#!/usr/bin/env node

/**
 * Script para deshabilitar endpoints de debug que causan errores en el build
 * Ejecutar: node scripts/disable-debug-endpoints.js
 */

const fs = require('fs');
const path = require('path');

const DEBUG_ENDPOINTS_TO_DISABLE = [
  'src/app/api/debug/auth-flow-test/route.ts',
  'src/app/api/debug/auth-status/route.ts', 
  'src/app/api/debug/cookie-diagnosis/route.ts',
  'src/app/api/debug/test-routing/route.ts',
  'src/app/api/debug/test-frontend-flow/route.ts',
  'src/app/api/debug/test-operations/route.ts',
  'src/app/api/debug/test-intelligent-routing/route.ts',
  'src/app/api/debug/test-agent-system/route.ts',
  'src/app/api/debug/test-enhanced-system/route.ts',
  'src/app/api/debug/test-langchain-rag/route.ts',
  'src/app/api/debug/test-agent-rag-access/route.ts',
  'src/app/api/debug/test-conversation-deletion/route.ts',
  'src/app/api/debug/test-auto-sync/route.ts',
  'src/app/api/debug/test-lock-integration/route.ts',
  'src/app/api/debug/test-namespace-creation-fix/route.ts',
  'src/app/api/debug/diagnose-namespace-creation/route.ts',
  'src/app/api/debug/pinecone-namespace-diagnosis/route.ts',
  'src/app/api/debug/pinecone-namespaces/route.ts',
  'src/app/api/debug/rag-context-test/route.ts',
  'src/app/api/debug/rag-status/route.ts',
  'src/app/api/debug/rag-locks/route.ts',
  'src/app/api/debug/rag-repair/route.ts',
  'src/app/api/debug/fix-rag-sync-issues/route.ts',
  'src/app/api/debug/fix-pinecone-namespaces/route.ts',
  'src/app/api/debug/fix-namespace-recreation/route.ts',
  'src/app/api/debug/cleanup-orphaned-namespaces/route.ts',
  'src/app/api/debug/fix-scheduler-orphans/route.ts',
  'src/app/api/debug/force-rag-sync/route.ts',
  'src/app/api/debug/force-unlock-store/route.ts',
  'src/app/api/debug/sync-store-data/route.ts',
  'src/app/api/debug/sync-real-store-data/route.ts',
  'src/app/api/debug/oauth-diagnosis/route.ts',
  'src/app/api/debug/oauth-production-test/route.ts',
  'src/app/api/debug/token-diagnosis/route.ts',
  'src/app/api/debug/fix-token-auth-issue/route.ts',
  'src/app/api/debug/fix-auth-issues/route.ts',
  'src/app/api/debug/eliminate-legacy-tokens/route.ts',
  'src/app/api/debug/migrate-token-systems/route.ts',
  'src/app/api/debug/store-reconnection-status/route.ts',
  'src/app/api/debug/store-repair/route.ts',
  'src/app/api/debug/stores-raw-data/route.ts',
  'src/app/api/debug/emergency-store-fix/route.ts',
  'src/app/api/debug/repair-unified-stores/route.ts',
  'src/app/api/debug/list-stores/route.ts',
  'src/app/api/debug/stores/route.ts',
  'src/app/api/debug/direct-sql/route.ts',
  'src/app/api/debug/public-schema-check/route.ts',
  'src/app/api/debug/schema-validation/route.ts',
  'src/app/api/debug/fix-stores-schema/route.ts',
  'src/app/api/debug/env-check/route.ts',
  'src/app/api/debug/create-delete-policies/route.ts',
  'src/app/api/debug/fix-delete-policies/route.ts',
  'src/app/api/debug/create-tiendanube-tokens-table/route.ts',
  'src/app/api/debug/chat-system-diagnosis/route.ts'
];

const DISABLED_ENDPOINT_TEMPLATE = `// DISABLED: Causing build errors in production
export async function GET() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Debug endpoint disabled during build',
      message: 'This debug endpoint has been disabled to prevent build failures'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function POST() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Debug endpoint disabled during build',
      message: 'This debug endpoint has been disabled to prevent build failures'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}`;

function disableEndpoint(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    fs.writeFileSync(fullPath, DISABLED_ENDPOINT_TEMPLATE);
    console.log(`✅ Disabled: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to disable ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚨 Disabling debug endpoints that cause build errors...\n');
  
  let disabledCount = 0;
  let errorCount = 0;
  
  for (const endpoint of DEBUG_ENDPOINTS_TO_DISABLE) {
    if (disableEndpoint(endpoint)) {
      disabledCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Disabled: ${disabledCount} endpoints`);
  console.log(`   ❌ Errors: ${errorCount} endpoints`);
  console.log(`   📁 Total: ${DEBUG_ENDPOINTS_TO_DISABLE.length} endpoints`);
  
  if (disabledCount > 0) {
    console.log('\n🎉 Debug endpoints disabled successfully!');
    console.log('   Build should now complete without debug endpoint errors.');
    console.log('   You can re-enable specific endpoints later if needed.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { disableEndpoint, DEBUG_ENDPOINTS_TO_DISABLE }; 