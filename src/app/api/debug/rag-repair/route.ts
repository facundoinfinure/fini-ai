import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, repairs } = body;
    
    if (!storeId) {
      return NextResponse.json({ 
        error: 'storeId parameter required' 
      }, { status: 400 });
    }

    console.log(`[RAG-REPAIR] Starting repairs for store: ${storeId}`);
    
    const repairResults = {
      storeId,
      timestamp: new Date().toISOString(),
      repairs: []
    };

    // ✅ REPAIR 1: Token Refresh
    if (repairs?.includes('token') || repairs?.includes('all')) {
      console.log(`[RAG-REPAIR] 1. Attempting token refresh...`);
      
      try {
        const supabase = createClient();
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError || !store) {
          repairResults.repairs.push({
            type: 'token_refresh',
            status: 'FAILED',
            error: 'Store not found'
          });
        } else {
          // Try to get valid token (this will attempt refresh if needed)
          const validToken = await TiendaNubeTokenManager.getValidToken(storeId);
          
          repairResults.repairs.push({
            type: 'token_refresh',
            status: validToken ? 'SUCCESS' : 'FAILED',
            message: validToken ? 'Token refreshed successfully' : 'Token refresh failed - manual reconnection may be needed'
          });
        }
      } catch (tokenError) {
        repairResults.repairs.push({
          type: 'token_refresh',
          status: 'ERROR',
          error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        });
      }
    }

    // ✅ REPAIR 2: RAG Data Sync
    if (repairs?.includes('rag') || repairs?.includes('all')) {
      console.log(`[RAG-REPAIR] 2. Attempting RAG data sync...`);
      
      try {
        // Get store with access token
        const supabase = createClient();
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError || !store) {
          repairResults.repairs.push({
            type: 'rag_sync',
            status: 'FAILED',
            error: 'Store not found'
          });
        } else if (!store.access_token) {
          repairResults.repairs.push({
            type: 'rag_sync',
            status: 'FAILED',
            error: 'No access token available'
          });
        } else {
          // Try RAG sync
          const { FiniRAGEngine } = await import('@/lib/rag');
          const ragEngine = new FiniRAGEngine();
          
          // First, initialize namespaces
          console.log(`[RAG-REPAIR] Initializing namespaces...`);
          const namespaceResult = await ragEngine.initializeStoreNamespaces(storeId);
          
          if (!namespaceResult.success) {
            repairResults.repairs.push({
              type: 'rag_sync',
              status: 'FAILED',
              error: `Namespace initialization failed: ${namespaceResult.error}`
            });
          } else {
            // Then, index store data
            console.log(`[RAG-REPAIR] Indexing store data...`);
            await ragEngine.indexStoreData(storeId, store.access_token);
            
            // Update last sync timestamp
            await supabase
              .from('stores')
              .update({ 
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', storeId);
            
            repairResults.repairs.push({
              type: 'rag_sync',
              status: 'SUCCESS',
              message: 'RAG data synchronized successfully'
            });
          }
        }
      } catch (ragError) {
        repairResults.repairs.push({
          type: 'rag_sync',
          status: 'ERROR',
          error: ragError instanceof Error ? ragError.message : 'Unknown error'
        });
      }
    }

    // ✅ REPAIR 3: Namespace Cleanup
    if (repairs?.includes('namespaces') || repairs?.includes('all')) {
      console.log(`[RAG-REPAIR] 3. Attempting namespace cleanup...`);
      
      try {
        const { FiniRAGEngine } = await import('@/lib/rag');
        const ragEngine = new FiniRAGEngine();
        
        const result = await ragEngine.initializeStoreNamespaces(storeId);
        
        repairResults.repairs.push({
          type: 'namespace_cleanup',
          status: result.success ? 'SUCCESS' : 'FAILED',
          message: result.success ? 'Namespaces initialized successfully' : result.error
        });
        
      } catch (namespaceError) {
        repairResults.repairs.push({
          type: 'namespace_cleanup',
          status: 'ERROR',
          error: namespaceError instanceof Error ? namespaceError.message : 'Unknown error'
        });
      }
    }

    // ✅ REPAIR 4: Test Agent Response
    if (repairs?.includes('test') || repairs?.includes('all')) {
      console.log(`[RAG-REPAIR] 4. Testing agent response...`);
      
      try {
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        // Test basic search
        const testSearch = await ragEngine.search({
          query: 'productos en la tienda',
          context: {
            storeId,
            userId: 'repair-test',
            agentType: 'analytics'
          },
          options: {
            topK: 3,
            scoreThreshold: 0.5
          }
        });
        
        repairResults.repairs.push({
          type: 'agent_test',
          status: testSearch.sources.length > 0 ? 'SUCCESS' : 'WARNING',
          message: testSearch.sources.length > 0 
            ? `Found ${testSearch.sources.length} documents, agents should work properly`
            : 'No documents found, agents may need more time for sync to complete',
          data: {
            documentsFound: testSearch.sources.length,
            confidence: testSearch.confidence,
            processingTime: testSearch.processingTime
          }
        });
        
      } catch (testError) {
        repairResults.repairs.push({
          type: 'agent_test',
          status: 'ERROR',
          error: testError instanceof Error ? testError.message : 'Unknown error'
        });
      }
    }

    // Summary
    const successCount = repairResults.repairs.filter(r => r.status === 'SUCCESS').length;
    const failedCount = repairResults.repairs.filter(r => r.status === 'FAILED' || r.status === 'ERROR').length;
    
    const overallStatus = {
      repairsAttempted: repairResults.repairs.length,
      successful: successCount,
      failed: failedCount,
      status: failedCount === 0 ? 'ALL_SUCCESS' : successCount > failedCount ? 'MOSTLY_SUCCESS' : 'MOSTLY_FAILED',
      recommendation: failedCount === 0 
        ? 'All repairs completed successfully. System should be working normally.'
        : failedCount === repairResults.repairs.length
          ? 'All repairs failed. Manual intervention required.'
          : 'Some repairs succeeded. Monitor system and retry failed repairs if needed.'
    };

    console.log(`[RAG-REPAIR] ✅ Repairs completed. Success: ${successCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      success: true,
      repairs: {
        ...repairResults,
        summary: overallStatus
      }
    });

  } catch (error) {
    console.error('[RAG-REPAIR] ❌ Repair process failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 