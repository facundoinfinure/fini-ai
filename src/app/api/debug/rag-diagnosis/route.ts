import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';

interface DiagnosisCheck {
  status: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED';
  [key: string]: any;
}

interface DiagnosisChecks {
  database?: DiagnosisCheck;
  tokenHealth?: DiagnosisCheck;
  tokenRetrieval?: DiagnosisCheck;
  apiConnection?: DiagnosisCheck;
  apiProducts?: DiagnosisCheck;
  ragConfiguration?: DiagnosisCheck;
  ragData?: DiagnosisCheck;
  ragNamespaces?: Record<string, DiagnosisCheck>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json({ 
        error: 'storeId parameter required' 
      }, { status: 400 });
    }

    console.log(`[RAG-DIAGNOSIS] Starting comprehensive diagnosis for store: ${storeId}`);
    
    const diagnosis = {
      storeId,
      timestamp: new Date().toISOString(),
      checks: {} as DiagnosisChecks
    };

    // ✅ STEP 1: Check Database Schema & Store Data
    console.log(`[RAG-DIAGNOSIS] 1. Checking database schema and store data...`);
    
    const supabase = createClient();
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      diagnosis.checks.database = {
        status: 'FAILED',
        error: storeError?.message || 'Store not found',
        storeExists: false
      };
    } else {
      diagnosis.checks.database = {
        status: 'PASSED',
        storeExists: true,
        storeData: {
          id: store.id,
          platform_store_id: store.platform_store_id,
          name: store.name,
          platform: store.platform,
          is_active: store.is_active,
          has_access_token: !!store.access_token,
          has_refresh_token: !!store.refresh_token,
          token_expires_at: store.token_expires_at,
          last_sync_at: store.last_sync_at,
          created_at: store.created_at
        }
      };
    }

    // ✅ STEP 2: Check Token Health
    console.log(`[RAG-DIAGNOSIS] 2. Checking TiendaNube token health...`);
    
    if (store?.access_token) {
      try {
        const tokenValidation = await TiendaNubeTokenManager.validateStoreTokens(storeId);
        
        diagnosis.checks.tokenHealth = {
          status: tokenValidation.isValid ? 'PASSED' : 'FAILED',
          isValid: tokenValidation.isValid,
          needsRefresh: tokenValidation.needsRefresh,
          error: tokenValidation.error
        };

        // Try to get a valid token
        const validToken = await TiendaNubeTokenManager.getValidToken(storeId);
        diagnosis.checks.tokenRetrieval = {
          status: validToken ? 'PASSED' : 'FAILED',
          hasValidToken: !!validToken,
          tokenSource: validToken ? 'token_manager' : 'none'
        };

      } catch (tokenError) {
        diagnosis.checks.tokenHealth = {
          status: 'ERROR',
          error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        };
      }
    } else {
      diagnosis.checks.tokenHealth = {
        status: 'FAILED',
        error: 'No access token found in database'
      };
    }

    // ✅ STEP 3: Test TiendaNube API Connection
    console.log(`[RAG-DIAGNOSIS] 3. Testing TiendaNube API connection...`);
    
    if (store?.access_token && store?.platform_store_id) {
      try {
        const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
        const storeInfo = await api.getStore();
        
                 diagnosis.checks.apiConnection = {
           status: 'PASSED',
           storeInfo: {
             id: storeInfo.id,
             name: storeInfo.name,
             url: storeInfo.url,
             country: storeInfo.country,
             currency: storeInfo.currency
           }
         };

         // Test products endpoint
         try {
           const products = await api.getProducts({ limit: 5 }); // Get first 5 products
           diagnosis.checks.apiProducts = {
             status: 'PASSED',
             productCount: products.length,
             hasProducts: products.length > 0,
             sampleProduct: products[0] ? {
               id: products[0].id,
               name: products[0].name,
               firstVariantPrice: products[0].variants?.[0]?.price || 'N/A'
             } : null
           };
         } catch (productsError) {
           diagnosis.checks.apiProducts = {
             status: 'FAILED',
             error: productsError instanceof Error ? productsError.message : 'Unknown error'
           };
         }

      } catch (apiError) {
        diagnosis.checks.apiConnection = {
          status: 'FAILED',
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        };
      }
    } else {
      diagnosis.checks.apiConnection = {
        status: 'SKIPPED',
        reason: 'No access token or platform store ID'
      };
    }

    // ✅ STEP 4: Check RAG Configuration
    console.log(`[RAG-DIAGNOSIS] 4. Checking RAG/Pinecone configuration...`);
    
    try {
      // Check environment variables
      const ragConfig = {
        pineconeApiKey: !!process.env.PINECONE_API_KEY,
        pineconeEnvironment: !!process.env.PINECONE_ENVIRONMENT,
        pineconeIndexName: !!process.env.PINECONE_INDEX_NAME,
        openaiApiKey: !!process.env.OPENAI_API_KEY
      };

      const allConfigured = Object.values(ragConfig).every(Boolean);
      
      diagnosis.checks.ragConfiguration = {
        status: allConfigured ? 'PASSED' : 'FAILED',
        config: ragConfig,
        missingVars: Object.entries(ragConfig)
          .filter(([_, exists]) => !exists)
          .map(([key, _]) => key)
      };

    } catch (ragConfigError) {
      diagnosis.checks.ragConfiguration = {
        status: 'ERROR',
        error: ragConfigError instanceof Error ? ragConfigError.message : 'Unknown error'
      };
    }

    // ✅ STEP 5: Check RAG Data Status
    console.log(`[RAG-DIAGNOSIS] 5. Checking RAG data status...`);
    
    try {
      // Dynamic import to avoid build issues
      const { FiniRAGEngine } = await import('@/lib/rag');
      const ragEngine = new FiniRAGEngine();
      
      // Test search for basic query
      const searchResults = await ragEngine.search({
        query: 'products',
        context: {
          storeId,
          userId: 'diagnostic-user',
          agentType: 'analytics'
        },
        options: {
          topK: 5,
          threshold: 0.5,
          includeMetadata: true
        }
      });
      
      diagnosis.checks.ragData = {
        status: searchResults.documents.length > 0 ? 'PASSED' : 'FAILED',
        documentCount: searchResults.documents.length,
        hasData: searchResults.documents.length > 0,
        searchQuery: 'products',
        confidence: searchResults.confidence,
        processingTime: searchResults.processingTime
      };

      // Check each namespace by filtering by type
      const namespaceChecks = {};
      const namespaces = ['store', 'product', 'order', 'customer', 'analytics'];
      
      for (const namespace of namespaces) {
        try {
          const nsResults = await ragEngine.search({
            query: `information about ${namespace}`,
            context: {
              storeId,
              userId: 'diagnostic-user',
              agentType: 'analytics'
            },
            filters: {
              type: [namespace as any]
            },
            options: {
              topK: 3,
              threshold: 0.3,
              includeMetadata: true
            }
          });
          namespaceChecks[namespace] = {
            status: nsResults.documents.length > 0 ? 'HAS_DATA' : 'EMPTY',
            documentCount: nsResults.documents.length
          };
        } catch (nsError) {
          namespaceChecks[namespace] = {
            status: 'ERROR',
            error: nsError instanceof Error ? nsError.message : 'Unknown error'
          };
        }
      }
      
      diagnosis.checks.ragNamespaces = namespaceChecks;

    } catch (ragError) {
      diagnosis.checks.ragData = {
        status: 'ERROR',
        error: ragError instanceof Error ? ragError.message : 'Unknown error'
      };
    }

    // ✅ STEP 6: Overall Health Assessment
    const failedChecks = Object.entries(diagnosis.checks)
      .filter(([_, check]) => check.status === 'FAILED' || check.status === 'ERROR')
      .map(([name, _]) => name);

    const overallHealth = {
      status: failedChecks.length === 0 ? 'HEALTHY' : failedChecks.length <= 2 ? 'DEGRADED' : 'CRITICAL',
      score: `${Math.max(0, 6 - failedChecks.length)}/6`,
      failedChecks,
      canUseRAG: diagnosis.checks.ragData?.status === 'PASSED',
      canAccessAPI: diagnosis.checks.apiConnection?.status === 'PASSED',
      recommendation: failedChecks.length === 0 
        ? 'System is healthy and ready for agent queries'
        : failedChecks.includes('apiConnection') 
          ? 'Fix TiendaNube token authentication first'
          : failedChecks.includes('ragData')
            ? 'Run RAG sync to populate data for agents'
            : 'Address configuration issues before using agents'
    };

    console.log(`[RAG-DIAGNOSIS] ✅ Diagnosis completed. Overall health: ${overallHealth.status}`);

    return NextResponse.json({
      success: true,
      diagnosis: {
        ...diagnosis,
        overallHealth
      },
      debugInfo: {
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
        storeId
      }
    });

  } catch (error) {
    console.error('[RAG-DIAGNOSIS] ❌ Diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 