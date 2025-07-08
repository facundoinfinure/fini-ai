import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Check RAG synchronization status for a specific store
 * GET /api/stores/[id]/rag-status
 * 🔄 Real-time sync status for better UX
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const storeId = params.id;

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }

    // Get user from session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get store information
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found or access denied'
      }, { status: 404 });
    }

    // Calculate sync status
    const now = new Date();
    const createdAt = new Date(store.created_at);
    const lastSyncAt = store.last_sync_at ? new Date(store.last_sync_at) : null;
    
    const minutesSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    const minutesSinceLastSync = lastSyncAt ? 
      Math.floor((now.getTime() - lastSyncAt.getTime()) / (1000 * 60)) : null;

    // Determine sync status
    let syncStatus: 'never_synced' | 'syncing' | 'synced' | 'needs_sync' | 'error';
    let statusMessage: string;
    let canTriggerSync = true;
    let estimatedTimeRemaining: number | null = null;

    if (!lastSyncAt) {
      if (minutesSinceCreation < 5) {
        syncStatus = 'syncing';
        statusMessage = 'Sincronización inicial en progreso...';
        estimatedTimeRemaining = Math.max(0, 5 - minutesSinceCreation);
        canTriggerSync = false;
      } else {
        syncStatus = 'never_synced';
        statusMessage = 'La sincronización inicial no se ha completado';
      }
    } else if (minutesSinceLastSync && minutesSinceLastSync > 60) {
      syncStatus = 'needs_sync';
      statusMessage = 'Los datos pueden estar desactualizados';
    } else {
      syncStatus = 'synced';
      statusMessage = 'Datos sincronizados correctamente';
    }

    // Check RAG data availability
    let hasRAGData = false;
    let ragStats = null;

    try {
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      // Test if we have any data for this store
      const testQuery = {
        query: 'test',
        context: {
          storeId,
          userId: user.id,
          agentType: 'analytics' as const
        },
        options: {
          topK: 1,
          scoreThreshold: 0.1
        }
      };

      const result = await ragEngine.search(testQuery);
      hasRAGData = result.sources.length > 0;

      // Get RAG engine statistics
      ragStats = await ragEngine.getStats();
    } catch (ragError) {
      console.warn('[RAG-STATUS] Failed to check RAG data:', ragError);
    }

    // Return comprehensive status
    return NextResponse.json({
      success: true,
      data: {
        storeId,
        storeName: store.name,
        syncStatus,
        statusMessage,
        canTriggerSync,
        estimatedTimeRemaining,
        hasRAGData,
        lastSyncAt: store.last_sync_at,
        createdAt: store.created_at,
        timeSinceCreation: minutesSinceCreation,
        timeSinceLastSync: minutesSinceLastSync,
        ragStats,
        recommendations: generateRecommendations(syncStatus, hasRAGData, minutesSinceCreation)
      }
    });

  } catch (error) {
    console.error('[RAG-STATUS] Status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate recommendations based on sync status
 */
function generateRecommendations(
  syncStatus: string, 
  hasRAGData: boolean, 
  minutesSinceCreation: number
): string[] {
  const recommendations: string[] = [];

  switch (syncStatus) {
    case 'never_synced':
      recommendations.push('Ejecuta una sincronización manual desde Configuración');
      recommendations.push('Verifica que tu tienda tenga productos publicados');
      if (minutesSinceCreation > 10) {
        recommendations.push('Si el problema persiste, contacta soporte técnico');
      }
      break;

    case 'syncing':
      recommendations.push('Espera unos minutos para que termine la sincronización');
      recommendations.push('Puedes continuar configurando otras funcionalidades');
      break;

    case 'needs_sync':
      recommendations.push('Ejecuta una sincronización para obtener datos actualizados');
      recommendations.push('Configura sincronización automática diaria');
      break;

    case 'synced':
      if (!hasRAGData) {
        recommendations.push('Los datos están sincronizados pero no se encontraron productos');
        recommendations.push('Verifica que tienes productos publicados en Tienda Nube');
      } else {
        recommendations.push('¡Todo está listo! Puedes hacer consultas a los agentes');
        recommendations.push('Prueba preguntar: "¿qué productos tengo?" o "analiza mi catálogo"');
      }
      break;
  }

  return recommendations;
} 