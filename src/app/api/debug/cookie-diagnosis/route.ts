import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('[COOKIE-DIAGNOSIS] Starting comprehensive cookie analysis');
    
    // 1. Raw cookies analysis
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    const cookieAnalysis = {
      totalCookies: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      supabaseCookies: allCookies.filter(c => c.name.includes('supabase')),
      hasSupabaseAccessToken: allCookies.some(c => c.name.includes('access_token')),
      hasSupabaseRefreshToken: allCookies.some(c => c.name.includes('refresh_token')),
    };

    console.log('[COOKIE-DIAGNOSIS] Cookie analysis:', cookieAnalysis);

    // 2. Headers analysis 
    const headerAnalysis = {
      hasUserAgent: !!request.headers.get('user-agent'),
      hasReferer: !!request.headers.get('referer'),
      hasCookieHeader: !!request.headers.get('cookie'),
      cookieHeaderValue: request.headers.get('cookie')?.substring(0, 100) + '...',
      hasAuthorization: !!request.headers.get('authorization'),
    };

    console.log('[COOKIE-DIAGNOSIS] Header analysis:', headerAnalysis);

    // 3. Supabase client test - SAME as oauth/connect endpoint
    const supabase = createClient();
    
    console.log('[COOKIE-DIAGNOSIS] Testing Supabase client...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    const supabaseTest = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionError: sessionError?.message,
      accessTokenExists: !!session?.access_token,
      accessTokenLength: session?.access_token?.length,
    };

    console.log('[COOKIE-DIAGNOSIS] Supabase test result:', supabaseTest);

    // 4. Simulate exact oauth/connect logic
    let oauthConnectSimulation = null;
    try {
      if (sessionError || !session?.user) {
        oauthConnectSimulation = {
          success: false,
          error: 'No authenticated user found - SAME AS OAUTH/CONNECT',
          sessionError: sessionError?.message,
          sessionNull: !session,
          userNull: !session?.user
        };
      } else {
        oauthConnectSimulation = {
          success: true,
          userId: session.user.id,
          message: 'Would work in oauth/connect endpoint'
        };
      }
    } catch (error) {
      oauthConnectSimulation = {
        success: false,
        error: 'Exception in simulation',
        details: error instanceof Error ? error.message : String(error)
      };
    }

    console.log('[COOKIE-DIAGNOSIS] OAuth connect simulation:', oauthConnectSimulation);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        cookieAnalysis,
        headerAnalysis,
        supabaseTest,
        oauthConnectSimulation,
        diagnosticSummary: {
          cookiesPresent: cookieAnalysis.totalCookies > 0,
          supabaseCookiesPresent: cookieAnalysis.supabaseCookies.length > 0,
          sessionValid: !!session,
          userAuthenticated: !!session?.user,
          wouldOAuthWork: !!session?.user
        }
      }
    });

  } catch (error) {
    console.error('[COOKIE-DIAGNOSIS] Error during diagnosis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[COOKIE-DIAGNOSIS] Testing POST endpoint with request body');
    
    // Parse request body like oauth/connect does
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('[COOKIE-DIAGNOSIS] Request body parsed successfully:', Object.keys(requestBody));
    } catch (parseError) {
      console.log('[COOKIE-DIAGNOSIS] Request body parse error:', parseError);
      requestBody = null;
    }

    // Same auth logic as oauth/connect
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('[COOKIE-DIAGNOSIS] POST - No authenticated user found:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found - EXACT SAME AS OAUTH/CONNECT',
        details: {
          sessionError: sessionError?.message,
          hasSession: !!session,
          hasUser: !!session?.user,
          requestBody: requestBody ? Object.keys(requestBody) : null
        }
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'POST endpoint works - OAuth/connect should work too!',
        userId: session.user.id,
        userEmail: session.user.email,
        requestBodyKeys: requestBody ? Object.keys(requestBody) : null
      }
    });

  } catch (error) {
    console.error('[COOKIE-DIAGNOSIS] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 