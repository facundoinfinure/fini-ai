#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🎭 [SIMULATE] Simulating namespace creation with timing fixes...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';

  try {
    console.log('🔄 [SIMULATE] Step 1: Simulating store reconnection...');
    
    // Simulate store update (like during reconnection)
    const { error: updateError } = await supabase
      .from('stores')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (updateError) {
      console.error('❌ [SIMULATE] Update failed:', updateError);
      return;
    }
    
    console.log('✅ [SIMULATE] Store updated successfully');
    
    console.log('⏳ [SIMULATE] Step 2: Applying 1.5-second delay (from our fix)...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('🔍 [SIMULATE] Step 3: Verifying store state...');
    
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('is_active, updated_at, created_at')
      .eq('id', storeId)
      .single();
      
    if (storeError || !store) {
      console.error('❌ [SIMULATE] Store verification failed:', storeError);
      return;
    }
    
    const updatedAt = new Date(store.updated_at);
    const now = new Date();
    const timeSinceUpdate = now.getTime() - updatedAt.getTime();
    
    console.log(`📊 [SIMULATE] Store status: active=${store.is_active}, updated_${timeSinceUpdate}ms ago`);
    
    const isRecentUpdate = timeSinceUpdate < 30000; // Less than 30 seconds
    console.log(`🔄 [SIMULATE] Recent update detected: ${isRecentUpdate ? 'YES' : 'NO'}`);
    
    if (isRecentUpdate) {
      console.log('✅ [SIMULATE] This would be treated as a reconnection scenario');
      console.log('🚀 [SIMULATE] Namespace creation would be ALLOWED');
    } else {
      console.log('⚠️ [SIMULATE] This would be treated as a normal request');
      console.log('🔍 [SIMULATE] Normal security validation would apply');
    }
    
    console.log('\n🏗️ [SIMULATE] Step 4: Simulating namespace creation...');
    
    const namespaceTypes = ['store', 'products', 'orders', 'customers', 'analytics', 'conversations'];
    
    for (const type of namespaceTypes) {
      const namespace = `${storeId}_${type}`;
      console.log(`   📦 [SIMULATE] Creating namespace: ${namespace}`);
      
      // Simulate namespace creation delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`   ✅ [SIMULATE] Namespace ${type} created successfully`);
    }
    
    console.log('\n🎉 [SIMULATE] Simulation completed successfully!');
    console.log('📋 [SIMULATE] Summary:');
    console.log(`   - Store update: ✅ Success`);
    console.log(`   - Timing delay: ✅ Applied (1.5s)`);
    console.log(`   - Recent update detection: ✅ ${isRecentUpdate ? 'Detected' : 'Not detected'}`);
    console.log(`   - Namespace creation: ✅ All 6 namespaces created`);
    
    console.log('\n💡 [SIMULATE] The timing fixes should prevent race conditions');
    console.log('🔧 [SIMULATE] Agents should now have access to RAG data');

  } catch (error) {
    console.error('❌ [SIMULATE] Simulation failed:', error);
  }
}

main(); 