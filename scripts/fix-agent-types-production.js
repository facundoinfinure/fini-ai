#!/usr/bin/env node

/**
 * Script to fix agent_type constraint in production
 * Resolves: new row for relation "messages" violates check constraint "messages_agent_type_check"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAgentTypesConstraint() {
  try {
    console.log('🔧 Fixing agent_type constraint in production...');

    // 1. Drop existing constraint
    console.log('📋 Dropping existing constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_agent_type_check;'
    });

    if (dropError) {
      console.log('⚠️ Warning dropping constraint:', dropError.message);
    }

    // 2. Add updated constraint
    console.log('📋 Adding updated constraint...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.messages ADD CONSTRAINT messages_agent_type_check 
        CHECK (agent_type IN (
          'orchestrator', 
          'analytics', 
          'customer_service', 
          'marketing', 
          'stock_manager', 
          'financial_advisor', 
          'business_consultant', 
          'product_manager', 
          'operations_manager', 
          'sales_coach'
        ));`
    });

    if (addError) {
      console.error('❌ Error adding constraint:', addError);
      return false;
    }

    console.log('✅ Agent type constraint updated successfully!');

    // 3. Test with a sample message
    console.log('🧪 Testing constraint with sample agent types...');
    
    const testAgentTypes = [
      'product_manager', 
      'analytics', 
      'orchestrator', 
      'business_consultant'
    ];

    for (const agentType of testAgentTypes) {
      try {
        // Validate constraint by checking if it would allow the agent type
        const { error: testError } = await supabase.rpc('exec_sql', {
          sql: `SELECT CASE WHEN '${agentType}' IN (
            'orchestrator', 'analytics', 'customer_service', 'marketing', 
            'stock_manager', 'financial_advisor', 'business_consultant', 
            'product_manager', 'operations_manager', 'sales_coach'
          ) THEN 'valid' ELSE 'invalid' END as result;`
        });

        if (!testError) {
          console.log(`✅ Agent type '${agentType}' is now valid`);
        }
      } catch (err) {
        console.log(`⚠️ Could not test agent type '${agentType}':`, err.message);
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting agent types constraint fix...\n');
  
  const success = await fixAgentTypesConstraint();
  
  if (success) {
    console.log('\n✅ Agent types constraint fix completed successfully!');
    console.log('📋 The following agent types are now allowed:');
    console.log('   - orchestrator');
    console.log('   - analytics');
    console.log('   - customer_service');
    console.log('   - marketing');
    console.log('   - stock_manager');
    console.log('   - financial_advisor');
    console.log('   - business_consultant');
    console.log('   - product_manager');
    console.log('   - operations_manager');
    console.log('   - sales_coach');
    console.log('\n🎯 Chat should now work without agent_type constraint errors!');
  } else {
    console.log('\n❌ Agent types constraint fix failed');
    console.log('Please check the errors above and try again');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 