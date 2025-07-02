#!/usr/bin/env node

/**
 * 🔧 CREATE TIENDANUBE_STORES TABLE
 * =================================
 * 
 * Direct creation of missing tiendanube_stores table
 * to fix "No valid token" errors in production
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function createTiendaNubeTable() {
  console.log('🔧 CREATING TIENDANUBE_STORES TABLE');
  console.log('===================================');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('✅ Connected to database');

    // 1. Create the table directly
    console.log('\n🔧 Creating tiendanube_stores table...');
    
    const { error: createError } = await supabase
      .from('tiendanube_stores')
      .select('*')
      .limit(1);

    if (createError && createError.message.includes('does not exist')) {
      console.log('❌ Table does not exist, need manual creation');
      console.log('\n📋 MANUAL SQL REQUIRED:');
      console.log('=====================================');
      console.log('Run this SQL in Supabase SQL Editor:');
      console.log('');
      console.log(`
-- Create tiendanube_stores table
CREATE TABLE IF NOT EXISTS public.tiendanube_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT NOT NULL,
  platform_store_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id),
  UNIQUE(platform_store_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tiendanube_stores_store_id ON public.tiendanube_stores(store_id);
CREATE INDEX IF NOT EXISTS idx_tiendanube_stores_platform_id ON public.tiendanube_stores(platform_store_id);

-- Enable RLS
ALTER TABLE public.tiendanube_stores ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY IF NOT EXISTS "Users can access their own store tokens" ON public.tiendanube_stores
FOR ALL USING (
  store_id IN (
    SELECT id FROM public.stores WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_tiendanube_stores_updated_at 
BEFORE UPDATE ON public.tiendanube_stores 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
      console.log('');
    } else {
      console.log('✅ Table already exists or different error occurred');
      console.log('Error:', createError?.message || 'None');
    }

    // 2. If table exists, migrate data
    console.log('\n🔧 Attempting data migration...');
    
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, platform_store_id, access_token')
      .not('access_token', 'is', null)
      .not('platform_store_id', 'is', null);

    if (storesError) {
      console.log(`❌ Error fetching stores: ${storesError.message}`);
    } else if (stores && stores.length > 0) {
      console.log(`Found ${stores.length} stores with tokens`);
      
      // Show what we would migrate
      console.log('\n📋 STORES TO MIGRATE:');
      stores.forEach(store => {
        console.log(`- Store ID: ${store.id.substring(0, 8)}...`);
        console.log(`  Platform ID: ${store.platform_store_id}`);
        console.log(`  Has Token: ${store.access_token ? 'Yes' : 'No'}`);
      });

      console.log('\n🔧 After creating the table, run migration:');
      stores.forEach(store => {
        console.log(`
INSERT INTO public.tiendanube_stores (store_id, platform_store_id, access_token, scope)
VALUES ('${store.id}', '${store.platform_store_id}', '${store.access_token}', 'read_products,read_orders,read_customers')
ON CONFLICT (store_id) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  updated_at = NOW();
        `);
      });
    } else {
      console.log('ℹ️ No stores with tokens found');
    }

    console.log('\n📊 NEXT STEPS');
    console.log('=============');
    console.log('1. 🔧 Run the SQL commands above in Supabase');
    console.log('2. 🔄 Refresh browser (Ctrl+F5)');
    console.log('3. 🤖 Test: Ask "¿qué productos tengo?"');
    console.log('4. ✅ Should see real products instead of "no data"');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Execute
if (require.main === module) {
  createTiendaNubeTable();
}

module.exports = { createTiendaNubeTable }; 