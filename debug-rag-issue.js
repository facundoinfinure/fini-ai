/**
 * Debug RAG Issue - Diagnose why product data isn't being retrieved
 * Run with: node debug-rag-issue.js
 */

const storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
const baseUrl = 'https://fini-tn.vercel.app';

async function debugRAGIssue() {
  console.log('🔍 Debugging RAG issue for store:', storeId);
  
  try {
    // Test 1: Check if RAG has data for this store
    console.log('\n1. Testing RAG context retrieval...');
    
    const ragTestResponse = await fetch(`${baseUrl}/api/debug/rag-context-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'que producto es el mas caro',
        storeId: storeId
      })
    });
    
    const ragTestResult = await ragTestResponse.json();
    console.log('RAG Context Test Result:', JSON.stringify(ragTestResult, null, 2));
    
    if (ragTestResult.success && ragTestResult.ragContext?.hasContext) {
      console.log('✅ RAG has context data');
      console.log('Context length:', ragTestResult.ragContext.contextLength);
      console.log('Contains product data:', ragTestResult.ragContext.containsProductData);
      
      if (ragTestResult.ragContext.content) {
        console.log('Sample content:', ragTestResult.ragContext.content.substring(0, 300) + '...');
      }
    } else {
      console.log('❌ RAG has no context data');
      
      // Test 2: Check store data and trigger sync
      console.log('\n2. Checking store data and triggering sync...');
      
      const syncResponse = await fetch(`${baseUrl}/api/debug/sync-store-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: storeId
        })
      });
      
      const syncResult = await syncResponse.json();
      console.log('Sync Result:', JSON.stringify(syncResult, null, 2));
    }
    
    // Test 3: Test the enhanced agent system
    console.log('\n3. Testing enhanced agent system...');
    
    const agentTestResponse = await fetch(`${baseUrl}/api/debug/test-intelligent-routing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'que producto es el mas caro de mi tienda',
        storeId: storeId
      })
    });
    
    const agentTestResult = await agentTestResponse.json();
    console.log('Agent Test Result:', JSON.stringify(agentTestResult, null, 2));
    
    // Test 4: Check if store has products via API
    console.log('\n4. Checking store API connectivity...');
    
    const forceDataResponse = await fetch(`${baseUrl}/api/debug/force-rag-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId: storeId
      })
    });
    
    const forceDataResult = await forceDataResponse.json();
    console.log('Force Data Sync Result:', JSON.stringify(forceDataResult, null, 2));
    
    // Summary
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('==================');
    
    if (ragTestResult.success && ragTestResult.ragContext?.hasContext) {
      console.log('✅ RAG System: Working');
      console.log('✅ Store Data: Available');
      console.log('🔧 Issue: Agent routing or response generation');
      console.log('💡 Solution: The data is there, but the agent needs to be fixed to use it properly');
    } else {
      console.log('❌ RAG System: No data available');
      console.log('🔧 Issue: Data sync or indexing problem');
      console.log('💡 Solution: Need to sync store data to RAG first');
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

// Run the debug
debugRAGIssue(); 