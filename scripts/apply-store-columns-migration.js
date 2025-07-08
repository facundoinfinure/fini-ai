#!/usr/bin/env node

/**
 * Apply Store Columns Migration
 * 
 * This script applies the migration to add currency, timezone, and language columns
 * to the stores table. Run this script when you have the database error:
 * "Could not find the 'currency' column of 'stores' in the schema cache"
 * 
 * Usage:
 * node scripts/apply-store-columns-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('🚀 Starting store columns migration...');
  
  try {
    // Check if columns already exist
    console.log('🔍 Checking current table structure...');
    const { data: existingData, error: checkError } = await supabase
      .from('stores')
      .select('id, currency, timezone, language')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Columns already exist! Migration not needed.');
      console.log('📊 Sample data:', existingData);
      return;
    }
    
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('❌ Unexpected error checking columns:', checkError);
      return;
    }
    
    console.log('📝 Columns do not exist. Applying migration...');
    console.log('');
    console.log('⚠️  IMPORTANT: This script cannot directly execute SQL.');
    console.log('   Please run the following SQL commands in Supabase Dashboard > SQL Editor:');
    console.log('');
    console.log('-- Add metadata columns to stores table');
    console.log('ALTER TABLE public.stores ');
    console.log("ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ARS',");
    console.log("ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',");
    console.log("ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';");
    console.log('');
    console.log('-- Update existing stores with default values');
    console.log('UPDATE public.stores ');
    console.log('SET ');
    console.log("  currency = COALESCE(currency, 'ARS'),");
    console.log("  timezone = COALESCE(timezone, 'America/Argentina/Buenos_Aires'),");
    console.log("  language = COALESCE(language, 'es')");
    console.log('WHERE currency IS NULL OR timezone IS NULL OR language IS NULL;');
    console.log('');
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard');
    console.log('');
    console.log('After running the SQL commands, test your OAuth callback again.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

applyMigration(); 