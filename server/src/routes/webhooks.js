import { Router } from 'express';
import { query } from '../database.js';
import { constructWebhookEvent, retrieveSubscription, retrieveInvoice } from '../lib/stripe.js';

const router = Router();

// ── POST /stripe ────────────────────────────────────────────────────
// Stripe webhook handler — uses raw body (NOT json parsed)
router.post('/stripe', async (req, res) => {
  let event;

  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      console.error('Webhook: Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Return 200 immediately, process async
  res.status(200).json({ received: true });

  // Process event asynchronously
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      default:
        // Unhandled event type — log for visibility
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }
  } catch (err) {
    // Log but don't fail — we already returned 200
    console.error(`Webhook handler error for ${event.type}:`, err.message);
  }
});

// ── Handlers ────────────────────────────────────────────────────────

async function handleSubscriptionCreated(eventSub) {
  // Re-fetch from Stripe for latest data
  const sub = await retrieveSubscription(eventSub.id);
  const customerId = sub.customer;
  const userId = sub.metadata?.user_id ? parseInt(sub.metadata.user_id) : null;

  if (!userId) {
    console.warn('Webhook: subscription.created missing user_id metadata for', sub.id);
    return;
  }

  // Check if record already exists (billing route may have created it)
  const existing = await query(
    'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
    [sub.id]
  );

  if (existing.rows.length > 0) {
    // Already created by the billing route — update with latest data
    await query(
      `UPDATE subscriptions SET
        status = $1,
        current_period_start = $2,
        current_period_end = $3,
        trial_ends_at = $4,
        cancel_at_period_end = $5,
        updated_at = NOW()
       WHERE stripe_subscription_id = $6`,
      [
        sub.status,
        new Date(sub.current_period_start * 1000),
        new Date(sub.current_period_end * 1000),
        sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        sub.cancel_at_period_end,
        sub.id,
      ]
    );
  } else {
    // Upsert — create new record
    const userResult = await query('SELECT team_id FROM users WHERE id = $1', [userId]);
    const teamId = userResult.rows[0]?.team_id;

    const planTier = sub.metadata?.plan_tier || 'solo';
    const seatItem = sub.items?.data[1];
    const seatCount = seatItem ? seatItem.quantity : 1;

    // Determine billing interval from the base price period
    const baseItem = sub.items?.data[0];
    const interval = baseItem?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';

    await query(
      `INSERT INTO subscriptions (
        user_id, team_id, stripe_customer_id, stripe_subscription_id,
        plan_tier, billing_interval, seat_count, status,
        trial_ends_at, current_period_start, current_period_end, cancel_at_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        trial_ends_at = EXCLUDED.trial_ends_at,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW()`,
      [
        userId,
        teamId,
        customerId,
        sub.id,
        planTier,
        interval,
        seatCount,
        sub.status,
        sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        new Date(sub.current_period_start * 1000),
        new Date(sub.current_period_end * 1000),
        sub.cancel_at_period_end,
      ]
    );
  }

  console.log(`Webhook: subscription.created processed for ${sub.id}`);
}

async function handleSubscriptionUpdated(eventSub) {
  // Re-fetch from Stripe
  const sub = await retrieveSubscription(eventSub.id);

  const seatItem = sub.items?.data[1];
  const seatCount = seatItem ? seatItem.quantity : 1;

  await query(
    `UPDATE subscriptions SET
      status = $1,
      current_period_start = $2,
      current_period_end = $3,
      trial_ends_at = $4,
      cancel_at_period_end = $5,
      seat_count = $6,
      updated_at = NOW()
     WHERE stripe_subscription_id = $7`,
    [
      sub.status,
      new Date(sub.current_period_start * 1000),
      new Date(sub.current_period_end * 1000),
      sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      sub.cancel_at_period_end,
      seatCount,
      sub.id,
    ]
  );

  console.log(`Webhook: subscription.updated processed for ${sub.id} — status: ${sub.status}`);
}

async function handleSubscriptionDeleted(eventSub) {
  // Re-fetch from Stripe
  const sub = await retrieveSubscription(eventSub.id);

  await query(
    `UPDATE subscriptions SET
      status = 'canceled',
      cancel_at_period_end = false,
      updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [sub.id]
  );

  console.log(`Webhook: subscription.deleted — marked canceled for ${sub.id}`);
}

async function handleInvoicePaid(eventInvoice) {
  // Re-fetch from Stripe
  const invoice = await retrieveInvoice(eventInvoice.id);

  const stripeSubId = invoice.subscription;
  if (!stripeSubId) {
    console.log('Webhook: invoice.paid has no subscription — skipping');
    return;
  }

  // Find local subscription
  const subResult = await query(
    'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubId]
  );

  if (subResult.rows.length === 0) {
    console.warn(`Webhook: invoice.paid — no local subscription found for ${stripeSubId}`);
    return;
  }

  const subscriptionId = subResult.rows[0].id;

  // Record in payment_history (upsert by stripe_invoice_id)
  await query(
    `INSERT INTO payment_history (
      subscription_id, stripe_invoice_id, amount_cents, status,
      invoice_pdf_url, period_start, period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = EXCLUDED.status,
      amount_cents = EXCLUDED.amount_cents,
      invoice_pdf_url = EXCLUDED.invoice_pdf_url,
      updated_at = NOW()`,
    [
      subscriptionId,
      invoice.id,
      invoice.amount_paid,
      'paid',
      invoice.invoice_pdf,
      invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    ]
  );

  // Update subscription status to active (payment succeeded)
  await query(
    `UPDATE subscriptions SET status = 'active', updated_at = NOW()
     WHERE stripe_subscription_id = $1 AND status != 'canceled'`,
    [stripeSubId]
  );

  console.log(`Webhook: invoice.paid recorded for ${invoice.id} ($${(invoice.amount_paid / 100).toFixed(2)})`);
}

async function handleInvoicePaymentFailed(eventInvoice) {
  // Re-fetch from Stripe
  const invoice = await retrieveInvoice(eventInvoice.id);

  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  // Find local subscription
  const subResult = await query(
    'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubId]
  );

  if (subResult.rows.length === 0) {
    console.warn(`Webhook: invoice.payment_failed — no local subscription for ${stripeSubId}`);
    return;
  }

  const subscriptionId = subResult.rows[0].id;

  // Record failed payment
  await query(
    `INSERT INTO payment_history (
      subscription_id, stripe_invoice_id, amount_cents, status,
      invoice_pdf_url, period_start, period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = NOW()`,
    [
      subscriptionId,
      invoice.id,
      invoice.amount_due,
      'failed',
      invoice.invoice_pdf,
      invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    ]
  );

  // Update subscription to past_due
  await query(
    `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [stripeSubId]
  );

  console.log(`Webhook: invoice.payment_failed for ${invoice.id} — subscription ${stripeSubId} marked past_due`);

  // TODO: Send warning email via Resend when email integration is ready
}

async function handleTrialWillEnd(eventSub) {
  // Log trial ending soon — email reminder can be added later
  const sub = await retrieveSubscription(eventSub.id);

  const localSub = await query(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [sub.id]
  );

  if (localSub.rows.length > 0) {
    const userId = localSub.rows[0].user_id;
    console.log(`Webhook: trial_will_end — user ${userId}, subscription ${sub.id}, trial ends ${new Date(sub.trial_end * 1000).toISOString()}`);
  }

  // TODO: Send trial ending email via Resend
}

export default router;
