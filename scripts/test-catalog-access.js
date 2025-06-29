#!/usr/bin/env node

/**
 * Test Catalog Access - Direct API Test
 * Prueba directa del acceso al catálogo de Tienda Nube
 */

const { createClient } = require('@supabase/supabase-js');

async function testCatalogAccess() {
  console.log('🛍️ [TEST] Testing direct catalog access...\n');

  try {
    // 1. Environment validation
    console.log('🔧 [TEST] Checking environment...');
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
    console.log('\n📊 [TEST] Connecting to database...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 3. Get LOBO store specifically
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, user_id, access_token, platform_store_id, last_sync_at')
      .eq('name', 'LOBO')
      .eq('is_active', true)
      .single();

    if (error) {
      console.log(`❌ [ERROR] Database query failed: ${error.message}`);
      return;
    }

    if (!stores) {
      console.log('❌ [ERROR] LOBO store not found');
      return;
    }

    console.log('✅ [SUCCESS] Found LOBO store:');
    console.log(`  ID: ${stores.id}`);
    console.log(`  Platform Store ID: ${stores.platform_store_id}`);
    console.log(`  Access Token: ${stores.access_token ? '✅ Available' : '❌ Missing'}`);
    console.log(`  Last Sync: ${stores.last_sync_at || 'Never'}`);

    if (!stores.access_token || !stores.platform_store_id) {
      console.log('\n❌ [ERROR] Missing credentials for API call');
      return;
    }

    // 4. Test direct API call to Tienda Nube
    console.log('\n🌐 [TEST] Testing Tienda Nube API access...');
    
    const apiUrl = `https://api.tiendanube.com/v1/${stores.platform_store_id}/products`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authentication': `bearer ${stores.access_token}`,
        'User-Agent': 'FiniAI/1.0',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ [ERROR] API call failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Response: ${errorText.substring(0, 200)}...`);
      return;
    }

    const products = await response.json();
    console.log(`✅ [SUCCESS] API call successful`);
    console.log(`   Found ${products.length} products in catalog`);
    
    // Show sample products
    if (products.length > 0) {
      console.log('\n📦 [PRODUCTS] Sample products:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name?.es || product.name || 'Unnamed'}`);
        console.log(`      ID: ${product.id}`);
        console.log(`      Price: $${product.variants?.[0]?.price || 'N/A'}`);
        console.log(`      Stock: ${product.variants?.[0]?.stock || 'N/A'}`);
      });
    }

    // 5. Test a basic search query
    console.log('\n🔍 [TEST] Testing basic search query...');
    const searchTerms = ['producto', 'tienda', 'catálogo'];
    
    for (const term of searchTerms) {
      const foundProducts = products.filter(p => 
        (p.name?.es || p.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.description?.es || p.description || '').toLowerCase().includes(term.toLowerCase())
      );
      
      console.log(`   "${term}": ${foundProducts.length} matches`);
    }

    console.log('\n✅ [SUCCESS] Catalog access test completed');
    console.log('\n🎯 [CONCLUSION]:');
    console.log('   - ✅ Database connection works');
    console.log('   - ✅ Store credentials are valid');
    console.log('   - ✅ Tienda Nube API responds correctly');
    console.log(`   - ✅ Catalog has ${products.length} products available`);
    console.log('   - ❓ If agents still report "no access", the problem is in RAG/Agent logic');

  } catch (error) {
    console.error('\n❌ [CRITICAL ERROR]:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testCatalogAccess(); 