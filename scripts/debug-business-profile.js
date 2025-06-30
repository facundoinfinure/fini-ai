#!/usr/bin/env node

/**
 * 🐛 Debug Business Profile Description Issue
 * 
 * Script para diagnosticar por qué la descripción del negocio aparece como "[object Object]"
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugBusinessProfile() {
  try {
    console.log('🔍 Debugging Business Profile Description Issue...\n');

    // 1. Buscar tiendas recientes
    console.log('📊 1. Checking recent stores...');
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (storesError) {
      console.error('❌ Error fetching stores:', storesError);
      return;
    }

    if (!stores || stores.length === 0) {
      console.log('⚠️  No stores found');
      return;
    }

    console.log(`✅ Found ${stores.length} stores`);
    console.log('\n📋 Store Details:');
    
    stores.forEach((store, index) => {
      console.log(`\n--- Store ${index + 1}: ${store.name} ---`);
      console.log('ID:', store.id);
      console.log('Platform Store ID:', store.platform_store_id);
      console.log('Has Access Token:', !!store.access_token);
      console.log('Description Type:', typeof store.description);
      console.log('Description Value:', store.description);
      
      // Check if description is an object
      if (typeof store.description === 'object' && store.description !== null) {
        console.log('🚨 DESCRIPTION IS OBJECT!');
        console.log('Object Keys:', Object.keys(store.description));
        console.log('Object Values:', Object.values(store.description));
        console.log('JSON String:', JSON.stringify(store.description, null, 2));
      }
    });

    // 2. Test store analysis API call
    console.log('\n🤖 2. Testing Store Analysis...');
    
    const testStore = stores[0];
    if (testStore && testStore.access_token && testStore.platform_store_id) {
      console.log(`\nTesting analysis for store: ${testStore.name}`);
      
      try {
        // Simulate what the API does
        const TiendaNubeAPI = require('../src/lib/integrations/tiendanube').TiendaNubeAPI;
        const tiendaNubeAPI = new TiendaNubeAPI(testStore.access_token, testStore.platform_store_id);
        
        console.log('📊 Fetching store info from Tienda Nube...');
        const storeInfo = await tiendaNubeAPI.getStore();
        
        console.log('\n📋 Tienda Nube Store Info:');
        console.log('Name:', storeInfo.name);
        console.log('Description Type:', typeof storeInfo.description);
        console.log('Description Value:', storeInfo.description);
        
        if (typeof storeInfo.description === 'object' && storeInfo.description !== null) {
          console.log('🚨 TIENDA NUBE DESCRIPTION IS OBJECT!');
          console.log('Object Keys:', Object.keys(storeInfo.description));
          console.log('Object Values:', Object.values(storeInfo.description));
          console.log('JSON String:', JSON.stringify(storeInfo.description, null, 2));
        }
        
        // Test what happens in store analysis
        console.log('\n🧪 Testing description fallback logic...');
        const fallbackDescription = storeInfo.description || `Tienda online especializada en e-commerce general`;
        console.log('Fallback Description:', fallbackDescription);
        console.log('Fallback Type:', typeof fallbackDescription);
        
        if (typeof fallbackDescription === 'object') {
          console.log('🚨 FALLBACK IS STILL OBJECT!');
          console.log('This would cause [object Object] in the UI');
        }
        
      } catch (apiError) {
        console.error('❌ Error testing Tienda Nube API:', apiError.message);
      }
    } else {
      console.log('⚠️  Cannot test analysis - no valid store with tokens');
    }

    // 3. Check recent conversations or profiles
    console.log('\n💬 3. Checking if this is affecting live users...');
    
    // Look for recent chat messages or analysis results
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messagesError && recentMessages) {
      console.log(`Found ${recentMessages.length} recent messages`);
      
      const objectMessages = recentMessages.filter(msg => {
        return (msg.content && msg.content.includes('[object Object]')) ||
               (msg.metadata && typeof msg.metadata === 'object' && 
                JSON.stringify(msg.metadata).includes('[object Object]'));
      });
      
      if (objectMessages.length > 0) {
        console.log(`🚨 Found ${objectMessages.length} messages with [object Object]!`);
        objectMessages.forEach((msg, index) => {
          console.log(`\nMessage ${index + 1}:`);
          console.log('Content:', msg.content);
          console.log('Metadata:', msg.metadata);
        });
      } else {
        console.log('✅ No [object Object] found in recent messages');
      }
    }

    console.log('\n🎯 Summary:');
    console.log('- Check if store descriptions from Tienda Nube are objects');
    console.log('- Verify fallback logic handles objects correctly');
    console.log('- Look for [object Object] in UI or messages');
    console.log('\n✅ Debug analysis complete!');

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run the debug
debugBusinessProfile(); 