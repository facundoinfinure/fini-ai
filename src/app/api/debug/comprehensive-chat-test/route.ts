import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FiniMultiAgentSystem } from '@/lib/agents/multi-agent-system';
import type { AgentContext } from '@/lib/agents/types';

export async function GET() {
  const startTime = Date.now();
  console.log('[COMPREHENSIVE-TEST] 🧪 Testing complete chat system...');

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        step: 'AUTH_CHECK'
      }, { status: 401 });
    }

    const testResults = {
      userId: user.id,
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Get user stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, tiendanube_store_id, is_active')
      .eq('user_id', user.id);

    testResults.tests.push({
      name: 'Store Configuration',
      success: !storesError && stores && stores.length > 0,
      details: {
        storesFound: stores?.length || 0,
        activeStores: stores?.filter(s => s.is_active).length || 0,
        error: storesError?.message
      }
    });

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No stores found - user needs to connect TiendaNube store',
        testResults,
        nextStep: 'CONNECT_STORE'
      });
    }

    const firstStore = stores[0];

    // Test 2: RAG System
    let ragTest = { success: false, details: {} };
    try {
      const { ragEngine } = await import('@/lib/rag');
      const ragResult = await ragEngine.search({
        query: 'productos tienda datos',
        context: {
          storeId: firstStore.id,
          userId: user.id,
          agentType: 'analytics' as any
        },
                  options: {
            topK: 3,
            scoreThreshold: 0.3
          }
      });

      ragTest = {
        success: true,
        details: {
          documentsFound: ragResult.documents.length,
          hasData: ragResult.documents.length > 0,
          storeId: firstStore.id
        }
      };
    } catch (error) {
      ragTest = {
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'RAG test failed'
        }
      };
    }

    testResults.tests.push({
      name: 'RAG System',
      success: ragTest.success,
      details: ragTest.details
    });

    // Test 3: Agent System  
    let agentTest = { success: false, details: {} };
    try {
      const agentSystem = new FiniMultiAgentSystem();
      const testContext: AgentContext = {
        userId: user.id,
        storeId: firstStore.id,
        conversationId: 'test-conversation',
        userMessage: 'Cuéntame sobre mi tienda',
        metadata: {
          platform: 'dashboard',
          timestamp: new Date().toISOString(),
          namespace: `store-${firstStore.id}`
        }
      };

      const response = await agentSystem.processMessage(testContext);

      agentTest = {
        success: !!response.response,
        details: {
          agentType: response.agentType,
          confidence: response.confidence,
          hasResponse: !!response.response,
          responseLength: response.response?.length || 0,
          responsePreview: response.response?.substring(0, 150) + '...'
        }
      };
    } catch (error) {
      agentTest = {
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Agent test failed'
        }
      };
    }

    testResults.tests.push({
      name: 'Agent System',
      success: agentTest.success,
      details: agentTest.details
    });

    // Test 4: Complete Chat Flow
    let chatTest = { success: false, details: {} };
    try {
      const response = await fetch('https://fini-tn.vercel.app/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Hola, cuéntame sobre mi tienda',
          storeId: firstStore.id,
          conversationId: 'test-conversation'
        })
      });

      const result = await response.json();

      chatTest = {
        success: result.success,
        details: {
          statusCode: response.status,
          hasResponse: !!result.response?.message,
          agentType: result.response?.agentType,
          error: result.error
        }
      };
    } catch (error) {
      chatTest = {
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Chat API test failed'
        }
      };
    }

    testResults.tests.push({
      name: 'Complete Chat Flow',
      success: chatTest.success,
      details: chatTest.details
    });

    // Generate summary
    const successfulTests = testResults.tests.filter(t => t.success).length;
    const totalTests = testResults.tests.length;
    const overallSuccess = successfulTests === totalTests;

    const executionTime = Date.now() - startTime;

    // Generate recommendations
    const recommendations = [];
    if (!testResults.tests[0].success) {
      recommendations.push('🔗 Connect your TiendaNube store from Configuration');
    }
    if (!testResults.tests[1].success) {
      recommendations.push('🔄 Trigger data synchronization from Configuration → Sync Data');
    }
    if (!testResults.tests[2].success) {
      recommendations.push('🤖 Agent system needs attention - check OpenAI API configuration');
    }
    if (!testResults.tests[3].success) {
      recommendations.push('💬 Chat API has issues - check authentication and endpoints');
    }

    if (overallSuccess) {
      recommendations.push('✅ All systems working! You should be able to chat normally.');
      recommendations.push('If still having issues, try clearing browser cache and refreshing.');
    }

    return NextResponse.json({
      success: overallSuccess,
      summary: {
        testsTotal: totalTests,
        testsSuccessful: successfulTests,
        successRate: (successfulTests / totalTests) * 100,
        overallHealth: overallSuccess ? 'HEALTHY' : 'NEEDS_ATTENTION'
      },
      testResults,
      recommendations,
      executionTime,
      nextSteps: overallSuccess ? [
        'Try sending a message in the chat',
        'Ask about your products or sales data',
        'Test different types of queries'
      ] : recommendations
    });

  } catch (error) {
    console.error('[COMPREHENSIVE-TEST] ❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'SYSTEM_ERROR'
    }, { status: 500 });
  }
} 