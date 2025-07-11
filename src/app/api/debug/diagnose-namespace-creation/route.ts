import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[NAMESPACE-DIAGNOSIS] 🔍 Starting namespace creation diagnosis...');
    
    const body = await request.json().catch(() => ({}));
    const storeId = body.storeId || 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    console.log(`[NAMESPACE-DIAGNOSIS] 🏪 Diagnosing namespace creation for store: ${storeId}`);
    
    const results = {
      storeId,
      timestamp: new Date().toISOString(),
      phases: {
        initialization: { status: 'pending', details: null },
        individual_namespaces: { status: 'pending', results: [] },
        verification: { status: 'pending', namespaces: [] }
      },
      summary: {
        expected: 6,
        created: 0,
        failed: 0,
        errors: []
      }
    };

    // PHASE 1: Test unified RAG engine initialization
    console.log('[NAMESPACE-DIAGNOSIS] 📊 Phase 1: Testing RAG engine initialization...');
    
    try {
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      results.phases.initialization = {
        status: 'success',
        details: 'RAG engine initialized successfully'
      };
      
      console.log('[NAMESPACE-DIAGNOSIS] ✅ RAG engine initialized');
      
      // PHASE 2: Test individual namespace creation
      console.log('[NAMESPACE-DIAGNOSIS] 🔧 Phase 2: Testing individual namespace creation...');
      
      const namespaceTypes = ['store', 'products', 'orders', 'customers', 'analytics', 'conversations'];
      const individualResults = [];
      
      for (const type of namespaceTypes) {
        const namespaceResult = {
          type,
          namespace: `store-${storeId}${type === 'store' ? '' : `-${type}`}`,
          status: 'pending',
          error: null
        };
        
        try {
          console.log(`[NAMESPACE-DIAGNOSIS] 🏗️ Creating namespace: ${namespaceResult.namespace}`);
          
          // Simulate the same logic as initializeSingleNamespace
          const placeholderId = `placeholder-${storeId}-${type}`;
          const placeholderContent = `Namespace initialized for ${type} data in store ${storeId}`;
          
          // Test embedding generation
          const { EmbeddingsService } = await import('@/lib/rag/embeddings');
          const embeddings = new EmbeddingsService();
          const embeddingResult = await embeddings.generateEmbedding(placeholderContent);
          
          if (!embeddingResult.embedding || embeddingResult.embedding.length === 0) {
            throw new Error('Failed to generate embedding');
          }
          
          // Test document chunk creation
          const documentChunk = {
            id: placeholderId,
            content: placeholderContent,
            metadata: {
              id: placeholderId,
              type: type as any,
              storeId,
              source: 'initialization',
              timestamp: new Date().toISOString(),
              isPlaceholder: true,
              title: `${type} namespace initialization`,
              category: 'system'
            },
            embedding: embeddingResult.embedding
          };
          
          // Test vector store upsert
          const { PineconeVectorStore } = await import('@/lib/rag/vector-store');
          const vectorStore = new PineconeVectorStore();
          await vectorStore.upsert([documentChunk]);
          
          namespaceResult.status = 'success';
          results.summary.created++;
          
          console.log(`[NAMESPACE-DIAGNOSIS] ✅ Successfully created namespace: ${namespaceResult.namespace}`);
          
        } catch (error) {
          namespaceResult.status = 'failed';
          namespaceResult.error = error instanceof Error ? error.message : 'Unknown error';
          results.summary.failed++;
          results.summary.errors.push(`${type}: ${namespaceResult.error}`);
          
          console.error(`[NAMESPACE-DIAGNOSIS] ❌ Failed to create namespace ${namespaceResult.namespace}:`, error);
        }
        
        individualResults.push(namespaceResult);
      }
      
      results.phases.individual_namespaces = {
        status: 'completed',
        results: individualResults
      };
      
      // PHASE 3: Verify actual namespaces in Pinecone
      console.log('[NAMESPACE-DIAGNOSIS] 🔍 Phase 3: Verifying namespaces in Pinecone...');
      
      try {
        // Dynamic import Pinecone client to check namespaces
        const { Pinecone } = await import('@pinecone-database/pinecone');
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
        
        const verifiedNamespaces = [];
        
        for (const type of namespaceTypes) {
          const namespace = `store-${storeId}${type === 'store' ? '' : `-${type}`}`;
          
          try {
            const stats = await index.namespace(namespace).describeIndexStats();
            verifiedNamespaces.push({
              namespace,
              exists: true,
              vectorCount: stats.totalRecordCount || 0
            });
          } catch (error) {
            verifiedNamespaces.push({
              namespace,
              exists: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        results.phases.verification = {
          status: 'completed',
          namespaces: verifiedNamespaces
        };
        
        console.log('[NAMESPACE-DIAGNOSIS] ✅ Verification completed');
        
      } catch (verificationError) {
               results.phases.verification = {
         status: 'failed',
         namespaces: []
       };
        
        console.error('[NAMESPACE-DIAGNOSIS] ❌ Verification failed:', verificationError);
      }
      
    } catch (initError) {
      results.phases.initialization = {
        status: 'failed',
        details: initError instanceof Error ? initError.message : 'Unknown error'
      };
      
      console.error('[NAMESPACE-DIAGNOSIS] ❌ RAG engine initialization failed:', initError);
    }
    
    // Final summary
    console.log(`[NAMESPACE-DIAGNOSIS] 📋 Final Summary: ${results.summary.created}/${results.summary.expected} namespaces created successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Namespace creation diagnosis completed',
      results,
      recommendations: results.summary.failed > 0 ? [
        'Check Pinecone API key and index configuration',
        'Verify embeddings service is working correctly',
        'Check vector store upsert permissions',
        'Review individual namespace error messages'
      ] : [
        'All namespaces created successfully',
        'Issue may be in the reconnection flow timing',
        'Check store-data-manager reconnection logic'
      ]
    });
    
  } catch (error) {
    console.error('[NAMESPACE-DIAGNOSIS] ❌ Diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run namespace creation diagnosis',
    usage: 'POST /api/debug/diagnose-namespace-creation',
    body: { storeId: 'optional-store-id' },
    description: 'Diagnoses why only 2 namespaces are created during store reconnection'
  });
} 