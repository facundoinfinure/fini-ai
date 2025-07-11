#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🔍 [CHECK] Checking stores table...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check all stores
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*');
      
    if (error) {
      console.error('❌ [CHECK] Error:', error);
      return;
    }
    
    console.log(`📊 [CHECK] Found ${stores?.length || 0} total stores`);
    
    if (stores && stores.length > 0) {
      console.log('\n📋 [CHECK] Stores details:');
      stores.forEach((store, index) => {
        console.log(`\n${index + 1}. Store: ${store.name || 'Unnamed'}`);
        console.log(`   ID: ${store.id}`);
        console.log(`   User ID: ${store.user_id}`);
        console.log(`   Platform: ${store.platform}`);
        console.log(`   Active: ${store.is_active}`);
        console.log(`   Created: ${store.created_at}`);
        console.log(`   Updated: ${store.updated_at}`);
        console.log(`   Last Sync: ${store.last_sync_at || 'Never'}`);
      });
    } else {
      console.log('ℹ️ [CHECK] No stores found in database');
    }
    
    // Check if table exists
    const { data: tableInfo, error: tableError } = await supabase
      .from('stores')
      .select('id')
      .limit(0);
      
    if (tableError) {
      console.error('❌ [CHECK] Table access error:', tableError);
    } else {
      console.log('✅ [CHECK] Stores table is accessible');
    }

  } catch (error) {
    console.error('❌ [CHECK] Fatal error:', error);
  }
}

main(); 