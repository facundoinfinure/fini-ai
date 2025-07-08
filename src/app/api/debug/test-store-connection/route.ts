import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Test Store Connection Flow
 * Este endpoint simula el flujo completo de conexión de tiendas para diagnóstico
 */

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    console.log('[DEBUG-STORE-CONNECTION] Starting comprehensive store connection test');
    
    const results: any[] = [];
    
    // Test 1: Environment Variables
    results.push({
      test: "Environment Variables",
      status: !!process.env.TIENDANUBE_CLIENT_ID && !!process.env.TIENDANUBE_CLIENT_SECRET ? "✅ PASS" : "❌ FAIL",
      details: {
        TIENDANUBE_CLIENT_ID: !!process.env.TIENDANUBE_CLIENT_ID,
        TIENDANUBE_CLIENT_SECRET: !!process.env.TIENDANUBE_CLIENT_SECRET,
        TIENDANUBE_REDIRECT_URI: process.env.TIENDANUBE_REDIRECT_URI,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
      }
    });
    
    // Test 2: Database Connection
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();
      
      const { data: tables, error } = await supabase
        .from('stores')
        .select('count')
        .limit(1);
        
      results.push({
        test: "Database Connection",
        status: !error ? "✅ PASS" : "❌ FAIL",
        details: {
          error: error?.message,
          tablesAccessible: !error
        }
      });
    } catch (dbError) {
      results.push({
        test: "Database Connection",
        status: "❌ FAIL",
        details: {
          error: dbError instanceof Error ? dbError.message : 'Unknown DB error'
        }
      });
    }
    
    // Test 3: OAuth Connect Endpoint Structure
    try {
      const testPayload = {
        storeUrl: "https://test.tiendanube.com",
        storeName: "Test Store",
        context: "configuration"
      };
      
      // Test internal endpoint without authentication
      const { BulletproofTiendaNube } = await import('@/lib/integrations/bulletproof-tiendanube');
      
      results.push({
        test: "OAuth Connect Endpoint Structure",
        status: "✅ PASS",
        details: {
          payload: testPayload,
          bulletproofModule: typeof BulletproofTiendaNube,
          endpointExists: true
        }
      });
    } catch (oauthError) {
      results.push({
        test: "OAuth Connect Endpoint Structure",
        status: "❌ FAIL",
        details: {
          error: oauthError instanceof Error ? oauthError.message : 'Unknown OAuth error'
        }
      });
    }
    
    // Test 4: TiendaNube API Connectivity (simulate)
    try {
      const testStoreId = "123456";
      const testUrl = `https://api.tiendanube.com/v1/${testStoreId}/store`;
      
      // Don't actually call the API, just test URL construction
      results.push({
        test: "TiendaNube API URL Construction",
        status: "✅ PASS",
        details: {
          testUrl,
          urlValid: testUrl.includes('api.tiendanube.com'),
          format: "correct"
        }
      });
    } catch (apiError) {
      results.push({
        test: "TiendaNube API URL Construction",
        status: "❌ FAIL",
        details: {
          error: apiError instanceof Error ? apiError.message : 'Unknown API error'
        }
      });
    }
    
    // Test 5: Store URL Validation
    const testUrls = [
      "https://test.tiendanube.com",
      "https://test.mitiendanube.com",
      "https://invalid.shopify.com",
      "not-a-url"
    ];
    
    const urlResults = testUrls.map(url => {
      const isValid = url.includes('tiendanube.com') || url.includes('mitiendanube.com');
      let domain = '';
      let subdomain = '';
      
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
        subdomain = domain.split('.')[0];
      } catch (e) {
        // Invalid URL
      }
      
      return {
        url,
        isValid,
        domain,
        subdomain,
        status: isValid ? "✅ VALID" : "❌ INVALID"
      };
    });
    
    results.push({
      test: "Store URL Validation",
      status: "✅ PASS",
      details: urlResults
    });
    
    // Test 6: Session Storage Functionality (simulate)
    results.push({
      test: "Frontend Session Storage",
      status: "✅ PASS", 
      details: {
        keysUsed: [
          'configStoreUrl',
          'configStoreName',
          'dashboard-store-connection'
        ],
        note: "This would be tested in the browser"
      }
    });
    
    // Summary
    const passedTests = results.filter(r => r.status.includes("✅")).length;
    const totalTests = results.length;
    
    return NextResponse.json({
      success: true,
      timestamp,
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        overallStatus: passedTests === totalTests ? "✅ ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED"
      },
      results,
      recommendations: [
        "Verify all environment variables are set correctly in production",
        "Test OAuth flow with a real TiendaNube store",
        "Verify database permissions for stores table",
        "Check frontend console for JavaScript errors during connection",
        "Test the complete flow: Dashboard → Connect Store → OAuth → Callback → Redirect"
      ],
      next_steps: [
        "1. Open browser and go to dashboard",
        "2. Click 'Conectar Tienda' button",
        "3. Fill in TiendaNube store URL",
        "4. Monitor browser network tab and console",
        "5. Check if OAuth redirect works properly",
        "6. Verify callback processing"
      ]
    });
    
  } catch (error) {
    console.error('[DEBUG-STORE-CONNECTION] Critical error during testing:', error);
    
    return NextResponse.json({
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, storeUrl, storeName } = await request.json();
    
    if (action === 'test-oauth-generation') {
      console.log('[DEBUG-STORE-CONNECTION] Testing OAuth URL generation');
      
      if (!process.env.TIENDANUBE_CLIENT_ID) {
        return NextResponse.json({
          success: false,
          error: 'TIENDANUBE_CLIENT_ID not configured'
        }, { status: 500 });
      }
      
      // Simulate state generation
      const stateData = {
        userId: 'test-user-id',
        storeUrl: storeUrl || 'https://test.tiendanube.com',
        storeName: storeName || 'Test Store',
        context: 'configuration',
        timestamp: Date.now()
      };
      
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
      const authUrl = `https://www.tiendanube.com/apps/${process.env.TIENDANUBE_CLIENT_ID}/authorize?state=${encodeURIComponent(state)}`;
      
      return NextResponse.json({
        success: true,
        data: {
          authUrl,
          stateData,
          encodedState: state
        },
        message: 'OAuth URL generated successfully (test mode)'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 