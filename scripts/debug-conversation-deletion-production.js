#!/usr/bin/env node

/**
 * Debug Script: Conversation Deletion in Production
 * 
 * Este script identifica exactamente por qué las conversaciones 
 * no se están eliminando correctamente del backend.
 */

const API_BASE = 'https://fini-ai.vercel.app';

console.log('🔍 DEBUGGING: Conversation Deletion Production Issue');
console.log('==================================================');

async function debugConversationDeletion() {
  console.log('\n📋 STEP 1: Listar conversaciones actuales');
  
  try {
    // 1. Get current conversations list
    const listResponse = await fetch(`${API_BASE}/api/conversations`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!listResponse.ok) {
      console.log(`❌ Error listing conversations: ${listResponse.status}`);
      return;
    }
    
    const listData = await listResponse.json();
    
    if (!listData.success || !listData.data || listData.data.length === 0) {
      console.log('❌ No conversations found or invalid response');
      return;
    }
    
    const conversations = listData.data;
    console.log(`✅ Found ${conversations.length} conversations`);
    
    // Pick first conversation to test deletion
    const targetConversation = conversations[0];
    console.log(`\n🎯 TARGET: ${targetConversation.id}`);
    console.log(`   Title: ${targetConversation.title || 'No title'}`);
    console.log(`   Created: ${targetConversation.created_at || 'Unknown'}`);
    
    // 2. Detailed DELETE request with debugging
    console.log('\n🗑️ STEP 2: Ejecutar DELETE con debugging detallado');
    
    const startTime = Date.now();
    
    const deleteResponse = await fetch(`${API_BASE}/api/conversations/${targetConversation.id}`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    const deleteTime = Date.now() - startTime;
    
    console.log(`   Delete request took: ${deleteTime}ms`);
    console.log(`   Response status: ${deleteResponse.status}`);
    console.log(`   Response headers:`, Object.fromEntries(deleteResponse.headers.entries()));
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.log(`❌ DELETE failed with status ${deleteResponse.status}`);
      console.log(`   Error body: ${errorText}`);
      return;
    }
    
    const deleteData = await deleteResponse.json();
    console.log(`   Response body:`, JSON.stringify(deleteData, null, 2));
    
    if (!deleteData.success) {
      console.log(`❌ Backend reported deletion failure: ${deleteData.error}`);
      return;
    }
    
    console.log(`✅ Backend reported successful deletion`);
    
    // 3. Immediate verification (no delay)
    console.log('\n⚡ STEP 3: Verificación inmediata (0ms delay)');
    
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
      }
    }
    
    // 4. Delayed verification (similar to frontend)
    console.log('\n⏰ STEP 4: Verificación con delay (1000ms)');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
          console.log(`❌ CRITICAL PROBLEM: Conversation still exists after 1 second delay`);
          console.log(`   This confirms the backend deletion is not working`);
          
          // Show all conversations for debugging
          console.log(`\n📋 All conversations after deletion attempt:`);
          delayedData.data?.forEach((conv, index) => {
            const marker = conv.id === targetConversation.id ? ' 👈 THIS SHOULD BE DELETED' : '';
            console.log(`   ${index + 1}. ${conv.id} - ${conv.title || 'No title'}${marker}`);
          });
          
        } else {
          console.log(`✅ Conversation correctly removed after delay`);
        }
      }
    }
    
    // 5. Try to access deleted conversation directly
    console.log('\n🔍 STEP 5: Verificar acceso directo a conversación');
    
    const directResponse = await fetch(`${API_BASE}/api/conversations/${targetConversation.id}`);
    console.log(`   Direct access status: ${directResponse.status}`);
    
    if (directResponse.status === 404) {
      console.log(`✅ Conversation correctly returns 404`);
    } else if (directResponse.status === 200) {
      console.log(`❌ PROBLEM: Conversation still accessible via direct URL`);
      const directData = await directResponse.json();
      console.log(`   Direct access data:`, JSON.stringify(directData, null, 2));
    } else {
      console.log(`⚠️ Unexpected status: ${directResponse.status}`);
    }
    
  } catch (error) {
    console.error(`❌ Script error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
}

function diagnosePotentialIssues() {
  console.log('\n🔧 POTENTIAL ISSUES ANALYSIS:');
  console.log('=============================');
  
  console.log('\n1️⃣ FOREIGN KEY CONSTRAINTS:');
  console.log('   • Mensajes deben eliminarse antes que conversaciones');
  console.log('   • Podrían existir otras tablas que referencian conversations');
  console.log('   • RLS policies podrían estar bloqueando eliminación');
  
  console.log('\n2️⃣ TRANSACTION ISSUES:');
  console.log('   • Eliminación de mensajes + conversación no está en transacción');
  console.log('   • Si falla conversación, mensajes quedan huérfanos');
  console.log('   • Race conditions entre multiple requests');
  
  console.log('\n3️⃣ SUPABASE RLS POLICIES:');
  console.log('   • Policies podrían estar impidiendo DELETE');
  console.log('   • user_id matching podría fallar');
  console.log('   • Policies inconsistentes entre SELECT y DELETE');
  
  console.log('\n4️⃣ CACHE/TIMING ISSUES:');
  console.log('   • Supabase cache no actualizándose inmediatamente');
  console.log('   • Database replication lag');
  console.log('   • Connection pooling issues');
  
  console.log('\n5️⃣ AUTHENTICATION ISSUES:');
  console.log('   • Token expiration durante operación');
  console.log('   • User ID mismatch');
  console.log('   • Service role vs anon key confusion');
}

function suggestFixes() {
  console.log('\n🛠️ SUGGESTED FIXES:');
  console.log('====================');
  
  console.log('\n✅ FIX 1: USE TRANSACTIONS');
  console.log('   • Wrap deletion in Supabase transaction');
  console.log('   • Ensure atomicity of messages + conversation deletion');
  
  console.log('\n✅ FIX 2: ENHANCED ERROR HANDLING');
  console.log('   • Check exact Supabase error codes');
  console.log('   • Log detailed deletion results');
  console.log('   • Verify affected row counts');
  
  console.log('\n✅ FIX 3: FORCE VERIFICATION');
  console.log('   • Query database immediately after deletion');
  console.log('   • Return actual confirmation of deletion');
  console.log('   • Don\'t trust simple "no error" responses');
  
  console.log('\n✅ FIX 4: CASCADE DELETION');
  console.log('   • Add ON DELETE CASCADE to foreign keys');
  console.log('   • Or implement proper cascade deletion logic');
  
  console.log('\n✅ FIX 5: RLS POLICY AUDIT');
  console.log('   • Review all RLS policies on conversations table');
  console.log('   • Ensure DELETE policies match SELECT policies');
}

async function runDiagnosis() {
  await debugConversationDeletion();
  diagnosePotentialIssues();
  suggestFixes();
  
  console.log('\n🎯 CONCLUSION:');
  console.log('===============');
  console.log('Ejecuta este script y revisa los resultados para identificar');
  console.log('exactamente dónde está fallando la eliminación en producción.');
  console.log('');
  console.log('Luego implementaremos el fix específico basado en los hallazgos.');
}

runDiagnosis().catch(console.error); 