/**
 * 🗄️ DATABASE MIGRATION: Add reasoning field to messages table
 * This adds the reasoning field needed for agent transparency features
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addReasoningField() {
  console.log('🗄️ Adding reasoning field to messages table...\n');

  try {
    // 1. Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'messages')
      .eq('column_name', 'reasoning');

    if (checkError) {
      console.error('❌ Error checking existing columns:', checkError.message);
      return false;
    }

    if (columns && columns.length > 0) {
      console.log('✅ Campo reasoning ya existe en la tabla messages');
      return true;
    }

    // 2. Add reasoning column
    console.log('📝 Agregando campo reasoning...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS reasoning TEXT;
        
        COMMENT ON COLUMN messages.reasoning IS 'Agent reasoning/thinking process for transparency';
      `
    });

    if (alterError) {
      console.error('❌ Error adding reasoning column:', alterError.message);
      return false;
    }

    console.log('✅ Campo reasoning agregado exitosamente');

    // 3. Verify the column was added
    const { data: verify, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'messages')
      .in('column_name', ['reasoning', 'processing_time_ms', 'confidence']);

    if (verifyError) {
      console.error('❌ Error verifying columns:', verifyError.message);
      return false;
    }

    console.log('\n📋 Campos verificados en tabla messages:');
    verify?.forEach(col => {
      console.log(`  • ${col.column_name}: ${col.data_type}`);
    });

    // 4. Update schema interface description
    console.log('\n📝 Actualizando schema interface...');
    
    return true;

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return false;
  }
}

// Alternative method using direct SQL if rpc doesn't work
async function addReasoningFieldDirect() {
  console.log('🔄 Trying direct SQL method...');
  
  try {
    // Using direct SQL query
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    if (error && error.message.includes('column "reasoning" does not exist')) {
      console.log('🔧 Column does not exist, needs to be added manually in Supabase');
      console.log('\n📋 SQL to run in Supabase SQL Editor:');
      console.log(`
-- Add reasoning field to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reasoning TEXT;

COMMENT ON COLUMN messages.reasoning IS 'Agent reasoning/thinking process for transparency';
      `);
      return false;
    }

    console.log('✅ Database connection verified');
    return true;

  } catch (error) {
    console.error('❌ Error in direct method:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting reasoning field migration...\n');
  
  const success = await addReasoningField();
  
  if (!success) {
    console.log('\n🔄 Trying alternative method...');
    await addReasoningFieldDirect();
  }

  if (success) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n✅ Next steps:');
    console.log('  1. Campo reasoning agregado a tabla messages');
    console.log('  2. Backend needs to be updated to send reasoning');
    console.log('  3. Frontend already configured to display reasoning');
  } else {
    console.log('\n⚠️ Manual action required:');
    console.log('  Go to Supabase Dashboard > SQL Editor and run:');
    console.log('  ALTER TABLE messages ADD COLUMN IF NOT EXISTS reasoning TEXT;');
  }
}

// Run migration
main().catch(console.error); 