import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {} as any,
    issues: [] as string[],
    recommendations: [] as string[]
  };

  console.log('[TIENDANUBE-DIAGNOSIS] Starting complete authentication diagnosis...');

  // 1. Environment Variables Check
  diagnosis.checks.environment = {
    TIENDANUBE_CLIENT_ID: {
      exists: !!process.env.TIENDANUBE_CLIENT_ID,
      length: process.env.TIENDANUBE_CLIENT_ID?.length || 0,
      preview: process.env.TIENDANUBE_CLIENT_ID ? `${process.env.TIENDANUBE_CLIENT_ID.substring(0, 8)}...` : 'NOT_SET'
    },
    TIENDANUBE_CLIENT_SECRET: {
      exists: !!process.env.TIENDANUBE_CLIENT_SECRET,
      length: process.env.TIENDANUBE_CLIENT_SECRET?.length || 0,
      preview: process.env.TIENDANUBE_CLIENT_SECRET ? `${process.env.TIENDANUBE_CLIENT_SECRET.substring(0, 8)}...` : 'NOT_SET'
    },
    TIENDANUBE_REDIRECT_URI: {
      exists: !!process.env.TIENDANUBE_REDIRECT_URI,
      value: process.env.TIENDANUBE_REDIRECT_URI || 'NOT_SET'
    },
    NEXT_PUBLIC_APP_URL: {
      exists: !!process.env.NEXT_PUBLIC_APP_URL,
      value: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET'
    }
  };

  // Check for missing environment variables
  if (!process.env.TIENDANUBE_CLIENT_ID) {
    diagnosis.issues.push('TIENDANUBE_CLIENT_ID is not set');
    diagnosis.recommendations.push('Set TIENDANUBE_CLIENT_ID in your environment variables');
  }

  if (!process.env.TIENDANUBE_CLIENT_SECRET) {
    diagnosis.issues.push('TIENDANUBE_CLIENT_SECRET is not set');
    diagnosis.recommendations.push('Set TIENDANUBE_CLIENT_SECRET in your environment variables');
  }

  if (!process.env.TIENDANUBE_REDIRECT_URI) {
    diagnosis.issues.push('TIENDANUBE_REDIRECT_URI is not set');
    diagnosis.recommendations.push('Set TIENDANUBE_REDIRECT_URI to match your TiendaNube app configuration');
  }

  // 2. TiendaNube API Credentials Test
  if (process.env.TIENDANUBE_CLIENT_ID && process.env.TIENDANUBE_CLIENT_SECRET) {
    try {
      console.log('[TIENDANUBE-DIAGNOSIS] Testing TiendaNube API credentials...');
      
      const testResponse = await fetch('https://www.tiendanube.com/apps/authorize/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FiniAI/1.0 (Complete Diagnosis)',
        },
        body: JSON.stringify({
          client_id: process.env.TIENDANUBE_CLIENT_ID,
          client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: 'test_invalid_code_for_credentials_check'
        }),
      });

      const responseText = await testResponse.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      diagnosis.checks.tiendaNubeCredentials = {
        status: testResponse.status,
        credentialsValid: testResponse.status === 400, // 400 means credentials are valid but code is invalid (expected)
        response: responseData
      };

      if (testResponse.status === 401) {
        diagnosis.issues.push('TiendaNube credentials are invalid or expired');
        diagnosis.recommendations.push('Verify your TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET are correct');
      } else if (testResponse.status === 400) {
        console.log('[TIENDANUBE-DIAGNOSIS] ✅ TiendaNube credentials are valid');
      }

    } catch (error) {
      diagnosis.checks.tiendaNubeCredentials = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      diagnosis.issues.push('Cannot connect to TiendaNube API');
      diagnosis.recommendations.push('Check your internet connection and firewall settings');
    }
  }

  // 3. Database Connection Test
  try {
    console.log('[TIENDANUBE-DIAGNOSIS] Testing database connection...');
    
    const supabase = createClient();
    const { data, error } = await supabase.from('stores').select('count').limit(1);
    
    diagnosis.checks.database = {
      connected: !error,
      error: error?.message
    };

    if (error) {
      diagnosis.issues.push('Database connection failed');
      diagnosis.recommendations.push('Check your Supabase configuration and connection');
    } else {
      console.log('[TIENDANUBE-DIAGNOSIS] ✅ Database connection successful');
    }

  } catch (error) {
    diagnosis.checks.database = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    diagnosis.issues.push('Database connection error');
  }

  // 4. Stores Analysis
  try {
    console.log('[TIENDANUBE-DIAGNOSIS] Analyzing existing stores...');
    
    const supabase = createClient();
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .order('created_at', { ascending: false });

    if (error) {
      diagnosis.checks.stores = {
        error: error.message
      };
    } else {
      const storeAnalysis = stores.map(store => ({
        id: store.id,
        name: store.name,
        domain: store.domain,
        hasAccessToken: !!store.access_token,
        tokenLength: store.access_token?.length || 0,
        tokenExpiresAt: store.token_expires_at,
        isActive: store.is_active,
        createdAt: store.created_at,
        updatedAt: store.updated_at,
        platformStoreId: store.platform_store_id
      }));

      diagnosis.checks.stores = {
        total: stores.length,
        active: stores.filter(s => s.is_active).length,
        withTokens: stores.filter(s => s.access_token).length,
        stores: storeAnalysis
      };

      // Check for common issues
      const storesWithoutTokens = stores.filter(s => !s.access_token);
      if (storesWithoutTokens.length > 0) {
        diagnosis.issues.push(`${storesWithoutTokens.length} stores missing access tokens`);
        diagnosis.recommendations.push('These stores need to be reconnected via OAuth');
      }

      const expiredTokens = stores.filter(s => s.token_expires_at && new Date(s.token_expires_at) < new Date());
      if (expiredTokens.length > 0) {
        diagnosis.issues.push(`${expiredTokens.length} stores have expired tokens`);
        diagnosis.recommendations.push('Expired tokens need to be refreshed or reconnected');
      }

      console.log('[TIENDANUBE-DIAGNOSIS] ✅ Store analysis complete');
    }

  } catch (error) {
    diagnosis.checks.stores = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    diagnosis.issues.push('Failed to analyze stores');
  }

  // 5. OAuth Flow Test
  try {
    console.log('[TIENDANUBE-DIAGNOSIS] Testing OAuth flow generation...');
    
    const testState = {
      userId: 'test-user-id',
      storeUrl: 'https://test-store.tiendanube.com',
      storeName: 'Test Store',
      context: 'diagnosis',
      timestamp: Date.now()
    };
    
    const state = Buffer.from(JSON.stringify(testState)).toString('base64');
    
    // Test state encoding/decoding
    const decodedState = decodeURIComponent(state);
    const decodedJson = Buffer.from(decodedState, 'base64').toString();
    const parsedState = JSON.parse(decodedJson);
    
    const authUrl = `https://www.tiendanube.com/apps/${process.env.TIENDANUBE_CLIENT_ID}/authorize?state=${encodeURIComponent(state)}`;
    
    diagnosis.checks.oauthFlow = {
      canGenerateState: true,
      canDecodeState: true,
      stateTest: {
        original: testState,
        decoded: parsedState,
        matches: JSON.stringify(testState) === JSON.stringify(parsedState)
      },
      authUrl: authUrl.substring(0, 100) + '...'
    };

    if (!diagnosis.checks.oauthFlow.stateTest.matches) {
      diagnosis.issues.push('OAuth state encoding/decoding mismatch');
      diagnosis.recommendations.push('Check state parameter handling in OAuth flow');
    }

    console.log('[TIENDANUBE-DIAGNOSIS] ✅ OAuth flow test complete');

  } catch (error) {
    diagnosis.checks.oauthFlow = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    diagnosis.issues.push('OAuth flow generation failed');
  }

  // 6. Token Validation Test (if stores exist)
  if (diagnosis.checks.stores?.stores?.length > 0) {
    try {
      console.log('[TIENDANUBE-DIAGNOSIS] Testing token validation...');
      
      const storeWithToken = diagnosis.checks.stores.stores.find((s: any) => s.hasAccessToken);
      
      if (storeWithToken) {
        // Import TiendaNubeTokenManager dynamically
        const { TiendaNubeTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
        
        const tokenValidation = await TiendaNubeTokenManager.validateStoreTokens(storeWithToken.id);
        
        diagnosis.checks.tokenValidation = {
          storeId: storeWithToken.id,
          storeName: storeWithToken.name,
          isValid: tokenValidation.isValid,
          needsRefresh: tokenValidation.needsRefresh,
          error: tokenValidation.error
        };

        if (!tokenValidation.isValid) {
          diagnosis.issues.push(`Token validation failed for store ${storeWithToken.name}`);
          diagnosis.recommendations.push('Store needs to be reconnected via OAuth');
        }
      } else {
        diagnosis.checks.tokenValidation = {
          skipped: 'No stores with tokens found'
        };
      }

    } catch (error) {
      diagnosis.checks.tokenValidation = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      diagnosis.issues.push('Token validation test failed');
    }
  }

  // 7. Network Connectivity Test
  try {
    console.log('[TIENDANUBE-DIAGNOSIS] Testing network connectivity...');
    
    const testUrls = [
      'https://www.tiendanube.com',
      'https://api.tiendanube.com',
      'https://www.tiendanube.com/apps/authorize/token'
    ];

    const networkTests = await Promise.all(
      testUrls.map(async (url) => {
        try {
          const response = await fetch(url, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          return {
            url,
            accessible: true,
            status: response.status
          };
        } catch (error) {
          return {
            url,
            accessible: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    diagnosis.checks.networkConnectivity = networkTests;

    const inaccessibleUrls = networkTests.filter(test => !test.accessible);
    if (inaccessibleUrls.length > 0) {
      diagnosis.issues.push('Some TiendaNube URLs are not accessible');
      diagnosis.recommendations.push('Check firewall and network settings');
    }

  } catch (error) {
    diagnosis.checks.networkConnectivity = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    diagnosis.issues.push('Network connectivity test failed');
  }

  // 8. Recent Errors Analysis
  try {
    console.log('[TIENDANUBE-DIAGNOSIS] Analyzing recent authentication attempts...');
    
    const supabase = createClient();
    
    // Check for recent store connection attempts
    const { data: recentStores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      diagnosis.checks.recentActivity = {
        error: error.message
      };
    } else {
      diagnosis.checks.recentActivity = {
        recentConnections: recentStores.length,
        successful: recentStores.filter(s => s.access_token).length,
        failed: recentStores.filter(s => !s.access_token).length,
        stores: recentStores.map(s => ({
          id: s.id,
          name: s.name,
          createdAt: s.created_at,
          hasToken: !!s.access_token,
          isActive: s.is_active
        }))
      };

      if (diagnosis.checks.recentActivity.failed > 0) {
        diagnosis.issues.push(`${diagnosis.checks.recentActivity.failed} recent connection attempts failed`);
        diagnosis.recommendations.push('Review recent OAuth callback logs for specific errors');
      }
    }

  } catch (error) {
    diagnosis.checks.recentActivity = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Summary
  diagnosis.summary = {
    totalIssues: diagnosis.issues.length,
    criticalIssues: diagnosis.issues.filter(issue => 
      issue.includes('credentials') || 
      issue.includes('Database') || 
      issue.includes('not set')
    ).length,
    status: diagnosis.issues.length === 0 ? 'HEALTHY' : 
           diagnosis.issues.length < 3 ? 'WARNING' : 'CRITICAL'
  };

  console.log('[TIENDANUBE-DIAGNOSIS] Complete diagnosis finished');
  console.log(`[TIENDANUBE-DIAGNOSIS] Status: ${diagnosis.summary.status}`);
  console.log(`[TIENDANUBE-DIAGNOSIS] Issues found: ${diagnosis.summary.totalIssues}`);

  return NextResponse.json(diagnosis, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
} 