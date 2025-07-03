#!/usr/bin/env node

/**
 * Debug RAG Data Availability
 * Tests what product data is actually available in the RAG system
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugRAGData() {
  console.log('🔍 [RAG-DEBUG] Starting RAG data investigation...');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Get all active stores
    console.log('\n📊 [RAG-DEBUG] 1. Checking stores in database...');
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storesError) {
      console.error('❌ Database error:', storesError);
      return;
    }

    console.log(`✅ Found ${stores?.length || 0} active stores`);
    
    if (stores && stores.length > 0) {
      stores.forEach(store => {
        console.log(`  📦 Store: ${store.name} (ID: ${store.id})`);
        console.log(`      Platform Store ID: ${store.platform_store_id}`);
        console.log(`      Has token: ${!!store.access_token}`);
        console.log(`      Last sync: ${store.last_sync_at || 'Never'}`);
        console.log(`      Created: ${store.created_at}`);
      });
    }

    // 2. Test RAG Engine
    console.log('\n🧠 [RAG-DEBUG] 2. Testing RAG Engine...');
    
    try {
      // Try to use production URL for RAG testing
      console.log('⚠️ Testing via production API endpoint instead of direct import...');
      
      // Use a simple test via the debug endpoint
      const testURL = 'https://fini-tn.vercel.app/api/debug/rag-status';
      const response = await fetch(testURL, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (response.ok) {
        const ragStatus = await response.json();
        console.log('✅ RAG Engine Status (via API):', ragStatus.data || ragStatus);
      } else {
        console.log('⚠️ Could not access RAG via API, trying local test...');
      }
             // 3. Test RAG via diagnosis endpoint for each store
       if (stores && stores.length > 0) {
         console.log('\n🔍 [RAG-DEBUG] 3. Testing RAG data for each store...');
         
         for (const store of stores.slice(0, 2)) { // Test first 2 stores
           console.log(`\n  🏪 Testing store: ${store.name} (${store.id})`);
           
           try {
             // Use the RAG diagnosis endpoint
             const diagnosisURL = `https://fini-tn.vercel.app/api/debug/rag-diagnosis?storeId=${store.id}`;
             const diagnosisResponse = await fetch(diagnosisURL);
             
             if (diagnosisResponse.ok) {
               const diagnosis = await diagnosisResponse.json();
               
               if (diagnosis.success) {
                 const checks = diagnosis.diagnosis.checks;
                 console.log(`    🗄️ Database: ${checks.database?.status || 'unknown'}`);
                 console.log(`    🔑 Token: ${checks.tokenHealth?.status || 'unknown'}`);
                 console.log(`    🔗 API: ${checks.apiConnection?.status || 'unknown'}`);
                 console.log(`    📦 Products: ${checks.apiProducts?.status || 'unknown'} (${checks.apiProducts?.productCount || 0} found)`);
                 console.log(`    🧠 RAG Data: ${checks.ragData?.status || 'unknown'} (${checks.ragData?.documentCount || 0} docs)`);
                 
                 if (checks.apiProducts?.sampleProduct) {
                   console.log(`    📄 Sample Product: ${checks.apiProducts.sampleProduct.name} - $${checks.apiProducts.sampleProduct.firstVariantPrice}`);
                 }
                 
                 console.log(`    💯 Overall Health: ${diagnosis.diagnosis.overallHealth?.status || 'unknown'}`);
               }
             } else {
               console.log(`    ❌ Diagnosis failed: ${diagnosisResponse.status}`);
             }
           } catch (diagnosisError) {
             console.error(`    ❌ Diagnosis error: ${diagnosisError.message}`);
           }
         }
       }

    } catch (ragError) {
      console.error('❌ RAG Engine failed:', ragError.message);
    }

    // 4. Summary
    console.log('\n📋 [RAG-DEBUG] 4. Summary...');
    
    if (stores && stores.length > 0) {
      console.log(`✅ Found ${stores.length} active stores in database`);
      console.log('🔍 Use the diagnosis results above to understand data availability');
      console.log('💡 If RAG shows 0 documents, the Product Manager Agent will only have limited data');
      console.log('🔧 Consider running a manual RAG sync if needed');
    } else {
      console.log('❌ No active stores found - this explains why agents have limited data');
    }

  } catch (error) {
    console.error('❌ [RAG-DEBUG] Failed:', error);
  }
}

// Run the debug
debugRAGData().catch(console.error); 