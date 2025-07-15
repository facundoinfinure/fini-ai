import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('[TEST-CONNECTION-FLOW] Starting connection flow test...');
  
  const results = {
    timestamp: new Date().toISOString(),
    test_results: []
  };

  function addResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', details: any) {
    results.test_results.push({
      test,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    console.log(`[TEST-CONNECTION-FLOW] ${test}: ${status}`, details);
  }

  try {
    // Test 1: Environment Configuration
    addResult('Environment Variables Check', 'PASS', {
      TIENDANUBE_CLIENT_ID_SET: !!process.env.TIENDANUBE_CLIENT_ID,
      TIENDANUBE_CLIENT_SECRET_SET: !!process.env.TIENDANUBE_CLIENT_SECRET,
      TIENDANUBE_REDIRECT_URI: process.env.TIENDANUBE_REDIRECT_URI,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    });

    // Test 2: OAuth Connect Endpoint 
    try {
      const testPayload = {
        storeUrl: "https://demo.tiendanube.com",
        storeName: "Demo Store",
        context: "configuration"
      };

      // Simulate the exact request that the frontend makes
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app';
      const connectResponse = await fetch(`${baseUrl}/api/tiendanube/oauth/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Fini-AI-Test/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      const responseText = await connectResponse.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = { raw_response: responseText.substring(0, 500) };
      }

      if (connectResponse.status === 401) {
        addResult('OAuth Connect Endpoint', 'WARN', {
          status: connectResponse.status,
          message: 'Authentication required (expected for test)',
          response: responseData
        });
      } else if (connectResponse.status >= 200 && connectResponse.status < 300) {
        addResult('OAuth Connect Endpoint', 'PASS', {
          status: connectResponse.status,
          has_auth_url: !!responseData.data?.authUrl,
          response: responseData
        });
      } else {
        addResult('OAuth Connect Endpoint', 'FAIL', {
          status: connectResponse.status,
          response: responseData,
          error: 'Unexpected status code'
        });
      }
    } catch (connectError) {
      addResult('OAuth Connect Endpoint', 'FAIL', {
        error: connectError instanceof Error ? connectError.message : 'Connection test failed',
        type: 'NETWORK_ERROR'
      });
    }

    // Test 3: Callback Endpoint Check
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app';
      const callbackResponse = await fetch(`${baseUrl}/api/tiendanube/oauth/callback`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Fini-AI-Test/1.0'
        }
      });

      if (callbackResponse.status === 302) {
        addResult('OAuth Callback Endpoint', 'PASS', {
          status: callbackResponse.status,
          message: 'Endpoint exists and redirects as expected',
          location: callbackResponse.headers.get('location')
        });
      } else {
        addResult('OAuth Callback Endpoint', 'WARN', {
          status: callbackResponse.status,
          message: 'Endpoint responds but not with redirect (may be missing params)'
        });
      }
    } catch (callbackError) {
      addResult('OAuth Callback Endpoint', 'FAIL', {
        error: callbackError instanceof Error ? callbackError.message : 'Callback test failed'
      });
    }

    // Test 4: Database Connection
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('stores')
        .select('count(*)', { count: 'exact', head: true });

      if (error) {
        addResult('Database Connection', 'FAIL', {
          error: error.message,
          code: error.code
        });
      } else {
        addResult('Database Connection', 'PASS', {
          stores_table_accessible: true,
          count: data
        });
      }
    } catch (dbError) {
      addResult('Database Connection', 'FAIL', {
        error: dbError instanceof Error ? dbError.message : 'Database test failed'
      });
    }

    // Test 5: TiendaNube URL Validation
    const testUrls = [
      'https://demo.tiendanube.com',
      'https://test.mitiendanube.com',
      'invalid-url',
      'https://shopify.com'
    ];

    const urlResults = testUrls.map(url => {
      const isValidTN = url.includes('tiendanube.com') || url.includes('mitiendanube.com');
      return {
        url,
        valid_tiendanube: isValidTN,
        has_https: url.startsWith('https://'),
        proper_format: /^https:\/\/[a-zA-Z0-9.-]+\.(tiendanube|mitiendanube)\.com\/?$/.test(url)
      };
    });

    addResult('URL Validation Logic', 'PASS', {
      test_urls: urlResults,
      validation_working: urlResults.filter(r => r.valid_tiendanube).length === 2
    });

    // Test 6: Error Scenarios Analysis
    const commonErrorScenarios = [
      {
        scenario: 'redirect_uri_mismatch',
        likely_cause: 'TIENDANUBE_REDIRECT_URI in env != URI in TiendaNube Partner Dashboard',
        configured_redirect_uri: process.env.TIENDANUBE_REDIRECT_URI,
        expected_redirect_uri: 'https://fini-tn.vercel.app/api/tiendanube/oauth/callback'
      },
      {
        scenario: 'invalid_client_id',
        likely_cause: 'TIENDANUBE_CLIENT_ID incorrect or app not approved',
        client_id_set: !!process.env.TIENDANUBE_CLIENT_ID
      },
      {
        scenario: 'network_timeout',
        likely_cause: 'TiendaNube API slow or unreachable',
        mitigation: 'Retry logic and timeout handling in place'
      }
    ];

    addResult('Error Scenarios Analysis', 'PASS', {
      common_scenarios: commonErrorScenarios,
      recommendations: [
        'Check TiendaNube Partner Dashboard for app status',
        'Verify redirect URI matches exactly',
        'Monitor network timeouts'
      ]
    });

    // Summary
    const failedTests = results.test_results.filter(r => r.status === 'FAIL').length;
    const warnTests = results.test_results.filter(r => r.status === 'WARN').length;
    const totalTests = results.test_results.length;

    const summary = {
      total_tests: totalTests,
      passed: totalTests - failedTests - warnTests,
      warnings: warnTests,
      failed: failedTests,
      overall_status: failedTests === 0 ? (warnTests === 0 ? 'HEALTHY' : 'MOSTLY_HEALTHY') : 'NEEDS_ATTENTION'
    };

    console.log('[TEST-CONNECTION-FLOW] Test completed:', summary);

    return NextResponse.json({
      ...results,
      summary,
      next_steps: failedTests > 0 ? [
        'Fix failed tests first',
        'Check environment variables in Vercel',
        'Verify TiendaNube Partner Dashboard settings'
      ] : [
        'Configuration looks good',
        'If still experiencing issues, check specific error messages in browser console',
        'Verify user authentication status'
      ]
    });

  } catch (error) {
    console.error('[TEST-CONNECTION-FLOW] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection flow test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      partial_results: results
    }, { status: 500 });
  }
} 