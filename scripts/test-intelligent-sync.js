#!/usr/bin/env node

/**
 * Test Intelligent Sync System
 * 🎯 OBJETIVO: Verificar que el nuevo sistema de sincronización automática funcione correctamente
 * 
 * ✅ TESTS:
 * 1. Verificar endpoint sync-status
 * 2. Probar sincronización automática
 * 3. Verificar que los agentes tengan acceso a datos
 * 4. Confirmar que "que productos tengo" funcione
 */

const { createClient } = require('@supabase/supabase-js');

async function testIntelligentSync() {
  console.log('🧪 [TEST] INTELLIGENT SYNC SYSTEM\n');

  try {
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'https://fini-tn.vercel.app';

    console.log(`🌐 [TEST] Using base URL: ${baseUrl}\n`);

    // 1. Test sync status endpoint
    console.log('📊 [TEST] 1. Testing sync status endpoint...');
    try {
      const syncStatusResponse = await fetch(`${baseUrl}/api/stores/sync-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (syncStatusResponse.ok) {
        const syncData = await syncStatusResponse.json();
        console.log('✅ [SUCCESS] Sync status endpoint working');
        console.log(`   - Summary: ${JSON.stringify(syncData.data?.summary || {})}`);
        
        if (syncData.data?.stores) {
          console.log(`   - Stores analyzed: ${syncData.data.stores.length}`);
          syncData.data.stores.forEach((store, index) => {
            console.log(`     ${index + 1}. ${store.storeName}: ${store.status} (needs sync: ${store.needsSync})`);
          });
        }
      } else {
        console.log(`⚠️ [WARNING] Sync status endpoint returned: ${syncStatusResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ [ERROR] Sync status test failed: ${error.message}`);
    }

    console.log('\n');

    // 2. Test intelligent sync trigger
    console.log('🚀 [TEST] 2. Testing intelligent sync trigger...');
    try {
      const triggerResponse = await fetch(`${baseUrl}/api/stores/sync-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceSync: false })
      });

      if (triggerResponse.ok) {
        const triggerData = await triggerResponse.json();
        console.log('✅ [SUCCESS] Intelligent sync trigger working');
        console.log(`   - Triggered: ${triggerData.data?.triggered || 0} stores`);
        console.log(`   - Skipped: ${triggerData.data?.skipped || 0} stores`);
        console.log(`   - Failed: ${triggerData.data?.failed || 0} stores`);
        
        if (triggerData.data?.results) {
          triggerData.data.results.forEach((result, index) => {
            console.log(`     ${index + 1}. ${result.storeName}: ${result.status} ${result.reason ? `(${result.reason})` : ''}`);
          });
        }
      } else {
        console.log(`⚠️ [WARNING] Sync trigger returned: ${triggerResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ [ERROR] Sync trigger test failed: ${error.message}`);
    }

    console.log('\n');

    // 3. Test agent response after sync
    console.log('🤖 [TEST] 3. Testing agent responses after sync...');
    const testQueries = [
      'que productos tengo',
      'cuales son mis productos',
      'mostrame mi catalogo',
      'que productos tengo en stock'
    ];

    for (const query of testQueries) {
      try {
        console.log(`   Testing query: "${query}"`);
        const chatResponse = await fetch(`${baseUrl}/api/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: query,
            conversationId: 'test-conversation'
          })
        });

        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          if (chatData.success) {
            const response = chatData.data?.response || '';
            const hasProductData = !response.includes('No se encontraron productos') && 
                                  !response.includes('Tienda Vacía') &&
                                  !response.includes('No encuentro productos');
            
            console.log(`     ${hasProductData ? '✅' : '❌'} Response: ${response.substring(0, 100)}...`);
            console.log(`     Agent: ${chatData.data?.agentType || 'unknown'}`);
            console.log(`     Confidence: ${chatData.data?.confidence || 0}`);
          } else {
            console.log(`     ❌ Chat API error: ${chatData.error}`);
          }
        } else {
          console.log(`     ⚠️ Chat API returned: ${chatResponse.status}`);
        }
      } catch (error) {
        console.log(`     ❌ Query test failed: ${error.message}`);
      }
    }

    console.log('\n');

    // 4. Database verification
    console.log('🗄️ [TEST] 4. Verifying database sync timestamps...');
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: stores, error } = await supabase
        .from('stores')
        .select('id, name, last_sync_at, access_token, is_active')
        .eq('is_active', true);

      if (error) {
        console.log(`❌ [ERROR] Database query failed: ${error.message}`);
      } else {
        console.log(`✅ [SUCCESS] Database connection working`);
        console.log(`   - Active stores: ${stores?.length || 0}`);
        
        if (stores && stores.length > 0) {
          stores.forEach((store, index) => {
            const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
            const hasToken = !!store.access_token;
            const syncAge = lastSync ? 
              Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60)) : 
              null;
            
            console.log(`     ${index + 1}. ${store.name}`);
            console.log(`        Access Token: ${hasToken ? '✅' : '❌'}`);
            console.log(`        Last Sync: ${lastSync ? lastSync.toLocaleString() : 'Never'}`);
            console.log(`        Sync Age: ${syncAge ? `${syncAge} hours` : 'N/A'}`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ [ERROR] Database verification failed: ${error.message}`);
    }

    console.log('\n');

    // 5. Summary and recommendations
    console.log('📋 [SUMMARY] Test Results:\n');
    console.log('🎯 [EXPECTED BEHAVIOR]:');
    console.log('   ✅ Users logging into dashboard → Auto sync triggered');
    console.log('   ✅ Users navigating to chat → Auto sync triggered');
    console.log('   ✅ Users creating new conversation → Fresh data check');
    console.log('   ✅ Product Manager Agent → Auto triggers sync when no data');
    console.log('   ✅ Intelligent timing → Prevents over-syncing');
    console.log('\n');
    
    console.log('🔧 [NEXT STEPS]:');
    console.log('   1. 🔄 Wait 2-3 minutes for background sync to complete');
    console.log('   2. 🧪 Test with real user: "que productos tengo?"');
    console.log('   3. 📱 Check WhatsApp integration with fresh data');
    console.log('   4. 📊 Monitor sync status endpoint for real-time status');
    console.log('\n');

    console.log('🎉 [COMPLETE] Intelligent Sync System Testing Finished!');

  } catch (error) {
    console.error('💥 [CRITICAL ERROR] Test suite failed:', error);
  }
}

// Run tests
testIntelligentSync().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 