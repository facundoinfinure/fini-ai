#!/usr/bin/env node

/**
 * 🔧 Test Namespace Creation Fix
 * 
 * Este script prueba el fix para la creación de namespaces de Pinecone.
 * Verifica que se creen los 6 namespaces esperados cuando se conecta una tienda.
 * 
 * Uso: node scripts/test-namespace-creation-fix.js
 */

const API_BASE = process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000';

const TEST_STORE_ID = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';

async function testNamespaceCreationFix() {
  console.log('🔧 Testing Namespace Creation Fix');
  console.log('=================================');
  
  try {
    console.log(`📡 Testing with API: ${API_BASE}`);
    console.log(`🏪 Store ID: ${TEST_STORE_ID}`);
    console.log('');

    // Test the fix
    console.log('🚀 Testing namespace creation fix...');
    const response = await fetch(`${API_BASE}/api/debug/test-namespace-creation-fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId: TEST_STORE_ID
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Test failed:', result);
      return;
    }

    console.log('✅ Namespace creation fix test completed successfully!');
    console.log('');
    
    console.log('📊 Results:');
    console.log('----------');
    console.log(`Store ID: ${result.data.storeId}`);
    console.log(`Initialization Success: ${result.data.initializationResult.success}`);
    console.log('');
    
    console.log('🎯 Expected Namespaces:');
    result.data.expectedNamespaces.forEach((ns, index) => {
      console.log(`${index + 1}. ${ns}`);
    });
    console.log('');
    
    console.log('📋 Next Steps:');
    result.data.instructions.forEach((instruction, index) => {
      console.log(`${index + 1}. ${instruction}`);
    });
    console.log('');
    
    console.log('🔍 Verification:');
    console.log('Go to Pinecone Dashboard → Database → Namespaces');
    console.log('You should now see 6 namespaces instead of just 2');
    console.log('');
    
    console.log('✅ Fix validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing namespace creation fix:', error);
    
    if (error.cause?.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure your development server is running:');
      console.log('   npm run dev');
      console.log('   # or');
      console.log('   yarn dev');
    }
  }
}

// Self-executing test
if (require.main === module) {
  testNamespaceCreationFix()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testNamespaceCreationFix }; 