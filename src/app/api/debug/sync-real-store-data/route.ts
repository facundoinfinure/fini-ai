import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedRAGEngine } from '@/lib/rag/unified-rag-engine';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] 🔄 Starting real store data synchronization endpoint...');
    
    // Get store ID from request or use default
    const body = await request.json().catch(() => ({}));
    const storeId = body.storeId || 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    console.log(`[DEBUG] 🏪 Syncing data for store: ${storeId}`);
    
    // Initialize the RAG engine
    const ragEngine = getUnifiedRAGEngine();
    
    // Execute full store data synchronization using indexStoreData
    console.log('[DEBUG] 📊 Starting comprehensive store data sync...');
    const syncResult = await ragEngine.indexStoreData(storeId);
    
    console.log('[DEBUG] ✅ Store data sync completed:', syncResult);
    
    // Verify namespace contents by attempting searches
    console.log('[DEBUG] 🔍 Verifying namespace contents...');
    const namespaces = ['store', 'products', 'orders', 'customers', 'analytics', 'conversations'];
    const verification = {};
    
    for (const namespace of namespaces) {
      try {
        // Try to search in each namespace to verify data exists
        const searchResult = await ragEngine.search({
          query: 'información',
          context: {
            storeId,
            userId: 'debug-user',
            agentType: 'orchestrator'
          },
          options: {
            topK: 5,
            scoreThreshold: 0.1
          },
          filters: {
            dataTypes: [namespace as any]
          }
        });
        
        verification[namespace] = {
          vectorCount: searchResult.sources.length,
          hasData: searchResult.sources.length > 0,
          sampleContent: searchResult.sources.slice(0, 2).map(s => s.pageContent.substring(0, 100))
        };
        
        console.log(`[DEBUG] 📈 ${namespace}: ${searchResult.sources.length} vectors found`);
      } catch (error) {
        console.error(`[DEBUG] ❌ Error searching ${namespace}:`, error);
        verification[namespace] = { 
          error: error instanceof Error ? error.message : 'Unknown error',
          vectorCount: 0,
          hasData: false
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Real store data synchronization completed successfully',
      storeId,
      syncResult,
      verification,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[DEBUG] ❌ Error during real store data synchronization:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to execute real store data synchronization',
    usage: 'POST /api/debug/sync-real-store-data',
    body: { storeId: 'optional-store-id' },
    description: 'Executes comprehensive real data sync from TiendaNube to Pinecone namespaces'
  });
} 