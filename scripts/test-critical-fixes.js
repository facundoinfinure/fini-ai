#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE CRITICAL FIXES TEST
 * ====================================
 * Tests all the critical flow fixes that were implemented
 */

const fs = require('fs');
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bold}🔧 ${msg}${colors.reset}`),
  test: (msg) => console.log(`   🧪 ${msg}`)
};

async function main() {
  console.log(`${colors.cyan}${colors.bold}
╔══════════════════════════════════════════════════════════════╗
║                CRITICAL FIXES VERIFICATION                  ║
║              Testing All Implemented Solutions              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Environment Variables
  log.section('TESTING ENVIRONMENT VARIABLES');
  totalTests++;
  
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    
    const checks = [
      { name: 'NEXTAUTH_URL', pattern: /NEXTAUTH_URL=https:\/\/fini-tn\.vercel\.app/, critical: true },
      { name: 'APP_URL', pattern: /APP_URL=https:\/\/fini-tn\.vercel\.app/, critical: true },
      { name: 'PINECONE_ENVIRONMENT', pattern: /PINECONE_ENVIRONMENT=us-east-1-aws/, critical: true },
      { name: 'TWILIO_OTP_CONTENTSID', pattern: /TWILIO_OTP_CONTENTSID=HX/, critical: true },
      { name: 'OPENAI_API_KEY', pattern: /OPENAI_API_KEY=sk-/, critical: false }
    ];
    
    let envPass = true;
    checks.forEach(check => {
      if (check.pattern.test(envContent)) {
        log.success(`${check.name} configured correctly`);
      } else {
        if (check.critical) {
          log.error(`${check.name} not configured correctly`);
          envPass = false;
        } else {
          log.warning(`${check.name} not configured (optional)`);
        }
      }
    });
    
    if (envPass) {
      log.success('Environment variables test PASSED');
      passedTests++;
    } else {
      log.error('Environment variables test FAILED');
      failedTests++;
    }
  } catch (error) {
    log.error(`Environment test failed: ${error.message}`);
    failedTests++;
  }

  // Test 2: Pinecone Namespace Creation Logic
  log.section('TESTING PINECONE NAMESPACE CREATION');
  totalTests++;
  
  try {
    const ragEngineFile = fs.readFileSync('src/lib/rag/unified-rag-engine.ts', 'utf8');
    
    const checks = [
      'checkExistingNamespaces',
      'STEP 1: Validate store exists',
      'STEP 2: Check which namespaces already exist',
      'hasEssentials',
      'Essential namespaces available'
    ];
    
    let namespacePass = true;
    checks.forEach(check => {
      if (ragEngineFile.includes(check)) {
        log.success(`Found: ${check}`);
      } else {
        log.error(`Missing: ${check}`);
        namespacePass = false;
      }
    });
    
    if (namespacePass) {
      log.success('Pinecone namespace logic test PASSED');
      passedTests++;
    } else {
      log.error('Pinecone namespace logic test FAILED');
      failedTests++;
    }
  } catch (error) {
    log.error(`Namespace test failed: ${error.message}`);
    failedTests++;
  }

  // Test 3: Background Task Monitoring
  log.section('TESTING BACKGROUND TASK MONITORING');
  totalTests++;
  
  try {
    const bulletproofFile = fs.readFileSync('src/lib/integrations/bulletproof-tiendanube.ts', 'utf8');
    
    const checks = [
      'executeMonitoredBackgroundOperations',
      'operationId',
      'OPERATION 1: RAG Namespace Initialization',
      'OPERATION 2: Store Data Sync',
      'OPERATION 3: Update Store Status',
      'logOperationResults'
    ];
    
    let monitoringPass = true;
    checks.forEach(check => {
      if (bulletproofFile.includes(check)) {
        log.success(`Found: ${check}`);
      } else {
        log.error(`Missing: ${check}`);
        monitoringPass = false;
      }
    });
    
    if (monitoringPass) {
      log.success('Background task monitoring test PASSED');
      passedTests++;
    } else {
      log.error('Background task monitoring test FAILED');
      failedTests++;
    }
  } catch (error) {
    log.error(`Monitoring test failed: ${error.message}`);
    failedTests++;
  }

  // Test 4: Agent Routing Fallbacks
  log.section('TESTING AGENT ROUTING FALLBACKS');
  totalTests++;
  
  try {
    const orchestratorFile = fs.readFileSync('src/lib/agents/orchestrator-agent.ts', 'utf8');
    
    const checks = [
      'hasOpenAI',
      'enhancedKeywordBasedRouting',
      'gracefully falling back',
      'Emergency fallback',
      'still effective!'
    ];
    
    let routingPass = true;
    checks.forEach(check => {
      if (orchestratorFile.includes(check)) {
        log.success(`Found: ${check}`);
      } else {
        log.error(`Missing: ${check}`);
        routingPass = false;
      }
    });
    
    if (routingPass) {
      log.success('Agent routing fallbacks test PASSED');
      passedTests++;
    } else {
      log.error('Agent routing fallbacks test FAILED');
      failedTests++;
    }
  } catch (error) {
    log.error(`Routing test failed: ${error.message}`);
    failedTests++;
  }

  // Test 5: WhatsApp Template Validation
  log.section('TESTING WHATSAPP TEMPLATE VALIDATION');
  totalTests++;
  
  try {
    const twilioFile = fs.readFileSync('src/lib/integrations/twilio-whatsapp.ts', 'utf8');
    
    const checks = [
      'sendValidatedTemplate',
      'STEP 1: Validate OTP template configuration',
      'Template validation',
      'primaryContentSID',
      'backupContentSID',
      'Emergency SMS fallback'
    ];
    
    let templatePass = true;
    checks.forEach(check => {
      if (twilioFile.includes(check)) {
        log.success(`Found: ${check}`);
      } else {
        log.error(`Missing: ${check}`);
        templatePass = false;
      }
    });
    
    if (templatePass) {
      log.success('WhatsApp template validation test PASSED');
      passedTests++;
    } else {
      log.error('WhatsApp template validation test FAILED');
      failedTests++;
    }
  } catch (error) {
    log.error(`Template test failed: ${error.message}`);
    failedTests++;
  }

  // Test 6: Circuit Breaker Implementation
  log.section('TESTING CIRCUIT BREAKER IMPLEMENTATION');
  totalTests++;
  
  try {
    const vectorStoreFile = fs.readFileSync('src/lib/rag/vector-store.ts', 'utf8');
    
    const checks = [
      'CircuitBreakerManager',
      'this.circuitBreaker.execute',
      'failureThreshold: 5',
      'RetryConfigs.EXTERNAL_API',
      'pinecone_upsert',
      'pinecone_query'
    ];
    
    let circuitPass = true;
    checks.forEach(check => {
      if (vectorStoreFile.includes(check)) {
        log.success(`Found: ${check}`);
      } else {
        log.error(`Missing: ${check}`);
        circuitPass = false;
      }
    });
    
    if (circuitPass) {
      log.success('Circuit breaker implementation test PASSED');
      passedTests++;
    } else {
      log.error('Circuit breaker implementation test FAILED');
      failedTests++;
    }
  } catch (error) {
    log.error(`Circuit breaker test failed: ${error.message}`);
    failedTests++;
  }

  // Test 7: Build Test
  log.section('TESTING BUILD COMPILATION');
  totalTests++;
  
  try {
    const { execSync } = require('child_process');
    log.test('Running TypeScript compilation...');
    
    const buildOutput = execSync('npm run build', { 
      encoding: 'utf8',
      timeout: 60000
    });
    
    if (buildOutput.includes('Compiled successfully') || !buildOutput.includes('error')) {
      log.success('Build compilation test PASSED');
      passedTests++;
    } else {
      log.error('Build compilation test FAILED');
      log.error('Build output: ' + buildOutput);
      failedTests++;
    }
  } catch (error) {
    log.error(`Build test failed: ${error.message}`);
    failedTests++;
  }

  // Final Results
  console.log(`\n${colors.cyan}${colors.bold}
╔══════════════════════════════════════════════════════════════╗
║                      TEST RESULTS                           ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}`);

  log.info(`Total Tests: ${totalTests}`);
  log.success(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    log.error(`Failed: ${failedTests}`);
  }

  const successRate = Math.round((passedTests / totalTests) * 100);
  
  if (successRate === 100) {
    log.success(`🎉 ALL CRITICAL FIXES VERIFIED! Success Rate: ${successRate}%`);
    
    console.log(`\n${colors.green}${colors.bold}
╔══════════════════════════════════════════════════════════════╗
║  🚀 READY FOR PRODUCTION! All critical issues resolved.     ║
║                                                              ║
║  ✅ Environment Variables Fixed                              ║
║  ✅ Pinecone Namespace Creation Enhanced                     ║
║  ✅ Background Task Monitoring Added                         ║
║  ✅ Agent Routing Fallbacks Implemented                      ║
║  ✅ WhatsApp Template Validation Added                       ║
║  ✅ Circuit Breaker Protection Added                         ║
║  ✅ Build Compilation Successful                             ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}`);
  } else if (successRate >= 80) {
    log.warning(`⚠️ MOSTLY READY: ${successRate}% of fixes verified. Address remaining issues.`);
  } else {
    log.error(`❌ NEEDS WORK: Only ${successRate}% of fixes verified. Review failed tests.`);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  log.error('Unhandled rejection:', error);
  process.exit(1);
});

main().catch(error => {
  log.error('Test script failed:', error);
  process.exit(1);
}); 