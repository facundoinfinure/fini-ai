/**
 * 🧪 Enhanced RAG System Testing
 * Comprehensive testing endpoint for all RAG components
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { storeId, testQueries = [], runAllTests = true } = await request.json();

    // Validate authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Validate store access
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (!store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found or access denied'
      }, { status: 404 });
    }

    const testResults: any = {
      storeId,
      storeName: store.name,
      testStartTime: new Date().toISOString(),
      results: {},
    };

    // Test 1: Enhanced RAG Engine
    if (runAllTests) {
      console.log('[TEST] 🚀 Testing Enhanced RAG Engine...');
      try {
        const { enhancedRAGEngine } = await import('@/lib/rag/enhanced-rag-engine');
        
        const ragTestQuery = {
          query: 'cuáles son mis productos más vendidos',
          context: {
            storeId,
            userId: user.id,
            agentType: 'analytics' as any,
            conversationId: 'test-conversation',
          },
          options: { topK: 5 }
        };

        const ragResult = await enhancedRAGEngine.search(ragTestQuery);
        
        testResults.results.enhancedRAG = {
          status: 'success',
          sources: ragResult.sources.length,
          confidence: ragResult.confidence,
          metadata: ragResult.metadata,
          performance: `${ragResult.metadata.processingTime}ms`,
        };
      } catch (error) {
        testResults.results.enhancedRAG = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test 2: Streaming RAG
    if (runAllTests) {
      console.log('[TEST] 🔄 Testing Streaming RAG...');
      try {
        // Import streaming RAG
        const streamingRAGPath = '@/lib/rag/streaming-rag';
        let streamingTest: any = { status: 'not_implemented' };
        
        try {
          const streamingModule = await import(streamingRAGPath);
          const streamingEngine = streamingModule.streamingRAGEngine;
          
          if (streamingEngine && typeof streamingEngine.healthCheck === 'function') {
            const healthCheck = await streamingEngine.healthCheck();
            streamingTest = {
              status: 'success',
              health: healthCheck,
              features: healthCheck.features,
            };
          }
        } catch (importError) {
          streamingTest = {
            status: 'module_not_found',
            note: 'Streaming RAG module not yet implemented'
          };
        }

        testResults.results.streamingRAG = streamingTest;
      } catch (error) {
        testResults.results.streamingRAG = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test 3: Conversation Memory
    if (runAllTests) {
      console.log('[TEST] 🧠 Testing Conversation Memory...');
      try {
        // Test conversation memory system
        let memoryTest: any = { status: 'not_implemented' };
        
        try {
          const memoryPath = '@/lib/rag/conversation-memory';
          const memoryModule = await import(memoryPath);
          const memoryManager = memoryModule.conversationMemoryManager;
          
          if (memoryManager && typeof memoryManager.getMemoryStats === 'function') {
            const memoryStats = await memoryManager.getMemoryStats();
            memoryTest = {
              status: 'success',
              stats: memoryStats,
            };
          }
        } catch (importError) {
          memoryTest = {
            status: 'module_not_found',
            note: 'Conversation memory module not yet implemented'
          };
        }

        testResults.results.conversationMemory = memoryTest;
      } catch (error) {
        testResults.results.conversationMemory = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test 4: Hybrid Search
    if (runAllTests) {
      console.log('[TEST] 🔍 Testing Hybrid Search...');
      try {
        // Test hybrid search system
        let hybridTest: any = { status: 'not_implemented' };
        
        try {
          const hybridPath = '@/lib/rag/hybrid-search-engine';
          const hybridModule = await import(hybridPath);
          const hybridEngine = hybridModule.hybridSearchEngine;
          
          if (hybridEngine && typeof hybridEngine.getSearchStats === 'function') {
            const searchStats = await hybridEngine.getSearchStats();
            hybridTest = {
              status: 'success',
              stats: searchStats,
            };
          }
        } catch (importError) {
          hybridTest = {
            status: 'module_not_found',
            note: 'Hybrid search module not yet implemented'
          };
        }

        testResults.results.hybridSearch = hybridTest;
      } catch (error) {
        testResults.results.hybridSearch = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test 5: Agent System Integration
    if (runAllTests) {
      console.log('[TEST] 🤖 Testing Agent Integration...');
      try {
                 const { _multiAgentSystem } = await import('@/lib/agents');
         
         const agentTestQuery = {
           userMessage: 'cuántos productos tengo en mi catálogo',
           storeId,
           userId: user.id,
           conversationId: 'test-conversation',
         };

         const agentResult = await _multiAgentSystem.processMessage(agentTestQuery);
        
        testResults.results.agentIntegration = {
          status: 'success',
          agentType: agentResult.agentType,
          success: agentResult.success,
          confidence: agentResult.confidence,
          responseLength: agentResult.response?.length || 0,
          metadata: agentResult.metadata,
        };
      } catch (error) {
        testResults.results.agentIntegration = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test 6: Custom Test Queries
    if (testQueries.length > 0) {
      console.log('[TEST] 📝 Running Custom Test Queries...');
      const customResults = [];
      
      for (const query of testQueries) {
        try {
          const { enhancedRAGEngine } = await import('@/lib/rag/enhanced-rag-engine');
          
          const customResult = await enhancedRAGEngine.search({
            query: query.query || query,
            context: {
              storeId,
              userId: user.id,
              agentType: query.agentType || 'general',
              conversationId: 'test-conversation',
            },
          });

          customResults.push({
            query: query.query || query,
            agentType: query.agentType || 'general',
            sources: customResult.sources.length,
            confidence: customResult.confidence,
            processingTime: customResult.metadata.processingTime,
          });
        } catch (error) {
          customResults.push({
            query: query.query || query,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      testResults.results.customQueries = customResults;
    }

    // Test 7: Performance Benchmarks
    if (runAllTests) {
      console.log('[TEST] ⚡ Running Performance Benchmarks...');
      const performanceTests = [
        { query: 'productos', agentType: 'product_manager' },
        { query: 'ventas del mes', agentType: 'analytics' },
        { query: 'atención al cliente', agentType: 'customer_service' },
      ];

      const benchmarkResults = [];
      
      for (const test of performanceTests) {
        const testStart = Date.now();
        try {
          const { enhancedRAGEngine } = await import('@/lib/rag/enhanced-rag-engine');
          
          const result = await enhancedRAGEngine.search({
            query: test.query,
            context: {
              storeId,
              userId: user.id,
              agentType: test.agentType as any,
              conversationId: 'benchmark-test',
            },
          });

          benchmarkResults.push({
            query: test.query,
            agentType: test.agentType,
            latency: Date.now() - testStart,
            sources: result.sources.length,
            confidence: result.confidence,
            status: 'success',
          });
        } catch (error) {
          benchmarkResults.push({
            query: test.query,
            agentType: test.agentType,
            latency: Date.now() - testStart,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      testResults.results.performanceBenchmarks = {
        avgLatency: benchmarkResults.reduce((sum, r) => sum + r.latency, 0) / benchmarkResults.length,
        results: benchmarkResults,
      };
    }

    // Calculate overall test summary
    const totalTime = Date.now() - startTime;
    const successfulTests = Object.values(testResults.results).filter((result: any) => result.status === 'success').length;
    const totalTests = Object.keys(testResults.results).length;

    testResults.summary = {
      totalExecutionTime: `${totalTime}ms`,
      testsRun: totalTests,
      testsSuccessful: successfulTests,
      successRate: `${((successfulTests / totalTests) * 100).toFixed(1)}%`,
      status: successfulTests === totalTests ? 'all_passed' : successfulTests > 0 ? 'partial_success' : 'all_failed',
      recommendations: generateRecommendations(testResults.results),
    };

    console.log(`[TEST] ✅ Enhanced RAG system test completed: ${successfulTests}/${totalTests} tests passed in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      data: testResults,
    });

  } catch (error) {
    console.error('[TEST] Enhanced system test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test execution failed',
      executionTime: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Enhanced RAG System Test Suite',
    description: 'Comprehensive testing for all enhanced RAG components',
    features: [
      'Enhanced RAG Engine testing',
      'Streaming capabilities validation',
      'Conversation memory testing',
      'Hybrid search validation',
      'Agent integration testing',
      'Performance benchmarking',
      'Custom query testing',
    ],
    usage: {
      method: 'POST',
      requiredFields: ['storeId'],
      optionalFields: ['testQueries', 'runAllTests'],
      testQueries: [
        { query: 'custom query', agentType: 'product_manager' },
        { query: 'another test', agentType: 'analytics' }
      ]
    }
  });
}

function generateRecommendations(results: any): string[] {
  const recommendations = [];

  if (results.enhancedRAG?.status !== 'success') {
    recommendations.push('🔧 Fix Enhanced RAG Engine - ensure proper initialization and data indexing');
  }

  if (results.streamingRAG?.status === 'not_implemented') {
    recommendations.push('🚀 Implement Streaming RAG for real-time responses');
  }

  if (results.conversationMemory?.status === 'not_implemented') {
    recommendations.push('🧠 Implement Conversation Memory for context retention');
  }

  if (results.hybridSearch?.status === 'not_implemented') {
    recommendations.push('🔍 Implement Hybrid Search for maximum precision');
  }

  if (results.performanceBenchmarks?.avgLatency > 2000) {
    recommendations.push('⚡ Optimize performance - average latency above 2 seconds');
  }

  if (results.agentIntegration?.confidence < 0.5) {
    recommendations.push('🎯 Improve agent confidence - consider better training data');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operational - consider advanced optimizations');
  }

  return recommendations;
} 