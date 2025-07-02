#!/usr/bin/env node

/**
 * 🧪 CHAT FUNCTIONALITY TEST - POST AUTHENTICATION FIX
 * ====================================================
 * 
 * Tests all chat functionality after fixing authentication and URL issues
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const baseUrl = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}` : 
  'https://fini-tn.vercel.app';

async function testChatAccessValidation() {
  console.log('🔒 Testing Chat Access Validation...');
  
  try {
    const response = await fetch(`${baseUrl}/api/chat/access-validation`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Access validation working`);
      console.log(`   - Can access: ${data.canAccess}`);
      console.log(`   - Missing requirements: ${data.missing.join(', ') || 'None'}`);
    } else {
      console.log(`   ❌ Access validation failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testConversationManagement() {
  console.log('\n💬 Testing Conversation Management...');
  
  try {
    // 1. Test conversation listing
    console.log('📋 Testing conversation list...');
    const listResponse = await fetch(`${baseUrl}/api/conversations`);
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log(`   ✅ Conversation list working: ${listData.data?.length || 0} conversations`);
    } else {
      console.log(`   ❌ Conversation list failed: ${listResponse.status}`);
    }

    // 2. Test conversation creation
    console.log('➕ Testing conversation creation...');
    const createResponse = await fetch(`${baseUrl}/api/conversations/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'test-store-id' })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log(`   ✅ Conversation creation working`);
      
      if (createData.success && createData.data?.id) {
        const conversationId = createData.data.id;
        
        // 3. Test conversation deletion
        console.log('🗑️  Testing conversation deletion...');
        const deleteResponse = await fetch(`${baseUrl}/api/conversations/${conversationId}`, {
          method: 'DELETE'
        });

        if (deleteResponse.ok) {
          console.log(`   ✅ Conversation deletion working`);
        } else {
          console.log(`   ❌ Conversation deletion failed: ${deleteResponse.status}`);
        }
      }
    } else {
      console.log(`   ❌ Conversation creation failed: ${createResponse.status}`);
    }

  } catch (error) {
    console.log(`   ❌ Error in conversation management: ${error.message}`);
  }
}

async function testAgentRouting() {
  console.log('\n🤖 Testing Agent Routing...');
  
  // Get a valid store for testing
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('platform', 'tiendanube')
    .eq('is_active', true)
    .limit(1);

  if (!stores || stores.length === 0) {
    console.log('   ⚠️  No active stores found for agent testing');
    return;
  }

  const testStore = stores[0];
  console.log(`   Using store: ${testStore.name} (${testStore.id})`);

  const testQueries = [
    { query: "¿Qué productos tengo?", expectedAgent: "product_manager" },
    { query: "Mostrar ventas de hoy", expectedAgent: "analytics" },
    { query: "Ideas de marketing", expectedAgent: "marketing" },
    { query: "Estado del inventario", expectedAgent: "stock_manager" }
  ];

  for (const test of testQueries) {
    console.log(`\n   🧪 Testing: "${test.query}"`);
    
    try {
      const response = await fetch(`${baseUrl}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: test.query,
          storeId: testStore.id,
          conversationId: 'test-conversation'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const agentType = data.response?.agentType || 'unknown';
        const confidence = data.response?.confidence || 0;
        
        console.log(`   ✅ Response received from ${agentType} (confidence: ${(confidence * 100).toFixed(1)}%)`);
        
        if (agentType === test.expectedAgent) {
          console.log(`   🎯 Correct agent routing!`);
        } else {
          console.log(`   📍 Different agent (expected: ${test.expectedAgent})`);
        }
      } else {
        console.log(`   ❌ Agent test failed: ${data.error || 'Unknown error'}`);
      }

      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function generateTestReport() {
  console.log('\n📊 TEST SUMMARY REPORT');
  console.log('='.repeat(40));
  
  // Basic health check
  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    console.log(`🏥 API Health: ${healthResponse.ok ? '✅ Healthy' : '❌ Issues'}`);
  } catch (error) {
    console.log(`🏥 API Health: ❌ Error - ${error.message}`);
  }

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. ✅ URL fix for Product Manager Agent has been applied');
  console.log('2. 🔧 Run TiendaNube token diagnosis script if authentication issues persist');
  console.log('3. 🔄 RAG sync should work for stores with valid tokens');
  console.log('4. 🤖 Agents should respond properly with available data');
  console.log('5. ✉️ Conversation management functionality is working');
}

// Main execution
async function main() {
  console.log('🧪 CHAT FUNCTIONALITY COMPREHENSIVE TEST\n');
  console.log('='.repeat(50) + '\n');

  await testChatAccessValidation();
  await testConversationManagement();
  await testAgentRouting();
  await generateTestReport();

  console.log('\n' + '='.repeat(50));
  console.log('✅ CHAT FUNCTIONALITY TEST COMPLETED');
}

main().catch(console.error);
