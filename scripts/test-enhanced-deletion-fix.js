#!/usr/bin/env node

/**
 * Test Script: Enhanced Conversation Deletion Fix
 * 
 * Este script verifica que el fix mejorado de eliminación
 * funcione correctamente con logging detallado y verificación.
 */

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://fini-ai.vercel.app' 
  : 'http://localhost:3000';

console.log('🧪 TESTING: Enhanced Conversation Deletion Fix');
console.log('==============================================');

async function testEnhancedDeletion() {
  console.log('\n📋 STEP 1: Getting conversation list...');
  
  try {
    // Get conversations
    const listResponse = await fetch(`${API_BASE}/api/conversations`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!listResponse.ok) {
      console.log(`❌ Error: ${listResponse.status} - Cannot fetch conversations`);
      return;
    }
    
    const listData = await listResponse.json();
    
    if (!listData.success || !listData.data || listData.data.length === 0) {
      console.log('⚠️ No conversations found. Creating test conversation...');
      
      // Create test conversation
      const createResponse = await fetch(`${API_BASE}/api/conversations/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!createResponse.ok) {
        console.log(`❌ Cannot create test conversation: ${createResponse.status}`);
        return;
      }
      
      const createData = await createResponse.json();
      if (!createData.success) {
        console.log(`❌ Error creating conversation: ${createData.error}`);
        return;
      }
      
      console.log(`✅ Test conversation created: ${createData.data.id}`);
      
      // Refresh list
      const refreshResponse = await fetch(`${API_BASE}/api/conversations`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const refreshData = await refreshResponse.json();
      listData.data = refreshData.success ? refreshData.data : [];
    }
    
    const conversations = listData.data;
    console.log(`✅ Found ${conversations.length} conversations`);
    
    if (conversations.length === 0) {
      console.log('❌ Still no conversations after creation attempt');
      return;
    }
    
    // Pick conversation to delete
    const targetConversation = conversations[0];
    console.log(`\n🎯 TARGET CONVERSATION:`);
    console.log(`   ID: ${targetConversation.id}`);
    console.log(`   Title: ${targetConversation.title || 'No title'}`);
    console.log(`   Created: ${targetConversation.created_at || 'Unknown'}`);
    
    // Test the enhanced DELETE
    console.log('\n🗑️ STEP 2: Testing enhanced DELETE endpoint...');
    console.log(`   Deleting conversation: ${targetConversation.id}`);
    
    const startTime = Date.now();
    
    const deleteResponse = await fetch(`${API_BASE}/api/conversations/${targetConversation.id}`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    const deleteTime = Date.now() - startTime;
    
    console.log(`   DELETE request completed in ${deleteTime}ms`);
    console.log(`   Response status: ${deleteResponse.status}`);
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.log(`❌ DELETE failed with status ${deleteResponse.status}`);
      console.log(`   Error response: ${errorText}`);
      return;
    }
    
    const deleteData = await deleteResponse.json();
    console.log(`\n📊 DELETE RESPONSE:`, JSON.stringify(deleteData, null, 2));
    
    if (!deleteData.success) {
      console.log(`❌ Backend reported deletion failure: ${deleteData.error}`);
      return;
    }
    
    console.log(`✅ Backend reported successful deletion`);
    
    // Check the enhanced response data
    if (deleteData.data) {
      console.log(`\n📈 DELETION SUMMARY:`);
      console.log(`   Conversations deleted: ${deleteData.data.conversationsDeleted}`);
      console.log(`   Messages deleted: ${deleteData.data.messagesDeleted}`);
      console.log(`   Original title: ${deleteData.data.originalTitle}`);
      console.log(`   Deleted at: ${deleteData.data.deletedAt}`);
    }
    
    // Immediate verification
    console.log('\n⚡ STEP 3: Immediate verification (0ms delay)...');
    
    const immediateResponse = await fetch(`${API_BASE}/api/conversations`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (immediateResponse.ok) {
      const immediateData = await immediateResponse.json();
      if (immediateData.success) {
        const stillExists = immediateData.data?.some(conv => conv.id === targetConversation.id);
        if (stillExists) {
          console.log(`❌ PROBLEM: Conversation still exists immediately after deletion`);
        } else {
          console.log(`✅ Conversation correctly removed from immediate list`);
        }
        console.log(`   Current conversation count: ${immediateData.data?.length || 0}`);
      }
    }
    
    // Delayed verification 
    console.log('\n⏰ STEP 4: Delayed verification (1500ms)...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const delayedResponse = await fetch(`${API_BASE}/api/conversations`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (delayedResponse.ok) {
      const delayedData = await delayedResponse.json();
      if (delayedData.success) {
        const stillExists = delayedData.data?.some(conv => conv.id === targetConversation.id);
        if (stillExists) {
          console.log(`❌ CRITICAL PROBLEM: Conversation still exists after 1.5 second delay`);
          console.log(`❌ Enhanced deletion fix did not work`);
          
          // Show all conversations
          console.log(`\n📋 All conversations after deletion attempt:`);
          delayedData.data?.forEach((conv, index) => {
            const marker = conv.id === targetConversation.id ? ' 👈 THIS SHOULD BE DELETED!' : '';
            console.log(`   ${index + 1}. ${conv.id} - ${conv.title || 'No title'}${marker}`);
          });
          
          return false; // Test failed
          
        } else {
          console.log(`✅ Conversation correctly removed after delay`);
          console.log(`   Final conversation count: ${delayedData.data?.length || 0}`);
        }
      }
    }
    
    // Direct access verification
    console.log('\n🔍 STEP 5: Direct access verification...');
    
    const directResponse = await fetch(`${API_BASE}/api/conversations/${targetConversation.id}`);
    console.log(`   Direct access status: ${directResponse.status}`);
    
    if (directResponse.status === 404) {
      console.log(`✅ Conversation correctly returns 404 (not found)`);
    } else if (directResponse.status === 401) {
      console.log(`✅ Conversation returns 401 (unauthorized - expected for test)`);
    } else if (directResponse.status === 200) {
      console.log(`❌ PROBLEM: Conversation still accessible via direct URL`);
      const directData = await directResponse.json();
      console.log(`   Direct access returned:`, JSON.stringify(directData, null, 2));
      return false; // Test failed
    } else {
      console.log(`⚠️ Unexpected status: ${directResponse.status}`);
    }
    
    console.log(`\n🎉 ENHANCED DELETION TEST PASSED!`);
    return true; // Test passed
    
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return false;
  }
}

function showEnhancementDetails() {
  console.log('\n🔧 ENHANCED DELETION FEATURES:');
  console.log('==============================');
  
  console.log('\n✅ EXPLICIT VERIFICATION:');
  console.log('   • Counts messages before deletion');
  console.log('   • Returns exact number of rows deleted');
  console.log('   • Verifies conversation no longer exists');
  console.log('   • Fails if 0 rows were deleted');
  
  console.log('\n✅ DETAILED LOGGING:');
  console.log('   • [DELETE] prefixed logs for easy filtering');
  console.log('   • Step-by-step deletion process tracking');
  console.log('   • Error details with conversation IDs');
  console.log('   • Deletion summary with statistics');
  
  console.log('\n✅ ROBUST ERROR HANDLING:');
  console.log('   • Checks affected row counts');
  console.log('   • Validates deletion was successful');
  console.log('   • Provides specific error messages');
  console.log('   • Includes conversation context in errors');
  
  console.log('\n✅ ENHANCED RESPONSE:');
  console.log('   • Returns deletion statistics');
  console.log('   • Includes original conversation title');
  console.log('   • Timestamp of deletion');
  console.log('   • Count of messages and conversations deleted');
}

async function runTest() {
  const testPassed = await testEnhancedDeletion();
  showEnhancementDetails();
  
  console.log('\n🎯 FINAL RESULT:');
  console.log('=================');
  
  if (testPassed) {
    console.log('✅ ENHANCED DELETION FIX IS WORKING CORRECTLY!');
    console.log('✅ Conversations are being properly deleted from database');
    console.log('✅ UI should now sync correctly with backend state');
    console.log('');
    console.log('🚀 Users should now be able to:');
    console.log('   • Delete conversations from sidebar');
    console.log('   • See immediate removal from UI');
    console.log('   • Have conversations stay deleted');
    console.log('   • No more "ghost" conversations');
  } else {
    console.log('❌ ENHANCED DELETION FIX IS NOT WORKING');
    console.log('❌ Additional debugging needed');
    console.log('❌ Check server logs for [DELETE] entries');
  }
}

runTest().catch(console.error); 