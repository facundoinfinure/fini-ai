import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 🔍 PINECONE NAMESPACE DIAGNOSTIC
 * =============================== 
 * 
 * Comprehensive diagnostic tool to debug Pinecone namespace creation issues.
 * 
 * CURRENT ISSUE: Only 2 of 6 namespaces created for store ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a
 * - ✅ store-ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a (13 records)
 * - ✅ store-ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a-analytics (3 records)
 * - ❌ store-ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a-products (missing)
 * - ❌ store-ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a-orders (missing)
 * - ❌ store-ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a-customers (missing)
 * - ❌ store-ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a-conversations (missing)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[PINECONE-DIAG] 🔍 Starting Pinecone namespace diagnosis');

    const supabase = createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { storeId, action = 'diagnose' } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    console.log(`[PINECONE-DIAG] Diagnosing store: ${storeId}`);

    // Get store info
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    const diagnosis = {
      storeId,
      store: store || null,
      timestamp: new Date().toISOString(),
      operations: [],
      namespaceTests: [],
      errors: [],
      recommendations: []
    };

    // Dynamic import RAG engine
    const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
    const ragEngine = getUnifiedRAGEngine();

    if (action === 'diagnose' || action === 'test_creation') {
      console.log(`[PINECONE-DIAG] 🧪 Testing namespace creation for store: ${storeId}`);

      // Expected namespaces
      const expectedNamespaces = ['store', 'products', 'orders', 'customers', 'analytics', 'conversations'];
      
      // Test each namespace creation individually
      for (const namespaceType of expectedNamespaces) {
        const testResult = {
          namespace: `store-${storeId}-${namespaceType}`,
          type: namespaceType,
          success: false,
          error: null,
          timing: 0,
          details: {}
        };

        const startTime = Date.now();

        try {
          console.log(`[PINECONE-DIAG] Testing ${namespaceType} namespace creation...`);

                     // Test individual namespace initialization by creating a single-type RAG operation
           await ragEngine.initializeStoreNamespaces(storeId);
          
          testResult.success = true;
          testResult.timing = Date.now() - startTime;
          testResult.details = { message: 'Namespace created successfully' };

        } catch (error) {
          testResult.success = false;
          testResult.timing = Date.now() - startTime;
          testResult.error = error instanceof Error ? error.message : 'Unknown error';
          testResult.details = { 
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            stack: error instanceof Error ? error.stack?.slice(0, 500) : null
          };

          console.error(`[PINECONE-DIAG] ❌ ${namespaceType} namespace failed:`, error);
          diagnosis.errors.push(`${namespaceType}: ${testResult.error}`);
        }

        diagnosis.namespaceTests.push(testResult);
      }

      diagnosis.operations.push('individual_namespace_tests');
    }

    if (action === 'test_parallel' || action === 'diagnose') {
      console.log(`[PINECONE-DIAG] 🔄 Testing parallel namespace creation...`);

      try {
        const parallelStartTime = Date.now();
        
        // Test the actual initializeStoreNamespaces method
        const parallelResult = await ragEngine.initializeStoreNamespaces(storeId);
        
        const parallelTest = {
          type: 'parallel_creation',
          success: parallelResult.success,
          timing: Date.now() - parallelStartTime,
          error: parallelResult.error || null,
          details: parallelResult
        };

        diagnosis.namespaceTests.push(parallelTest);
        diagnosis.operations.push('parallel_namespace_test');

        if (!parallelResult.success) {
          diagnosis.errors.push(`Parallel creation failed: ${parallelResult.error}`);
        }

      } catch (error) {
        diagnosis.errors.push(`Parallel test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (action === 'test_api_access' || action === 'diagnose') {
      console.log(`[PINECONE-DIAG] 🌐 Testing TiendaNube API access...`);

      try {
        // Test API access which is required for namespace creation
        if (store?.access_token) {
                     const { TiendaNubeAPI } = await import('@/lib/integrations/tiendanube');
          const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
          
          const apiStartTime = Date.now();
          await api.getStore();
          
          diagnosis.namespaceTests.push({
            type: 'api_access',
            success: true,
            timing: Date.now() - apiStartTime,
            error: null,
            details: { message: 'API access successful' }
          });

          diagnosis.operations.push('api_access_test');
        } else {
          diagnosis.errors.push('No access token available for API testing');
        }

      } catch (error) {
        diagnosis.errors.push(`API access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Generate recommendations based on findings
    const successfulNamespaces = diagnosis.namespaceTests.filter(test => test.success);
    const failedNamespaces = diagnosis.namespaceTests.filter(test => !test.success);

    if (failedNamespaces.length > 0) {
      diagnosis.recommendations.push(`${failedNamespaces.length} namespaces failed - check individual errors`);
      
      // Group errors by type
      const errorPatterns = {};
      failedNamespaces.forEach(failed => {
        const errorKey = failed.error?.split(':')[0] || 'Unknown';
        errorPatterns[errorKey] = (errorPatterns[errorKey] || 0) + 1;
      });

      Object.entries(errorPatterns).forEach(([pattern, count]) => {
        diagnosis.recommendations.push(`Common error pattern: ${pattern} (${count} occurrences)`);
      });
    }

    if (successfulNamespaces.length === 6) {
      diagnosis.recommendations.push('All namespaces created successfully - issue may be timing-related');
    } else if (successfulNamespaces.length > 0) {
      diagnosis.recommendations.push(`Partial success: ${successfulNamespaces.length}/6 namespaces created`);
    }

    // Timing analysis
    const timings = diagnosis.namespaceTests.map(test => test.timing).filter(t => t > 0);
    if (timings.length > 0) {
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTiming = Math.max(...timings);
      
      diagnosis.recommendations.push(`Average timing: ${avgTiming.toFixed(0)}ms, Max: ${maxTiming}ms`);
      
      if (maxTiming > 10000) {
        diagnosis.recommendations.push('Some operations are slow (>10s) - consider timeout issues');
      }
    }

    console.log(`[PINECONE-DIAG] ✅ Diagnosis completed for store: ${storeId}`);

    return NextResponse.json({
      success: true,
      diagnosis
    });

  } catch (error) {
    console.error('[PINECONE-DIAG] ❌ Diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Quick namespace status check
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Get store status
    const { data: store } = await supabase
      .from('stores')
      .select('id, name, is_active, last_sync_at, platform_store_id')
      .eq('id', storeId)
      .single();

    const expectedNamespaces = [
      `store-${storeId}`,
      `store-${storeId}-products`,
      `store-${storeId}-orders`,
      `store-${storeId}-customers`,
      `store-${storeId}-analytics`,
      `store-${storeId}-conversations`,
    ];

    const status = {
      storeId,
      store: store || null,
      expectedNamespaces,
      timestamp: new Date().toISOString(),
      quickDiagnosis: {
        storeExists: !!store,
        storeActive: store?.is_active || false,
        lastSync: store?.last_sync_at || null,
        hasToken: !!(store?.platform_store_id)
      }
    };

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('[PINECONE-DIAG] ❌ Quick status failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 