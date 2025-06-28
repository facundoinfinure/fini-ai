#!/usr/bin/env node

/**
 * 🔄 Apply Conversation Title Migration
 * Aplica la migración para agregar títulos a las conversaciones
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Required env vars:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying conversation title migration...');

    // Check if title column already exists
    const { data: columns, error: columnsError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('❌ Error checking table structure:', columnsError.message);
      return;
    }

    console.log('✅ Table structure check passed');

    // Apply migration SQL
    const migrationSQL = `
      -- Add title column to conversations table
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS title TEXT;

      -- Create index for better performance on title searches
      CREATE INDEX IF NOT EXISTS idx_conversations_title ON conversations(title);

      -- Add comment explaining the purpose
      COMMENT ON COLUMN conversations.title IS 'Auto-generated or custom title for the conversation, similar to ChatGPT/Claude conversation titles';
    `;

    console.log('📝 Executing migration SQL...');
    
    const { error: migrationError } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (migrationError) {
      console.error('❌ Migration failed:', migrationError.message);
      return;
    }

    console.log('✅ Migration applied successfully!');

    // Test the new column
    console.log('🧪 Testing new title column...');
    
    const { data: testData, error: testError } = await supabase
      .from('conversations')
      .select('id, title, customer_number, created_at')
      .limit(5);

    if (testError) {
      console.error('❌ Test query failed:', testError.message);
      return;
    }

    console.log('✅ Title column is working!');
    console.log(`📊 Found ${testData.length} conversations`);
    
    if (testData.length > 0) {
      console.log('🔍 Sample conversations:');
      testData.forEach(conv => {
        console.log(`  - ${conv.id}: ${conv.title || '(sin título)'} - ${conv.customer_number}`);
      });
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the new conversation management features');
    console.log('2. Create some conversations and verify title auto-generation');
    console.log('3. Deploy to production when ready');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Alternative method if RPC doesn't work
async function applyMigrationAlternative() {
  try {
    console.log('🔄 Trying alternative migration method...');

    // Try to add a test record with title to verify schema
    const { error: testInsertError } = await supabase
      .from('conversations')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        whatsapp_number: 'test-migration',
        customer_number: 'test-customer',
        conversation_id: `migration-test-${Date.now()}`,
        title: 'Test Title - Migration',
        status: 'active',
        last_message_at: new Date().toISOString(),
        message_count: 0
      });

    if (testInsertError) {
      if (testInsertError.message.includes('column "title" does not exist')) {
        console.log('❌ Title column does not exist. Migration needed.');
        console.log('📝 Please run this SQL manually in Supabase SQL Editor:');
        console.log('\n' + '='.repeat(50));
        console.log(`
-- Add title column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_title ON conversations(title);

-- Add comment
COMMENT ON COLUMN conversations.title IS 'Auto-generated or custom title for the conversation';
        `);
        console.log('='.repeat(50));
      } else {
        console.error('❌ Test insert failed:', testInsertError.message);
      }
      return;
    }

    console.log('✅ Title column exists and working!');

    // Clean up test record
    await supabase
      .from('conversations')
      .delete()
      .eq('customer_number', 'test-customer');

    console.log('🧹 Test record cleaned up');

  } catch (error) {
    console.error('💥 Alternative migration error:', error);
  }
}

async function main() {
  console.log('🎯 Fini AI - Conversation Title Migration');
  console.log('=====================================\n');

  try {
    await applyMigration();
  } catch (error) {
    console.log('\n🔄 Primary migration failed, trying alternative...');
    await applyMigrationAlternative();
  }
}

if (require.main === module) {
  main();
}

module.exports = { applyMigration, applyMigrationAlternative }; 