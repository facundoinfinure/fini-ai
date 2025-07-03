import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'all';
    
    console.log('[OAUTH-PROD-TEST] Starting production OAuth test:', testType);
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      tests: {} as any,
      issues: [] as string[]
    };

    // TEST 1: Environment Variables Detailed Check
    if (testType === 'all' || testType === 'env') {
      console.log('[OAUTH-PROD-TEST] 1. Testing environment variables...');
      
      const envVars = {
        TIENDANUBE_CLIENT_ID: process.env.TIENDANUBE_CLIENT_ID,
        TIENDANUBE_CLIENT_SECRET: process.env.TIENDANUBE_CLIENT_SECRET,
        TIENDANUBE_REDIRECT_URI: process.env.TIENDANUBE_REDIRECT_URI,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
      };

      results.tests.environment = {
        status: 'CHECKED',
        variables: {
          TIENDANUBE_CLIENT_ID: envVars.TIENDANUBE_CLIENT_ID ? `${envVars.TIENDANUBE_CLIENT_ID.substring(0, 5)}...` : 'MISSING',
          TIENDANUBE_CLIENT_SECRET: envVars.TIENDANUBE_CLIENT_SECRET ? `${envVars.TIENDANUBE_CLIENT_SECRET.substring(0, 10)}...` : 'MISSING',
          TIENDANUBE_REDIRECT_URI: envVars.TIENDANUBE_REDIRECT_URI || 'MISSING',
          NEXT_PUBLIC_APP_URL: envVars.NEXT_PUBLIC_APP_URL || 'MISSING'
        },
        redirectUriMismatch: false
      };

      // Check for redirect URI mismatch
      if (envVars.TIENDANUBE_REDIRECT_URI) {
        const expectedUri = 'https://fini-tn.vercel.app/api/tiendanube/oauth/callback';
        if (envVars.TIENDANUBE_REDIRECT_URI !== expectedUri) {
          results.tests.environment.redirectUriMismatch = true;
          results.issues.push(`REDIRECT_URI mismatch: expected ${expectedUri}, got ${envVars.TIENDANUBE_REDIRECT_URI}`);
        }
      }

      // Check for missing vars
      Object.entries(envVars).forEach(([key, value]) => {
        if (!value) {
          results.issues.push(`Missing environment variable: ${key}`);
        }
      });
    }

    // TEST 2: Supabase Client Test
    if (testType === 'all' || testType === 'supabase') {
      console.log('[OAUTH-PROD-TEST] 2. Testing Supabase client...');
      
      try {
        const supabase = createClient();
        
        // Test basic connection (no auth required)
        const { data, error } = await supabase.from('stores').select('id').limit(1);
        
        results.tests.supabase = {
          status: error ? 'FAILED' : 'PASSED',
          canConnect: !error,
          error: error?.message || null
        };
        
        if (error) {
          results.issues.push(`Supabase connection failed: ${error.message}`);
        }
      } catch (supabaseError) {
        results.tests.supabase = {
          status: 'FAILED',
          canConnect: false,
          error: supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase error'
        };
        results.issues.push(`Supabase client error: ${supabaseError instanceof Error ? supabaseError.message : 'Unknown error'}`);
      }
    }

    // TEST 3: TiendaNube API Connection Test
    if (testType === 'all' || testType === 'tiendanube') {
      console.log('[OAUTH-PROD-TEST] 3. Testing TiendaNube API...');
      
      try {
        if (process.env.TIENDANUBE_CLIENT_ID && process.env.TIENDANUBE_CLIENT_SECRET) {
          // Test the token exchange endpoint (will fail but tells us if credentials work)
          const testResponse = await fetch('https://www.tiendanube.com/apps/authorize/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'FiniAI/1.0 (Production Test)',
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

          results.tests.tiendaNubeApi = {
            status: testResponse.status === 400 ? 'CREDENTIALS_OK' : testResponse.status === 401 ? 'CREDENTIALS_FAILED' : 'UNKNOWN',
            responseStatus: testResponse.status,
            response: responseData,
            credentialsValid: testResponse.status === 400 // 400 means credentials are valid but code is invalid (expected)
          };

          if (testResponse.status === 401) {
            results.issues.push('TiendaNube credentials are invalid or expired');
          }
        } else {
          results.tests.tiendaNubeApi = {
            status: 'SKIPPED',
            error: 'Missing credentials for test'
          };
        }
      } catch (apiError) {
        results.tests.tiendaNubeApi = {
          status: 'FAILED',
          error: apiError instanceof Error ? apiError.message : 'API connection failed'
        };
        results.issues.push(`TiendaNube API connection failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
      }
    }

    // TEST 4: OAuth URL Generation Test
    if (testType === 'all' || testType === 'oauth') {
      console.log('[OAUTH-PROD-TEST] 4. Testing OAuth URL generation...');
      
      try {
        const clientId = process.env.TIENDANUBE_CLIENT_ID;
        
        if (clientId) {
          // Simulate state creation
          const testState = {
            userId: 'test-user-id',
            storeUrl: 'https://test-store.tiendanube.com',
            storeName: 'Test Store',
            context: 'configuration',
            timestamp: Date.now()
          };
          
          const state = Buffer.from(JSON.stringify(testState)).toString('base64');
          const authUrl = `https://www.tiendanube.com/apps/${clientId}/authorize?state=${encodeURIComponent(state)}`;
          
          // Test state decoding
          const decodedState = decodeURIComponent(state);
          const decodedJson = Buffer.from(decodedState, 'base64').toString();
          const parsedState = JSON.parse(decodedJson);
          
          results.tests.oauthFlow = {
            status: 'PASSED',
            canGenerateUrl: true,
            canDecodeState: true,
            authUrl: authUrl.substring(0, 100) + '...',
            stateTest: {
              encoded: state.substring(0, 20) + '...',
              decoded: parsedState
            }
          };
        } else {
          results.tests.oauthFlow = {
            status: 'FAILED',
            canGenerateUrl: false,
            error: 'Missing CLIENT_ID'
          };
          results.issues.push('Cannot generate OAuth URL - missing CLIENT_ID');
        }
      } catch (oauthError) {
        results.tests.oauthFlow = {
          status: 'FAILED',
          error: oauthError instanceof Error ? oauthError.message : 'OAuth flow test failed'
        };
        results.issues.push(`OAuth flow test failed: ${oauthError instanceof Error ? oauthError.message : 'Unknown error'}`);
      }
    }

    // SUMMARY
    const totalTests = Object.keys(results.tests).length;
    const passedTests = Object.values(results.tests).filter((test: any) => 
      test.status === 'PASSED' || test.status === 'CREDENTIALS_OK'
    ).length;
    const failedTests = Object.values(results.tests).filter((test: any) => 
      test.status === 'FAILED'
    ).length;

    results.tests.summary = {
      totalTests,
      passedTests,
      failedTests,
      issueCount: results.issues.length,
      overallStatus: results.issues.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
      recommendation: results.issues.length === 0 
        ? 'All production tests passed. OAuth should work correctly.'
        : 'Issues found that may cause OAuth failures. Check the issues array for details.'
    };

    console.log('[OAUTH-PROD-TEST] Test completed:', {
      totalTests,
      passedTests,
      failedTests,
      issueCount: results.issues.length
    });

    return NextResponse.json(results);

  } catch (error) {
    console.error('[OAUTH-PROD-TEST] Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Production OAuth test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST endpoint for testing with real OAuth codes (if needed)
export async function POST(request: NextRequest) {
  try {
    const { code, action } = await request.json();
    
    if (action === 'test_token_exchange' && code) {
      console.log('[OAUTH-PROD-TEST] Testing token exchange with real code');
      
      try {
        const result = await exchangeCodeForToken(code);
        
        return NextResponse.json({
          success: true,
          message: 'Token exchange successful in production',
          data: {
            hasAccessToken: !!result.access_token,
            hasUserId: !!result.user_id,
            userId: result.user_id,
            tokenPreview: result.access_token ? `${result.access_token.substring(0, 10)}...` : null
          }
        });
      } catch (exchangeError) {
        return NextResponse.json({
          success: false,
          error: 'Token exchange failed in production',
          details: exchangeError instanceof Error ? exchangeError.message : 'Unknown error'
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Production test POST failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 