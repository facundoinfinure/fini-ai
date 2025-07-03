import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';

export async function GET() {
  try {
    console.log('[OAUTH-DIAGNOSIS] Starting OAuth diagnosis');
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      environment: {
        CLIENT_ID: !!process.env.TIENDANUBE_CLIENT_ID,
        CLIENT_SECRET: !!process.env.TIENDANUBE_CLIENT_SECRET,
        REDIRECT_URI: process.env.TIENDANUBE_REDIRECT_URI,
        APP_URL: process.env.NEXT_PUBLIC_APP_URL
      },
      issues: [] as string[],
      checks: {} as any
    };

    // CHECK 1: Environment Variables
    if (!process.env.TIENDANUBE_CLIENT_ID) {
      diagnosis.issues.push('TIENDANUBE_CLIENT_ID is missing');
    }
    if (!process.env.TIENDANUBE_CLIENT_SECRET) {
      diagnosis.issues.push('TIENDANUBE_CLIENT_SECRET is missing');
    }
    if (!process.env.TIENDANUBE_REDIRECT_URI) {
      diagnosis.issues.push('TIENDANUBE_REDIRECT_URI is missing');
    }

    diagnosis.checks.environmentVariables = {
      status: diagnosis.issues.length === 0 ? 'PASSED' : 'FAILED',
      clientId: process.env.TIENDANUBE_CLIENT_ID ? `${process.env.TIENDANUBE_CLIENT_ID.substring(0, 8)}...` : 'missing',
      redirectUri: process.env.TIENDANUBE_REDIRECT_URI || 'missing',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'missing'
    };

    // CHECK 2: TiendaNube API Connection
    if (process.env.TIENDANUBE_CLIENT_ID && process.env.TIENDANUBE_CLIENT_SECRET) {
      try {
        const testResponse = await fetch('https://www.tiendanube.com/apps/authorize/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FiniAI/1.0 (OAuth Diagnosis)',
          },
          body: JSON.stringify({
            client_id: process.env.TIENDANUBE_CLIENT_ID,
            client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: 'test_code' // This will fail but tells us if credentials are wrong
          }),
        });
        
        const responseText = await testResponse.text();
        
        if (testResponse.status === 400) {
          diagnosis.checks.tiendaNubeApi = {
            status: 'PASSED',
            message: 'TiendaNube API accepting credentials',
            responseStatus: testResponse.status
          };
        } else if (testResponse.status === 401) {
          diagnosis.checks.tiendaNubeApi = {
            status: 'FAILED',
            message: 'Invalid TiendaNube credentials',
            responseStatus: testResponse.status,
            response: responseText
          };
          diagnosis.issues.push('TiendaNube credentials are invalid');
        } else {
          diagnosis.checks.tiendaNubeApi = {
            status: 'UNKNOWN',
            message: 'Unexpected response from TiendaNube API',
            responseStatus: testResponse.status,
            response: responseText
          };
        }
      } catch (apiError) {
        diagnosis.checks.tiendaNubeApi = {
          status: 'FAILED',
          error: apiError instanceof Error ? apiError.message : 'API connection failed'
        };
        diagnosis.issues.push('Cannot connect to TiendaNube API');
      }
    } else {
      diagnosis.checks.tiendaNubeApi = {
        status: 'SKIPPED',
        message: 'Missing credentials for API test'
      };
    }

    // FINAL ASSESSMENT
    const totalChecks = Object.keys(diagnosis.checks).length;
    const passedChecks = Object.values(diagnosis.checks).filter((check: any) => check.status === 'PASSED').length;
    const failedChecks = Object.values(diagnosis.checks).filter((check: any) => check.status === 'FAILED').length;
    
    diagnosis.checks.summary = {
      totalChecks,
      passedChecks,
      failedChecks,
      healthScore: `${passedChecks}/${totalChecks}`,
      overallStatus: failedChecks === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
      recommendations: diagnosis.issues.length > 0 ? [
        ...diagnosis.issues.map(issue => `Fix: ${issue}`),
        'Check your .env.local file for missing variables',
        'Verify TiendaNube app configuration in Partner Dashboard',
        'Ensure redirect URI matches exactly in both .env and TiendaNube app settings'
      ] : ['OAuth configuration appears healthy']
    };

    console.log('[OAUTH-DIAGNOSIS] Diagnosis completed:', {
      healthScore: diagnosis.checks.summary.healthScore,
      issues: diagnosis.issues.length,
      overallStatus: diagnosis.checks.summary.overallStatus
    });

    return NextResponse.json(diagnosis);

  } catch (error) {
    console.error('[OAUTH-DIAGNOSIS] Diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'OAuth diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, code } = await request.json();
    
    if (action === 'test_token_exchange' && code) {
      console.log('[OAUTH-DIAGNOSIS] Testing token exchange with provided code');
      
      try {
        const result = await exchangeCodeForToken(code);
        
        return NextResponse.json({
          success: true,
          message: 'Token exchange successful',
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
          error: 'Token exchange failed',
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
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 