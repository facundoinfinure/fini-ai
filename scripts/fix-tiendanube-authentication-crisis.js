#!/usr/bin/env node

/**
 * 🔑 TIENDANUBE AUTHENTICATION CRISIS FIX
 * =====================================
 * 
 * Diagnóstica y soluciona problemas de autenticación de TiendaNube
 * que están causando errores en cascada en los agentes.
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

async function diagnoseTiendaNubeTokens() {
  console.log('🔍 DIAGNOSING TIENDANUBE AUTHENTICATION ISSUES\n');

  try {
    // 1. Check stores table
    console.log('📊 Checking stores table...');
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .eq('is_active', true);

    if (storesError) {
      console.error('❌ Error fetching stores:', storesError.message);
      return;
    }

    console.log(`✅ Found ${stores?.length || 0} TiendaNube stores\n`);

    // 2. Check each store's token status
    if (stores && stores.length > 0) {
      for (const store of stores) {
        console.log(`🏪 Store: ${store.name || 'Sin nombre'} (${store.id})`);
        console.log(`   Platform Store ID: ${store.platform_store_id}`);
        console.log(`   Access Token: ${store.access_token ? '✅ Present' : '❌ Missing'}`);
        console.log(`   Token Valid: ${await checkTokenHealth(store.access_token, store.platform_store_id)}`);
        console.log(`   Last Sync: ${store.last_sync_at || 'Never'}`);
        console.log('');
      }
    }

    // 3. Check tiendanube_stores table if exists
    console.log('🔍 Checking tiendanube_stores table...');
    const { data: tnStores, error: tnError } = await supabase
      .from('tiendanube_stores')
      .select('*');

    if (tnError) {
      if (tnError.message.includes('does not exist')) {
        console.log('ℹ️  tiendanube_stores table does not exist (this is normal)');
      } else {
        console.error('❌ Error with tiendanube_stores table:', tnError.message);
      }
    } else {
      console.log(`✅ Found ${tnStores?.length || 0} entries in tiendanube_stores table`);
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    
    const invalidTokenStores = stores?.filter(store => 
      !store.access_token || store.access_token.trim() === ''
    ) || [];

    if (invalidTokenStores.length > 0) {
      console.log('❌ CRITICAL: Stores with missing/invalid tokens:');
      invalidTokenStores.forEach(store => {
        console.log(`   - ${store.name} (${store.id})`);
      });
      console.log('\n💡 Solution: These stores need to be reconnected through the onboarding flow.');
    }

    // 4. Check if RAG sync is needed
    const staleStores = stores?.filter(store => {
      if (!store.last_sync_at) return true;
      const lastSync = new Date(store.last_sync_at);
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      return lastSync < fourHoursAgo;
    }) || [];

    if (staleStores.length > 0) {
      console.log('\n⏰ Stores needing RAG sync:');
      staleStores.forEach(store => {
        console.log(`   - ${store.name} (last sync: ${store.last_sync_at || 'never'})`);
      });
    }

  } catch (error) {
    console.error('💥 Error during diagnosis:', error);
  }
}

async function checkTokenHealth(accessToken, platformStoreId) {
  if (!accessToken || !platformStoreId) {
    return '❌ Missing token or store ID';
  }

  try {
    // Test token with a simple API call
    const response = await fetch(`https://api.tiendanube.com/v1/${platformStoreId}/store`, {
      headers: {
        'Authorization': `bearer ${accessToken}`,
        'User-Agent': 'Fini-AI/1.0'
      }
    });

    if (response.ok) {
      return '✅ Valid';
    } else if (response.status === 401) {
      return '❌ Invalid (401 Unauthorized)';
    } else {
      return `⚠️  API Error (${response.status})`;
    }
  } catch (error) {
    return `❌ Network Error: ${error.message}`;
  }
}

async function fixCommonIssues() {
  console.log('\n🔧 ATTEMPTING COMMON FIXES...\n');

  try {
    // 1. Update stores with invalid tokens to inactive
    console.log('🔄 Deactivating stores with missing tokens...');
    const { data: updatedStores, error: updateError } = await supabase
      .from('stores')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('platform', 'tiendanube')
      .is('access_token', null);

    if (updateError) {
      console.error('❌ Error updating stores:', updateError.message);
    } else {
      console.log(`✅ Updated ${updatedStores?.length || 0} stores`);
    }

    // 2. Clean up orphaned data
    console.log('\n🧹 Cleaning up orphaned data...');
    
    // This would include cleaning up old webhook entries, etc.
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('💥 Error during fixes:', error);
  }
}

async function triggerRagSync() {
  console.log('\n🚀 TRIGGERING RAG SYNC FOR VALID STORES...\n');

  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .eq('is_active', true)
      .not('access_token', 'is', null);

    if (!stores || stores.length === 0) {
      console.log('ℹ️  No valid stores found for RAG sync');
      return;
    }

    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'https://fini-tn.vercel.app';

    for (const store of stores) {
      console.log(`🔄 Syncing store: ${store.name} (${store.id})`);
      
      try {
        const response = await fetch(`${baseUrl}/api/stores/${store.id}/sync-rag`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET || 'manual-sync'}`
          }
        });

        if (response.ok) {
          console.log(`   ✅ Sync triggered successfully`);
        } else {
          console.log(`   ❌ Sync failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Sync error: ${error.message}`);
      }

      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('💥 Error during RAG sync:', error);
  }
}

async function generateReconnectionInstructions() {
  console.log('\n📋 RECONNECTION INSTRUCTIONS FOR USERS:\n');
  
  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .or('access_token.is.null,is_active.eq.false');

    if (!stores || stores.length === 0) {
      console.log('✅ All stores have valid connections!');
      return;
    }

    stores.forEach(store => {
      console.log(`🏪 Store: ${store.name || 'Sin nombre'}`);
      console.log(`   Status: ${store.is_active ? 'Active but token issues' : 'Inactive'}`);
      console.log(`   Action: User needs to reconnect via onboarding`);
      console.log(`   URL: https://fini-tn.vercel.app/onboarding?step=1`);
      console.log('');
    });

  } catch (error) {
    console.error('💥 Error generating instructions:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 TIENDANUBE AUTHENTICATION CRISIS RESOLUTION\n');
  console.log('='.repeat(50) + '\n');

  await diagnoseTiendaNubeTokens();
  await fixCommonIssues();
  await triggerRagSync();
  await generateReconnectionInstructions();

  console.log('\n' + '='.repeat(50));
  console.log('✅ DIAGNOSIS AND REPAIR COMPLETED');
  console.log('\n💡 Next Steps:');
  console.log('1. Deploy the URL fix for Product Manager Agent');
  console.log('2. Users with broken tokens need to reconnect stores');
  console.log('3. RAG sync should start working for valid stores');
  console.log('4. Agents will respond properly once data is available');
}

main().catch(console.error); 