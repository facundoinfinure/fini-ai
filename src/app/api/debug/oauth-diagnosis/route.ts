import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('[OAUTH-DIAGNOSIS] Starting comprehensive OAuth diagnosis...');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    diagnosis: {
      environment_variables: {},
      endpoints: {},
      auth_status: {},
      common_errors: []
    }
  };

  try {
    // 1. Check Environment Variables
    console.log('[OAUTH-DIAGNOSIS] Checking environment variables...');
    results.diagnosis.environment_variables = {
      TIENDANUBE_CLIENT_ID: !!process.env.TIENDANUBE_CLIENT_ID,
      TIENDANUBE_CLIENT_SECRET: !!process.env.TIENDANUBE_CLIENT_SECRET,
      TIENDANUBE_REDIRECT_URI: process.env.TIENDANUBE_REDIRECT_URI || 'NOT_SET',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // 2. Check Auth Status
    console.log('[OAUTH-DIAGNOSIS] Checking authentication...');
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      results.diagnosis.auth_status = {
        session_exists: !!session,
        user_id: session?.user?.id || 'NO_USER',
        error: error?.message || null
      };
    } catch (authError) {
      results.diagnosis.auth_status = {
        session_exists: false,
        error: authError instanceof Error ? authError.message : 'Auth check failed'
      };
    }

    // 3. Check Critical Endpoints
    console.log('[OAUTH-DIAGNOSIS] Checking endpoint availability...');
    const endpointsToCheck = [
      '/api/tiendanube/oauth/connect',
      '/api/tiendanube/oauth/callback',
      '/api/stores',
      '/api/user/profile'
    ];

    for (const endpoint of endpointsToCheck) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app';
        const testResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: 'HEAD', // Just check if endpoint exists
          headers: {
            'User-Agent': 'Fini-AI-Diagnosis/1.0'
          }
        });
        
        results.diagnosis.endpoints[endpoint] = {
          exists: testResponse.status !== 404,
          status: testResponse.status,
          responds: true
        };
      } catch (endpointError) {
        results.diagnosis.endpoints[endpoint] = {
          exists: false,
          responds: false,
          error: endpointError instanceof Error ? endpointError.message : 'Endpoint test failed'
        };
      }
    }

    // 4. Common Error Patterns Check
    console.log('[OAUTH-DIAGNOSIS] Checking for common error patterns...');
    const commonErrors = [];

    // Check for localhost vs production URL mismatch
    const redirectUri = process.env.TIENDANUBE_REDIRECT_URI || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    
    if (redirectUri.includes('localhost') && !appUrl.includes('localhost')) {
      commonErrors.push({
        type: 'URL_MISMATCH',
        severity: 'CRITICAL',
        message: 'TIENDANUBE_REDIRECT_URI still points to localhost while app runs in production',
        solution: 'Update TIENDANUBE_REDIRECT_URI to production URL'
      });
    }

    if (!process.env.TIENDANUBE_CLIENT_ID || !process.env.TIENDANUBE_CLIENT_SECRET) {
      commonErrors.push({
        type: 'MISSING_CREDENTIALS',
        severity: 'CRITICAL',
        message: 'TiendaNube OAuth credentials are missing',
        solution: 'Set TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET in environment variables'
      });
    }

    if (!redirectUri || redirectUri === 'NOT_SET') {
      commonErrors.push({
        type: 'MISSING_REDIRECT_URI',
        severity: 'CRITICAL',
        message: 'TIENDANUBE_REDIRECT_URI is not configured',
        solution: 'Set TIENDANUBE_REDIRECT_URI to https://fini-tn.vercel.app/api/tiendanube/oauth/callback'
      });
    }

    results.diagnosis.common_errors = commonErrors;

    // 5. Generate Recommendations
    const recommendations = [];

    if (commonErrors.length === 0) {
      recommendations.push('✅ No critical configuration errors detected');
      recommendations.push('🔍 If connection still fails, check TiendaNube Partner Dashboard settings');
      recommendations.push('📝 Verify that redirect URI in TiendaNube matches: ' + redirectUri);
    } else {
      recommendations.push('🚨 Critical errors found - see common_errors section');
      recommendations.push('🔧 Fix environment variables in Vercel Dashboard');
      recommendations.push('🔄 Redeploy after fixing environment variables');
    }

    const finalResults = {
      ...results,
      recommendations,
      status: commonErrors.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
      next_steps: [
        'Fix any critical errors listed above',
        'Test store connection after fixes',
        'Monitor for OAuth redirect_uri_mismatch errors',
        'Check TiendaNube Partner Dashboard for app approval status'
      ]
    };

    console.log('[OAUTH-DIAGNOSIS] Diagnosis completed successfully');
    return NextResponse.json(finalResults);

  } catch (error) {
    console.error('[OAUTH-DIAGNOSIS] Diagnosis failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      partial_results: results
    }, { status: 500 });
  }
} 