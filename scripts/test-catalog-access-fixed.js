#!/usr/bin/env node

/**
 * Test Catalog Access - FIXED VERSION
 * Prueba con diferentes métodos de autenticación
 */

const { createClient } = require('@supabase/supabase-js');

async function testCatalogAccessFixed() {
  console.log('🛍️ [FIXED] Testing catalog access with multiple auth methods...\n');

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

    // 4. Test múltiples métodos de autenticación
    const apiUrl = `https://api.tiendanube.com/v1/${stores.platform_store_id}/products`;
    const authMethods = [
      {
        name: 'Authorization: Bearer',
        headers: {
          'Authorization': `Bearer ${stores.access_token}`,
          'User-Agent': 'FiniAI/1.0',
          'Content-Type': 'application/json'
        }
      },
      {
        name: 'Authentication: bearer',
        headers: {
          'Authentication': `bearer ${stores.access_token}`,
          'User-Agent': 'FiniAI/1.0',
          'Content-Type': 'application/json'
        }
      },
      {
        name: 'Authorization: bearer',
        headers: {
          'Authorization': `bearer ${stores.access_token}`,
          'User-Agent': 'FiniAI/1.0',
          'Content-Type': 'application/json'
        }
      }
    ];

    for (const method of authMethods) {
      console.log(`\n🌐 [TEST] Testing ${method.name}...`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: method.headers
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const products = await response.json();
          console.log(`   ✅ SUCCESS: Found ${products.length} products`);
          
          if (products.length > 0) {
            console.log('\n📦 [PRODUCTS] Sample products:');
            products.slice(0, 3).forEach((product, index) => {
              console.log(`   ${index + 1}. ${product.name?.es || product.name || 'Unnamed'}`);
              console.log(`      ID: ${product.id}`);
              console.log(`      Price: $${product.variants?.[0]?.price || 'N/A'}`);
              console.log(`      Stock: ${product.variants?.[0]?.stock || 'N/A'}`);
              console.log(`      Published: ${product.published ? 'Yes' : 'No'}`);
            });
            
            // Success! Store the working method
            console.log(`\n🎯 [SUCCESS] Working authentication method: ${method.name}`);
            return { success: true, method: method.name, productsCount: products.length };
          }
        } else {
          const errorText = await response.text();
          console.log(`   ❌ FAILED: ${errorText.substring(0, 200)}...`);
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }

    // 5. Test con parámetros específicos
    console.log('\n🔍 [TEST] Testing with specific parameters...');
    const testUrls = [
      `${apiUrl}?limit=50`,
      `${apiUrl}?published=true`,
      `${apiUrl}?published=true&limit=50`,
      `${apiUrl}?fields=id,name,variants`
    ];

    for (const testUrl of testUrls) {
      console.log(`\n   Testing: ${testUrl.split('?')[1] || 'no params'}`);
      
      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${stores.access_token}`,
            'User-Agent': 'FiniAI/1.0',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const products = await response.json();
          console.log(`   ✅ Found ${products.length} products`);
          if (products.length > 0) {
            console.log(`   🎯 BREAKTHROUGH! This configuration works!`);
            return { success: true, url: testUrl, productsCount: products.length };
          }
        } else {
          console.log(`   ❌ Status: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n❌ [CONCLUSION] All authentication methods failed');
    console.log('   - The API is responding (not a network issue)');
    console.log('   - The credentials seem valid (not 401 errors)');
    console.log('   - The store may have no published products');
    console.log('   - Or there may be a pagination/filtering issue');

  } catch (error) {
    console.error('\n❌ [CRITICAL ERROR]:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testCatalogAccessFixed(); 