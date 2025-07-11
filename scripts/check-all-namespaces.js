#!/usr/bin/env node

/**
 * 🔍 Check All Pinecone Namespaces
 * =================================
 * 
 * Verifies all 6 namespaces are properly created for the store
 */

require('dotenv').config({ path: '.env.local' });

async function checkAllNamespaces() {
  try {
    console.log('[DEBUG] 🔍 Checking all Pinecone namespaces...');
    
    const storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    // Expected namespaces
    const expectedNamespaces = [
      `store-${storeId}`,
      `store-${storeId}-products`, 
      `store-${storeId}-orders`,
      `store-${storeId}-customers`,
      `store-${storeId}-analytics`,
      `store-${storeId}-conversations`
    ];
    
    console.log(`[DEBUG] Expected ${expectedNamespaces.length} namespaces for store: ${storeId}`);
    expectedNamespaces.forEach((ns, i) => {
      console.log(`[DEBUG] ${i + 1}. ${ns}`);
    });
    
    // Initialize Pinecone
    const { Pinecone } = await import('@pinecone-database/pinecone');
    
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'fini-ai-small';
    const index = pc.index(indexName);
    
    console.log(`[DEBUG] 📊 Checking namespaces in index: ${indexName}`);
    
    // Get index stats to see all namespaces
    const stats = await index.describeIndexStats();
    console.log(`[DEBUG] 📈 Index stats:`, JSON.stringify(stats, null, 2));
    
    const existingNamespaces = Object.keys(stats.namespaces || {});
    console.log(`[DEBUG] 🔍 Found ${existingNamespaces.length} namespaces in Pinecone:`);
    
    existingNamespaces.forEach((ns, i) => {
      const vectorCount = stats.namespaces[ns]?.vectorCount || 0;
      console.log(`[DEBUG] ${i + 1}. ${ns} (${vectorCount} vectors)`);
    });
    
    // Check each expected namespace
    console.log(`[DEBUG] ✅ Verification Results:`);
    let foundCount = 0;
    
    for (const expectedNs of expectedNamespaces) {
      const exists = existingNamespaces.includes(expectedNs);
      const vectorCount = exists ? stats.namespaces[expectedNs]?.vectorCount || 0 : 0;
      
      if (exists) {
        console.log(`[DEBUG] ✅ ${expectedNs} - EXISTS (${vectorCount} vectors)`);
        foundCount++;
      } else {
        console.log(`[DEBUG] ❌ ${expectedNs} - MISSING`);
      }
    }
    
    console.log(`[DEBUG] 🎯 Summary: ${foundCount}/${expectedNamespaces.length} namespaces found`);
    
    if (foundCount === expectedNamespaces.length) {
      console.log(`[DEBUG] 🎉 SUCCESS: All namespaces are properly created!`);
    } else {
      console.log(`[DEBUG] ⚠️ INCOMPLETE: Missing ${expectedNamespaces.length - foundCount} namespaces`);
      
      // Try to query individual namespaces to see if they exist but are empty
      console.log(`[DEBUG] 🔍 Checking for empty namespaces...`);
      
      for (const expectedNs of expectedNamespaces) {
        if (!existingNamespaces.includes(expectedNs)) {
          try {
            const queryResult = await index.namespace(expectedNs).query({
              vector: new Array(1536).fill(0),
              topK: 1,
              includeMetadata: true
            });
            
            console.log(`[DEBUG] 📋 ${expectedNs} query result:`, {
              matches: queryResult.matches?.length || 0,
              exists: queryResult.matches?.length > 0
            });
            
          } catch (error) {
            console.log(`[DEBUG] ❌ ${expectedNs} query failed:`, error.message);
          }
        }
      }
    }
    
    // Also check for any extra namespaces that shouldn't be there
    const extraNamespaces = existingNamespaces.filter(ns => 
      !expectedNamespaces.includes(ns) && ns.includes(storeId)
    );
    
    if (extraNamespaces.length > 0) {
      console.log(`[DEBUG] 🚨 Found ${extraNamespaces.length} unexpected namespaces:`);
      extraNamespaces.forEach(ns => {
        const vectorCount = stats.namespaces[ns]?.vectorCount || 0;
        console.log(`[DEBUG] 🚨 ${ns} (${vectorCount} vectors)`);
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] ❌ Error checking namespaces:', error);
  }
}

checkAllNamespaces(); 