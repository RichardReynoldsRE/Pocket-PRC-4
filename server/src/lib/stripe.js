import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe Customer.
 */
export async function createCustomer(email, name, metadata = {}) {
  return stripe.customers.create({ email, name, metadata });
}

/**
 * Create a SetupIntent for embedded card collection.
 */
export async function createSetupIntent(customerId) {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });
}

/**
 * Create a subscription. Supports trial_period_days, default_payment_method, metadata.
 * `items` is an array of { price, quantity } objects.
 */
export async function createSubscription(customerId, items, options = {}) {
  return stripe.subscriptions.create({
    customer: customerId,
    items,
    ...options,
  });
}

/**
 * Update a subscription (plan/seats with proration).
 * `updates` can include items, proration_behavior, etc.
 */
export async function updateSubscription(subscriptionId, updates) {
  return stripe.subscriptions.update(subscriptionId, updates);
}

/**
 * Cancel a subscription immediately or at period end.
 */
export async function cancelSubscription(subscriptionId, atPeriodEnd = true) {
  if (atPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Resume a subscription by removing cancel_at_period_end.
 */
export async function resumeSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Create a billing portal session (fallback).
 */
export async function createPortalSession(customerId, returnUrl) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Verify a Stripe webhook event signature.
 */
export function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Preview upcoming invoice / proration.
 */
export async function getUpcomingInvoice(customerId, subscriptionId, items) {
  const params = { customer: customerId };
  if (subscriptionId) params.subscription = subscriptionId;
  if (items) params.subscription_items = items;
  return stripe.invoices.retrieveUpcoming(params);
}

/**
 * List customer invoices from Stripe.
 */
export async function listInvoices(customerId, options = {}) {
  return stripe.invoices.list({
    customer: customerId,
    limit: options.limit || 10,
    starting_after: options.starting_after || undefined,
  });
}

/**
 * Attach a payment method to a customer and set as default.
 */
export async function attachPaymentMethod(customerId, paymentMethodId) {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

/**
 * Retrieve a subscription from Stripe.
 */
export async function retrieveSubscription(subscriptionId) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Retrieve an invoice from Stripe.
 */
export async function retrieveInvoice(invoiceId) {
  return stripe.invoices.retrieve(invoiceId);
}
