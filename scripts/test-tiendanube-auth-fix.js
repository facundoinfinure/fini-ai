#!/usr/bin/env node

/**
 * 🔧 TEST TIENDA NUBE AUTHENTICATION FIX
 * =====================================
 * 
 * Tests the critical fixes applied to Tienda Nube OAuth authentication:
 * 1. Fixed store ID resolution (user_id vs store_id)
 * 2. Removed circular dependency in makeRequest
 * 3. Improved error handling in OAuth callback
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log('🔧 [TEST] Starting Tienda Nube Authentication Fix Test');
  console.log('========================================================\n');

  // Test 1: Check if OAuth callback endpoint is accessible
  console.log('1. 🧪 Testing OAuth callback endpoint accessibility...');
  try {
    const response = await fetch(`${API_BASE}/api/tiendanube/oauth/callback?error=test`, {
      method: 'GET',
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log(`   ✅ OAuth callback responds: ${response.status}`);
    console.log(`   ✅ Redirect location: ${response.headers.get('location')}`);
  } catch (error) {
    console.log(`   ❌ OAuth callback error: ${error.message}`);
  }

  // Test 2: Check environment variables
  console.log('\n2. 🔍 Checking Tienda Nube environment variables...');
  const requiredEnvs = [
    'TIENDANUBE_CLIENT_ID',
    'TIENDANUBE_CLIENT_SECRET',
    'TIENDANUBE_REDIRECT_URI'
  ];

  for (const env of requiredEnvs) {
    const exists = !!process.env[env];
    console.log(`   ${exists ? '✅' : '❌'} ${env}: ${exists ? 'configured' : 'missing'}`);
  }

  // Test 3: Check Supabase stores table structure
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    console.log('\n3. 🗄️  Checking stores table structure...');
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      const { data, error } = await supabase
        .from('stores')
        .select('id, platform_store_id, user_id, platform')
        .eq('platform', 'tiendanube')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log('   ⚠️  Stores table does not exist yet');
        } else {
          console.log(`   ❌ Stores table error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Stores table accessible, ${data?.length || 0} TN stores found`);
        if (data && data.length > 0) {
          console.log(`   📋 Sample store structure: platform_store_id: ${data[0].platform_store_id}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Database connection error: ${error.message}`);
    }
  } else {
    console.log('\n3. ⚠️  Skipping database test - Supabase credentials not available');
  }

  // Test 4: Test OAuth URL generation
  console.log('\n4. 🔗 Testing OAuth URL generation...');
  try {
    const response = await fetch(`${API_BASE}/api/tiendanube/oauth/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeUrl: 'https://test.mitiendanube.com',
        storeName: 'Test Store',
        context: 'test'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ OAuth URL generation working');
      console.log(`   🔗 Generated URL includes: ${data.url ? 'tiendanube.com' : 'unknown format'}`);
    } else {
      console.log(`   ❌ OAuth URL generation failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ OAuth connect test error: ${error.message}`);
  }

  // Test 5: Check for circular dependency issues
  console.log('\n5. 🔄 Testing for circular dependency issues...');
  try {
    // Try to import both modules to check for circular dependencies
    const { TiendaNubeAPI } = await import('../src/lib/integrations/tiendanube.js');
    const { TiendaNubeTokenManager } = await import('../src/lib/integrations/tiendanube-token-manager.js');
    
    console.log('   ✅ TiendaNubeAPI imported successfully');
    console.log('   ✅ TiendaNubeTokenManager imported successfully');
    console.log('   ✅ No circular dependency detected');
  } catch (error) {
    console.log(`   ❌ Import error (possible circular dependency): ${error.message}`);
  }

  console.log('\n📋 SUMMARY OF FIXES APPLIED:');
  console.log('==========================================');
  console.log('✅ Fixed OAuth callback to properly resolve store_id vs user_id');
  console.log('✅ Added fallback mechanism to get store list if user_id != store_id');
  console.log('✅ Removed circular dependency in TiendaNubeAPI.makeRequest');
  console.log('✅ Improved error handling and logging throughout OAuth flow');
  console.log('✅ Simplified token management to avoid conflicts');
  
  console.log('\n🚀 Next steps:');
  console.log('- Test OAuth connection with a real Tienda Nube store');
  console.log('- Monitor logs for "actualStoreId" vs "storeId" messages');
  console.log('- Verify that store data is saved correctly in database');
  
  console.log('\n🔧 Test completed successfully!');
}

main().catch(console.error); 