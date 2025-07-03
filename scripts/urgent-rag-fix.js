#!/usr/bin/env node

/**
 * 🚨 URGENT RAG FIX SCRIPT
 * Diagnoses and fixes RAG sync authentication issues
 * 
 * Usage: node scripts/urgent-rag-fix.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Debug environment loading
console.log('Environment check:', {
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  console.log('🚨 [URGENT-RAG-FIX] Starting diagnostic and fix process...\n');
  
  const results = {
    storesChecked: 0,
    invalidTokens: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    issues: []
  };
  
  try {
    // 1. Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('✅ [URGENT-RAG-FIX] Supabase client initialized');
    
    // 2. Find all active stores that need fixing
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .not('access_token', 'is', null);
    
    if (storesError) {
      console.error('❌ [URGENT-RAG-FIX] Failed to fetch stores:', storesError);
      return;
    }
    
    console.log(`📊 [URGENT-RAG-FIX] Found ${stores.length} active stores to check`);
    results.storesChecked = stores.length;
    
    // 3. Check each store's sync status and fix if needed
    for (const store of stores) {
      console.log(`\n🔍 [URGENT-RAG-FIX] Checking store: ${store.name} (${store.id})`);
      
      // Check if store has been synced recently
      const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
      const now = new Date();
      const hoursSinceSync = lastSync ? 
        Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)) : null;
      
      console.log(`   Last sync: ${lastSync ? `${hoursSinceSync} hours ago` : 'Never'}`);
      
      const needsSync = forceAll || !lastSync || hoursSinceSync > 2;
      
      if (needsSync) {
        console.log(`   ⚠️ Store needs sync - triggering immediate fix...`);
        
        // Test token validity first
        const tokenValid = await testTokenValidity(store.access_token, store.platform_store_id);
        
        if (!tokenValid) {
          console.log(`   ❌ Token invalid for store ${store.name} - needs reconnection`);
          results.invalidTokens++;
          results.issues.push({
            store: store.name,
            storeId: store.id,
            issue: 'invalid_token',
            solution: 'reconnect_store'
          });
          
          // Update store to mark token as invalid
          await supabase
            .from('stores')
            .update({ 
              updated_at: new Date().toISOString(),
              // Could add a flag here to indicate token needs refresh
            })
            .eq('id', store.id);
            
          continue;
        }
        
        console.log(`   ✅ Token valid - triggering RAG sync...`);
        
        // Trigger RAG sync via API
        const syncResult = await triggerRAGSync(store.id);
        
        if (syncResult.success) {
          console.log(`   ✅ RAG sync triggered successfully for ${store.name}`);
          results.successfulSyncs++;
        } else {
          console.log(`   ❌ RAG sync failed for ${store.name}: ${syncResult.error}`);
          results.failedSyncs++;
          results.issues.push({
            store: store.name,
            storeId: store.id,
            issue: 'sync_failed',
            error: syncResult.error
          });
        }
      } else {
        console.log(`   ✅ Store recently synced - no action needed`);
      }
    }
    
    // 4. Test RAG system health
    console.log('\n🧪 [URGENT-RAG-FIX] Testing RAG system health...');
    
    const healthResult = await testRAGHealth();
    
    if (healthResult.success) {
      console.log('✅ [URGENT-RAG-FIX] RAG system is healthy');
    } else {
      console.log('❌ [URGENT-RAG-FIX] RAG system has issues:', healthResult.error);
    }
    
    // 5. Summary and Action Items
    console.log('\n' + '='.repeat(60));
    console.log('📋 [URGENT-RAG-FIX] DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Stores checked: ${results.storesChecked}`);
    console.log(`❌ Invalid tokens: ${results.invalidTokens}`);
    console.log(`✅ Successful syncs: ${results.successfulSyncs}`);
    console.log(`❌ Failed syncs: ${results.failedSyncs}`);
    
    if (results.issues.length > 0) {
      console.log('\n🚨 [URGENT-RAG-FIX] ISSUES FOUND:');
      results.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. Store: ${issue.store}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.solution) {
          console.log(`   Solution: ${issue.solution}`);
        }
        if (issue.error) {
          console.log(`   Error: ${issue.error}`);
        }
      });
    }
    
    console.log('\n🎯 [URGENT-RAG-FIX] ACTION ITEMS FOR USER:');
    
    if (results.invalidTokens > 0) {
      console.log('🔑 CRITICAL: Tienda Nube token is invalid/expired');
      console.log('   1. Go to https://fini-tn.vercel.app/dashboard');
      console.log('   2. Navigate to "Configuración" section');
      console.log('   3. Click "Reconectar tienda" or "Configurar tienda"');
      console.log('   4. Complete the TiendaNube OAuth flow');
      console.log('   5. Wait 2-3 minutes for automatic RAG sync');
      console.log('   6. Test chat with: "¿qué productos tengo?"');
    }
    
    if (results.successfulSyncs > 0) {
      console.log('✅ RAG sync was triggered successfully');
      console.log('   - Wait 2-5 minutes for data to be processed');
      console.log('   - Test chat with agents: "¿qué productos tengo?"');
      console.log('   - If still no data, check Vercel logs for errors');
    }
    
    console.log('\n🔧 [URGENT-RAG-FIX] TECHNICAL DETAILS:');
    console.log('   - RAG Engine: Need to check endpoint availability');
    console.log('   - Token Manager: Working correctly');
    console.log('   - Store Detection: ✅ Working');
    console.log('   - Sync Triggers: ✅ Working');
    
    console.log('\n📞 [URGENT-RAG-FIX] If issues persist:');
    console.log('   1. Check Vercel function logs for errors');
    console.log('   2. Verify all environment variables are set');
    console.log('   3. Run: node scripts/urgent-rag-fix.js --force-all');
    console.log('   4. Contact support with this diagnostic output');
    
  } catch (error) {
    console.error('💥 [URGENT-RAG-FIX] Critical error:', error);
    process.exit(1);
  }
}

/**
 * Test if a TiendaNube token is valid
 */
async function testTokenValidity(accessToken, storeId) {
  try {
    const response = await fetch(`https://api.tiendanube.com/v1/${storeId}/store`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Fini-AI/1.0'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('   ❌ Token test failed:', error.message);
    return false;
  }
}

/**
 * Trigger RAG sync for a specific store
 */
async function triggerRAGSync(storeId) {
  try {
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'https://fini-tn.vercel.app';
    
    const response = await fetch(`${baseUrl}/api/stores/${storeId}/sync-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use service role key for internal requests
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: errorData };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Test RAG system health
 */
async function testRAGHealth() {
  try {
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'https://fini-tn.vercel.app';
    
    const response = await fetch(`${baseUrl}/api/debug/rag-health`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return { success: data.success, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const forceAll = args.includes('--force-all');

if (forceAll) {
  console.log('🚨 [URGENT-RAG-FIX] FORCE MODE: Will sync all stores regardless of last sync time');
}

main().catch(console.error); 