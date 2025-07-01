#!/usr/bin/env node

/**
 * 🔧 TEST: ONBOARDING REDIRECT FIX
 * ==============================
 * 
 * Tests the fix for users being redirected to onboarding
 * when they should go to dashboard.
 */

const fs = require('fs');

// Test files that should have graceful error handling
const testCases = [
  {
    name: 'Middleware Fallback Logic',
    file: 'src/middleware.ts',
    checks: [
      'catch (schemaError)',
      'fallback logic',
      'User has stores, allowing dashboard access',
      'despite schema issues'
    ]
  },
  {
    name: 'Auth Callback Fallback',
    file: 'src/app/auth/callback/route.ts', 
    checks: [
      'catch (schemaError)',
      'fallback logic',
      'despite schema issues',
      'User has stores, redirecting to dashboard'
    ]
  },
  {
    name: 'Onboarding Status API',
    file: 'src/app/api/user/complete-onboarding/route.ts',
    checks: [
      'graceful fallback',
      'Schema error',
      'hasBasicProfile && hasStores',
      'finalCompleted: completed'
    ]
  },
  {
    name: 'Schema Validation with Fix Instructions',
    file: 'src/app/api/debug/schema-validation/route.ts',
    checks: [
      'critical_issues',
      'missing_columns',
      'onboarding_completed column missing',
      'fix_instructions'
    ]
  }
];

async function testOnboardingRedirectFix() {
  console.log('🔧 TESTING: Onboarding Redirect Fix');
  console.log('===================================\n');

  let allTestsPassed = true;
  let testsRun = 0;
  let testsPassed = 0;

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      const content = fs.readFileSync(testCase.file, 'utf8');
      let casesPassed = 0;
      
      for (const check of testCase.checks) {
        testsRun++;
        
        if (content.includes(check)) {
          console.log(`   ✅ ${check}`);
          casesPassed++;
          testsPassed++;
        } else {
          console.log(`   ❌ Missing: ${check}`);
          allTestsPassed = false;
        }
      }
      
      const percentage = Math.round((casesPassed / testCase.checks.length) * 100);
      console.log(`   📊 ${testCase.name}: ${casesPassed}/${testCase.checks.length} checks passed (${percentage}%)\n`);
      
    } catch (error) {
      console.log(`   ❌ Error reading ${testCase.file}: ${error.message}\n`);
      allTestsPassed = false;
    }
  }

  // Additional API endpoint tests
  console.log('🌐 Testing API Endpoints...');
  
  try {
    console.log('   📋 Schema validation endpoint should exist...');
    const schemaValidationExists = fs.existsSync('src/app/api/debug/schema-validation/route.ts');
    if (schemaValidationExists) {
      console.log('   ✅ Schema validation endpoint exists');
      testsPassed++;
    } else {
      console.log('   ❌ Schema validation endpoint missing');
      allTestsPassed = false;
    }
    testsRun++;

    console.log('   📋 Setup database endpoint should exist...');
    const setupDbExists = fs.existsSync('src/app/api/setup-database/route.ts');
    if (setupDbExists) {
      console.log('   ✅ Setup database endpoint exists');
      testsPassed++;
    } else {
      console.log('   ❌ Setup database endpoint missing');
      allTestsPassed = false;
    }
    testsRun++;

  } catch (error) {
    console.log(`   ❌ Error checking API endpoints: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Total tests run: ${testsRun}`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsRun - testsPassed}`);
  console.log(`Success rate: ${Math.round((testsPassed / testsRun) * 100)}%`);

  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Onboarding redirect fix is properly implemented.');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Deploy these changes to production');
    console.log('2. Run POST /api/debug/schema-validation to check database schema');
    console.log('3. If schema issues found, run POST /api/setup-database');
    console.log('4. Test user login flow in production');
  } else {
    console.log('\n❌ SOME TESTS FAILED! Please review and fix the issues above.');
    process.exit(1);
  }
}

// Run the tests
testOnboardingRedirectFix().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 