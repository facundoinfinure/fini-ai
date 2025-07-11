#!/usr/bin/env node

/**
 * 🔄 Sync Real Store Data to RAG
 * ==============================
 * 
 * Synchronizes real TiendaNube store data to Pinecone namespaces
 * using the fixed token manager and authentication system.
 */

require('dotenv').config({ path: '.env.local' });

async function syncRealStoreData() {
  try {
    console.log('[DEBUG] 🔄 Starting real store data synchronization...');
    
    const storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    console.log(`[DEBUG] 🏪 Syncing data for store: ${storeId}`);
    
    // Test token manager fix first
    console.log('[DEBUG] 🔍 Testing token manager with fixed RLS...');
    
    const { UniversalTokenManager } = await import('../src/lib/integrations/universal-token-manager.js');
    
    const storeData = await UniversalTokenManager.getValidStoreData(storeId);
    
    if (!storeData) {
      console.error('[DEBUG] ❌ Could not get valid store data - token manager still failing');
      console.error('[DEBUG] 💡 Check if createServiceClient() fix was applied correctly');
      return;
    }
    
    console.log('[DEBUG] ✅ Token manager fixed! Store data retrieved:', {
      storeId: storeData.storeId,
      storeName: storeData.storeName,
      hasToken: !!storeData.token,
      platformStoreId: storeData.platformStoreId
    });
    
    // Now sync the real data using the RAG engine
    console.log('[DEBUG] 🚀 Starting RAG data synchronization...');
    
    const { UnifiedFiniRAGEngine } = await import('../src/lib/rag/unified-rag-engine.js');
    
    const ragEngine = new UnifiedFiniRAGEngine();
    
    // Sync store data - this should now work with the fixed token manager
    console.log('[DEBUG] 📊 Syncing store information...');
    const storeResult = await ragEngine.indexStoreData(storeId);
    
    if (storeResult.success) {
      console.log('[DEBUG] ✅ Store data sync successful');
    } else {
      console.error('[DEBUG] ❌ Store data sync failed:', storeResult.error);
    }
    
    console.log('[DEBUG] 🎯 Synchronization process completed');
    
    // Verify the data was indexed correctly
    console.log('[DEBUG] 🔍 Verifying indexed data...');
    
    const { Pinecone } = await import('@pinecone-database/pinecone');
    
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'fini-ai-small';
    const index = pc.index(indexName);
    
    const stats = await index.describeIndexStats();
    
    console.log('[DEBUG] 📈 Final namespace stats:');
    Object.entries(stats.namespaces || {}).forEach(([namespace, data]) => {
      if (namespace.includes(storeId)) {
        console.log(`[DEBUG] 📊 ${namespace}: ${data.recordCount} records`);
      }
    });
    
    const totalRecords = Object.values(stats.namespaces || {}).reduce((sum, ns) => sum + (ns.recordCount || 0), 0);
    console.log(`[DEBUG] 🎉 Total records across all namespaces: ${totalRecords}`);
    
    if (totalRecords > 10) { // More than just placeholders
      console.log('[DEBUG] 🎉 SUCCESS: Real store data has been indexed!');
    } else {
      console.log('[DEBUG] ⚠️ Only placeholders detected - data sync may have failed');
    }
    
  } catch (error) {
    console.error('[DEBUG] ❌ Error during store data synchronization:', error);
    
    if (error.message && error.message.includes('JSON object requested, multiple')) {
      console.error('[DEBUG] 💡 RLS error detected - check if all components use createServiceClient()');
    }
  }
}

syncRealStoreData(); 