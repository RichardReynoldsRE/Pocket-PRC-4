import { query } from '../database.js';
import { createError } from '../utils/errors.js';

/**
 * Require an active or trialing subscription.
 * Attaches req.subscription if found.
 * Returns 402 if no valid subscription exists.
 * Super_admin bypasses all subscription checks.
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    // Super admin bypasses subscription checks
    if (req.user?.role === 'super_admin') {
      return next();
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(createError('Authentication required', 401));
    }

    // Check for user's own subscription or their team's subscription
    const result = await query(
      `SELECT s.*, t.name as team_name
       FROM subscriptions s
       LEFT JOIN teams t ON s.team_id = t.id
       WHERE (s.user_id = $1 OR s.team_id = (SELECT team_id FROM users WHERE id = $1))
         AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(402).json({
        error: 'Subscription required',
        message: 'An active subscription is required to access this feature.',
      });
    }

    req.subscription = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require a specific plan tier (or one of several).
 * Must be used after requireActiveSubscription (depends on req.subscription).
 */
export function requirePlanTier(...tiers) {
  return (req, res, next) => {
    // Super admin bypasses
    if (req.user?.role === 'super_admin') {
      return next();
    }

    if (!req.subscription) {
      return res.status(402).json({
        error: 'Subscription required',
        message: 'An active subscription is required to access this feature.',
      });
    }

    if (!tiers.includes(req.subscription.plan_tier)) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        message: `This feature requires one of: ${tiers.join(', ')}. Your current plan: ${req.subscription.plan_tier}.`,
      });
    }

    next();
  };
}

/**
 * For expired/canceled subscriptions: allows GET requests, blocks POST/PUT/DELETE with 402.
 * Super_admin bypasses all checks.
 */
export async function checkReadOnly(req, res, next) {
  try {
    // Super admin bypasses
    if (req.user?.role === 'super_admin') {
      return next();
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(createError('Authentication required', 401));
    }

    // Check for any subscription (active, trialing, past_due, canceled)
    const result = await query(
      `SELECT s.*
       FROM subscriptions s
       WHERE (s.user_id = $1 OR s.team_id = (SELECT team_id FROM users WHERE id = $1))
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const sub = result.rows[0];

    // If active or trialing, allow everything
    if (sub && ['active', 'trialing'].includes(sub.status)) {
      req.subscription = sub;
      return next();
    }

    // No subscription or expired/canceled — read-only mode
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (sub) req.subscription = sub;
      return next();
    }

    return res.status(402).json({
      error: 'Subscription required',
      message: 'An active subscription is required to make changes. Read-only access is available.',
    });
  } catch (err) {
    next(err);
  }
}
