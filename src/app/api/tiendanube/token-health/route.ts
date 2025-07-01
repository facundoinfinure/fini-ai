import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tiendaNubeTokenManager, validateUserTiendaNubeStores } from '@/lib/integrations/tiendanube-token-manager';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';

/**
 * 🔄 TIENDANUBE TOKEN HEALTH ENDPOINT
 * ==================================
 * 
 * GET: Verifica el estado de tokens para un usuario específico
 * POST: Ejecuta health check global de todos los tokens
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Verificar tokens de TiendaNube para usuario específico
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Starting TiendaNube token health check');
    
    const supabase = createClient();
    
    // Get user authentication (only for manual checks)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Get all user's stores
    const { data: stores, error: storesError } = await supabase
      .from('tiendanube_stores')
      .select('store_id, name, access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id);

    if (storesError) {
      console.error('[ERROR] Failed to fetch user stores:', storesError.message);
      return NextResponse.json(
        { success: false, error: 'Error obteniendo tiendas' },
        { status: 500 }
      );
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay tiendas conectadas',
        results: []
      });
    }

    console.log(`[INFO] Checking token health for ${stores.length} stores`);

    const results = [];
    let totalRefreshed = 0;
    let totalFailed = 0;

    for (const store of stores) {
      try {
        console.log(`[INFO] Checking token health for store: ${store.store_id}`);
        
        const validation = await TiendaNubeTokenManager.validateStoreTokens(store.store_id);
        
        let status = 'healthy';
        let action = 'none';
        let newToken = null;

        if (!validation.isValid) {
          console.warn(`[WARNING] Store ${store.store_id} has invalid token, attempting refresh`);
          
          // Try to get a fresh token (includes automatic refresh)
          newToken = await TiendaNubeTokenManager.getValidToken(store.store_id);
          
          if (newToken && newToken !== store.access_token) {
            status = 'refreshed';
            action = 'token_refreshed';
            totalRefreshed++;
            console.log(`[INFO] ✅ Token refreshed for store: ${store.store_id}`);
          } else {
            status = 'failed';
            action = 'refresh_failed';
            totalFailed++;
            console.error(`[ERROR] ❌ Token refresh failed for store: ${store.store_id}`);
          }
        } else if (validation.needsRefresh) {
          console.log(`[INFO] Store ${store.store_id} token needs proactive refresh`);
          
          // Proactively refresh token that's about to expire
          newToken = await TiendaNubeTokenManager.getValidToken(store.store_id);
          
          if (newToken && newToken !== store.access_token) {
            status = 'proactive_refresh';
            action = 'proactive_refresh';
            totalRefreshed++;
            console.log(`[INFO] ✅ Proactive refresh for store: ${store.store_id}`);
          }
        }

        results.push({
          storeId: store.store_id,
          storeName: store.name,
          status,
          action,
          isValid: validation.isValid,
          needsRefresh: validation.needsRefresh,
          error: validation.error,
          expiresAt: store.token_expires_at
        });

      } catch (error) {
        console.error(`[ERROR] Failed to check token health for store ${store.store_id}:`, error);
        
        results.push({
          storeId: store.store_id,
          storeName: store.name,
          status: 'error',
          action: 'check_failed',
          isValid: false,
          needsRefresh: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        totalFailed++;
      }
    }

    const summary = {
      totalStores: stores.length,
      healthyStores: results.filter(r => r.status === 'healthy').length,
      refreshedStores: totalRefreshed,
      failedStores: totalFailed,
      storesNeedingAttention: results.filter(r => r.status === 'failed' || r.status === 'error').length
    };

    console.log(`[INFO] ✅ Token health check completed:`, summary);

    return NextResponse.json({
      success: true,
      message: 'Health check completado',
      summary,
      results
    });

  } catch (error) {
    console.error('[ERROR] Unexpected error during token health check:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST: Ejecutar health check global (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Starting forced token refresh operation');
    
    // This could be protected with admin authentication in the future
    const { refreshAll = false } = await request.json();
    
    if (!refreshAll) {
      return NextResponse.json(
        { success: false, error: 'Parámetro refreshAll requerido' },
        { status: 400 }
      );
    }

    const result = await TiendaNubeTokenManager.refreshExpiringTokens();
    
    console.log(`[INFO] ✅ Forced refresh completed: ${result.refreshed} refreshed, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Refresh masivo completado',
      refreshed: result.refreshed,
      failed: result.failed
    });

  } catch (error) {
    console.error('[ERROR] Unexpected error during forced token refresh:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Marcar una tienda específica para reconexión
 */
export async function PATCH(request: NextRequest) {
  try {
    const { storeId, reason } = await request.json();
    
    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }

    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    // Verify user owns this store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', session.user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found or access denied'
      }, { status: 404 });
    }

    // Mark store for reconnection
    const success = await tiendaNubeTokenManager.markStoreForReconnection(
      storeId, 
      reason || 'Manual reconnection requested'
    );

    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          storeId,
          message: 'Store marked for reconnection',
          reconnectionUrl: tiendaNubeTokenManager.generateReconnectionUrl({
            storeId: store.id,
            storeName: store.name || 'Tienda sin nombre',
            platformStoreId: store.platform_store_id,
            userId: store.user_id,
            lastValidation: new Date().toISOString(),
            reconnectionRequired: true
          })
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to mark store for reconnection'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[ERROR] Failed to mark store for reconnection:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process reconnection request'
    }, { status: 500 });
  }
} 