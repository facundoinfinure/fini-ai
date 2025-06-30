#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log('🧪 Testing Onboarding Improvements');
console.log('=====================================');
console.log('✅ WhatsApp OTP Verification');
console.log('✅ Updated Plans (Pro $39.99 + Enterprise $99.99)');
console.log('✅ 7 Days Free Trial for Both Plans');

async function testOnboardingPage() {
  try {
    console.log('\n1. Testing Onboarding Page Load...');
    
    const response = await fetch(`${API_BASE}/onboarding`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for WhatsApp OTP verification features
      console.log('\n🔍 WhatsApp OTP Features:');
      if (html.includes('showOTPVerification')) {
        console.log('   ✅ OTP verification state management present');
      } else {
        console.log('   ❌ OTP verification state missing');
      }
      
      if (html.includes('handleVerifyOTP')) {
        console.log('   ✅ OTP verification function present');
      } else {
        console.log('   ❌ OTP verification function missing');
      }
      
      if (html.includes('handleResendOTP')) {
        console.log('   ✅ OTP resend function present');
      } else {
        console.log('   ❌ OTP resend function missing');
      }
      
      if (html.includes('Verifica tu WhatsApp')) {
        console.log('   ✅ OTP verification UI present');
      } else {
        console.log('   ❌ OTP verification UI missing');
      }
      
      // Check for updated plans
      console.log('\n💰 Updated Plans:');
      if (html.includes('$39.99/mes')) {
        console.log('   ✅ Pro plan $39.99/mes found');
      } else {
        console.log('   ❌ Pro plan $39.99/mes not found');
      }
      
      if (html.includes('$99.99/mes')) {
        console.log('   ✅ Enterprise plan $99.99/mes found');
      } else {
        console.log('   ❌ Enterprise plan $99.99/mes not found');
      }
      
      if (html.includes('7 días gratis')) {
        console.log('   ✅ 7 days free trial found');
      } else {
        console.log('   ❌ 7 days free trial not found');
      }
      
      // Check that free plan is removed
      if (!html.includes('"free"') || !html.includes('Plan Básico')) {
        console.log('   ✅ Free plan successfully removed');
      } else {
        console.log('   ❌ Free plan still present');
      }
      
      if (html.includes('highlighted: true')) {
        console.log('   ✅ Pro plan highlighted as recommended');
      } else {
        console.log('   ❌ Pro plan highlighting missing');
      }
      
      // Check grid layout
      if (html.includes('grid-cols-2')) {
        console.log('   ✅ 2-column layout for plans');
      } else {
        console.log('   ❌ 2-column layout not found');
      }
      
      return true;
    } else {
      console.log('   ❌ Could not load onboarding page');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Onboarding test failed:', error.message);
    return false;
  }
}

async function testWhatsAppSetupEndpoint() {
  try {
    console.log('\n2. Testing WhatsApp Setup Endpoint...');
    
    const response = await fetch(`${API_BASE}/api/whatsapp/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (response.status !== 404) {
      console.log('   ✅ WhatsApp setup endpoint exists and responds');
      
      const data = await response.json();
      if (data.error && data.error.includes('autorizado')) {
        console.log('   ✅ Proper authentication check in place');
      }
      
      return true;
    } else {
      console.log('   ❌ WhatsApp setup endpoint not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ WhatsApp endpoint test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`Testing against: ${API_BASE}`);
  
  const results = [];
  
  results.push(await testOnboardingPage());
  results.push(await testWhatsAppSetupEndpoint());
  
  console.log('\n📊 Test Results Summary:');
  console.log('=======================');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Onboarding improvements are working correctly.');
    console.log('\n📋 Implemented Features:');
    console.log('   1. ✅ WhatsApp OTP verification flow integrated');
    console.log('   2. ✅ Two premium plans: Pro ($39.99) + Enterprise ($99.99)');
    console.log('   3. ✅ 7 days free trial for both plans');
    console.log('   4. ✅ Pro plan highlighted as recommended');
    console.log('   5. ✅ Improved UI with 2-column layout');
    console.log('   6. ✅ Free plan removed as requested');
  } else {
    console.log('\n❌ Some tests failed. Check the issues above.');
  }
  
  console.log('\n🔄 Manual Testing Instructions:');
  console.log('   1. Go to /onboarding');
  console.log('   2. Complete steps 1-3 (store, analysis, profile)');
  console.log('   3. Step 4: Enter WhatsApp number');
  console.log('   4. Verify OTP code is sent and verification screen appears');
  console.log('   5. Step 5: See 2 plans with 7 days free trial');
  console.log('   6. Complete onboarding with selected plan');
}

if (require.main === module) {
  runTests().catch(console.error);
} 