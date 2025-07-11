import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * 🐛 DEBUG ENDPOINT: Fix Pinecone Namespaces
 * ==========================================
 * 
 * Manually triggers namespace creation for stores that have 0 namespaces in Pinecone.
 * This helps diagnose and fix the sync issues between Tienda Nube, Supabase, and Pinecone.
 * 
 * Usage: POST /api/debug/fix-pinecone-namespaces
 * Body: { storeId?: string } (optional - if not provided, fixes all stores)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] 🐛 Starting Pinecone namespace fix...');
    
    const supabase = createServiceClient(); // Use service client for admin operations
    
    // 🚨 DEVELOPMENT BYPASS: Allow testing without auth in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    let userId = null;
    
    if (!isDevelopment) {
      // Get current user session for security (using regular client)
      const userClient = createClient();
      const { data: { session }, error: sessionError } = await userClient.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.error('[DEBUG] ❌ No authenticated user found:', sessionError);
        return NextResponse.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }
      userId = session.user.id;
    } else {
      console.log('[DEBUG] 🚨 Development mode: Bypassing authentication');
      // In development, we'll get the first user from the database
      const { data: firstUser } = await supabase
        .from('stores')
        .select('user_id')
        .limit(1)
        .single();
      
      if (firstUser) {
        userId = firstUser.user_id;
        console.log(`[DEBUG] 🔧 Using development user ID: ${userId}`);
      } else {
        console.log('[DEBUG] ⚠️ No user found, will process all stores');
      }
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { storeId } = body;

    // Get stores to fix
    let stores;
    if (storeId) {
      // Fix specific store
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
        
      if (error || !store) {
        return NextResponse.json({
          success: false,
          error: `Store not found: ${storeId}. Error: ${error?.message || 'Not found'}`
        }, { status: 404 });
      }
      
      // In production, verify ownership
      if (!isDevelopment && userId && store.user_id !== userId) {
        return NextResponse.json({
          success: false,
          error: `Unauthorized: Store ${storeId} does not belong to user ${userId}`
        }, { status: 403 });
      }
      
      stores = [store];
    } else {
      // Fix all stores (filtered by user in production)
      let query = supabase
        .from('stores')
        .select('*')
        .eq('platform', 'tiendanube')
        .eq('is_active', true);
        
      // Only filter by user_id in production
      if (!isDevelopment && userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data: allStores, error } = await query;
        
      console.log(`[DEBUG] 🔍 Query results: found ${allStores?.length || 0} stores`);
      console.log(`[DEBUG] 🔍 Query error:`, error);
      console.log(`[DEBUG] 🔍 Development mode:`, isDevelopment);
      console.log(`[DEBUG] 🔍 User ID used:`, userId);
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: `Failed to fetch stores: ${error.message}`
        }, { status: 500 });
      }
      
      stores = allStores || [];
    }

    console.log(`[DEBUG] 🏪 Final stores count: ${stores.length}`);
    if (stores.length > 0) {
      console.log(`[DEBUG] 🏪 Stores to process:`, stores.map(s => ({ id: s.id, name: s.name, active: s.is_active })));
    }

    if (stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stores found to fix',
        results: []
      });
    }

    console.log(`[DEBUG] 🔧 Fixing namespaces for ${stores.length} store(s)...`);

    const results = [];
    
    // Import RAG engine dynamically
    const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
    const ragEngine = getUnifiedRAGEngine();

    for (const store of stores) {
      const storeResult = {
        storeId: store.id,
        storeName: store.name,
        success: false,
        operations: [] as string[],
        error: null as string | null
      };

      try {
        console.log(`[DEBUG] 🏪 Processing store: ${store.name} (${store.id})`);
        
        // Step 1: Force namespace initialization
        console.log(`[DEBUG] 🏗️ Initializing namespaces for ${store.id}...`);
        const namespaceResult = await ragEngine.initializeStoreNamespaces(store.id);
        
        if (namespaceResult.success) {
          storeResult.operations.push('✅ Namespaces initialized');
          console.log(`[DEBUG] ✅ Namespaces created for ${store.name}`);
          
          // Step 2: Index store data if we have a valid token
          if (store.access_token) {
            try {
              console.log(`[DEBUG] 📊 Indexing store data for ${store.id}...`);
              const indexResult = await ragEngine.indexStoreData(store.id, store.access_token);
              
              if (indexResult.success) {
                storeResult.operations.push(`✅ Indexed ${indexResult.documentsIndexed} documents`);
                console.log(`[DEBUG] ✅ Indexed ${indexResult.documentsIndexed} documents for ${store.name}`);
              } else {
                storeResult.operations.push(`⚠️ Partial indexing: ${indexResult.error}`);
                console.log(`[DEBUG] ⚠️ Partial indexing for ${store.name}: ${indexResult.error}`);
              }
            } catch (indexError) {
              storeResult.operations.push(`❌ Indexing failed: ${indexError instanceof Error ? indexError.message : 'Unknown error'}`);
              console.log(`[DEBUG] ❌ Indexing failed for ${store.name}:`, indexError);
            }
          } else {
            storeResult.operations.push('⚠️ No access token - namespaces created but no data indexed');
            console.log(`[DEBUG] ⚠️ No access token for ${store.name} - only namespaces created`);
          }
          
          // Step 3: Update last sync timestamp
          await supabase
            .from('stores')
            .update({ 
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', store.id);
            
          storeResult.operations.push('✅ Sync timestamp updated');
          storeResult.success = true;
          
        } else {
          storeResult.error = `Namespace initialization failed: ${namespaceResult.error}`;
          storeResult.operations.push(`❌ Namespace initialization failed: ${namespaceResult.error}`);
          console.log(`[DEBUG] ❌ Namespace initialization failed for ${store.name}: ${namespaceResult.error}`);
        }

      } catch (error) {
        storeResult.error = error instanceof Error ? error.message : 'Unknown error';
        storeResult.operations.push(`❌ Fatal error: ${storeResult.error}`);
        console.error(`[DEBUG] ❌ Fatal error processing ${store.name}:`, error);
      }

      results.push(storeResult);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[DEBUG] 🎉 Fix completed: ${successCount} success, ${failureCount} failures`);

    return NextResponse.json({
      success: true,
      message: `Namespace fix completed: ${successCount} stores fixed, ${failureCount} failures`,
      summary: {
        totalStores: stores.length,
        successCount,
        failureCount
      },
      results
    });

  } catch (error) {
    console.error('[DEBUG] ❌ Fatal error in namespace fix:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 