import { NextRequest, NextResponse } from 'next/server';

/**
 * 🐛 DEBUG ENDPOINT: Environment Check
 * ===================================
 * 
 * Checks environment variables and configuration in the API context.
 * Only works in development mode.
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: 'This endpoint is only available in development mode'
      }, { status: 403 });
    }

    console.log('[DEBUG] 🔍 Checking environment variables...');

    return NextResponse.json({
      success: true,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
        actualSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...'
      }
    });

  } catch (error) {
    console.error('[DEBUG] ❌ Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 