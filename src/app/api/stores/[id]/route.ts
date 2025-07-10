import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';
import { WhatsAppService } from '@/lib/database/whatsapp-service';

// PUT - Update a store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Updating store:', params.id);
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('[ERROR] No authenticated user found:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    const _userId = session.user.id;

    // Parse request body
    const updates = await request.json();

    // Validate that at least one field is being updated
    if (!updates.name && !updates.domain && !updates.access_token) {
      return NextResponse.json(
        { success: false, error: 'At least one field must be updated' },
        { status: 400 }
      );
    }

    // Update store
    const storeResult = await StoreService.updateStore(params.id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    if (!storeResult.success) {
      console.error('[ERROR] Failed to update store:', storeResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update store',
        details: storeResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Store updated successfully:', params.id);

    return NextResponse.json({
      success: true,
      data: {
        store: storeResult.store
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to update store:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete a store (soft delete by setting is_active to false)
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    console.log('[INFO] Deleting store:', storeId);

    // 🔒 IMMEDIATELY LOCK STORE - Prevent any RAG operations during deletion
    const { lockStoreForDeletion } = await import('@/lib/rag/global-locks');
    await lockStoreForDeletion(storeId, `Store deletion in progress (DELETE /${storeId})`);

    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Verificar que la tienda pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id, name')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      console.error('[ERROR] Store not found or unauthorized:', storeError?.message);
      return NextResponse.json(
        { success: false, error: 'Store not found or unauthorized' },
        { status: 404 }
      );
    }

    // Primero desconectar todos los números de WhatsApp asociados
    const { error: disconnectError } = await supabase
      .from('whatsapp_store_connections')
      .update({ is_active: false })
      .eq('store_id', storeId);

    if (disconnectError) {
      console.error('[ERROR] Failed to disconnect WhatsApp numbers:', disconnectError.message);
    }

    // 🔥 NEW: Trigger Pinecone cleanup BEFORE database deletion
    console.log(`[INFO] Triggering Pinecone cleanup for store: ${storeId}`);
    try {
      // Dynamic import to avoid build issues
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      // Delete all namespaces for the store
      const cleanupResult = await ragEngine.deleteStoreNamespaces(storeId);
      
      if (cleanupResult.success) {
        console.log(`[INFO] ✅ Pinecone cleanup completed for store: ${storeId}`);
      } else {
        console.warn(`[WARN] ⚠️ Pinecone cleanup had issues: ${cleanupResult.error}`);
        // Continue with database deletion even if Pinecone cleanup fails
      }
    } catch (pineconeError) {
      console.warn(`[WARN] ❌ Pinecone cleanup failed: ${pineconeError instanceof Error ? pineconeError.message : 'Unknown error'}`);
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
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[ERROR] Failed to delete store:', deleteError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to delete store' },
        { status: 500 }
      );
    }

    // 🔥 FIX: Remover tienda del auto-sync scheduler
    try {
      const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
      const scheduler = await getAutoSyncScheduler();
      scheduler.removeStore(storeId);
      console.log(`[INFO] Store ${storeId} removed from auto-sync scheduler`);
    } catch (schedulerError) {
      console.warn(`[WARN] Failed to remove store from scheduler: ${schedulerError instanceof Error ? schedulerError.message : 'Unknown error'}`);
      // No need to fail the delete operation if scheduler removal fails
    }

    console.log(`[INFO] Store ${store.name} deleted successfully (database + Pinecone cleanup + scheduler removal)`);

    // 🔓 UNLOCK STORE - Allow RAG operations for this store ID to proceed
    const { unlockStoreAfterDeletion } = await import('@/lib/rag/global-locks');
    await unlockStoreAfterDeletion(storeId);

    return NextResponse.json({
      success: true,
      message: `Store ${store.name} deleted successfully`
    });

  } catch (error) {
    console.error('[ERROR] Failed to delete store:', error);
    
    // 🔓 UNLOCK STORE on error - Prevent permanent locks
    try {
      const { unlockStoreAfterDeletion } = await import('@/lib/rag/global-locks');
      await unlockStoreAfterDeletion(params.id);
    } catch (unlockError) {
      console.warn('[WARN] Failed to unlock store after deletion error:', unlockError);
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 