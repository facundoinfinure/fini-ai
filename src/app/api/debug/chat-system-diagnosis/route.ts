import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FiniMultiAgentSystem } from '@/lib/agents/multi-agent-system';
import type { AgentContext } from '@/lib/agents/types';

/**
 * 🔧 CHAT SYSTEM DIAGNOSIS
 * Comprehensive diagnosis endpoint for troubleshooting chat/RAG issues
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[CHAT-DIAGNOSIS] 🔍 Starting comprehensive system diagnosis...');

  try {
    // 1. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        diagnosis: 'USER_AUTH_FAILED'
      }, { status: 401 });
    }

    const diagnosis = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      tests: {} as any,
      summary: {
        overallHealth: 'UNKNOWN',
        criticalIssues: [],
        warnings: [],
        recommendations: []
      }
    };

    // 2. Test Database Connection
    console.log('[CHAT-DIAGNOSIS] 🗄️ Testing database connection...');
    diagnosis.tests.database = await testDatabaseConnection(supabase, user.id);

    // 3. Test Store Configuration
    console.log('[CHAT-DIAGNOSIS] 🏪 Testing store configuration...');
    diagnosis.tests.stores = await testStoreConfiguration(supabase, user.id);

    // 4. Test RAG System
    console.log('[CHAT-DIAGNOSIS] 🧠 Testing RAG system...');
    diagnosis.tests.rag = await testRAGSystem(diagnosis.tests.stores.stores);

    // 5. Test Agent System
    console.log('[CHAT-DIAGNOSIS] 🤖 Testing agent system...');
    diagnosis.tests.agents = await testAgentSystem(user.id, diagnosis.tests.stores.stores);

    // 6. Test Chat Flow End-to-End
    console.log('[CHAT-DIAGNOSIS] 💬 Testing complete chat flow...');
    diagnosis.tests.chatFlow = await testChatFlow(user.id, diagnosis.tests.stores.stores);

    // 7. Generate Summary and Recommendations
    diagnosis.summary = generateDiagnosisSummary(diagnosis.tests);

    const executionTime = Date.now() - startTime;
    console.log(`[CHAT-DIAGNOSIS] ✅ Diagnosis completed in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      diagnosis,
      executionTime,
      nextSteps: generateNextSteps(diagnosis.summary)
    });

  } catch (error) {
    console.error('[CHAT-DIAGNOSIS] ❌ Diagnosis failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnosis: 'SYSTEM_ERROR'
    }, { status: 500 });
  }
}

/**
 * Test database connectivity and basic queries
 */
async function testDatabaseConnection(supabase: any, userId: string) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('user_id', userId)
      .limit(5);

    return {
      status: 'HEALTHY',
      profileFound: !!profile,
      conversationsCount: conversations?.length || 0,
      errors: [profileError, convError].filter(Boolean).map(e => e.message)
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

/**
 * Test store configuration and data availability
 */
async function testStoreConfiguration(supabase: any, userId: string) {
  try {
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, tiendanube_store_id, is_active, created_at')
      .eq('user_id', userId);

    if (storesError) throw storesError;

    const storeTests = stores?.map(store => ({
      id: store.id,
      name: store.name,
      tiendanubeId: store.tiendanube_store_id,
      isActive: store.is_active,
      hasValidId: !!store.tiendanube_store_id,
      ageInDays: Math.floor((Date.now() - new Date(store.created_at).getTime()) / (1000 * 60 * 60 * 24))
    })) || [];

    return {
      status: stores && stores.length > 0 ? 'HEALTHY' : 'NO_STORES',
      storesCount: stores?.length || 0,
      stores: storeTests,
      activeStores: storeTests.filter(s => s.isActive).length
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Store configuration test failed'
    };
  }
}

/**
 * Test RAG system functionality
 */
async function testRAGSystem(stores: any[]) {
  if (!stores || stores.length === 0) {
    return {
      status: 'SKIPPED',
      reason: 'No stores available to test'
    };
  }

  try {
    // Import RAG engine dynamically
    const { ragEngine } = await import('@/lib/rag');
    
    const testStore = stores[0];
    const testQuery = {
      query: 'productos tienda información',
      context: {
        storeId: testStore.id,
        userId: 'diagnosis-test',
        agentType: 'analytics' as any
      },
      options: {
        topK: 3,
        threshold: 0.3,
        includeMetadata: true
      }
    };

    const ragResult = await ragEngine.search(testQuery);

    return {
      status: 'HEALTHY',
      documentsFound: ragResult.documents.length,
      testStoreId: testStore.id,
      hasData: ragResult.documents.length > 0,
      sampleDocuments: ragResult.documents.slice(0, 2).map(doc => ({
        type: doc.metadata?.type || 'unknown',
        contentPreview: doc.content?.substring(0, 100) || 'No content',
        relevanceScore: doc.metadata?.relevanceScore || 0
      }))
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'RAG system test failed'
    };
  }
}

/**
 * Test agent system functionality
 */
async function testAgentSystem(userId: string, stores: any[]) {
  if (!stores || stores.length === 0) {
    return {
      status: 'SKIPPED',
      reason: 'No stores available to test'
    };
  }

  try {
    const agentSystem = new FiniMultiAgentSystem();
    const testStore = stores[0];
    
    const testContext: AgentContext = {
      userId,
      storeId: testStore.id,
      conversationId: 'diagnosis-test',
      userMessage: 'Dame información sobre mis productos y ventas',
      metadata: {
        platform: 'dashboard',
        timestamp: new Date().toISOString(),
        namespace: `store-${testStore.id}`
      }
    };

    const response = await agentSystem.processMessage(testContext);

    return {
      status: 'HEALTHY',
      responseGenerated: !!response.response,
      agentType: response.agentType,
      confidence: response.confidence,
      hasReasoning: !!response.reasoning,
      executionTime: response.metadata?.systemExecutionTime || 0,
      responsePreview: response.response?.substring(0, 200) || 'No response generated'
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Agent system test failed'
    };
  }
}

/**
 * Test complete chat flow
 */
async function testChatFlow(userId: string, stores: any[]) {
  if (!stores || stores.length === 0) {
    return {
      status: 'SKIPPED',
      reason: 'No stores available to test'
    };
  }

  try {
    // Test different types of queries
    const testQueries = [
      'Cuánto vendí ayer?',
      'Qué productos tengo?',
      'Ayuda con marketing',
      'Análisis de mi tienda'
    ];

    const testResults = [];
    const agentSystem = new FiniMultiAgentSystem();
    const testStore = stores[0];

    for (const query of testQueries) {
      try {
        const context: AgentContext = {
          userId,
          storeId: testStore.id,
          conversationId: 'diagnosis-test',
          userMessage: query,
          metadata: {
            platform: 'dashboard',
            timestamp: new Date().toISOString(),
            namespace: `store-${testStore.id}`
          }
        };

        const response = await agentSystem.processMessage(context);
        
        testResults.push({
          query,
          success: !!response.response,
          agentType: response.agentType,
          confidence: response.confidence,
          hasUsefulResponse: response.response && response.response.length > 100
        });
      } catch (error) {
        testResults.push({
          query,
          success: false,
          error: error instanceof Error ? error.message : 'Query failed'
        });
      }
    }

    const successfulQueries = testResults.filter(r => r.success).length;
    const usefulResponses = testResults.filter(r => r.hasUsefulResponse).length;

    return {
      status: successfulQueries > 0 ? 'HEALTHY' : 'FAILED',
      queriesTested: testQueries.length,
      successfulQueries,
      usefulResponses,
      successRate: (successfulQueries / testQueries.length) * 100,
      details: testResults
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Chat flow test failed'
    };
  }
}

/**
 * Generate diagnosis summary
 */
function generateDiagnosisSummary(tests: any) {
  const criticalIssues = [];
  const warnings = [];
  const recommendations = [];

  // Check database
  if (tests.database?.status === 'FAILED') {
    criticalIssues.push('Database connection failed');
  }

  // Check stores
  if (tests.stores?.status === 'NO_STORES') {
    criticalIssues.push('No stores configured - user needs to connect TiendaNube store');
    recommendations.push('Connect your TiendaNube store from the Configuration section');
  } else if (tests.stores?.activeStores === 0) {
    warnings.push('No active stores found');
    recommendations.push('Activate your stores in the Configuration section');
  }

  // Check RAG
  if (tests.rag?.status === 'FAILED') {
    criticalIssues.push('RAG system not functioning');
    recommendations.push('Trigger manual data synchronization');
  } else if (tests.rag?.hasData === false) {
    warnings.push('No RAG data found - sync needed');
    recommendations.push('Wait for automatic sync or trigger manual sync');
  }

  // Check agents
  if (tests.agents?.status === 'FAILED') {
    criticalIssues.push('Agent system not responding');
  } else if (tests.agents?.confidence < 0.5) {
    warnings.push('Low agent confidence - may need better data');
  }

  // Check chat flow
  if (tests.chatFlow?.status === 'FAILED') {
    criticalIssues.push('Complete chat flow not working');
  } else if (tests.chatFlow?.successRate < 50) {
    warnings.push('Low chat success rate');
    recommendations.push('Check data synchronization and agent configuration');
  }

  // Determine overall health
  let overallHealth = 'HEALTHY';
  if (criticalIssues.length > 0) {
    overallHealth = 'CRITICAL';
  } else if (warnings.length > 0) {
    overallHealth = 'WARNING';
  }

  return {
    overallHealth,
    criticalIssues,
    warnings,
    recommendations
  };
}

/**
 * Generate next steps based on diagnosis
 */
function generateNextSteps(summary: any) {
  const steps = [];

  if (summary.overallHealth === 'CRITICAL') {
    steps.push('🚨 URGENT: Address critical issues immediately');
    steps.push('Contact support if database issues persist');
  }

  if (summary.criticalIssues.includes('No stores configured')) {
    steps.push('1. Go to Configuration → TiendaNube → Connect Store');
    steps.push('2. Complete OAuth flow to connect your store');
    steps.push('3. Wait 2-5 minutes for initial data sync');
  }

  if (summary.warnings.some(w => w.includes('RAG data'))) {
    steps.push('1. Go to Configuration → Sync Data');
    steps.push('2. Click "Sync Now" to force data synchronization');
    steps.push('3. Wait 2-3 minutes and try chatting again');
  }

  if (steps.length === 0) {
    steps.push('✅ System appears healthy - you should be able to chat normally');
    steps.push('If still having issues, try refreshing the page');
  }

  return steps;
}

/**
 * POST endpoint for triggering fixes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, storeId } = body;

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    switch (action) {
      case 'force_rag_sync':
        if (!storeId) {
          return NextResponse.json({
            success: false,
            error: 'Store ID required'
          }, { status: 400 });
        }

        // Trigger RAG sync
        const syncUrl = `https://fini-tn.vercel.app/api/stores/${storeId}/sync-rag`;
        try {
          const syncResponse = await fetch(syncUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          return NextResponse.json({
            success: true,
            message: 'RAG sync triggered',
            syncResponse: await syncResponse.json()
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Failed to trigger sync'
          }, { status: 500 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 