import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUnifiedRAGEngine } from '@/lib/rag';

/**
 * Store management endpoint
 * POST /api/stores/manage
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[STORE-MANAGE] 📋 Processing store management request');
    
    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[STORE-MANAGE] ❌ Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, storeId, name, domain } = body;
    
    if (!action || !storeId) {
      return NextResponse.json(
        { success: false, error: 'Action and storeId are required' },
        { status: 400 }
      );
    }

    // Verificar que la tienda pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id, name, domain, access_token, is_active')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      console.error('[STORE-MANAGE] ❌ Store not found or unauthorized:', storeError?.message);
      return NextResponse.json(
        { success: false, error: 'Store not found or unauthorized' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'update':
        return await handleUpdateStore(supabase, storeId, { name, domain });
      
      case 'delete':
        return await handleDeleteStore(supabase, storeId, store, user.id);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[STORE-MANAGE] ❌ Failed to process request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle store update
 */
async function handleUpdateStore(supabase: any, storeId: string, updates: { name?: string; domain?: string }) {
  try {
    console.log(`[STORE-MANAGE] 📝 Updating store: ${storeId}`);
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.name) updateData.name = updates.name;
    if (updates.domain) updateData.domain = updates.domain;
    
    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', storeId)
      .select()
      .single();

    if (updateError) {
      console.error('[STORE-MANAGE] ❌ Failed to update store:', updateError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to update store' },
        { status: 500 }
      );
    }

    console.log(`[STORE-MANAGE] ✅ Store updated successfully: ${storeId}`);

    return NextResponse.json({
      success: true,
      message: 'Store updated successfully',
      data: updatedStore
    });

  } catch (error) {
    console.error('[STORE-MANAGE] ❌ Error updating store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update store' },
      { status: 500 }
    );
  }
}

/**
 * Handle store deletion
 */
async function handleDeleteStore(supabase: any, storeId: string, store: any, userId: string) {
  try {
    console.log(`[STORE-MANAGE] 🗑️ Deleting store: ${storeId} (${store.name})`);

    // 🔒 IMMEDIATELY LOCK STORE - Prevent any RAG operations during deletion
    try {
      const { lockStoreForDeletion } = await import('@/lib/rag/global-locks');
      await lockStoreForDeletion(storeId, `Store deletion in progress via /api/stores/manage`);
    } catch (lockError) {
      console.warn('[STORE-MANAGE] ⚠️ Could not lock store for deletion, continuing:', lockError);
    }

    // Primero desconectar todos los números de WhatsApp asociados
    const { error: disconnectError } = await supabase
      .from('whatsapp_store_connections')
      .update({ is_active: false })
      .eq('store_id', storeId);

    if (disconnectError) {
      console.error('[STORE-MANAGE] ⚠️ Failed to disconnect WhatsApp numbers:', disconnectError.message);
    } else {
      console.log('[STORE-MANAGE] ✅ WhatsApp connections disconnected');
    }

    // 🔥 Trigger Pinecone cleanup BEFORE database deletion
    console.log(`[STORE-MANAGE] 🧹 Triggering Pinecone cleanup for store: ${storeId}`);
    try {
      const ragEngine = getUnifiedRAGEngine();
      
      // Delete all namespaces for the store
      const cleanupResult = await ragEngine.deleteStoreNamespaces(storeId);
      
      if (cleanupResult.success) {
        console.log(`[STORE-MANAGE] ✅ Pinecone cleanup completed for store: ${storeId}`);
      } else {
        console.warn(`[STORE-MANAGE] ⚠️ Pinecone cleanup had issues: ${cleanupResult.error}`);
        // Continue with database deletion even if Pinecone cleanup fails
      }
    } catch (pineconeError) {
      console.warn(`[STORE-MANAGE] ❌ Pinecone cleanup failed: ${pineconeError instanceof Error ? pineconeError.message : 'Unknown error'}`);
      // Continue with database deletion even if Pinecone cleanup fails
    }

    // Realizar soft delete de la tienda
    const { error: deleteError } = await supabase
      .from('stores')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[STORE-MANAGE] ❌ Failed to delete store:', deleteError.message);
      
      // 🔓 UNLOCK STORE on error
      try {
        const { unlockStoreAfterDeletion } = await import('@/lib/rag/global-locks');
        await unlockStoreAfterDeletion(storeId);
      } catch (unlockError) {
        console.warn('[STORE-MANAGE] ⚠️ Failed to unlock store after deletion error:', unlockError);
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to delete store' },
        { status: 500 }
      );
    }

    console.log(`[STORE-MANAGE] ✅ Store ${store.name} deleted successfully (database + Pinecone cleanup)`);

    // 🔓 UNLOCK STORE - Allow RAG operations for this store ID to proceed
    try {
      const { unlockStoreAfterDeletion } = await import('@/lib/rag/global-locks');
      await unlockStoreAfterDeletion(storeId);
    } catch (unlockError) {
      console.warn('[STORE-MANAGE] ⚠️ Failed to unlock store after successful deletion:', unlockError);
    }

    return NextResponse.json({
      success: true,
      message: `Store ${store.name} deleted successfully`
    });

  } catch (error) {
    console.error('[STORE-MANAGE] ❌ Error deleting store:', error);
    
    // 🔓 UNLOCK STORE on error - Prevent permanent locks
    try {
      const { unlockStoreAfterDeletion } = await import('@/lib/rag/global-locks');
      await unlockStoreAfterDeletion(storeId);
    } catch (unlockError) {
      console.warn('[STORE-MANAGE] ⚠️ Failed to unlock store after deletion error:', unlockError);
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete store' },
      { status: 500 }
    );
  }
} 