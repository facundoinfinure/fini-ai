/**
 * 🔥 ENHANCED PRODUCTION HEALTH CHECK
 * Comprehensive monitoring for authentication, network, and RAG issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';
import { getUnifiedRAGEngine } from '@/lib/rag/unified-rag-engine';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  responseTime?: number;
  lastChecked: string;
}

interface NetworkDiagnostics {
  connectivity: HealthCheckResult;
  dns: HealthCheckResult;
  timeout: HealthCheckResult;
}

interface StoreHealthStatus {
  storeId: string;
  storeName: string;
  tokenStatus: HealthCheckResult;
  apiConnectivity: HealthCheckResult;
  ragStatus: HealthCheckResult;
  overallHealth: 'healthy' | 'warning' | 'error';
}

/**
 * 🔥 NEW: Network connectivity diagnostics
 */
async function checkNetworkConnectivity(): Promise<NetworkDiagnostics> {
  const startTime = Date.now();
  
  // Test TiendaNube API connectivity
  const connectivityTest = async (): Promise<HealthCheckResult> => {
    try {
      const response = await fetch('https://api.tiendanube.com', {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      return {
        service: 'tiendanube_connectivity',
        status: response.ok ? 'healthy' : 'warning',
        message: `TiendaNube API responded with status ${response.status}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'tiendanube_connectivity',
        status: 'error',
        message: `TiendaNube API connectivity failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          isTimeout: error instanceof Error && error.message.includes('timeout'),
          isNetwork: error instanceof Error && (
            error.message.includes('network') ||
            error.message.includes('fetch failed') ||
            error.message.includes('ETIMEDOUT')
          )
        },
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    }
  };

  // Test DNS resolution
  const dnsTest = async (): Promise<HealthCheckResult> => {
    try {
      const domains = ['api.tiendanube.com', 'api.pinecone.io'];
      const results = await Promise.all(
        domains.map(async (domain) => {
          try {
            await fetch(`https://${domain}`, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            });
            return { domain, status: 'ok' };
          } catch (error) {
            return { 
              domain, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        })
      );
      
      const failedDomains = results.filter(r => r.status === 'error');
      
      return {
        service: 'dns_resolution',
        status: failedDomains.length === 0 ? 'healthy' : 'warning',
        message: failedDomains.length === 0 
          ? 'All DNS resolutions successful' 
          : `${failedDomains.length}/${results.length} DNS resolutions failed`,
        details: { results },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'dns_resolution',
        status: 'error',
        message: `DNS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      };
    }
  };

  // Test timeout handling
  const timeoutTest = async (): Promise<HealthCheckResult> => {
    try {
      const startTime = Date.now();
      
      // Test a deliberate timeout scenario
      await fetch('https://httpbin.org/delay/2', {
        signal: AbortSignal.timeout(1000) // 1 second timeout for 2 second delay
      });
      
      return {
        service: 'timeout_handling',
        status: 'warning',
        message: 'Timeout test did not timeout as expected',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const isExpectedTimeout = error instanceof Error && 
        (error.name === 'AbortError' || error.message.includes('timeout'));
      
      return {
        service: 'timeout_handling',
        status: isExpectedTimeout ? 'healthy' : 'warning',
        message: isExpectedTimeout 
          ? 'Timeout handling working correctly' 
          : `Unexpected timeout behavior: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime,
        lastChecked: new Date().toISOString()
      };
    }
  };

  const [connectivity, dns, timeout] = await Promise.all([
    connectivityTest(),
    dnsTest(),
    timeoutTest()
  ]);

  return { connectivity, dns, timeout };
}

/**
 * 🔥 NEW: Comprehensive store health check
 */
async function checkStoreHealth(storeId: string): Promise<StoreHealthStatus> {
  const supabase = createClient();
  
  // Get store info
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, access_token, platform_store_id, platform')
    .eq('id', storeId)
    .eq('platform', 'tiendanube')
    .single();

  if (storeError || !store) {
    return {
      storeId,
      storeName: 'Unknown',
      tokenStatus: {
        service: 'token_validation',
        status: 'error',
        message: 'Store not found in database',
        lastChecked: new Date().toISOString()
      },
      apiConnectivity: {
        service: 'api_connectivity',
        status: 'error',
        message: 'Cannot test API - store not found',
        lastChecked: new Date().toISOString()
      },
      ragStatus: {
        service: 'rag_engine',
        status: 'error',
        message: 'Cannot test RAG - store not found',
        lastChecked: new Date().toISOString()
      },
      overallHealth: 'error'
    };
  }

  // Test token validation
  const tokenTest = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    try {
      const validToken = await TiendaNubeTokenManager.getValidToken(storeId);
      
      return {
        service: 'token_validation',
        status: validToken ? 'healthy' : 'error',
        message: validToken ? 'Token validation successful' : 'Token validation failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'token_validation',
        status: 'error',
        message: `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          isNetworkError: error instanceof Error && (
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch failed')
          )
        },
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    }
  };

  // Test API connectivity
  const apiTest = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    try {
      if (!store.access_token) {
        return {
          service: 'api_connectivity',
          status: 'error',
          message: 'No access token available for API test',
          lastChecked: new Date().toISOString()
        };
      }

      const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
      const storeData = await api.getStore();
      
      return {
        service: 'api_connectivity',
        status: 'healthy',
        message: 'API connectivity successful',
        details: {
          storeId: storeData.id,
          storeName: storeData.name
        },
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'api_connectivity',
        status: 'error',
        message: `API connectivity failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          isAuthError: error instanceof Error && error.message.includes('401'),
          isNetworkError: error instanceof Error && (
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch failed') ||
            error.message.includes('ETIMEDOUT')
          )
        },
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    }
  };

  // Test RAG engine
  const ragTest = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    try {
      const ragEngine = getUnifiedRAGEngine();
      
      // Test if we can get RAG stats (this tests Pinecone connectivity)
      const stats = await ragEngine.getStats();
      
      return {
        service: 'rag_engine',
        status: stats.isConfigured ? 'healthy' : 'warning',
        message: stats.isConfigured ? 'RAG engine operational' : 'RAG engine not fully configured',
        details: {
          vectorStore: stats.vectorStore,
          embeddings: stats.embeddings,
          errors: stats.errors
        },
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'rag_engine',
        status: 'error',
        message: `RAG engine test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          isPineconeError: error instanceof Error && error.message.toLowerCase().includes('pinecone'),
          isNetworkError: error instanceof Error && (
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch failed')
          )
        },
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    }
  };

  const [tokenStatus, apiConnectivity, ragStatus] = await Promise.all([
    tokenTest(),
    apiTest(),
    ragTest()
  ]);

  // Determine overall health
  const statuses = [tokenStatus.status, apiConnectivity.status, ragStatus.status];
  const overallHealth = statuses.includes('error') ? 'error' :
                       statuses.includes('warning') ? 'warning' : 'healthy';

  return {
    storeId,
    storeName: store.name || 'Unknown',
    tokenStatus,
    apiConnectivity,
    ragStatus,
    overallHealth
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetStoreId = searchParams.get('storeId');
    const includeNetwork = searchParams.get('network') !== 'false';
    
    console.log('[HEALTH] Starting comprehensive production health check');
    const startTime = Date.now();

    // Run network diagnostics if requested
    let networkDiagnostics: NetworkDiagnostics | null = null;
    if (includeNetwork) {
      console.log('[HEALTH] Running network diagnostics');
      networkDiagnostics = await checkNetworkConnectivity();
    }

    // Get stores to check
    const supabase = createClient();
    let storesToCheck: string[] = [];
    
    if (targetStoreId) {
      storesToCheck = [targetStoreId];
    } else {
      // Get all TiendaNube stores
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id')
        .eq('platform', 'tiendanube')
        .limit(10); // Limit to avoid long response times

      if (error) {
        console.error('[HEALTH] Error fetching stores:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch stores for health check'
        }, { status: 500 });
      }

      storesToCheck = stores?.map(s => s.id) || [];
    }

    // Check health of each store
    console.log(`[HEALTH] Checking health of ${storesToCheck.length} stores`);
    const storeHealthPromises = storesToCheck.map(storeId => checkStoreHealth(storeId));
    const storeHealthResults = await Promise.all(storeHealthPromises);

    // Calculate overall system health
    const healthyStores = storeHealthResults.filter(s => s.overallHealth === 'healthy').length;
    const warningStores = storeHealthResults.filter(s => s.overallHealth === 'warning').length;
    const errorStores = storeHealthResults.filter(s => s.overallHealth === 'error').length;

    const systemHealth = errorStores > 0 ? 'error' :
                        warningStores > 0 ? 'warning' : 'healthy';

    const totalTime = Date.now() - startTime;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      systemHealth,
      summary: {
        totalStores: storeHealthResults.length,
        healthyStores,
        warningStores,
        errorStores,
        healthPercentage: Math.round((healthyStores / storeHealthResults.length) * 100) || 0
      },
      networkDiagnostics,
      storeHealth: storeHealthResults,
      recommendations: generateRecommendations(networkDiagnostics, storeHealthResults)
    };

    console.log(`[HEALTH] Health check completed in ${totalTime}ms - System: ${systemHealth}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[HEALTH] Health check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * 🔥 NEW: Generate actionable recommendations based on health check results
 */
function generateRecommendations(
  networkDiagnostics: NetworkDiagnostics | null,
  storeHealthResults: StoreHealthStatus[]
): string[] {
  const recommendations: string[] = [];

  // Network recommendations
  if (networkDiagnostics) {
    if (networkDiagnostics.connectivity.status === 'error') {
      recommendations.push('🌐 CRITICAL: TiendaNube API connectivity issues detected. Check network configuration and firewall settings.');
    }
    
    if (networkDiagnostics.dns.status !== 'healthy') {
      recommendations.push('🌐 DNS resolution issues detected. Verify DNS configuration and external domain accessibility.');
    }
    
    if (networkDiagnostics.timeout.status !== 'healthy') {
      recommendations.push('⏱️ Timeout handling may not be working properly. Review timeout configurations.');
    }
  }

  // Store-level recommendations
  const tokenErrors = storeHealthResults.filter(s => s.tokenStatus.status === 'error').length;
  const apiErrors = storeHealthResults.filter(s => s.apiConnectivity.status === 'error').length;
  const ragErrors = storeHealthResults.filter(s => s.ragStatus.status === 'error').length;

  if (tokenErrors > 0) {
    recommendations.push(`🔑 ${tokenErrors} store(s) have token validation issues. Check TiendaNube OAuth tokens and consider re-authorization.`);
  }

  if (apiErrors > 0) {
    recommendations.push(`🔌 ${apiErrors} store(s) have API connectivity issues. This may indicate network problems or invalid tokens.`);
  }

  if (ragErrors > 0) {
    recommendations.push(`🤖 ${ragErrors} store(s) have RAG engine issues. Check Pinecone configuration and network connectivity.`);
  }

  // Performance recommendations
  const slowStores = storeHealthResults.filter(s => 
    (s.tokenStatus.responseTime && s.tokenStatus.responseTime > 5000) ||
    (s.apiConnectivity.responseTime && s.apiConnectivity.responseTime > 10000)
  );

  if (slowStores.length > 0) {
    recommendations.push(`⚡ ${slowStores.length} store(s) showing slow response times. Consider optimizing network configuration or adding retry logic.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operational. No immediate action required.');
  }

  return recommendations;
} 