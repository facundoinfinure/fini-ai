#!/usr/bin/env node

/**
 * 🔧 MANUAL PINECONE NAMESPACE FIX SCRIPT
 * =======================================
 * 
 * This script can be run manually to diagnose and fix Pinecone namespace issues.
 * Use this when you need to fix the sync between Tienda Nube, Supabase, and Pinecone.
 * 
 * Usage:
 * - node scripts/fix-pinecone-namespaces.js
 * - node scripts/fix-pinecone-namespaces.js --store-id=<storeId>
 * - node scripts/fix-pinecone-namespaces.js --user-id=<userId>
 */

const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🔧 [SCRIPT] Starting Pinecone namespace fix...');
  
  // Debug environment variables
  console.log(`🔍 [SCRIPT] Environment check:`);
  console.log(`  - SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing'}`);
  console.log(`  - SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'}`);
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ [SCRIPT] Missing required environment variables');
    console.error('Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  const storeIdFlag = args.find(arg => arg.startsWith('--store-id='));
  const userIdFlag = args.find(arg => arg.startsWith('--user-id='));
  
  const targetStoreId = storeIdFlag ? storeIdFlag.split('=')[1] : null;
  const targetUserId = userIdFlag ? userIdFlag.split('=')[1] : null;

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
  );

  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ [SCRIPT] Supabase connection failed:', testError.message);
      process.exit(1);
    }
    
    console.log('✅ [SCRIPT] Supabase connection successful');

    // Get stores to fix
    let stores;
    if (targetStoreId) {
      console.log(`🎯 [SCRIPT] Fixing specific store: ${targetStoreId}`);
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', targetStoreId)
        .single();
        
      if (error || !store) {
        console.error(`❌ [SCRIPT] Store not found: ${targetStoreId}`, error);
        process.exit(1);
      }
      
      stores = [store];
    } else if (targetUserId) {
      console.log(`👤 [SCRIPT] Fixing stores for user: ${targetUserId}`);
      const { data: userStores, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('platform', 'tiendanube')
        .eq('is_active', true);
        
      if (error) {
        console.error(`❌ [SCRIPT] Failed to fetch user stores: ${error.message}`);
        process.exit(1);
      }
      
      stores = userStores || [];
    } else {
      console.log(`🌍 [SCRIPT] Fixing all active stores...`);
      const { data: allStores, error } = await supabase
        .from('stores')
        .select('*')
        .eq('platform', 'tiendanube')
        .eq('is_active', true)
        .limit(10); // Limit to first 10 stores for safety
        
      if (error) {
        console.error(`❌ [SCRIPT] Failed to fetch stores: ${error.message}`);
        process.exit(1);
      }
      
      stores = allStores || [];
    }

    if (stores.length === 0) {
      console.log('ℹ️ [SCRIPT] No stores found to fix');
      process.exit(0);
    }

    console.log(`🏪 [SCRIPT] Found ${stores.length} store(s) to fix`);

    // Since we can't easily import ES modules, let's create a simpler approach
    // We'll manually trigger the API endpoints we created instead
    const results = [];

    for (const store of stores) {
      const storeResult = {
        storeId: store.id,
        storeName: store.name,
        success: false,
        operations: [],
        error: null
      };

      try {
        console.log(`\n🏪 [SCRIPT] Processing store: ${store.name} (${store.id})`);
        
        // For now, let's just update the store timestamp to trigger a sync
        console.log(`🔄 [SCRIPT] Updating store sync timestamp to trigger namespace creation...`);
        
        const { error: updateError } = await supabase
          .from('stores')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', store.id);

        if (updateError) {
          throw new Error(`Failed to update store: ${updateError.message}`);
        }

        storeResult.operations.push('✅ Store timestamp updated');
        storeResult.operations.push('ℹ️ Manual namespace initialization needed via API endpoint');
        storeResult.success = true;
        
        console.log(`✅ [SCRIPT] Store ${store.name} prepared for namespace creation`);
        console.log(`💡 [SCRIPT] To complete the fix, run: curl -X POST /api/debug/fix-pinecone-namespaces -d '{"storeId":"${store.id}"}'`);

      } catch (error) {
        storeResult.error = error.message;
        console.error(`❌ [SCRIPT] Error processing ${store.name}:`, error);
      }

      results.push(storeResult);
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`\n🎉 [SCRIPT] Fix preparation completed!`);
    console.log(`✅ Prepared: ${successCount} stores`);
    console.log(`❌ Failed: ${failureCount} stores`);

    if (successCount > 0) {
      console.log(`\n📋 Next Steps:`);
      console.log(`1. Start your development server: npm run dev`);
      console.log(`2. Run the debug endpoint to complete namespace creation:`);
      console.log(`   curl -X POST http://localhost:3000/api/debug/fix-pinecone-namespaces -H "Content-Type: application/json" -d '{}'`);
    }

    if (failureCount > 0) {
      console.log('\n❌ Failed stores:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.storeName} (${r.storeId}): ${r.error}`);
      });
    }

    console.log('\n📋 Full results:');
    results.forEach(r => {
      console.log(`\n🏪 ${r.storeName} (${r.storeId}):`);
      console.log(`   Status: ${r.success ? '✅ PREPARED' : '❌ FAILED'}`);
      if (r.error) console.log(`   Error: ${r.error}`);
      console.log(`   Operations: ${r.operations.join(', ')}`);
    });

    console.log(`\n🔗 [SCRIPT] For production, use the API endpoint with proper authentication.`);

  } catch (error) {
    console.error('❌ [SCRIPT] Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ [SCRIPT] Unhandled error:', error);
  process.exit(1);
}); 