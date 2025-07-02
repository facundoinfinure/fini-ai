import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check RAG data synchronization status
 * GET /api/debug/rag-status
 * 
 * Verifies:
 * - Store sync timestamps
 * - RAG engine configuration
 * - Sample search results
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[DEBUG:RAG] Checking RAG status...');
    
    const supabase = createClient();
    
    // Get stores data
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, user_id, access_token, last_sync_at, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores',
        details: storesError.message
      }, { status: 500 });
    }

    const storeStatus = stores?.map(store => ({
      id: store.id,
      name: store.name,
      hasAccessToken: !!store.access_token,
      lastSync: store.last_sync_at,
      syncAge: store.last_sync_at ? 
        Math.floor((Date.now() - new Date(store.last_sync_at).getTime()) / (1000 * 60)) : 
        null,
      createdDaysAgo: Math.floor((Date.now() - new Date(store.created_at).getTime()) / (1000 * 60 * 60 * 24))
    })) || [];

    // Try to test RAG engine
    let ragEngineStatus = null;
    let sampleSearchResults = null;
    
    try {
      const { FiniRAGEngine } = await import('@/lib/rag');
      const ragEngine = new FiniRAGEngine();
      
      // Get RAG engine stats
      const stats = await ragEngine.getStats();
      ragEngineStatus = {
        isConfigured: stats.isConfigured,
        embeddings: stats.embeddings,
        vectorStore: stats.vectorStore,
        errors: stats.errors || []
      };

      // Try a sample search if we have stores
      if (stats.isConfigured && stores && stores.length > 0) {
        const testStore = stores.find(s => s.access_token);
        if (testStore) {
          try {
            const testQuery = {
              query: 'productos catálogo',
              context: {
                storeId: testStore.id,
                userId: testStore.user_id,
                agentType: 'analytics' as const
              },
              options: {
                topK: 3,
                threshold: 0.6
              }
            };

            const searchResult = await ragEngine.search(testQuery);
            sampleSearchResults = {
              storeId: testStore.id,
              storeName: testStore.name,
              query: testQuery.query,
              totalFound: searchResult.totalFound,
              confidence: searchResult.confidence,
              hasDocuments: searchResult.documents.length > 0,
              sampleContent: searchResult.documents.slice(0, 2).map(doc => ({
                type: doc.metadata.type,
                relevanceScore: doc.metadata.relevanceScore,
                contentPreview: doc.content.substring(0, 150) + '...'
              }))
            };
          } catch (searchError) {
            sampleSearchResults = {
              error: searchError instanceof Error ? searchError.message : 'Unknown search error'
            };
          }
        }
      }

    } catch (ragError) {
      ragEngineStatus = {
        isConfigured: false,
        error: ragError instanceof Error ? ragError.message : 'Unknown RAG error'
      };
    }

    // Environment check
    const environmentStatus = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasPineconeKey: !!process.env.PINECONE_API_KEY,
      hasPineconeIndex: !!process.env.PINECONE_INDEX_NAME,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalStores: stores?.length || 0,
        storesWithTokens: storeStatus.filter(s => s.hasAccessToken).length,
        recentlySynced: storeStatus.filter(s => s.syncAge !== null && s.syncAge < 60).length,
        ragConfigured: ragEngineStatus?.isConfigured || false,
        hasSearchResults: sampleSearchResults?.totalFound > 0
      },
      stores: storeStatus,
      ragEngine: ragEngineStatus,
      sampleSearch: sampleSearchResults,
      environment: environmentStatus,
      troubleshooting: {
        syncDataManually: '/api/test-rag-sync (POST)',
        checkLogs: 'Vercel function logs',
        testAgent: 'Try: "¿qué productos tengo?" in chat',
        expectedResult: 'Agents should list actual products from catalog'
      }
    });

  } catch (error) {
    console.error('[DEBUG:RAG] Status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 