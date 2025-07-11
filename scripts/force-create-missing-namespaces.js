#!/usr/bin/env node

/**
 * 🔧 Force Create Missing Namespaces
 * ===================================
 * 
 * Creates the missing 4 namespaces by directly inserting placeholder documents
 */

require('dotenv').config({ path: '.env.local' });

async function forceCreateMissingNamespaces() {
  try {
    console.log('[DEBUG] 🔧 Force creating missing namespaces...');
    
    const storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    // Missing namespaces that need to be created
    const missingNamespaces = [
      { type: 'product', namespace: `store-${storeId}-products` },
      { type: 'order', namespace: `store-${storeId}-orders` },
      { type: 'customer', namespace: `store-${storeId}-customers` },
      { type: 'conversation', namespace: `store-${storeId}-conversations` }
    ];
    
    console.log(`[DEBUG] Creating ${missingNamespaces.length} missing namespaces...`);
    
    // Initialize Pinecone directly
    const { Pinecone } = await import('@pinecone-database/pinecone');
    
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'fini-ai-small';
    const index = pc.index(indexName);
    
    // Create placeholder vector (1536 dimensions of small random values)
    const createPlaceholderVector = () => {
      return Array.from({ length: 1536 }, () => Math.random() * 0.01 - 0.005);
    };
    
    console.log('[DEBUG] 🚀 Creating missing namespaces...');
    
    for (const { type, namespace } of missingNamespaces) {
      try {
        console.log(`[DEBUG] 📝 Creating namespace: ${namespace}`);
        
        const placeholderId = `placeholder-${storeId}-${type}`;
        const placeholderVector = createPlaceholderVector();
        
        // Create the namespace by upserting a placeholder document
        await index.namespace(namespace).upsert([{
          id: placeholderId,
          values: placeholderVector,
          metadata: {
            storeId: storeId,
            type: type,
            source: 'initialization',
            isPlaceholder: true,
            content: `Namespace initialized for store ${storeId}, type: ${type}`,
            timestamp: new Date().toISOString(),
            documentId: placeholderId
          }
        }]);
        
        console.log(`[DEBUG] ✅ Created namespace: ${namespace}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[DEBUG] ❌ Failed to create namespace ${namespace}:`, error.message);
      }
    }
    
    console.log('[DEBUG] ⏳ Waiting for Pinecone to sync...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify all namespaces were created
    console.log('[DEBUG] 🔍 Verifying namespace creation...');
    const stats = await index.describeIndexStats();
    const existingNamespaces = Object.keys(stats.namespaces || {});
    
    console.log(`[DEBUG] 📊 Current namespaces (${existingNamespaces.length}):`);
    existingNamespaces.forEach((ns, i) => {
      const recordCount = stats.namespaces[ns]?.recordCount || 0;
      console.log(`[DEBUG] ${i + 1}. ${ns} (${recordCount} records)`);
    });
    
    // Check success rate
    const allExpectedNamespaces = [
      `store-${storeId}`,
      `store-${storeId}-products`,
      `store-${storeId}-orders`, 
      `store-${storeId}-customers`,
      `store-${storeId}-analytics`,
      `store-${storeId}-conversations`
    ];
    
    const foundCount = allExpectedNamespaces.filter(ns => existingNamespaces.includes(ns)).length;
    
    console.log(`[DEBUG] 🎯 Final Result: ${foundCount}/${allExpectedNamespaces.length} namespaces exist`);
    
    if (foundCount === allExpectedNamespaces.length) {
      console.log(`[DEBUG] 🎉 SUCCESS: All 6 namespaces are now created!`);
    } else {
      console.log(`[DEBUG] ⚠️ Still missing ${allExpectedNamespaces.length - foundCount} namespaces`);
      
      const stillMissing = allExpectedNamespaces.filter(ns => !existingNamespaces.includes(ns));
      stillMissing.forEach(ns => {
        console.log(`[DEBUG] ❌ Missing: ${ns}`);
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] ❌ Error force creating namespaces:', error);
  }
}

forceCreateMissingNamespaces(); 