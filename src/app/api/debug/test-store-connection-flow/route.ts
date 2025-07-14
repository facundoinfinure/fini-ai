import { NextRequest, NextResponse } from 'next/server';
import { StoreService } from '@/lib/database/client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🧪 DEBUG: Test Complete Store Connection Flow
 * ============================================
 * 
 * Tests the complete flow after connecting a store:
 * 1. Store connection state
 * 2. Namespace creation
 * 3. Data synchronization 
 * 4. Agent data access
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log(`[TEST-STORE-FLOW] Starting complete store connection flow test`);
  
  try {
    const body = await request.json().catch(() => ({}));
    const { storeId, testAgentAccess } = body;
    
    const results: any = {
      timestamp: new Date().toISOString(),
      storeId,
      tests: {
        store_connection: { status: 'pending' },
        namespace_creation: { status: 'pending' },
        data_sync: { status: 'pending' },
        agent_access: { status: 'pending' }
      },
      recommendations: []
    };

    // Test 1: Store Connection State
    console.log(`[TEST-STORE-FLOW] 1. Testing store connection...`);
    
    try {
      let targetStore;
      
      if (storeId) {
        const storeResult = await StoreService.getStore(storeId);
        if (!storeResult.success) {
          throw new Error(`Store not found: ${storeId}`);
        }
        targetStore = storeResult.store!;
      } else {
        // Get first active store for user
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const storesResult = await StoreService.getStoresByUserId(user.id);
        if (!storesResult.success || !storesResult.stores?.length) {
          throw new Error('No stores found for user');
        }
        
        targetStore = storesResult.stores[0];
      }
      
      results.tests.store_connection = {
        status: 'success',
        data: {
          storeId: targetStore.id,
          storeName: targetStore.name,
          domain: targetStore.domain,
          hasAccessToken: !!targetStore.access_token,
          lastSyncAt: targetStore.last_sync_at,
          isActive: targetStore.is_active
        }
      };
      
      results.storeId = targetStore.id;
      console.log(`[TEST-STORE-FLOW] ✅ Store connection verified: ${targetStore.name}`);
      
    } catch (error) {
      results.tests.store_connection = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error(`[TEST-STORE-FLOW] ❌ Store connection test failed:`, error);
    }

    // Test 2: Namespace Creation & RAG Setup
    if (results.tests.store_connection.status === 'success') {
      console.log(`[TEST-STORE-FLOW] 2. Testing namespace creation...`);
      
      try {
        const { getUnifiedRAGEngine } = await import('@/lib/rag');
        const ragEngine = getUnifiedRAGEngine();
        
        // Test namespace initialization
        const namespaceResult = await ragEngine.initializeStoreNamespaces(results.storeId);
        
        if (namespaceResult.success) {
          results.tests.namespace_creation = {
            status: 'success',
            data: {
              namespacesCreated: [
                `store-${results.storeId}`,
                `store-${results.storeId}-products`,
                `store-${results.storeId}-orders`,
                `store-${results.storeId}-customers`,
                `store-${results.storeId}-analytics`,
                `store-${results.storeId}-conversations`
              ],
              message: 'All namespaces initialized successfully'
            }
          };
          console.log(`[TEST-STORE-FLOW] ✅ Namespaces created successfully`);
        } else {
          throw new Error(namespaceResult.error || 'Namespace creation failed');
        }
        
      } catch (error) {
        results.tests.namespace_creation = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error(`[TEST-STORE-FLOW] ❌ Namespace creation test failed:`, error);
      }
    }

    // Test 3: Data Synchronization
    if (results.tests.namespace_creation.status === 'success') {
      console.log(`[TEST-STORE-FLOW] 3. Testing data synchronization...`);
      
      try {
        const store = results.tests.store_connection.data;
        
        // Trigger immediate sync using UnifiedRAGEngine
        const { getUnifiedRAGEngine } = await import('@/lib/rag');
        const ragEngine = getUnifiedRAGEngine();
        
        const syncResult = await ragEngine.indexStoreData(results.storeId, store.access_token);
        
        if (syncResult.success) {
          results.tests.data_sync = {
            status: 'success',
            data: {
              syncTriggered: true,
              syncTimestamp: new Date().toISOString(),
              documentsIndexed: syncResult.documentsIndexed,
              processingTime: syncResult.processingTime,
              message: 'Store data synchronized to RAG successfully'
            }
          };
        } else {
          throw new Error(syncResult.error || 'Sync failed');
        }
        
        console.log(`[TEST-STORE-FLOW] ✅ Data synchronization completed`);
        
      } catch (error) {
        results.tests.data_sync = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error(`[TEST-STORE-FLOW] ❌ Data sync test failed:`, error);
      }
    }

    // Test 4: Agent Data Access (if requested)
    if (testAgentAccess && results.tests.data_sync.status === 'success') {
      console.log(`[TEST-STORE-FLOW] 4. Testing agent data access...`);
      
      try {
        const { getUnifiedRAGEngine } = await import('@/lib/rag');
        const ragEngine = getUnifiedRAGEngine();
        
        // Test a product query
        const testQuery = {
          query: 'productos disponibles en la tienda',
          context: {
            storeId: results.storeId,
            userId: 'test-user',
            agentType: 'product_manager' as any
          },
          options: {
            topK: 5,
            threshold: 0.3
          }
        };

        const searchResult = await ragEngine.search(testQuery);
        
        results.tests.agent_access = {
          status: 'success',
          data: {
            documentsFound: searchResult.sources.length,
            relevantContexts: searchResult.sources.length > 0,
            sampleResults: searchResult.sources.slice(0, 2).map(doc => ({
              type: doc.metadata.type,
              source: doc.metadata.source,
              contentSnippet: doc.pageContent.substring(0, 100) + '...'
            })),
            message: searchResult.sources.length > 0 ? 
              'Agents can successfully access store data' : 
              'No data found - may need more time for indexing'
          }
        };
        
        console.log(`[TEST-STORE-FLOW] ✅ Agent access test completed - found ${searchResult.sources.length} documents`);
        
      } catch (error) {
        results.tests.agent_access = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error(`[TEST-STORE-FLOW] ❌ Agent access test failed:`, error);
      }
    }

    // Generate recommendations
    if (results.tests.store_connection.status === 'failed') {
      results.recommendations.push('Verificar que la tienda esté correctamente conectada y tenga un access token válido');
    }
    
    if (results.tests.namespace_creation.status === 'failed') {
      results.recommendations.push('Verificar configuración de Pinecone (API key e index name)');
    }
    
    if (results.tests.data_sync.status === 'failed') {
      results.recommendations.push('Verificar que el token de TiendaNube sea válido y la API esté accesible');
    }
    
    if (results.tests.agent_access.status === 'failed') {
      results.recommendations.push('Esperar unos minutos y volver a probar - la indexación puede tomar tiempo');
    }

    const allTestsPassed = Object.values(results.tests).every((test: any) => test.status === 'success');
    
    console.log(`[TEST-STORE-FLOW] 🎯 Test completion: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

    return NextResponse.json({
      success: true,
      message: 'Store connection flow test completed',
      results,
      overallStatus: allTestsPassed ? 'success' : 'partial',
      nextSteps: allTestsPassed ? [
        'El flujo de conexión está funcionando correctamente',
        'Los agentes deberían poder responder preguntas sobre la tienda',
        'Probar el chat con consultas como "que productos tengo"'
      ] : [
        'Revisar los errores específicos en cada test',
        'Aplicar las recomendaciones sugeridas',
        'Volver a ejecutar el test después de corregir los problemas'
      ]
    });

  } catch (error) {
    console.error('[TEST-STORE-FLOW] ❌ Critical test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Store connection flow test failed'
    }, { status: 500 });
  }
} 