#!/usr/bin/env node

const http = require('http');
const { promisify } = require('util');

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  step: (msg) => console.log(`\x1b[35m[STEP]\x1b[0m ${msg}`),
};

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testOTPFlow() {
  log.step('🔍 DEBUGGING WHATSAPP OTP FLOW');
  console.log('');

  // Test 1: Health check
  log.step('1. Testing API health...');
  try {
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3005,
      path: '/api/health',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (healthResponse.status === 200) {
      log.success('API is healthy');
    } else {
      log.error(`API health check failed: ${healthResponse.status}`);
      return false;
    }
  } catch (error) {
    log.error(`Cannot connect to API: ${error.message}`);
    log.warning('Make sure the dev server is running on port 3005');
    return false;
  }

  // Test 2: Test number creation (without auth - expected to fail)
  log.step('2. Testing WhatsApp number creation API...');
  try {
    const createResponse = await makeRequest({
      hostname: 'localhost',
      port: 3005,
      path: '/api/whatsapp/numbers',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      phone_number: '+541112345678',
      display_name: 'Debug Test Number',
      store_id: 'test-store-identifier'
    });

    if (createResponse.status === 401) {
      log.success('Number creation API correctly requires authentication');
    } else {
      log.warning(`Unexpected response: ${createResponse.status} - ${JSON.stringify(createResponse.data)}`);
    }
  } catch (error) {
    log.error(`Number creation API test failed: ${error.message}`);
  }

  // Test 3: Test OTP send API (without auth - expected to fail)
  log.step('3. Testing OTP send API...');
  try {
    const otpResponse = await makeRequest({
      hostname: 'localhost',
      port: 3005,
      path: '/api/whatsapp/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      whatsapp_number_id: 'test-identifier'
    });

    if (otpResponse.status === 401) {
      log.success('OTP send API correctly requires authentication');
    } else {
      log.warning(`Unexpected response: ${otpResponse.status} - ${JSON.stringify(otpResponse.data)}`);
    }
  } catch (error) {
    log.error(`OTP send API test failed: ${error.message}`);
  }

  // Test 4: Check if WhatsApp service is configured
  log.step('4. Checking Twilio WhatsApp configuration...');
  try {
    const testPath = '/api/whatsapp/test';
    const testResponse = await makeRequest({
      hostname: 'localhost',
      port: 3005,
      path: testPath,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (testResponse.status === 404) {
      log.success('WhatsApp test endpoint doesn\'t exist (expected)');
    } else {
      log.info(`WhatsApp test response: ${testResponse.status}`);
    }
  } catch (error) {
    log.warning(`WhatsApp test failed: ${error.message}`);
  }

  console.log('');
  log.step('🔧 FRONTEND DEBUGGING INSTRUCTIONS');
  console.log('');
  
  console.log('1. Open your browser and navigate to: http://localhost:3005/dashboard');
  console.log('2. Open Developer Tools (F12)');
  console.log('3. Go to the Console tab');
  console.log('4. Try to add a WhatsApp number');
  console.log('5. Look for the following debug messages:');
  console.log('   • [DEBUG] Starting handleAddNumber with values:');
  console.log('   • [DEBUG] Sending POST request to /api/whatsapp/numbers with:');
  console.log('   • [DEBUG] Number creation response:');
  console.log('   • [DEBUG] Sending OTP for number ID:');
  console.log('   • [DEBUG] OTP send response:');
  console.log('   • [DEBUG] OTP dialog state after success:');
  console.log('');
  
  log.step('🚨 COMMON ISSUES TO CHECK');
  console.log('');
  console.log('• Authentication: Make sure you\'re logged in');
  console.log('• Store selection: Verify a store is selected');
  console.log('• Phone validation: Check if phone number is valid');
  console.log('• Network errors: Look for failed API calls');
  console.log('• State issues: Check if showOTPDialog is being set to true');
  console.log('• Modal rendering: Verify Dialog component is properly rendered');
  console.log('');
  
  log.step('📋 TWILIO VERIFICATION');
  console.log('');
  console.log('If OTP is being sent but not received:');
  console.log('• Check Twilio Console: https://console.twilio.com/us1/monitor/logs/sms');
  console.log('• Look for delivery status and any error codes');
  console.log('• Verify your Twilio WhatsApp template is approved');
  console.log('• Check if the phone number is properly formatted');
  console.log('');

  log.success('🎯 DEBUG SETUP COMPLETE - Start testing in the browser!');
  
  return true;
}

// Run the test
testOTPFlow().catch(console.error); 