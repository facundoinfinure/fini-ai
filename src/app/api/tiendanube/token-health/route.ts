import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tiendaNubeTokenManager, validateUserTiendaNubeStores } from '@/lib/integrations/tiendanube-token-manager';

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
    console.log('[INFO] TiendaNube token health check requested');
    
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

    const userId = session.user.id;
    console.log('[INFO] Running token validation for user:', userId);

    // Check all user's TiendaNube stores
    const storesNeedingReconnection = await validateUserTiendaNubeStores(userId);

    if (storesNeedingReconnection.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          allTokensValid: true,
          storesNeedingReconnection: [],
          message: 'Todos los tokens de TiendaNube están válidos'
        }
      });
    }

    // Generate reconnection URLs for invalid stores
    const reconnectionInfo = storesNeedingReconnection.map(store => ({
      ...store,
      reconnectionUrl: tiendaNubeTokenManager.generateReconnectionUrl(store)
    }));

    console.log(`[WARNING] Found ${storesNeedingReconnection.length} stores needing reconnection for user:`, userId);

    return NextResponse.json({
      success: true,
      data: {
        allTokensValid: false,
        storesNeedingReconnection: reconnectionInfo,
        totalStoresAffected: storesNeedingReconnection.length,
        message: `${storesNeedingReconnection.length} tienda(s) necesita(n) reconexión`
      }
    });

  } catch (error) {
    console.error('[ERROR] Token health check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check token health'
    }, { status: 500 });
  }
}

/**
 * POST: Ejecutar health check global (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Global TiendaNube health check requested');
    
    // Check authorization header for admin access
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      console.warn('[WARNING] Unauthorized global health check attempt');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Admin access required'
      }, { status: 403 });
    }

    // Run global health check
    const healthCheckResult = await tiendaNubeTokenManager.runHealthCheck();

    console.log('[INFO] Global health check completed:', healthCheckResult);

    // If there are stores needing reconnection, we might want to send notifications
    if (healthCheckResult.reconnectionRequired.length > 0) {
      console.log(`[WARNING] Global health check found ${healthCheckResult.reconnectionRequired.length} stores needing reconnection`);
      
      // TODO: Here you could send notifications, emails, etc.
      // For now, just log the affected users
      const affectedUsers = [...new Set(healthCheckResult.reconnectionRequired.map(s => s.userId))];
      console.log('[INFO] Affected users needing notification:', affectedUsers);
    }

    return NextResponse.json({
      success: true,
      data: {
        healthCheck: healthCheckResult,
        timestamp: new Date().toISOString(),
        summary: {
          totalStores: healthCheckResult.totalStores,
          healthyStores: healthCheckResult.validStores,
          unhealthyStores: healthCheckResult.invalidStores,
          reconnectionRate: healthCheckResult.totalStores > 0 
            ? Math.round((healthCheckResult.invalidStores / healthCheckResult.totalStores) * 100)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('[ERROR] Global health check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run global health check'
    }, { status: 500 });
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