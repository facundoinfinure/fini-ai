import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint para diagnosticar y reparar problemas de token inválido
 * Soluciona el problema donde los tokens se vuelven inválidos después de reconectar la tienda
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[TOKEN-FIX] Starting token authentication diagnosis and repair');

    const supabase = createClient();
    
    // Verificar autenticación del usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      summary: {
        totalStores: 0,
        storesWithInvalidTokens: 0,
        storesFixed: 0,
        totalErrors: 0
      },
      storeResults: [] as any[]
    };

    // Obtener todas las tiendas del usuario
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id);

    if (storesError) {
      console.error('[TOKEN-FIX] Error fetching stores:', storesError);
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }

    results.summary.totalStores = stores?.length || 0;

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No stores found for user'
      });
    }

    // Procesar cada tienda
    for (const store of stores) {
      const storeResult = {
        storeId: store.id,
        storeName: store.name,
        platformStoreId: store.platform_store_id,
        issues: [] as string[],
        fixes: [] as string[],
        status: 'unknown' as 'healthy' | 'fixed' | 'error'
      };

      try {
        console.log(`[TOKEN-FIX] Processing store: ${store.id} (${store.name})`);
        
        // 1. Verificar token existente
        if (!store.access_token) {
          storeResult.issues.push('No access token found');
          results.summary.storesWithInvalidTokens++;
          storeResult.status = 'error';
          results.storeResults.push(storeResult);
          continue;
        }

        // 2. Probar el token con una llamada simple a TiendaNube
        const { TiendaNubeAPI } = await import('@/lib/integrations/tiendanube');
        const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
        
        let tokenIsValid = false;
        try {
          // Intentar obtener información de la tienda
          const storeInfo = await api.getStore();
          if (storeInfo && storeInfo.id) {
            tokenIsValid = true;
            storeResult.fixes.push('Token is valid - no action needed');
          }
        } catch (error) {
          console.log(`[TOKEN-FIX] Token validation failed for store ${store.id}:`, error);
          storeResult.issues.push(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (!tokenIsValid) {
          results.summary.storesWithInvalidTokens++;
          storeResult.issues.push('Token is invalid - manual reconnection required');
          storeResult.fixes.push('Store needs to be reconnected via OAuth flow');
          storeResult.status = 'error';
          
          // Note: Bulletproof health check temporarily disabled
          // TODO: Re-implement after BulletproofTiendaNube refactor
        } else {
          storeResult.status = 'healthy';
        }

        // 4. Si el token está ahora válido, limpiar y reinicializar RAG
        if (tokenIsValid || storeResult.status === 'healthy') {
          try {
            // Limpiar RAG existente
            const { FiniRAGEngine } = await import('@/lib/rag/rag-engine');
            const ragEngine = new FiniRAGEngine();
            
            // Reinicializar namespaces
            await ragEngine.initializeStoreNamespaces(store.id);
            storeResult.fixes.push('RAG namespaces reinitialized');
            
            // Programar sincronización
            const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
            const scheduler = await getAutoSyncScheduler();
            await scheduler.addStore(store.id);
            storeResult.fixes.push('Store added to auto-sync scheduler');
            
          } catch (error) {
            console.error(`[TOKEN-FIX] RAG cleanup failed for store ${store.id}:`, error);
            storeResult.issues.push(`RAG cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

      } catch (error) {
        console.error(`[TOKEN-FIX] Error processing store ${store.id}:`, error);
        storeResult.issues.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        storeResult.status = 'error';
        results.summary.totalErrors++;
      }

      results.storeResults.push(storeResult);
    }

    // Generar resumen final
    const healthyStores = results.storeResults.filter(s => s.status === 'healthy').length;
    const overallStatus = results.summary.storesWithInvalidTokens === 0 ? 'healthy' : 
                         healthyStores > 0 ? 'partial' : 'unhealthy';

    return NextResponse.json({
      ...results,
      overallStatus,
      message: `Processed ${results.summary.totalStores} stores. ${results.summary.storesWithInvalidTokens} had invalid tokens, ${healthyStores} are now healthy.`
    });

  } catch (error) {
    console.error('[TOKEN-FIX] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'Token Authentication Fixer',
    description: 'Diagnoses and repairs invalid token issues after store reconnection',
    usage: 'POST to this endpoint to run token diagnosis and repair'
  });
} 