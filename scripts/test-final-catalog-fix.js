#!/usr/bin/env node

/**
 * Final Catalog Fix Test
 * Usa la autenticación correcta y parámetros optimizados
 */

const { createClient } = require('@supabase/supabase-js');

async function testFinalCatalogFix() {
  console.log('🎯 [FINAL] Testing catalog fix with correct authentication...\n');

  try {
    // 1. Environment validation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Get LOBO store
    const { data: store, error } = await supabase
      .from('stores')
      .select('id, name, user_id, access_token, platform_store_id, last_sync_at')
      .eq('name', 'LOBO')
      .eq('is_active', true)
      .single();

    if (error || !store) {
      console.log(`❌ [ERROR] Store not found: ${error?.message}`);
      return;
    }

    console.log('✅ [SUCCESS] Found LOBO store:');
    console.log(`  ID: ${store.id}`);
    console.log(`  Platform Store ID: ${store.platform_store_id}`);

    // 3. Test with correct authentication and various parameters
    const baseUrl = `https://api.tiendanube.com/v1/${store.platform_store_id}/products`;
    const correctHeaders = {
      'Authentication': `bearer ${store.access_token}`, // ✅ CORRECT
      'User-Agent': 'FiniAI/1.0',
      'Content-Type': 'application/json'
    };

    const testCases = [
      { name: 'No filters', url: baseUrl },
      { name: 'Limit 250', url: `${baseUrl}?limit=250` },
      { name: 'All published', url: `${baseUrl}?published=true&limit=250` },
      { name: 'All unpublished', url: `${baseUrl}?published=false&limit=250` },
      { name: 'Basic fields', url: `${baseUrl}?fields=id,name,published,variants&limit=250` }
    ];

    let totalFound = 0;
    let workingConfig = null;

    for (const testCase of testCases) {
      console.log(`\n🔍 [TEST] ${testCase.name}...`);
      
      try {
        const response = await fetch(testCase.url, {
          method: 'GET',
          headers: correctHeaders
        });

        if (response.ok) {
          const products = await response.json();
          console.log(`   ✅ Found ${products.length} products`);
          
          if (products.length > 0) {
            totalFound = products.length;
            workingConfig = testCase;
            
            console.log('\n📦 [PRODUCTS] Sample products found:');
            products.slice(0, 5).forEach((product, index) => {
              console.log(`   ${index + 1}. ${product.name?.es || product.name || 'Unnamed'}`);
              console.log(`      ID: ${product.id}`);
              console.log(`      Published: ${product.published ? 'Yes' : 'No'}`);
              console.log(`      Price: $${product.variants?.[0]?.price || 'N/A'}`);
              console.log(`      Stock: ${product.variants?.[0]?.stock || 'N/A'}`);
            });
            
            // Check published vs draft ratio
            const publishedCount = products.filter(p => p.published).length;
            const draftCount = products.length - publishedCount;
            console.log(`\n📊 [STATS] Published: ${publishedCount}, Draft: ${draftCount}`);
            
            break; // Stop testing once we find products
          }
        } else {
          console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // 4. Results and next steps
    if (totalFound > 0) {
      console.log(`\n🎉 [SUCCESS] Found ${totalFound} products total!`);
      console.log(`✅ Working configuration: ${workingConfig.name}`);
      console.log(`✅ Working URL: ${workingConfig.url}`);
      
      console.log('\n🔧 [NEXT STEPS]:');
      console.log('1. ✅ API authentication is working correctly');
      console.log('2. ✅ Products are accessible through API');
      console.log('3. 🔄 Now trigger RAG sync with corrected API calls');
      console.log('4. 🤖 Test agents with the synced data');
      
      // Trigger production sync
      console.log('\n⚡ [ACTION] Triggering production RAG sync...');
      try {
        const syncResponse = await fetch('https://fini-tn.vercel.app/api/test-rag-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('✅ RAG sync triggered successfully');
          console.log(`   Stores triggered: ${syncResult.results?.triggered || 0}`);
        } else {
          console.log('❌ Failed to trigger RAG sync');
        }
      } catch (syncError) {
        console.log(`❌ Sync trigger error: ${syncError.message}`);
      }
      
    } else {
      console.log('\n❌ [PROBLEM] Still no products found');
      console.log('Possible issues:');
      console.log('- Products are in a special state');
      console.log('- API permissions are limited');
      console.log('- Store configuration issue');
      console.log('- Pagination issue (products on page 2+)');
    }

  } catch (error) {
    console.error('\n❌ [CRITICAL ERROR]:', error.message);
  }
}

// Run the test
testFinalCatalogFix(); 