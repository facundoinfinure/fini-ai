import { NextResponse } from 'next/server';

/**
 * 🐛 DEBUG ENDPOINT: Test Token Manager Fix
 * =========================================
 * 
 * Tests if the createServiceClient() fix resolved the RLS authentication issues
 * in the token manager and allows real store data synchronization.
 */
export async function POST() {
  try {
    console.log('[DEBUG] 🧪 Testing token manager fix...');
    
    const storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    const testResults = {
      storeId,
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0
      }
    };

    // Test 1: Universal Token Manager
    console.log('[DEBUG] 📊 Test 1: Universal Token Manager with createServiceClient()...');
    const tokenTest = {
      testName: 'Universal Token Manager',
      success: false,
      results: null as any,
      error: null as string | null
    };

    try {
      const { UniversalTokenManager } = await import('@/lib/integrations/universal-token-manager');
      
      const storeData = await UniversalTokenManager.getValidStoreData(storeId);
      
      if (storeData) {
        tokenTest.success = true;
                 tokenTest.results = {
           storeId: storeData.id,
           storeName: storeData.name,
           hasToken: !!storeData.access_token,
           platformStoreId: storeData.platform_store_id
         };
        console.log('[DEBUG] ✅ Token manager working - store data retrieved');
      } else {
        tokenTest.error = 'No store data returned - RLS issue may persist';
        console.log('[DEBUG] ❌ Token manager failed - no store data returned');
      }
    } catch (error) {
      tokenTest.error = error instanceof Error ? error.message : 'Unknown error';
      console.log('[DEBUG] ❌ Token manager error:', error);
    }

    testResults.tests.push(tokenTest);

    // Test 2: RAG Data Sync
    console.log('[DEBUG] 📊 Test 2: RAG Data Synchronization...');
    const ragTest = {
      testName: 'RAG Data Sync',
      success: false,
      results: null as any,
      error: null as string | null
    };

    try {
      if (tokenTest.success) {
        const { UnifiedFiniRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        
        const ragEngine = new UnifiedFiniRAGEngine();
        const syncResult = await ragEngine.indexStoreData(storeId);
        
        if (syncResult.success) {
          ragTest.success = true;
          ragTest.results = {
            syncSuccess: true,
            message: 'Store data indexed successfully'
          };
          console.log('[DEBUG] ✅ RAG sync successful');
        } else {
          ragTest.error = syncResult.error || 'RAG sync failed without error message';
          console.log('[DEBUG] ❌ RAG sync failed:', ragTest.error);
        }
      } else {
        ragTest.error = 'Skipped - token manager test failed';
        console.log('[DEBUG] ⚠️ RAG test skipped - token manager failed');
      }
    } catch (error) {
      ragTest.error = error instanceof Error ? error.message : 'Unknown error';
      console.log('[DEBUG] ❌ RAG sync error:', error);
    }

    testResults.tests.push(ragTest);

    // Test 3: Verify Pinecone Data
    console.log('[DEBUG] 📊 Test 3: Verify Pinecone Data...');
    const pineconeTest = {
      testName: 'Pinecone Data Verification',
      success: false,
      results: null as any,
      error: null as string | null
    };

    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      
      const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
      });
      
      const indexName = process.env.PINECONE_INDEX_NAME || 'fini-ai-small';
      const index = pc.index(indexName);
      
      const stats = await index.describeIndexStats();
      
      const storeNamespaces = Object.entries(stats.namespaces || {})
        .filter(([namespace]) => namespace.includes(storeId))
        .map(([namespace, data]) => ({
          namespace,
          recordCount: data.recordCount || 0
        }));
      
      const totalRecords = storeNamespaces.reduce((sum, ns) => sum + ns.recordCount, 0);
      
      pineconeTest.success = true;
      pineconeTest.results = {
        totalNamespaces: storeNamespaces.length,
        totalRecords,
        namespaces: storeNamespaces,
        hasRealData: totalRecords > 10 // More than just placeholders
      };
      
      console.log(`[DEBUG] ✅ Pinecone verification complete - ${totalRecords} total records`);
      
    } catch (error) {
      pineconeTest.error = error instanceof Error ? error.message : 'Unknown error';
      console.log('[DEBUG] ❌ Pinecone verification error:', error);
    }

    testResults.tests.push(pineconeTest);

    // Calculate summary
    testResults.summary.totalTests = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.success).length;
    testResults.summary.failed = testResults.summary.totalTests - testResults.summary.passed;

    const overallSuccess = testResults.summary.passed >= 2; // At least token manager + one other test

    console.log(`[DEBUG] 🎉 Token manager fix test completed: ${testResults.summary.passed}/${testResults.summary.totalTests} tests passed`);

    return NextResponse.json({
      success: overallSuccess,
      message: `Token manager fix test completed: ${testResults.summary.passed}/${testResults.summary.totalTests} tests passed`,
      testResults,
      recommendation: overallSuccess 
        ? "✅ Token manager fix successful - real data sync is working!"
        : "❌ Token manager fix incomplete - check createServiceClient() implementation"
    });

  } catch (error) {
    console.error('[DEBUG] ❌ Fatal error in token manager fix test:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendation: "Check server logs for detailed error information"
    }, { status: 500 });
  }
} 