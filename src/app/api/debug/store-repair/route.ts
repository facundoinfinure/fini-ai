import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Store Repair Endpoint - Fix store connection and force data sync
 * POST /api/debug/store-repair
 */
export async function POST(request: NextRequest) {
  try {
    const { storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a', action = 'diagnose' } = await request.json();
    
    console.log(`[STORE-REPAIR] Starting repair for store: ${storeId}, action: ${action}`);
    
    // Use service role to bypass RLS
    const supabase = createClient();
    
    const repairResults: any = {
      storeId,
      action,
      timestamp: new Date().toISOString(),
      steps: []
    };

    // Step 1: Check if store exists in database
    console.log('[STORE-REPAIR] 1. Checking store in database...');
    
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    repairResults.steps.push({
      step: 1,
      name: 'Database Store Check',
      status: store ? 'SUCCESS' : 'FAILED',
      error: storeError?.message,
      data: store ? {
        id: store.id,
        name: store.name,
        platform_store_id: store.platform_store_id,
        has_access_token: !!store.access_token,
        is_active: store.is_active,
        last_sync_at: store.last_sync_at
      } : null
    });

    if (!store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found in database',
        repairResults
      }, { status: 404 });
    }

    // Step 2: Test TiendaNube API connection
    if (store.access_token && store.platform_store_id) {
      console.log('[STORE-REPAIR] 2. Testing TiendaNube API...');
      
      try {
        const { TiendaNubeAPI } = await import('@/lib/integrations/tiendanube');
        const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
        
        const storeInfo = await api.getStore();
        const products = await api.getProducts({ limit: 5 });
        
        repairResults.steps.push({
          step: 2,
          name: 'TiendaNube API Test',
          status: 'SUCCESS',
          data: {
            storeInfo: {
              id: storeInfo.id,
              name: storeInfo.name,
              url: storeInfo.url
            },
            productsFound: products.length,
            sampleProducts: products.slice(0, 2).map(p => ({
              id: p.id,
              name: p.name,
              price: p.variants?.[0]?.price || 'N/A'
            }))
          }
        });

        // Step 3: Force RAG sync if action is 'repair'
        if (action === 'repair') {
          console.log('[STORE-REPAIR] 3. Force RAG sync...');
          
          try {
            const { FiniRAGEngine } = await import('@/lib/rag');
            const ragEngine = new FiniRAGEngine();
            
            // Initialize namespaces first
            console.log('[STORE-REPAIR] Initializing namespaces...');
            const namespaceResult = await ragEngine.initializeStoreNamespaces(storeId);
            
            // Then index store data
            console.log('[STORE-REPAIR] Indexing store data...');
            await ragEngine.indexStoreData(storeId, store.access_token);
            
            // Update last sync timestamp
            await supabase
              .from('stores')
              .update({ 
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', storeId);
            
            repairResults.steps.push({
              step: 3,
              name: 'RAG Sync',
              status: 'SUCCESS',
              data: {
                namespacesInitialized: namespaceResult.success,
                dataIndexed: true,
                timestampUpdated: true
              }
            });

            // Step 4: Test RAG retrieval
            console.log('[STORE-REPAIR] 4. Testing RAG retrieval...');
            
            const testQuery = {
              query: 'productos precios tienda información',
              context: {
                storeId,
                userId: 'repair-test',
                agentType: 'product_manager' as any
              },
              options: {
                topK: 5,
                threshold: 0.3
              }
            };

            const ragResult = await ragEngine.search(testQuery);
            
            repairResults.steps.push({
              step: 4,
              name: 'RAG Retrieval Test',
              status: ragResult.documents.length > 0 ? 'SUCCESS' : 'WARNING',
              data: {
                documentsFound: ragResult.documents.length,
                confidence: ragResult.confidence,
                sampleContent: ragResult.documents.slice(0, 2).map(doc => ({
                  type: doc.metadata?.type,
                  contentPreview: doc.content?.substring(0, 100) + '...'
                }))
              }
            });

          } catch (ragError) {
            repairResults.steps.push({
              step: 3,
              name: 'RAG Sync',
              status: 'FAILED',
              error: ragError instanceof Error ? ragError.message : 'Unknown error'
            });
          }
        }

      } catch (apiError) {
        repairResults.steps.push({
          step: 2,
          name: 'TiendaNube API Test',
          status: 'FAILED',
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        });
      }
    } else {
      repairResults.steps.push({
        step: 2,
        name: 'TiendaNube API Test',
        status: 'SKIPPED',
        reason: 'No access token or platform store ID'
      });
    }

    // Determine overall status
    const failedSteps = repairResults.steps.filter((step: any) => step.status === 'FAILED');
    const overallStatus = failedSteps.length === 0 ? 'SUCCESS' : 'PARTIAL';

    console.log(`[STORE-REPAIR] Repair completed with status: ${overallStatus}`);

    return NextResponse.json({
      success: overallStatus === 'SUCCESS',
      overallStatus,
      failedSteps: failedSteps.length,
      repairResults,
      recommendations: failedSteps.length > 0 ? [
        'Check TiendaNube credentials',
        'Verify store permissions',
        'Try manual reconnection in dashboard'
      ] : [
        'Store is healthy',
        'Test agent queries now',
        'RAG data should be available'
      ]
    });

  } catch (error) {
    console.error('[STORE-REPAIR] Repair failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Store repair failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Store repair endpoint ready',
    usage: {
      endpoint: '/api/debug/store-repair',
      method: 'POST',
      body: {
        storeId: 'Store ID to repair (optional)',
        action: '"diagnose" or "repair"'
      }
    }
  });
} 