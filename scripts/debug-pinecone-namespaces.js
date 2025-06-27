#!/usr/bin/env node

/**
 * Debug script to check Pinecone namespace creation
 * Verifies why namespaces might not be showing up in Pinecone
 */

const { createClient } = require('@supabase/supabase-js');

async function debugPineconeNamespaces() {
  console.log('🔍 [DEBUG] Debugging Pinecone namespace initialization...\n');

  try {
    // 1. Check all required environment variables
    console.log('🔑 [DEBUG] Checking environment variables:');
    const envVars = {
      'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
      'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'PINECONE_API_KEY': process.env.PINECONE_API_KEY,
      'PINECONE_INDEX_NAME': process.env.PINECONE_INDEX_NAME,
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY
    };

    let hasAllVars = true;
    Object.entries(envVars).forEach(([name, value]) => {
      if (value) {
        console.log(`  ✅ ${name}: ${value.substring(0, 10)}...${value.substring(value.length - 4)}`);
      } else {
        console.log(`  ❌ ${name}: MISSING`);
        hasAllVars = false;
      }
    });

    if (!hasAllVars) {
      console.log('\n🚨 [ERROR] Missing required environment variables for RAG/Pinecone functionality');
      console.log('Without these, namespace initialization will fail silently.');
      return;
    }

    // 2. Test Supabase connection
    console.log('\n🗄️ [DEBUG] Testing Supabase connection...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get recent stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, user_id, created_at, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (storesError) {
      console.log(`❌ [ERROR] Failed to fetch stores: ${storesError.message}`);
      return;
    }

    if (!stores || stores.length === 0) {
      console.log('⚠️ [WARNING] No active stores found.');
      console.log('Create a store to trigger namespace initialization.');
      return;
    }

    console.log(`✅ [SUCCESS] Found ${stores.length} recent active stores:`);
    stores.forEach((store, index) => {
      const createdDate = new Date(store.created_at);
      const isRecent = (Date.now() - createdDate.getTime()) < (24 * 60 * 60 * 1000); // 24 hours
      console.log(`  ${index + 1}. ${store.name} (ID: ${store.id})`);
      console.log(`     Created: ${createdDate.toISOString()} ${isRecent ? '🆕 RECENT' : ''}`);
      console.log(`     User: ${store.user_id}`);
    });

    // 3. Check for recent store creations (these should have triggered namespace init)
    const recentStores = stores.filter(store => {
      const createdDate = new Date(store.created_at);
      return (Date.now() - createdDate.getTime()) < (24 * 60 * 60 * 1000);
    });

    if (recentStores.length > 0) {
      console.log(`\n🆕 [DEBUG] Found ${recentStores.length} stores created in the last 24 hours:`);
      recentStores.forEach(store => {
        console.log(`  - ${store.name} (${store.id})`);
        console.log(`    Expected namespaces:`);
        console.log(`      • store-${store.id}`);
        console.log(`      • store-${store.id}-products`);
        console.log(`      • store-${store.id}-orders`);
        console.log(`      • store-${store.id}-customers`);
        console.log(`      • store-${store.id}-analytics`);
        console.log(`      • store-${store.id}-conversations`);
      });
    } else {
      console.log('\n⏰ [INFO] No stores created in the last 24 hours.');
      console.log('Create a new store to test namespace initialization.');
    }

    // 4. Manual Pinecone API check (if we can access it)
    console.log('\n🌲 [DEBUG] Testing Pinecone API access...');
    
    try {
      // Simple fetch to Pinecone API to check if credentials work
      const pineconeResponse = await fetch(`https://api.pinecone.io/indexes`, {
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY
        }
      });

      if (pineconeResponse.ok) {
        const indexes = await pineconeResponse.json();
        console.log(`✅ [SUCCESS] Pinecone API accessible. Found ${indexes.indexes?.length || 0} indexes.`);
        
        // Check if our index exists
        const ourIndex = indexes.indexes?.find(idx => idx.name === process.env.PINECONE_INDEX_NAME);
        if (ourIndex) {
          console.log(`✅ [SUCCESS] Index '${process.env.PINECONE_INDEX_NAME}' found.`);
          console.log(`   Status: ${ourIndex.status?.ready ? 'Ready' : ourIndex.status?.state || 'Unknown'}`);
          console.log(`   Dimension: ${ourIndex.dimension}`);
          console.log(`   Metric: ${ourIndex.metric}`);
        } else {
          console.log(`❌ [ERROR] Index '${process.env.PINECONE_INDEX_NAME}' not found.`);
          console.log('Available indexes:', indexes.indexes?.map(idx => idx.name) || []);
        }
      } else {
        console.log(`❌ [ERROR] Pinecone API error: ${pineconeResponse.status} ${pineconeResponse.statusText}`);
        const errorBody = await pineconeResponse.text();
        console.log(`Error details: ${errorBody}`);
      }
    } catch (pineconeError) {
      console.log(`❌ [ERROR] Failed to access Pinecone API: ${pineconeError.message}`);
    }

    // 5. Provide debugging guidance
    console.log('\n🔧 [DEBUGGING GUIDE]:');
    console.log('\n1. **Check Vercel Function Logs** for these messages:');
    console.log('   • "[DEBUG] Starting async namespace initialization for store: [ID]"');
    console.log('   • "[RAG:engine] Initializing namespaces for store: [ID]"');
    console.log('   • "[SUCCESS] RAG namespaces initialized for store: [ID]"');
    console.log('   • "[WARNING] RAG namespace initialization failed..." (if RAG not configured)');

    console.log('\n2. **Check Pinecone Console** (https://app.pinecone.io):');
    console.log('   • Go to your index dashboard');
    console.log('   • Look for namespaces in the "Browse" or "Index" section');
    console.log('   • Search for namespace patterns like "store-[ID]-*"');

    console.log('\n3. **Expected Behavior**:');
    console.log('   • Creating a new store triggers StoreService.createStore()');
    console.log('   • This calls initializeStoreNamespacesAsync() fire-and-forget');
    console.log('   • RAG engine creates placeholder docs in 6 namespaces');
    console.log('   • Placeholders are cleaned up after 100ms');
    console.log('   • Namespaces remain ready for use');

    console.log('\n4. **Common Issues**:');
    console.log('   • Missing environment variables → Silent failure');
    console.log('   • Pinecone API issues → Error logs in Vercel');
    console.log('   • OpenAI API issues → Error during embedding generation');
    console.log('   • Network timeouts → Async operation fails silently');

    console.log('\n5. **Manual Test**:');
    console.log('   • Create a new store in the dashboard');
    console.log('   • Check Vercel function logs immediately');
    console.log('   • Wait 1-2 minutes, then check Pinecone console');
    console.log('   • Should see 6 new namespaces for the store');

    console.log('\n6. **Force Trigger Test**:');
    if (stores.length > 0) {
      console.log(`   • Test with existing store: ${stores[0].name} (${stores[0].id})`);
      console.log(`   • Call: POST /api/stores/${stores[0].id} with update data`);
      console.log(`   • This should trigger namespace initialization`);
    }

    console.log('\n📊 [SUMMARY]:');
    console.log(`   ✅ Environment: ${hasAllVars ? 'Configured' : 'Missing variables'}`);
    console.log(`   ✅ Database: ${stores.length} active stores`);
    console.log(`   ✅ Recent stores: ${recentStores.length} in last 24h`);
    console.log(`   🔍 Next step: Check Vercel logs for namespace initialization`);

  } catch (error) {
    console.error('💥 [ERROR] Script failed:', error);
    console.log('\nThis could indicate:');
    console.log('• Database connection issues');
    console.log('• Environment variable problems');
    console.log('• Network connectivity issues');
  }
}

// Run if called directly
if (require.main === module) {
  debugPineconeNamespaces().catch(console.error);
}

module.exports = { debugPineconeNamespaces }; 