import { NextRequest, NextResponse } from 'next/server';

/**
 * Test LangChain RAG System
 * Debug endpoint to test the enhanced RAG implementation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a',
      query = 'que productos tengo en mi tienda',
      agentType = 'product_manager',
      testType = 'comparison' // 'legacy', 'enhanced', 'comparison'
    } = body;

    console.log(`[LANGCHAIN-RAG-TEST] Testing ${testType} for query: "${query}"`);

    const results: any = {
      query,
      storeId,
      agentType,
      testType,
      timestamp: new Date().toISOString(),
    };

    // Test enhanced LangChain system
    if (testType === 'enhanced' || testType === 'comparison') {
      try {
        console.log('[LANGCHAIN-RAG-TEST] Testing enhanced LangChain system...');
        const startTime = Date.now();

        // Import the enhanced RAG engine
        const { enhancedRAGEngine } = await import('@/lib/rag/enhanced-rag-engine');
        
        const enhancedQuery = {
          query,
          context: {
            storeId,
            userId: 'test-user',
            agentType: agentType as any,
            conversationId: 'test-conversation',
          },
          options: {
            topK: 8,
            scoreThreshold: 0.3,
            includeStreaming: false,
          },
        };

        const enhancedResult = await enhancedRAGEngine.search(enhancedQuery);
        const enhancedTime = Date.now() - startTime;

        results.enhanced = {
          success: true,
          processingTime: enhancedTime,
          answer: enhancedResult.answer,
          confidence: enhancedResult.confidence,
          sourcesCount: enhancedResult.sources.length,
          sources: enhancedResult.sources.map(doc => ({
            dataType: doc.metadata.dataType,
            chunkIndex: doc.metadata.chunkIndex,
            contentPreview: doc.pageContent.substring(0, 100) + '...',
            score: doc.metadata.score,
          })),
          metadata: enhancedResult.metadata,
        };

        console.log(`[LANGCHAIN-RAG-TEST] Enhanced system completed in ${enhancedTime}ms`);
      } catch (error) {
        console.error('[LANGCHAIN-RAG-TEST] Enhanced system failed:', error);
        results.enhanced = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Test legacy system for comparison
    if (testType === 'legacy' || testType === 'comparison') {
      try {
        console.log('[LANGCHAIN-RAG-TEST] Testing legacy RAG system...');
        const startTime = Date.now();

        // Import the legacy RAG engine
        const { FiniRAGEngine } = await import('@/lib/rag/rag-engine');
        const legacyRAGEngine = new FiniRAGEngine();

        const legacyQuery = {
          query,
          context: {
            storeId,
            userId: 'test-user',
            conversationId: 'test-conversation',
            agentType: agentType as any,
          },
          options: {
            topK: 8,
            threshold: 0.3,
            includeMetadata: true,
          },
        };

        const legacyResult = await legacyRAGEngine.search(legacyQuery);
        const legacyTime = Date.now() - startTime;

        results.legacy = {
          success: true,
          processingTime: legacyTime,
          documentsFound: legacyResult.documents.length,
          confidence: legacyResult.confidence,
          totalFound: legacyResult.totalFound,
          documents: legacyResult.documents.map((doc: any) => ({
            type: doc.metadata.type,
            contentPreview: doc.content.substring(0, 100) + '...',
            relevanceScore: doc.metadata.relevanceScore,
          })),
        };

        console.log(`[LANGCHAIN-RAG-TEST] Legacy system completed in ${legacyTime}ms`);
      } catch (error) {
        console.error('[LANGCHAIN-RAG-TEST] Legacy system failed:', error);
        results.legacy = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Add comparison metrics if both systems were tested
    if (testType === 'comparison' && results.enhanced && results.legacy) {
      results.comparison = {
        performanceImprovement: {
          timeReduction: results.legacy.processingTime - results.enhanced.processingTime,
          timeReductionPercent: ((results.legacy.processingTime - results.enhanced.processingTime) / results.legacy.processingTime * 100).toFixed(2),
        },
        qualityComparison: {
          enhancedConfidence: results.enhanced.confidence,
          legacyConfidence: results.legacy.confidence,
          confidenceImprovement: (results.enhanced.confidence - results.legacy.confidence).toFixed(3),
        },
        featuresComparison: {
          enhancedFeatures: [
            'LangChain integration',
            'Advanced text splitting',
            'MMR diversity',
            'Conversation memory',
            'Streaming support',
            'Multi-namespace retrieval',
          ],
          legacyFeatures: [
            'Basic vector search',
            'Simple chunking',
            'Single namespace',
          ],
        },
      };
    }

    // Test configuration status
    try {
      const { validateLangChainConfig } = await import('@/lib/rag/langchain-config');
      const config = validateLangChainConfig();
      
      results.configuration = {
        isConfigured: config.isValid,
        missing: config.missing,
        warnings: config.warnings,
      };
    } catch (error) {
      results.configuration = {
        isConfigured: false,
        error: error instanceof Error ? error.message : 'Configuration check failed',
      };
    }

    // Get system stats
    try {
      if (results.enhanced) {
        const { enhancedRAGEngine } = await import('@/lib/rag/enhanced-rag-engine');
        const stats = await enhancedRAGEngine.getStats();
        results.systemStats = stats;
      }
    } catch (error) {
      console.warn('[LANGCHAIN-RAG-TEST] Failed to get system stats:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'LangChain RAG system test completed',
      results,
      recommendations: {
        nextSteps: [
          testType === 'comparison' && results.enhanced?.success 
            ? '✅ Enhanced system working - ready for agent integration'
            : '⚠️ Enhanced system needs attention',
          'Test streaming functionality',
          'Test conversation memory',
          'Update agents to use enhanced system',
        ],
        optimizations: [
          'Fine-tune similarity thresholds per agent type',
          'Implement response caching',
          'Add more sophisticated error handling',
          'Consider hybrid search strategies',
        ],
      },
    });

  } catch (error) {
    console.error('[LANGCHAIN-RAG-TEST] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'LangChain RAG Test Endpoint',
    description: 'Test and compare legacy vs enhanced RAG systems',
    usage: {
      method: 'POST',
      body: {
        storeId: 'string (optional)',
        query: 'string (optional)', 
        agentType: 'string (optional)',
        testType: '"legacy" | "enhanced" | "comparison" (optional)',
      },
    },
    examples: [
      {
        testType: 'enhanced',
        query: 'que productos tengo disponibles',
        description: 'Test only the enhanced LangChain system',
      },
      {
        testType: 'comparison',
        query: 'cuales son mis productos mas vendidos',
        description: 'Compare both legacy and enhanced systems',
      },
    ],
  });
} 