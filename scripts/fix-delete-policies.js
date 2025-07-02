#!/usr/bin/env node

/**
 * Fix DELETE RLS Policies
 * Agrega las políticas Row Level Security faltantes para operaciones DELETE
 * en las tablas conversations y messages
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Crear cliente de Supabase con service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Ejecutar SQL directo usando fetch API
 */
async function executeSql(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return await response.json();
}

/**
 * Políticas DELETE faltantes
 */
const MISSING_DELETE_POLICIES = [
  {
    table: 'conversations',
    policy: `
      CREATE POLICY "Users can delete own conversations" 
      ON conversations 
      FOR DELETE 
      USING (auth.uid()::text = user_id::text);
    `,
    description: 'Permite a los usuarios eliminar sus propias conversaciones'
  },
  {
    table: 'messages',
    policy: `
      CREATE POLICY "Users can delete messages from own conversations" 
      ON messages 
      FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM conversations 
          WHERE conversations.id = messages.conversation_id 
          AND conversations.user_id::text = auth.uid()::text
        )
      );
    `,
    description: 'Permite a los usuarios eliminar mensajes de sus propias conversaciones'
  }
];

async function checkExistingPolicies() {
  console.log('🔍 Checking existing DELETE policies...\n');
  
  for (const { table } of MISSING_DELETE_POLICIES) {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          policyname,
          cmd,
          roles,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = '${table}' 
        AND cmd = 'DELETE'
        ORDER BY policyname;
      `;
      
      console.log(`📋 DELETE policies for table "${table}":`);
      
      // Try using the PostgreSQL system tables directly
      const { data, error } = await supabase
        .from('pg_policies')
        .select('schemaname,tablename,policyname,cmd,roles,qual,with_check')
        .eq('tablename', table)
        .eq('cmd', 'DELETE');

      if (error) {
        console.warn(`⚠️  Could not check policies for ${table}:`, error.message);
        console.log(`  ❓ Cannot verify existing policies (may not have access to pg_policies)`);
      } else if (data && data.length > 0) {
        data.forEach(policy => {
          console.log(`  ✅ ${policy.policyname}`);
        });
      } else {
        console.log(`  ❌ No DELETE policies found`);
      }
      console.log('');
    } catch (err) {
      console.warn(`⚠️  Error checking ${table}:`, err.message);
      console.log(`  ❓ Cannot verify existing policies\n`);
    }
  }
}

async function createDeletePolicies() {
  console.log('🔧 Creating missing DELETE policies...\n');
  
  for (const { table, policy, description } of MISSING_DELETE_POLICIES) {
    try {
      console.log(`📝 Creating DELETE policy for "${table}"`);
      console.log(`   Description: ${description}`);
      
      // Execute the policy creation SQL directly
      await executeSql(policy.trim());
      
      console.log(`   ✅ Successfully created DELETE policy for ${table}`);
      console.log('');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`   ⚠️  Policy already exists for ${table}`);
      } else {
        console.error(`   ❌ Error creating policy for ${table}:`, err.message);
      }
      console.log('');
    }
  }
}

async function testDeleteOperation() {
  console.log('🔍 Testing DELETE operation with a dummy user...\n');
  
  try {
    // Create a test user session
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    
    if (authError || !authData.user) {
      console.log('⚠️  Cannot test with anonymous user, skipping test');
      return;
    }

    const testUserId = authData.user.id;
    console.log(`📝 Testing with user ID: ${testUserId}`);

    // Try to insert a test conversation
    const { data: testConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        user_id: testUserId,
        whatsapp_number: '+1234567890',
        customer_number: '+0987654321',
        conversation_id: `test-${Date.now()}`,
        title: 'Test Conversation',
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Could not create test conversation:', insertError.message);
      return;
    }

    console.log(`✅ Created test conversation: ${testConv.id}`);

    // Try to delete the test conversation
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', testConv.id);

    if (deleteError) {
      console.error(`❌ DELETE operation failed:`, deleteError.message);
      console.log('   This indicates the policies are not working correctly');
    } else {
      console.log(`✅ DELETE operation successful! Policies are working.`);
    }

    // Sign out the test user
    await supabase.auth.signOut();

  } catch (err) {
    console.warn('⚠️  Could not complete delete test:', err.message);
  }
}

async function main() {
  console.log('🚀 Fix DELETE RLS Policies');
  console.log('==========================\n');
  
  console.log('🔍 DIAGNOSIS: Las conversaciones no se pueden eliminar');
  console.log('💡 CAUSA RAÍZ: Faltan políticas RLS para operaciones DELETE');
  console.log('🛠️  SOLUCIÓN: Agregar políticas DELETE para conversations y messages\n');
  
  try {
    // Paso 1: Verificar políticas existentes
    await checkExistingPolicies();
    
    // Paso 2: Crear políticas faltantes
    await createDeletePolicies();
    
    // Paso 3: Test de verificación (opcional)
    console.log('🧪 Testing DELETE functionality...\n');
    await testDeleteOperation();
    
    console.log('\n🎉 DELETE policy fix completed!');
    console.log('\n💡 Las conversaciones ahora se deberían poder eliminar.');
    console.log('🔄 Prueba eliminando una conversación en el dashboard.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Ejecutar script
main().catch(console.error); 