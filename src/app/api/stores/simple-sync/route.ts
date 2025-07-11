import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncStoreNow } from '@/lib/services/simple-store-sync';

export async function POST(request: NextRequest) {
  try {
    console.log('[SIMPLE-SYNC-API] 🚀 Starting simple store sync');
    
    // Autenticación
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[SIMPLE-SYNC-API] ❌ Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Obtener store ID del body
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID es requerido' },
        { status: 400 }
      );
    }

    console.log(`[SIMPLE-SYNC-API] 📊 Starting sync for store: ${storeId}`);

    // Verificar que la tienda pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, user_id, is_active')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      console.error('[SIMPLE-SYNC-API] ❌ Store not found or access denied:', storeError);
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada o acceso denegado' },
        { status: 404 }
      );
    }

    if (!store.is_active) {
      return NextResponse.json(
        { success: false, error: 'La tienda no está activa' },
        { status: 400 }
      );
    }

    // Ejecutar sincronización usando el nuevo SimpleStoreSync
    console.log(`[SIMPLE-SYNC-API] 🔄 Executing sync for store: ${store.name}`);
    
    const syncResult = await syncStoreNow(storeId, (progress) => {
      // Log del progreso para debugging
      console.log(`[SIMPLE-SYNC-API] ${progress.progress}% - ${progress.message}`);
    });

    if (syncResult.success) {
      // Actualizar timestamp de última sincronización
      await supabase
        .from('stores')
        .update({ 
          last_sync_at: new Date().toISOString() 
        })
        .eq('id', storeId);

      console.log(`[SIMPLE-SYNC-API] ✅ Sync completed successfully for store: ${store.name}`, syncResult.stats);
      
      return NextResponse.json({
        success: true,
        message: 'Sincronización completada exitosamente',
        storeId,
        storeName: store.name,
        stats: syncResult.stats,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`[SIMPLE-SYNC-API] ❌ Sync failed for store: ${store.name}`, syncResult.error);
      
      return NextResponse.json({
        success: false,
        error: syncResult.error || 'Error durante la sincronización',
        storeId,
        storeName: store.name
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[SIMPLE-SYNC-API] ❌ Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple Store Sync API',
    usage: 'POST /api/stores/simple-sync',
    body: { storeId: 'store-id' },
    description: 'Sincroniza una tienda específica usando el nuevo sistema simple y directo'
  });
} 