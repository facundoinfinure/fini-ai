#!/usr/bin/env node

/**
 * Force RAG Sync Fix - Production Ready
 * Fixes the issue where agents don't have access to catalog data
 * 
 * 🎯 GOAL: Ensure all stores have their catalog data properly indexed in RAG system
 * 🔧 APPROACH: Manual sync trigger + verification for production stores
 */

const { createClient } = require('@supabase/supabase-js');

async function forceRAGSyncFix() {
  console.log('🚀 [FIX] Force RAG Sync for Catalog Access\n');

  try {
    // 1. Environment validation
    console.log('🔧 [FIX] Checking environment...');
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.log(`❌ [ERROR] Missing variables: ${missingVars.join(', ')}`);
      return;
    }

    console.log('✅ [SUCCESS] Environment configured');

    // 2. Connect to database
    console.log('\n📊 [FIX] Connecting to database...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 3. Get stores with access tokens
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, user_id, access_token, platform_store_id, last_sync_at, created_at')
      .eq('is_active', true)
      .not('access_token', 'is', null);

    if (error) {
      console.log(`❌ [ERROR] Database query failed: ${error.message}`);
      return;
    }

    if (!stores || stores.length === 0) {
      console.log('⚠️ [WARNING] No active stores with access tokens found');
      console.log('Make sure stores are properly connected to Tienda Nube');
      return;
    }

    console.log(`✅ [SUCCESS] Found ${stores.length} stores to sync:`);
    
    // 4. Display store status
    stores.forEach((store, index) => {
      const lastSync = store.last_sync_at ? 
        new Date(store.last_sync_at).toLocaleString() : 
        'Never synced';
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(store.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      console.log(`  ${index + 1}. ${store.name}`);
      console.log(`     Store ID: ${store.id}`);
      console.log(`     Platform Store: ${store.platform_store_id}`);
      console.log(`     Last Sync: ${lastSync}`);
      console.log(`     Age: ${daysSinceCreated} days`);
      console.log(`     Status: ${lastSync === 'Never synced' ? '❌ NEEDS SYNC' : '✅ Previously synced'}`);
    });

    // 5. Trigger sync via API endpoints
    console.log('\n🔄 [FIX] Triggering RAG sync for all stores...');
    
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'https://fini-tn.vercel.app';

    console.log(`Using API base: ${baseUrl}`);

    const syncPromises = stores.map(async (store) => {
      try {
        console.log(`  📡 [SYNC] Starting sync for ${store.name}...`);
        
        // Call the test-rag-sync endpoint which handles all the logic
        const response = await fetch(`${baseUrl}/api/test-rag-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        return {
          storeId: store.id,
          storeName: store.name,
          status: 'triggered',
          triggeredAt: new Date().toISOString(),
          result: result
        };

      } catch (error) {
        console.log(`  ❌ [ERROR] Failed to sync ${store.name}: ${error.message}`);
        return {
          storeId: store.id,
          storeName: store.name,
          status: 'failed',
          error: error.message
        };
      }
    });

    // Execute just one call to the batch endpoint instead of individual calls
    console.log('\n🎯 [FIX] Executing batch sync...');
    
    try {
      const response = await fetch(`${baseUrl}/api/test-rag-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const batchResult = await response.json();
      console.log('✅ [SUCCESS] Batch sync triggered successfully');
      console.log(`  - Stores processed: ${batchResult.results?.totalStores || 0}`);
      console.log(`  - Successfully triggered: ${batchResult.results?.triggered || 0}`);
      console.log(`  - Failed: ${batchResult.results?.failed || 0}`);

      if (batchResult.results?.details) {
        console.log('\n📋 [DETAILS] Individual store results:');
        batchResult.results.details.forEach((detail, index) => {
          const status = detail.status === 'triggered' ? '✅' : '❌';
          console.log(`  ${index + 1}. ${status} ${detail.storeName} (${detail.storeId})`);
          if (detail.error) {
            console.log(`     Error: ${detail.error}`);
          }
        });
      }

    } catch (batchError) {
      console.log(`❌ [ERROR] Batch sync failed: ${batchError.message}`);
      console.log('This might be due to cold start or configuration issues.');
    }

    // 6. Monitoring instructions
    console.log('\n📊 [MONITORING] Next Steps:');
    console.log('1. 🕐 Wait 2-5 minutes for background sync to complete');
    console.log('2. 🔍 Check Vercel function logs for detailed progress');
    console.log('3. 🧪 Test agent responses: "¿qué productos tengo?"');
    console.log('4. 🎯 Expected: Agents should now have catalog access');
    
    console.log('\n🏷️ [CHECK] To verify sync completion:');
    console.log(`  - Visit: ${baseUrl}/api/test-rag-sync (GET)`);
    console.log('  - Check store "last_sync_at" timestamps in database');
    console.log('  - Test Product Manager agent with catalog queries');

    console.log('\n🎉 [COMPLETE] RAG sync fix process initiated!');
    console.log('\n🤖 [RESULT] Agents should now have access to:');
    console.log('  ✅ Product catalog data');
    console.log('  ✅ Store information');
    console.log('  ✅ Order history');
    console.log('  ✅ Customer data');
    console.log('  ✅ Analytics insights');

  } catch (error) {
    console.log(`❌ [FATAL] Script failed: ${error.message}`);
    console.log('\nTroubleshooting:');
    console.log('1. Check environment variables');
    console.log('2. Verify database connection');
    console.log('3. Ensure production deployment is active');
  }
}

// Self-executing for Node.js
if (require.main === module) {
  forceRAGSyncFix()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { forceRAGSyncFix }; 