import { Router } from 'express';
import { query } from '../database.js';
import { verifyToken } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';
import {
  createCustomer,
  createSetupIntent,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  resumeSubscription,
  getUpcomingInvoice,
  attachPaymentMethod,
  retrieveSubscription,
} from '../lib/stripe.js';

const router = Router();

// ── Price ID mapping from env vars ──────────────────────────────────

const PRICE_MAP = {
  solo: {
    monthly: () => process.env.STRIPE_PRICE_SOLO_MONTHLY,
    annual: () => process.env.STRIPE_PRICE_SOLO_ANNUAL,
    seat_monthly: () => null,
    seat_annual: () => null,
  },
  team: {
    monthly: () => process.env.STRIPE_PRICE_TEAM_MONTHLY,
    annual: () => process.env.STRIPE_PRICE_TEAM_ANNUAL,
    seat_monthly: () => process.env.STRIPE_PRICE_SEAT_TEAM_MONTHLY,
    seat_annual: () => process.env.STRIPE_PRICE_SEAT_TEAM_ANNUAL,
  },
  large_team: {
    monthly: () => process.env.STRIPE_PRICE_LARGE_TEAM_MONTHLY,
    annual: () => process.env.STRIPE_PRICE_LARGE_TEAM_ANNUAL,
    seat_monthly: () => process.env.STRIPE_PRICE_SEAT_LARGE_TEAM_MONTHLY,
    seat_annual: () => process.env.STRIPE_PRICE_SEAT_LARGE_TEAM_ANNUAL,
  },
};

const VALID_TIERS = ['solo', 'team', 'large_team'];
const VALID_INTERVALS = ['monthly', 'annual'];

function getPriceId(tier, interval) {
  return PRICE_MAP[tier]?.[interval]?.() || null;
}

function getSeatPriceId(tier, interval) {
  const key = `seat_${interval}`;
  return PRICE_MAP[tier]?.[key]?.() || null;
}

// ── POST /setup-intent ──────────────────────────────────────────────
// Create Stripe Customer (if not exists) + SetupIntent
router.post('/setup-intent', verifyToken, async (req, res, next) => {
  try {
    const { userId, email } = req.user;

    // Check if user already has a stripe_customer_id
    const existing = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    let customerId = existing.rows[0]?.stripe_customer_id;

    if (!customerId) {
      // Get user name for customer creation
      const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
      const name = userResult.rows[0]?.name || '';

      const customer = await createCustomer(email, name, { user_id: String(userId) });
      customerId = customer.id;
    }

    const setupIntent = await createSetupIntent(customerId);

    res.json({
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /create-subscription ───────────────────────────────────────
// Create a subscription with 14-day trial
router.post('/create-subscription', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { planTier, billingInterval, seatCount = 1, paymentMethodId, customerId } = req.body;

    if (!planTier || !billingInterval || !paymentMethodId || !customerId) {
      throw createError('planTier, billingInterval, paymentMethodId, and customerId are required', 400);
    }

    if (!VALID_TIERS.includes(planTier)) {
      throw createError(`Invalid plan tier. Must be one of: ${VALID_TIERS.join(', ')}`, 400);
    }

    if (!VALID_INTERVALS.includes(billingInterval)) {
      throw createError(`Invalid billing interval. Must be one of: ${VALID_INTERVALS.join(', ')}`, 400);
    }

    // Check for existing active subscription
    const existingSub = await query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status IN ('active', 'trialing')`,
      [userId]
    );
    if (existingSub.rows.length > 0) {
      throw createError('You already have an active subscription', 409);
    }

    // Attach payment method to customer and set as default
    await attachPaymentMethod(customerId, paymentMethodId);

    // Build subscription items
    const basePriceId = getPriceId(planTier, billingInterval);
    if (!basePriceId) {
      throw createError('Price not configured for this plan', 500);
    }

    const items = [{ price: basePriceId }];

    // Add seat item for team plans (quantity = extra seats beyond included)
    const seatPriceId = getSeatPriceId(planTier, billingInterval);
    if (seatPriceId) {
      // Even if seatCount is 0, create the item so it exists for later updates
      const extraSeats = Math.max(0, (seatCount || 0));
      items.push({ price: seatPriceId, quantity: extraSeats });
    }

    // Get user's team_id
    const userResult = await query('SELECT team_id FROM users WHERE id = $1', [userId]);
    const teamId = userResult.rows[0]?.team_id;

    // Create subscription with 14-day trial
    const subscription = await createSubscription(customerId, items, {
      default_payment_method: paymentMethodId,
      trial_period_days: 14,
      metadata: {
        user_id: String(userId),
        plan_tier: planTier,
      },
    });

    // Store in database
    await query(
      `INSERT INTO subscriptions (
        user_id, team_id, stripe_customer_id, stripe_subscription_id,
        plan_tier, billing_interval, seat_count, status,
        trial_ends_at, current_period_start, current_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        teamId,
        customerId,
        subscription.id,
        planTier,
        billingInterval,
        seatCount || 1,
        subscription.status, // 'trialing'
        subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
      ]
    );

    res.status(201).json({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /subscription ───────────────────────────────────────────────
// Get current subscription for authenticated user
router.get('/subscription', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const result = await query(
      `SELECT s.*, t.name as team_name,
        (SELECT COUNT(*)::int FROM users WHERE team_id = s.team_id AND is_active = true) as active_members
       FROM subscriptions s
       LEFT JOIN teams t ON s.team_id = t.id
       WHERE (s.user_id = $1 OR s.team_id = (SELECT team_id FROM users WHERE id = $1))
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ subscription: null });
    }

    res.json({ subscription: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /update-plan ───────────────────────────────────────────────
// Change plan tier. Upgrades: immediate proration. Downgrades: at period end.
router.post('/update-plan', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { planTier, billingInterval } = req.body;

    if (!planTier || !billingInterval) {
      throw createError('planTier and billingInterval are required', 400);
    }

    if (!VALID_TIERS.includes(planTier)) {
      throw createError(`Invalid plan tier. Must be one of: ${VALID_TIERS.join(', ')}`, 400);
    }

    if (!VALID_INTERVALS.includes(billingInterval)) {
      throw createError(`Invalid billing interval. Must be one of: ${VALID_INTERVALS.join(', ')}`, 400);
    }

    // Get current subscription
    const subResult = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status IN ('active', 'trialing')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      throw createError('No active subscription found', 404);
    }

    const sub = subResult.rows[0];

    // Determine if upgrade or downgrade
    const tierOrder = { solo: 1, team: 2, large_team: 3 };
    const currentLevel = tierOrder[sub.plan_tier] || 0;
    const newLevel = tierOrder[planTier] || 0;
    const isUpgrade = newLevel > currentLevel || (newLevel === currentLevel && billingInterval === 'annual' && sub.billing_interval === 'monthly');

    // Fetch current Stripe subscription to get item IDs
    const stripeSub = await retrieveSubscription(sub.stripe_subscription_id);

    // Build update items — replace base price, keep/add seat price
    const basePriceId = getPriceId(planTier, billingInterval);
    if (!basePriceId) {
      throw createError('Price not configured for this plan', 500);
    }

    // Find existing base item (first item is always base)
    const baseItem = stripeSub.items.data[0];
    const updateItems = [{ id: baseItem.id, price: basePriceId }];

    // Handle seat item
    const seatPriceId = getSeatPriceId(planTier, billingInterval);
    const existingSeatItem = stripeSub.items.data[1]; // second item is seats if exists

    if (seatPriceId) {
      if (existingSeatItem) {
        updateItems.push({ id: existingSeatItem.id, price: seatPriceId, quantity: existingSeatItem.quantity });
      } else {
        updateItems.push({ price: seatPriceId, quantity: 0 });
      }
    } else if (existingSeatItem) {
      // Moving to solo, remove seat item
      updateItems.push({ id: existingSeatItem.id, deleted: true });
    }

    const prorationBehavior = isUpgrade ? 'create_prorations' : 'none';

    const updated = await updateSubscription(sub.stripe_subscription_id, {
      items: updateItems,
      proration_behavior: prorationBehavior,
    });

    // Update local database
    await query(
      `UPDATE subscriptions SET plan_tier = $1, billing_interval = $2, updated_at = NOW()
       WHERE id = $3`,
      [planTier, billingInterval, sub.id]
    );

    res.json({
      message: isUpgrade ? 'Plan upgraded immediately with proration' : 'Plan change applied',
      subscription: {
        planTier,
        billingInterval,
        status: updated.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /update-seats ──────────────────────────────────────────────
// Add/remove seats. Adding: immediate proration. Removing: at period end.
router.post('/update-seats', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { seatCount } = req.body;

    if (seatCount === undefined || seatCount === null) {
      throw createError('seatCount is required', 400);
    }

    if (seatCount < 0) {
      throw createError('seatCount must be non-negative', 400);
    }

    // Get current subscription
    const subResult = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status IN ('active', 'trialing')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      throw createError('No active subscription found', 404);
    }

    const sub = subResult.rows[0];

    if (sub.plan_tier === 'solo') {
      throw createError('Solo plan does not support additional seats', 400);
    }

    // Fetch Stripe subscription to get seat item
    const stripeSub = await retrieveSubscription(sub.stripe_subscription_id);
    const seatItem = stripeSub.items.data[1]; // second item is seats

    if (!seatItem) {
      throw createError('Seat item not found on subscription', 500);
    }

    const currentSeats = seatItem.quantity;
    const isAdding = seatCount > currentSeats;

    const updated = await updateSubscription(sub.stripe_subscription_id, {
      items: [{ id: seatItem.id, quantity: seatCount }],
      proration_behavior: isAdding ? 'create_prorations' : 'none',
    });

    // Update local database
    await query(
      `UPDATE subscriptions SET seat_count = $1, updated_at = NOW() WHERE id = $2`,
      [seatCount, sub.id]
    );

    res.json({
      message: isAdding ? 'Seats added with immediate proration' : 'Seats updated (takes effect at period end)',
      seatCount,
      status: updated.status,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /cancel ────────────────────────────────────────────────────
// Cancel subscription. Default: at period end.
router.post('/cancel', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { immediate = false } = req.body;

    const subResult = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status IN ('active', 'trialing')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      throw createError('No active subscription found', 404);
    }

    const sub = subResult.rows[0];

    await cancelSubscription(sub.stripe_subscription_id, !immediate);

    if (immediate) {
      await query(
        `UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = false, updated_at = NOW()
         WHERE id = $1`,
        [sub.id]
      );
    } else {
      await query(
        `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW()
         WHERE id = $1`,
        [sub.id]
      );
    }

    res.json({
      message: immediate
        ? 'Subscription canceled immediately'
        : 'Subscription will cancel at end of billing period',
      cancelAtPeriodEnd: !immediate,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /resume ────────────────────────────────────────────────────
// Remove cancel_at_period_end
router.post('/resume', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const subResult = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND cancel_at_period_end = true AND status IN ('active', 'trialing')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      throw createError('No subscription pending cancellation found', 404);
    }

    const sub = subResult.rows[0];

    await resumeSubscription(sub.stripe_subscription_id);

    await query(
      `UPDATE subscriptions SET cancel_at_period_end = false, updated_at = NOW()
       WHERE id = $1`,
      [sub.id]
    );

    res.json({ message: 'Subscription resumed' });
  } catch (err) {
    next(err);
  }
});

// ── POST /update-payment-method ─────────────────────────────────────
// Create new SetupIntent for card update
router.post('/update-payment-method', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const subResult = await query(
      `SELECT stripe_customer_id FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      throw createError('No subscription found', 404);
    }

    const customerId = subResult.rows[0].stripe_customer_id;
    const setupIntent = await createSetupIntent(customerId);

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    next(err);
  }
});

// ── GET /invoices ───────────────────────────────────────────────────
// Get payment history from local DB with pagination
router.get('/invoices', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Get user's subscription id(s)
    const subResult = await query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 OR team_id = (SELECT team_id FROM users WHERE id = $1)`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      return res.json({ invoices: [], total: 0, page, limit });
    }

    const subIds = subResult.rows.map(r => r.id);

    const countResult = await query(
      `SELECT COUNT(*)::int as total FROM payment_history
       WHERE subscription_id = ANY($1)`,
      [subIds]
    );

    const invoicesResult = await query(
      `SELECT * FROM payment_history
       WHERE subscription_id = ANY($1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [subIds, limit, offset]
    );

    res.json({
      invoices: invoicesResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /upcoming-invoice ───────────────────────────────────────────
// Preview next charge via Stripe API
router.get('/upcoming-invoice', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const subResult = await query(
      `SELECT stripe_customer_id, stripe_subscription_id FROM subscriptions
       WHERE user_id = $1 AND status IN ('active', 'trialing')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      throw createError('No active subscription found', 404);
    }

    const { stripe_customer_id, stripe_subscription_id } = subResult.rows[0];

    const invoice = await getUpcomingInvoice(stripe_customer_id, stripe_subscription_id);

    res.json({
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      lines: invoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
        period: line.period,
      })),
    });
  } catch (err) {
    // Stripe throws if no upcoming invoice (e.g., during trial with no charge)
    if (err.type === 'StripeInvalidRequestError') {
      return res.json({ amountDue: 0, currency: 'usd', lines: [], message: 'No upcoming invoice' });
    }
    next(err);
  }
});

export default router;
