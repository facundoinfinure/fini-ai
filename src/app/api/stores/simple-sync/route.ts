import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUnifiedRAGEngine } from '@/lib/rag';

/**
 * Simple sync endpoint for store data
 * POST /api/stores/simple-sync
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[SIMPLE-SYNC] 🔄 Starting store sync');
    
    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[SIMPLE-SYNC] ❌ Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storeId } = body;
    
    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la tienda pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id, name, access_token')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      console.error('[SIMPLE-SYNC] ❌ Store not found or unauthorized:', storeError?.message);
      return NextResponse.json(
        { success: false, error: 'Store not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if store has access token
    if (!store.access_token) {
      return NextResponse.json(
        { success: false, error: 'Store missing access token - cannot sync data' },
        { status: 400 }
      );
    }

    console.log(`[SIMPLE-SYNC] ✅ Starting sync for store: ${storeId} (${store.name})`);

    // Trigger async sync using unified RAG engine (fire-and-forget)
    try {
      const ragEngine = getUnifiedRAGEngine();
      
      // Initialize namespaces and sync data in background
      setTimeout(async () => {
        try {
          console.log(`[SIMPLE-SYNC] 🔄 Initializing namespaces for store: ${storeId}`);
          await ragEngine.initializeStoreNamespaces(storeId);
          
          console.log(`[SIMPLE-SYNC] 📊 Indexing store data for store: ${storeId}`);
          await ragEngine.indexStoreData(storeId, store.access_token);
          
          // Update last_sync_at timestamp
          await supabase
            .from('stores')
            .update({ 
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', storeId);
          
          console.log(`[SIMPLE-SYNC] ✅ Sync completed successfully for store: ${storeId}`);
        } catch (error) {
          console.error(`[SIMPLE-SYNC] ❌ Sync failed for store ${storeId}:`, error);
        }
      }, 200); // Fire and forget with minimal delay

    } catch (error) {
      console.warn('[SIMPLE-SYNC] ⚠️ Sync initialization failed, continuing anyway:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Store sync started successfully',
      data: {
        storeId,
        storeName: store.name,
        syncTriggeredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[SIMPLE-SYNC] ❌ Failed to sync store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 