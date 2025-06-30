import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
});

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  pricingTableId: process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID!,
  
  // Product and Price IDs for our plans
  products: {
    basic: {
      monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!,
      annual: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID!,
    },
    pro: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
    }
  }
};

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(params: {
  email: string;
  name?: string;
  userId: string;
}): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      userId: params.userId,
    },
  });
  
  return customer;
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateStripeCustomer(params: {
  email: string;
  name?: string;
  userId: string;
}): Promise<Stripe.Customer> {
  // First, try to find existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }
  
  // If not found, create new customer
  return createStripeCustomer(params);
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  plan: 'basic' | 'pro';
  billing: 'monthly' | 'annual';
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      plan: params.plan,
      billing: params.billing,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        plan: params.plan,
        billing: params.billing,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });
  
  return session;
}

/**
 * Create a customer portal session
 */
export async function createCustomerPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
  
  return session;
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('[ERROR] Failed to retrieve subscription:', error);
    return null;
  }
}

/**
 * Get customer's active subscriptions
 */
export async function getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10,
    });
    
    return subscriptions.data;
  } catch (error) {
    console.error('[ERROR] Failed to retrieve customer subscriptions:', error);
    return [];
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

/**
 * Update subscription
 */
export async function updateSubscription(
  subscriptionId: string, 
  params: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, params);
  return subscription;
}

/**
 * Get price details
 */
export async function getPrice(priceId: string): Promise<Stripe.Price | null> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    return price;
  } catch (error) {
    console.error('[ERROR] Failed to retrieve price:', error);
    return null;
  }
}

/**
 * Get all products and prices
 */
export async function getProductsAndPrices(): Promise<{
  products: Stripe.Product[];
  prices: Stripe.Price[];
}> {
  const [products, prices] = await Promise.all([
    stripe.products.list({ active: true }),
    stripe.prices.list({ active: true }),
  ]);
  
  return {
    products: products.data,
    prices: prices.data,
  };
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Map Stripe subscription to our plan type
 */
export function mapStripePlanToAppPlan(subscription: Stripe.Subscription): {
  plan: 'basic' | 'pro';
  billing: 'monthly' | 'annual';
  status: string;
} {
  const metadata = subscription.metadata;
  const plan = metadata.plan as 'basic' | 'pro' || 'basic';
  const billing = metadata.billing as 'monthly' | 'annual' || 'monthly';
  
  // Fallback: try to determine from price ID if metadata is missing
  let fallbackPlan: 'basic' | 'pro' = 'basic';
  let fallbackBilling: 'monthly' | 'annual' = 'monthly';
  
  if (subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0].price.id;
    
    // Map price IDs to plans
    if (priceId === STRIPE_CONFIG.products.basic.monthly) {
      fallbackPlan = 'basic';
      fallbackBilling = 'monthly';
    } else if (priceId === STRIPE_CONFIG.products.basic.annual) {
      fallbackPlan = 'basic';
      fallbackBilling = 'annual';
    } else if (priceId === STRIPE_CONFIG.products.pro.monthly) {
      fallbackPlan = 'pro';
      fallbackBilling = 'monthly';
    } else if (priceId === STRIPE_CONFIG.products.pro.annual) {
      fallbackPlan = 'pro';
      fallbackBilling = 'annual';
    }
  }
  
  return {
    plan: plan || fallbackPlan,
    billing: billing || fallbackBilling,
    status: subscription.status,
  };
}

/**
 * Get price ID for plan and billing cycle
 */
export function getPriceIdForPlan(plan: 'basic' | 'pro', billing: 'monthly' | 'annual'): string {
  return STRIPE_CONFIG.products[plan][billing];
}

/**
 * Create usage record for metered billing (if needed in the future)
 * Note: Commented out for now as the API may have changed
 */
// export async function createUsageRecord(params: {
//   subscriptionItemId: string;
//   quantity: number;
//   timestamp?: number;
// }): Promise<any> {
//   // Implementation to be updated based on current Stripe API
//   throw new Error('Usage records not implemented yet');
// }

export { stripe };
export default stripe; 