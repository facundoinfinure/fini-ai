/**
 * Debug Full Pipeline - Comprehensive RAG system diagnosis
 * Tests: TiendaNube API → Database → RAG Engine → LangChain → Agent Response
 */

const storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
const baseUrl = 'https://fini-tn.vercel.app';

async function debugFullPipeline() {
  console.log('🔍 Debugging FULL RAG Pipeline for store:', storeId);
  console.log('=====================================\n');
  
  try {
    // ==========================================
    // STEP 1: Check Database Store Connection
    // ==========================================
    console.log('1️⃣ CHECKING DATABASE & STORE CONNECTION...');
    
    const storeResponse = await fetch(`${baseUrl}/api/debug/stores`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const storeResult = await storeResponse.json();
    console.log('Store Database Status:', JSON.stringify(storeResult, null, 2));
    
    // ==========================================
    // STEP 2: Test TiendaNube API Connection
    // ==========================================
    console.log('\n2️⃣ TESTING TIENDANUBE API CONNECTION...');
    
    const tnTestResponse = await fetch(`${baseUrl}/api/tiendanube/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId })
    });
    
    const tnTestResult = await tnTestResponse.json();
    console.log('TiendaNube API Test:', JSON.stringify(tnTestResult, null, 2));
    
    // ==========================================
    // STEP 3: Force RAG Data Sync
    // ==========================================
    console.log('\n3️⃣ FORCING RAG DATA SYNC...');
    
    const ragSyncResponse = await fetch(`${baseUrl}/api/stores/${storeId}/sync-rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });
    
    const ragSyncResult = await ragSyncResponse.json();
    console.log('RAG Sync Result:', JSON.stringify(ragSyncResult, null, 2));
    
    // Wait for sync to complete
    console.log('⏳ Waiting 10 seconds for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // ==========================================
    // STEP 4: Test LangChain Enhanced RAG
    // ==========================================
    console.log('\n4️⃣ TESTING LANGCHAIN ENHANCED RAG...');
    
    const langchainTestResponse = await fetch(`${baseUrl}/api/debug/test-langchain-rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        query: 'que producto es el mas caro de mi tienda',
        agentType: 'product_manager',
        testType: 'enhanced'
      })
    });
    
    const langchainTestResult = await langchainTestResponse.json();
    console.log('LangChain RAG Test:', JSON.stringify(langchainTestResult, null, 2));
    
    // ==========================================
    // STEP 5: Test Agent System
    // ==========================================
    console.log('\n5️⃣ TESTING COMPLETE AGENT SYSTEM...');
    
    const agentResponse = await fetch(`${baseUrl}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'cual es el producto mas caro de mi tienda',
        conversationId: 'debug-conversation',
        storeId
      })
    });
    
    const agentResult = await agentResponse.json();
    console.log('Complete Agent Response:', JSON.stringify(agentResult, null, 2));
    
    // ==========================================
    // STEP 6: Check Vector Store Data
    // ==========================================
    console.log('\n6️⃣ CHECKING VECTOR STORE DATA...');
    
    const vectorStoreResponse = await fetch(`${baseUrl}/api/debug/rag-diagnosis?storeId=${storeId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const vectorStoreResult = await vectorStoreResponse.json();
    console.log('Vector Store Diagnosis:', JSON.stringify(vectorStoreResult, null, 2));
    
    // ==========================================
    // ANALYSIS & DIAGNOSIS
    // ==========================================
    console.log('\n📋 COMPREHENSIVE DIAGNOSIS:');
    console.log('============================');
    
    // Check each component
    const hasValidStore = storeResult.success && storeResult.data?.stores?.length > 0;
    const hasValidTNConnection = tnTestResult.success;
    const ragSyncSuccess = ragSyncResult.success;
    const langchainWorking = langchainTestResult.enhanced?.success;
    const agentWorking = agentResult.success;
    const vectorStoreHealthy = vectorStoreResult.success && vectorStoreResult.diagnosis?.overallHealth?.status === 'HEALTHY';
    
    console.log('✅ Database & Store Connection:', hasValidStore ? 'WORKING' : '❌ FAILED');
    console.log('✅ TiendaNube API Connection:', hasValidTNConnection ? 'WORKING' : '❌ FAILED');
    console.log('✅ RAG Data Sync:', ragSyncSuccess ? 'WORKING' : '❌ FAILED');
    console.log('✅ LangChain Enhanced RAG:', langchainWorking ? 'WORKING' : '❌ FAILED');
    console.log('✅ Agent System:', agentWorking ? 'WORKING' : '❌ FAILED');
    console.log('✅ Vector Store Health:', vectorStoreHealthy ? 'WORKING' : '❌ FAILED');
    
    // Identify the problem
    console.log('\n🎯 ROOT CAUSE ANALYSIS:');
    if (!hasValidStore) {
      console.log('❌ CRITICAL: Store not found in database');
    } else if (!hasValidTNConnection) {
      console.log('❌ CRITICAL: Cannot connect to TiendaNube API - token issue');
    } else if (!ragSyncSuccess) {
      console.log('❌ CRITICAL: RAG sync failing - data not being indexed');
    } else if (!langchainWorking) {
      console.log('❌ CRITICAL: LangChain RAG system not working');
    } else if (!vectorStoreHealthy) {
      console.log('❌ CRITICAL: Vector store has no data or is unhealthy');
    } else if (!agentWorking) {
      console.log('❌ CRITICAL: Agent system failing to process requests');
    } else {
      console.log('🤔 MYSTERIOUS: All components seem to work but agent responses are generic');
      console.log('💡 LIKELY CAUSE: Agent not using RAG data properly or data quality issue');
    }
    
    // Show specific data samples if available
    if (langchainTestResult.enhanced?.sources?.length > 0) {
      console.log('\n📦 SAMPLE PRODUCT DATA FOUND:');
      langchainTestResult.enhanced.sources.forEach((source, i) => {
        console.log(`${i + 1}. ${source.contentPreview}`);
      });
    } else {
      console.log('\n📦 NO PRODUCT DATA FOUND IN RAG');
    }
    
  } catch (error) {
    console.error('❌ Full pipeline debug failed:', error);
  }
}

// Run the comprehensive diagnosis
debugFullPipeline(); 