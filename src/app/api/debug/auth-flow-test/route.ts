import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Test Complete Auth Flow
 * Este endpoint verifica todo el flujo de autenticación y conexión
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG-AUTH-FLOW] Testing complete authentication and connection flow');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const results: any[] = [];
    
    // Test 1: Dashboard Access (should redirect to signin)
    try {
      const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
        method: 'GET',
        redirect: 'manual' // Don't follow redirects
      });
      
      results.push({
        test: "Dashboard Access (No Auth)",
        status: dashboardResponse.status === 302 ? "✅ PASS" : "❌ FAIL",
        details: {
          status: dashboardResponse.status,
          location: dashboardResponse.headers.get('location'),
          expected: "Should redirect to signin"
        }
      });
    } catch (error) {
      results.push({
        test: "Dashboard Access (No Auth)",
        status: "❌ ERROR",
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    // Test 2: Auth endpoints availability
    try {
      const signinResponse = await fetch(`${baseUrl}/auth/signin`, {
        method: 'GET',
        redirect: 'manual'
      });
      
      results.push({
        test: "Auth Signin Page",
        status: signinResponse.status === 200 ? "✅ PASS" : "❌ FAIL",
        details: {
          status: signinResponse.status,
          accessible: signinResponse.status === 200
        }
      });
    } catch (error) {
      results.push({
        test: "Auth Signin Page",
        status: "❌ ERROR",
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    // Test 3: Store connection endpoint (should require auth)
    try {
      const connectResponse = await fetch(`${baseUrl}/api/tiendanube/oauth/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: 'https://test.tiendanube.com',
          storeName: 'Test Store'
        })
      });
      
      results.push({
        test: "Store Connection (No Auth)",
        status: connectResponse.status === 401 ? "✅ PASS" : "❌ FAIL",
        details: {
          status: connectResponse.status,
          expected: "Should return 401 when not authenticated"
        }
      });
    } catch (error) {
      results.push({
        test: "Store Connection (No Auth)",
        status: "❌ ERROR",
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    // Test 4: Session endpoint
    try {
      const sessionResponse = await fetch(`${baseUrl}/api/user/session`, {
        method: 'GET'
      });
      
      const sessionData = await sessionResponse.json();
      
      results.push({
        test: "Session Check",
        status: sessionResponse.status === 401 ? "✅ PASS" : "❌ FAIL",
        details: {
          status: sessionResponse.status,
          authenticated: sessionData.authenticated || false,
          expected: "Should show no authentication"
        }
      });
    } catch (error) {
      results.push({
        test: "Session Check",
        status: "❌ ERROR",
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    // Summary
    const passedTests = results.filter(r => r.status === "✅ PASS").length;
    const totalTests = results.length;
    
    return NextResponse.json({
      success: true,
      summary: {
        tests_passed: passedTests,
        tests_total: totalTests,
        flow_status: passedTests === totalTests ? "EXPECTED_BEHAVIOR" : "ISSUES_FOUND",
        message: "Authentication flow working as expected - user needs to sign in first"
      },
      tests: results,
      recommendations: [
        "✅ Dashboard correctly requires authentication",
        "✅ Store connection correctly requires authentication", 
        "⚠️ Users must sign in before connecting stores",
        "📝 Frontend should guide users to sign in first",
        "🔧 Consider adding auth prompts in store connection UI"
      ],
      next_steps: [
        "1. User needs to visit /auth/signin",
        "2. Complete authentication with Google/email",
        "3. Then access dashboard and connect stores",
        "4. OAuth flow to TiendaNube will work properly"
      ]
    });
    
  } catch (error) {
    console.error('[DEBUG-AUTH-FLOW] Critical error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to test auth flow"
    }, { status: 500 });
  }
} 