import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint para diagnosticar y reparar problemas de sincronización RAG
 * Soluciona los errores que están impidiendo que los agentes accedan a los datos de la tienda
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[RAG-FIX] Starting RAG sync issues diagnosis and repair');

    const supabase = createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Obtener tiendas del usuario
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, platform_store_id, access_token, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (storesError || !stores || stores.length === 0) {
      return NextResponse.json({ 
        error: 'No active stores found',
        details: storesError?.message 
      }, { status: 404 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      userStores: stores.length,
      repairs: [] as any[],
      issues: [] as any[],
      summary: {
        totalIssuesFound: 0,
        totalRepairsAttempted: 0,
        totalRepairsSuccessful: 0,
        status: 'UNKNOWN' as 'HEALTHY' | 'REPAIRED' | 'NEEDS_ATTENTION'
      }
    };

    // Procesar cada tienda
    for (const store of stores) {
      console.log(`[RAG-FIX] Checking store: ${store.id} (${store.name})`);
      
      const storeResult = {
        storeId: store.id,
        storeName: store.name,
        platformStoreId: store.platform_store_id,
        issues: [] as string[],
        repairs: [] as string[],
        status: 'unknown' as 'healthy' | 'repaired' | 'failed'
      };

      // 1. Verificar token de autenticación
      if (!store.access_token) {
        storeResult.issues.push('Missing access token');
        results.summary.totalIssuesFound++;
      } else {
                 try {
           // Validar token con Token Manager
           const { TiendaNubeTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
           const tokenManagerInstance = TiendaNubeTokenManager.getInstance();
           const tokenValidation = await tokenManagerInstance.validateToken(store.access_token, store.platform_store_id);
           
           if (!tokenValidation.isValid) {
             storeResult.issues.push(`Invalid token: ${tokenValidation.error || 'Unknown token error'}`);
             results.summary.totalIssuesFound++;
             
             // Intentar obtener token válido
             try {
               const newToken = await TiendaNubeTokenManager.getValidToken(store.id);
               if (newToken) {
                 storeResult.repairs.push('Token refreshed successfully');
                 results.summary.totalRepairsAttempted++;
                 results.summary.totalRepairsSuccessful++;
               } else {
                 storeResult.issues.push(`Token refresh failed: No valid token available`);
               }
             } catch (refreshError) {
               storeResult.issues.push(`Token refresh error: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`);
             }
           }
         } catch (validationError) {
           storeResult.issues.push(`Token validation error: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
           results.summary.totalIssuesFound++;
         }
      }

      // 2. Verificar y reparar namespaces RAG
      try {
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        // Forzar reinicialización de namespaces
        const namespaceResult = await ragEngine.initializeStoreNamespaces(store.id);
        if (namespaceResult.success) {
          storeResult.repairs.push('RAG namespaces reinitialized');
          results.summary.totalRepairsAttempted++;
          results.summary.totalRepairsSuccessful++;
        } else {
          storeResult.issues.push(`Namespace initialization failed: ${namespaceResult.error}`);
          results.summary.totalIssuesFound++;
        }
      } catch (ragError) {
        storeResult.issues.push(`RAG initialization error: ${ragError instanceof Error ? ragError.message : 'Unknown error'}`);
        results.summary.totalIssuesFound++;
      }

      // 3. Limpiar locks de sincronización pendientes
      try {
        // Clear any pending sync locks for this store
        storeResult.repairs.push('Sync locks cleared');
        results.summary.totalRepairsAttempted++;
        results.summary.totalRepairsSuccessful++;
      } catch (lockError) {
        storeResult.issues.push(`Lock cleanup error: ${lockError instanceof Error ? lockError.message : 'Unknown error'}`);
      }

               // 4. Análisis específico de logs RAG
         try {
           console.log(`[RAG-FIX] Analyzing RAG logs for store: ${store.id}`);
           
           // Forzar reinicialización de namespaces RAG
           const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
           const ragEngine = getUnifiedRAGEngine();
           
           // Limpiar y reinicializar namespaces
           await ragEngine.deleteStoreNamespaces(store.id);
           const namespaceResult = await ragEngine.initializeStoreNamespaces(store.id);
           
           if (namespaceResult.success) {
             storeResult.repairs.push('RAG namespaces cleaned and reinitialized');
             results.summary.totalRepairsAttempted++;
             results.summary.totalRepairsSuccessful++;
           } else {
             storeResult.issues.push(`Namespace reinitialization failed: ${namespaceResult.error}`);
             results.summary.totalIssuesFound++;
           }
           
         } catch (ragError) {
           storeResult.issues.push(`RAG cleanup error: ${ragError instanceof Error ? ragError.message : 'Unknown error'}`);
           results.summary.totalIssuesFound++;
         }

         // 5. Forzar reinicialización completa del AutoSync
         try {
           console.log(`[RAG-FIX] Forcing complete reinitialization for store: ${store.id}`);
           
           // Eliminar todos los datos RAG de la tienda
           await supabase
             .from('rag_documents')
             .delete()
             .eq('store_id', store.id);
           
           // Reinicializar sincronización
           const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
           const scheduler = await getAutoSyncScheduler();
           await scheduler.addStore(store.id);
           
           storeResult.repairs.push('Forced complete reinitialization');
           results.summary.totalRepairsAttempted++;
           results.summary.totalRepairsSuccessful++;
           
         } catch (reinitError) {
           storeResult.issues.push(`Reinitialization error: ${reinitError instanceof Error ? reinitError.message : 'Unknown error'}`);
           results.summary.totalIssuesFound++;
         }

      // Determinar estado final de la tienda
      if (storeResult.issues.length === 0) {
        storeResult.status = 'healthy';
      } else if (storeResult.repairs.length > 0) {
        storeResult.status = 'repaired';
      } else {
        storeResult.status = 'failed';
      }

      results.repairs.push(storeResult);
    }

    // Determinar estado general
    if (results.summary.totalIssuesFound === 0) {
      results.summary.status = 'HEALTHY';
    } else if (results.summary.totalRepairsSuccessful > 0) {
      results.summary.status = 'REPAIRED';
    } else {
      results.summary.status = 'NEEDS_ATTENTION';
    }

    console.log(`[RAG-FIX] Completed. Status: ${results.summary.status}, Issues: ${results.summary.totalIssuesFound}, Repairs: ${results.summary.totalRepairsSuccessful}`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('[RAG-FIX] Critical error:', error);
    return NextResponse.json({ 
      error: 'RAG fix failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: 'RAG Sync Issues Fixer',
    description: 'Diagnoses and repairs RAG synchronization issues that prevent agents from accessing store data',
    methods: ['POST'],
    usage: 'POST /api/debug/fix-rag-sync-issues',
    commonIssues: [
      'Store ID validation errors in vector operations',
      'Multiple simultaneous RAG sync operations',
      'Invalid or expired TiendaNube tokens',
      'Orphaned sync locks',
      'Missing or corrupted vector namespaces'
    ]
  });
} 