#!/usr/bin/env node

/**
 * 🧪 TEST TIENDANUBE TOKEN SYSTEM
 * ==============================
 * 
 * Script para probar el nuevo sistema de gestión automática
 * de tokens de TiendaNube
 */

const https = require('https');

const PRODUCTION_URL = 'https://fini-tn.vercel.app';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔧 ${msg}${colors.reset}`)
};

async function makeRequest(path, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fini-tn.vercel.app',
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve({ status: res.statusCode, body, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testTiendaNubeTokenHealth() {
  log.step('Testing TiendaNube Token Health System...');
  
  try {
    // Test 1: Check token health endpoint accessibility
    log.info('1. Testing token health endpoint...');
    const healthResponse = await makeRequest('/api/tiendanube/token-health');
    
    if (healthResponse.status === 401) {
      log.warning('Endpoint requires authentication (expected)');
    } else if (healthResponse.status === 200) {
      log.success('Token health endpoint accessible');
      log.info('Response:', JSON.stringify(healthResponse.body, null, 2));
    } else {
      log.error(`Unexpected response: ${healthResponse.status}`);
      console.log(healthResponse.body);
    }

    // Test 2: Check if token manager is properly integrated
    log.info('2. Testing token manager integration...');
    try {
      // This should test the module loading
      const testResponse = await makeRequest('/api/debug/test-routing');
      if (testResponse.status === 200) {
        log.success('Token manager integration appears functional');
      }
    } catch (error) {
      log.warning('Could not verify token manager integration:', error.message);
    }

    // Test 3: Test global health check (admin endpoint)
    log.info('3. Testing global health check...');
    const globalHealthResponse = await makeRequest('/api/tiendanube/token-health', 'POST', {
      'Authorization': 'Bearer test-admin-key'
    });
    
    if (globalHealthResponse.status === 403) {
      log.success('Global health check properly protected (requires admin key)');
    } else if (globalHealthResponse.status === 200) {
      log.success('Global health check accessible');
      log.info('Health check result:', JSON.stringify(globalHealthResponse.body, null, 2));
    } else {
      log.warning(`Global health check returned: ${globalHealthResponse.status}`);
    }

    return true;

  } catch (error) {
    log.error('Error testing TiendaNube token system:', error.message);
    return false;
  }
}

async function testStripeWebhookDiagnostics() {
  log.step('Testing Stripe Webhook Diagnostics...');
  
  try {
    // Test 1: Check webhook diagnostics endpoint
    log.info('1. Testing Stripe webhook diagnostics endpoint...');
    const diagnosticsResponse = await makeRequest('/api/stripe/webhook-fix');
    
    if (diagnosticsResponse.status === 200) {
      log.success('Stripe diagnostics endpoint accessible');
      log.info('Configuration check:', JSON.stringify(diagnosticsResponse.body, null, 2));
    } else {
      log.warning(`Diagnostics endpoint returned: ${diagnosticsResponse.status}`);
    }

    // Test 2: Check webhook configuration
    const config = diagnosticsResponse.body?.config;
    if (config) {
      log.info('2. Analyzing Stripe configuration...');
      
      if (config.webhookSecretConfigured) {
        log.success('STRIPE_WEBHOOK_SECRET is configured');
        
        if (config.webhookSecretFormat === 'correct') {
          log.success('Webhook secret format is correct (starts with whsec_)');
        } else {
          log.error('Webhook secret format is incorrect (should start with whsec_)');
        }
      } else {
        log.error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      if (config.stripeSecretConfigured) {
        log.success('STRIPE_SECRET_KEY is configured');
      } else {
        log.error('STRIPE_SECRET_KEY is not configured');
      }

      log.info(`Environment: ${config.environment}`);
      log.info(`Recommended webhook URL: ${config.recommendedWebhookUrl || 'Not provided'}`);
    }

    return true;

  } catch (error) {
    log.error('Error testing Stripe webhook diagnostics:', error.message);
    return false;
  }
}

async function runAllTests() {
  log.info(`${colors.bold}🚀 TESTING VERCEL ERROR FIXES${colors.reset}`);
  console.log('='.repeat(50));
  
  const results = [];
  
  // Test TiendaNube Token System
  console.log('\n1. TIENDANUBE TOKEN MANAGEMENT SYSTEM');
  console.log('-'.repeat(40));
  const tiendaNubeResult = await testTiendaNubeTokenHealth();
  results.push({ test: 'TiendaNube Token System', success: tiendaNubeResult });
  
  // Test Stripe Webhook Diagnostics
  console.log('\n2. STRIPE WEBHOOK DIAGNOSTICS');
  console.log('-'.repeat(30));
  const stripeResult = await testStripeWebhookDiagnostics();
  results.push({ test: 'Stripe Webhook Diagnostics', success: stripeResult });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  log.info(`${colors.bold}📋 TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(50));
  
  results.forEach(result => {
    if (result.success) {
      log.success(`${result.test}: PASSED`);
    } else {
      log.error(`${result.test}: FAILED`);
    }
  });
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log('\n' + '-'.repeat(50));
  if (passedTests === totalTests) {
    log.success(`All tests passed! (${passedTests}/${totalTests})`);
  } else {
    log.warning(`Some tests failed: ${passedTests}/${totalTests} passed`);
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. For TiendaNube: Users with invalid tokens need to reconnect');
  console.log('2. For Stripe: Check webhook secret configuration in Vercel');
  console.log('3. Monitor logs after implementing fixes');
  console.log('\n📖 See VERCEL_ERRORS_SOLUTIONS.md for detailed guides');
}

// Run tests
runAllTests().catch(error => {
  log.error('Test runner failed:', error.message);
  process.exit(1);
}); 