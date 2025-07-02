#!/usr/bin/env node

/**
 * Script: Test Conversation Deletion Debug Endpoint
 * 
 * Este script usa el endpoint de debug para probar la eliminación
 * de conversaciones paso a paso y ver logs detallados.
 */

const API_BASE = 'https://fini-ai.vercel.app';

console.log('🧪 TESTING: Conversation Deletion Debug Endpoint');
console.log('================================================');

async function testConversationDeletionDebug() {
  try {
    // Step 1: Get conversations to find a target
    console.log('\n📋 STEP 1: Getting conversations to test deletion...');
    
    const listResponse = await fetch(`${API_BASE}/api/conversations`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!listResponse.ok) {
      console.log(`❌ Error getting conversations: ${listResponse.status}`);
      const errorText = await listResponse.text();
      console.log(`   Error: ${errorText}`);
      return;
    }

    const listData = await listResponse.json();
    
    if (!listData.success || !listData.data || listData.data.length === 0) {
      console.log('❌ No conversations found to test');
      return;
    }

    const conversations = listData.data;
    console.log(`✅ Found ${conversations.length} conversations`);
    
    // Pick first conversation as target
    const targetConversation = conversations[0];
    console.log(`\n🎯 TARGET CONVERSATION:`);
    console.log(`   ID: ${targetConversation.id}`);
    console.log(`   Title: ${targetConversation.title || 'No title'}`);

    // Step 2: Test the debug deletion endpoint
    console.log('\n🧪 STEP 2: Testing debug deletion endpoint...');
    
    const debugResponse = await fetch(`${API_BASE}/api/debug/test-conversation-deletion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({
        conversationId: targetConversation.id
      })
    });

    console.log(`   Debug response status: ${debugResponse.status}`);

    if (!debugResponse.ok) {
      const errorText = await debugResponse.text();
      console.log(`❌ Debug endpoint failed: ${errorText}`);
      return;
    }

    const debugData = await debugResponse.json();
    console.log(`\n📊 DEBUG RESULTS:`);
    console.log(JSON.stringify(debugData, null, 2));

    // Analyze results
    console.log(`\n🔍 ANALYSIS:`);
    const debug = debugData.debug;
    
    if (debug) {
      console.log(`   User ID: ${debug.user_id}`);
      console.log(`   Target Conversation ID: ${debug.conversationId}`);
      
      // Step 1: List conversations
      const step1 = debug.steps.step1_listConversations;
      console.log(`\n   📋 Step 1 - List Conversations:`);
      console.log(`      Error: ${step1.error || 'None'}`);
      console.log(`      Count: ${step1.count}`);
      console.log(`      All IDs: ${step1.allIds.slice(0, 3).join(', ')}${step1.allIds.length > 3 ? '...' : ''}`);
      
      // Step 2: Find target
      const step2 = debug.steps.step2_findTarget;
      console.log(`\n   🔍 Step 2 - Find Target:`);
      console.log(`      Found: ${step2.found}`);
      if (step2.targetConversation) {
        console.log(`      Target: ${step2.targetConversation.id} (${step2.targetConversation.title || 'No title'})`);
      }
      
      // Step 3: Check messages
      const step3 = debug.steps.step3_checkMessages;
      console.log(`\n   💬 Step 3 - Check Messages:`);
      console.log(`      Error: ${step3.error || 'None'}`);
      console.log(`      Message Count: ${step3.messageCount}`);
      
      // Step 4: Delete messages
      const step4 = debug.steps.step4_deleteMessages;
      console.log(`\n   🗑️ Step 4 - Delete Messages:`);
      console.log(`      Error: ${step4.error || 'None'}`);
      console.log(`      Messages Deleted: ${step4.messagesDeleted}`);
      
      // Step 5: Delete conversation
      const step5 = debug.steps.step5_deleteConversation;
      console.log(`\n   🗑️ Step 5 - Delete Conversation:`);
      console.log(`      Error: ${step5.error || 'None'}`);
      console.log(`      Conversations Deleted: ${step5.conversationsDeleted}`);
      
      // Step 6: Verify
      const step6 = debug.steps.step6_verify;
      console.log(`\n   ✅ Step 6 - Verify Deletion:`);
      console.log(`      Error: ${step6.error || 'None'}`);
      console.log(`      Still Exists: ${step6.stillExists}`);
      
      // Summary
      console.log(`\n🎯 SUMMARY:`);
      if (step5.conversationsDeleted === 0) {
        console.log(`   ❌ PROBLEM: No conversations were deleted`);
        if (step5.error) {
          console.log(`   ❌ DELETE ERROR: ${step5.error}`);
        }
      } else {
        console.log(`   ✅ SUCCESS: ${step5.conversationsDeleted} conversation(s) deleted`);
      }
      
      if (step6.stillExists) {
        console.log(`   ❌ PROBLEM: Conversation still exists after deletion`);
      } else {
        console.log(`   ✅ SUCCESS: Conversation no longer exists`);
      }
    }

  } catch (error) {
    console.error(`❌ Test script error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
}

function showInstructions() {
  console.log('\n📋 INSTRUCTIONS:');
  console.log('=================');
  console.log('1. Este script testea la eliminación paso a paso');
  console.log('2. Revisa los logs de Vercel con filtro [DEBUG-DELETE]');
  console.log('3. Compara resultados con logs del endpoint real');
  console.log('4. Identifica exactamente dónde falla la eliminación');
  console.log('');
  console.log('🔍 Busca en Vercel logs:');
  console.log('   • [DEBUG-DELETE] para este test');
  console.log('   • [DELETE] para el endpoint real');
}

async function runTest() {
  await testConversationDeletionDebug();
  showInstructions();
}

runTest().catch(console.error); 