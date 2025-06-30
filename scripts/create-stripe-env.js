#!/usr/bin/env node

/**
 * Script to set up Stripe environment variables
 * Creates .env.local with required Stripe configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Stripe Environment Variables');
console.log('=========================================\n');

// Stripe configuration from the user
const STRIPE_CONFIG = {
  publishableKey: 'pk_test_51RcwBQ08jeYF36FPGMbgPtNdU9uvkxtmEe3KJx7NPLI1DMgoTo3RZYlgboltSQb1x35VSSfKaTCd1ZWBbABWm78T005UdnoRIg',
  pricingTableId: 'prctbl_1Rfo0k08jeYF36FPvRHMm0dc',
  secretKey: 'sk_test_...', // User needs to provide this
  webhookSecret: 'whsec_...', // User needs to provide this
  
  // Price IDs - these need to be created in Stripe Dashboard
    basicMonthly: 'price_...', // $29.99/month
  basicAnnual: 'price_...', // $299.99/year (17% discount)
  proMonthly: 'price_...', // $49.99/month
  proAnnual: 'price_...', // $499.99/year (17% discount)
};

const envPath = path.join(process.cwd(), '.env.local');

// Read existing .env.local if it exists
let existingEnv = '';
if (fs.existsSync(envPath)) {
  existingEnv = fs.readFileSync(envPath, 'utf8');
  console.log('📁 Found existing .env.local file');
} else {
  console.log('📁 Creating new .env.local file');
}

// Stripe environment variables to add/update
const stripeEnvVars = `
# ===== STRIPE CONFIGURATION =====
# Stripe Keys
STRIPE_SECRET_KEY=${STRIPE_CONFIG.secretKey}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_CONFIG.publishableKey}
STRIPE_WEBHOOK_SECRET=${STRIPE_CONFIG.webhookSecret}

# Stripe Pricing Table
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=${STRIPE_CONFIG.pricingTableId}

# Stripe Price IDs for Plans
# Basic Plan ($29.99/month, $299.99/year)
STRIPE_BASIC_MONTHLY_PRICE_ID=${STRIPE_CONFIG.basicMonthly}
STRIPE_BASIC_ANNUAL_PRICE_ID=${STRIPE_CONFIG.basicAnnual}

# Pro Plan ($49.99/month, $499.99/year)
STRIPE_PRO_MONTHLY_PRICE_ID=${STRIPE_CONFIG.proMonthly}
STRIPE_PRO_ANNUAL_PRICE_ID=${STRIPE_CONFIG.proAnnual}
`;

// Function to update or add environment variable
function updateEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + `\n${key}=${value}`;
  }
}

// Remove old Stripe variables if they exist
let updatedContent = existingEnv
  .replace(/^STRIPE_.*$/gm, '')
  .replace(/^NEXT_PUBLIC_STRIPE_.*$/gm, '')
  .replace(/\n\n+/g, '\n\n'); // Clean up extra newlines

// Add new Stripe configuration
updatedContent += stripeEnvVars;

// Write to .env.local
fs.writeFileSync(envPath, updatedContent);

console.log('✅ Stripe environment variables configured!');
console.log('\n📋 Next steps:');
console.log('1. Update the following variables in .env.local with your actual Stripe values:');
console.log('   - STRIPE_SECRET_KEY (starts with sk_test_)');
console.log('   - STRIPE_WEBHOOK_SECRET (starts with whsec_)');
console.log('   - Price IDs for each plan (starts with price_)');
console.log('\n2. Create products and prices in Stripe Dashboard:');

const products = [
  {
    name: 'Basic Plan',
    description: 'Perfect for small businesses starting with WhatsApp analytics',
    prices: [
      { amount: 2999, interval: 'month', nickname: 'Basic Monthly' },
      { amount: 29999, interval: 'year', nickname: 'Basic Annual (17% off)' }
    ]
  },
  {
    name: 'Pro Plan', 
    description: 'Advanced features for growing businesses',
    prices: [
      { amount: 4999, interval: 'month', nickname: 'Pro Monthly' },
      { amount: 49999, interval: 'year', nickname: 'Pro Annual (17% off)' }
    ]
  }
];

console.log('\n🏷️  Products to create in Stripe:');
products.forEach((product, i) => {
  console.log(`\n${i + 1}. ${product.name}`);
  console.log(`   Description: ${product.description}`);
  console.log('   Prices:');
  product.prices.forEach(price => {
    console.log(`   - ${price.nickname}: $${(price.amount / 100).toFixed(2)}/${price.interval}`);
  });
});

console.log('\n3. Set up webhook endpoint in Stripe Dashboard:');
console.log('   URL: https://your-domain.com/api/stripe/webhook');
console.log('   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed, invoice.payment_succeeded');

console.log('\n4. Create a pricing table in Stripe Dashboard and update NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID');

console.log('\n🚀 Ready to test Stripe integration!'); 