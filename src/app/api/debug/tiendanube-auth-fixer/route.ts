import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface DiagnosisResult {
  timestamp: string;
  issues: string[];
  fixes: string[];
  status: 'HEALTHY' | 'REPAIRED' | 'CRITICAL';
  details: any;
}

export async function POST(request: NextRequest) {
  const diagnosis: DiagnosisResult = {
    timestamp: new Date().toISOString(),
    issues: [],
    fixes: [],
    status: 'HEALTHY',
    details: {}
  };

  console.log('🔧 [AUTH-FIXER] Starting TiendaNube authentication diagnosis and repair...');

  try {
    // 1. Check Environment Variables
    console.log('🔍 [AUTH-FIXER] Checking environment variables...');
    
    const envChecks = {
      TIENDANUBE_CLIENT_ID: !!process.env.TIENDANUBE_CLIENT_ID,
      TIENDANUBE_CLIENT_SECRET: !!process.env.TIENDANUBE_CLIENT_SECRET,
      TIENDANUBE_REDIRECT_URI: !!process.env.TIENDANUBE_REDIRECT_URI,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL
    };

    diagnosis.details.environment = envChecks;

    // Check for missing env vars
    Object.entries(envChecks).forEach(([key, exists]) => {
      if (!exists) {
        diagnosis.issues.push(`Missing environment variable: ${key}`);
      }
    });

    // 2. Test TiendaNube API Credentials
    if (envChecks.TIENDANUBE_CLIENT_ID && envChecks.TIENDANUBE_CLIENT_SECRET) {
      console.log('🔍 [AUTH-FIXER] Testing TiendaNube credentials...');
      
      try {
        const credentialTest = await fetch('https://www.tiendanube.com/apps/authorize/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FiniAI/1.0 (Auth Fixer)',
          },
          body: JSON.stringify({
            client_id: process.env.TIENDANUBE_CLIENT_ID,
            client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: 'test_code_for_credential_validation'
          }),
        });

        const credentialResponse = await credentialTest.text();
        
        diagnosis.details.credentialTest = {
          status: credentialTest.status,
          response: credentialResponse
        };

        if (credentialTest.status === 401) {
          diagnosis.issues.push('TiendaNube credentials are invalid');
        } else if (credentialTest.status === 400) {
          console.log('✅ [AUTH-FIXER] TiendaNube credentials are valid');
        }

      } catch (error) {
        diagnosis.issues.push('Cannot connect to TiendaNube API');
        diagnosis.details.credentialError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // 3. Database Analysis and Repair
    console.log('🔍 [AUTH-FIXER] Analyzing database stores...');
    
    const supabase = createClient();
    
    // Get all TiendaNube stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube');

    if (storesError) {
      diagnosis.issues.push('Database connection failed');
      diagnosis.details.databaseError = storesError.message;
    } else {
      const storeAnalysis = {
        total: stores.length,
        active: stores.filter(s => s.is_active).length,
        withTokens: stores.filter(s => s.access_token).length,
        withoutTokens: stores.filter(s => !s.access_token).length,
        expired: stores.filter(s => s.token_expires_at && new Date(s.token_expires_at) < new Date()).length
      };

      diagnosis.details.stores = storeAnalysis;

      // Identify problematic stores
      const problematicStores = stores.filter(s => !s.access_token || !s.platform_store_id);
      
      if (problematicStores.length > 0) {
        diagnosis.issues.push(`${problematicStores.length} stores have missing credentials`);
        
        // 🔧 AUTO-FIX: Mark problematic stores for reconnection
        console.log('🔧 [AUTH-FIXER] Marking problematic stores for reconnection...');
        
        for (const store of problematicStores) {
          try {
            const { error: updateError } = await supabase
              .from('stores')
              .update({
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', store.id);

            if (!updateError) {
              diagnosis.fixes.push(`Marked store ${store.name} for reconnection`);
            }
          } catch (error) {
            console.error('Failed to mark store for reconnection:', error);
          }
        }
      }
    }

    // 4. Determine status
    if (diagnosis.issues.length === 0) {
      diagnosis.status = 'HEALTHY';
      diagnosis.fixes.push('No issues found - system is healthy');
    } else {
      diagnosis.status = diagnosis.fixes.length > 0 ? 'REPAIRED' : 'CRITICAL';
    }

    console.log(`🎯 [AUTH-FIXER] Diagnosis complete - Status: ${diagnosis.status}`);

    return NextResponse.json({
      success: true,
      diagnosis
    });

  } catch (error) {
    console.error('❌ [AUTH-FIXER] Critical error during diagnosis:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnosis
    }, { status: 500 });
  }
}

// GET endpoint for read-only diagnosis
export async function GET(request: NextRequest) {
  console.log('🔍 [AUTH-FIXER] Running read-only diagnosis...');
  
  const diagnosis = {
    timestamp: new Date().toISOString(),
    checks: {} as any,
    issues: [] as string[],
    recommendations: [] as string[]
  };

  // Environment check
  const envVars = {
    TIENDANUBE_CLIENT_ID: !!process.env.TIENDANUBE_CLIENT_ID,
    TIENDANUBE_CLIENT_SECRET: !!process.env.TIENDANUBE_CLIENT_SECRET,
    TIENDANUBE_REDIRECT_URI: !!process.env.TIENDANUBE_REDIRECT_URI,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL
  };

  diagnosis.checks.environment = envVars;

  // Quick database check
  try {
    const supabase = createClient();
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, access_token, is_active, platform')
      .eq('platform', 'tiendanube')
      .limit(10);

    if (error) {
      diagnosis.issues.push('Database connection failed');
    } else {
      diagnosis.checks.database = {
        connected: true,
        storeCount: stores.length,
        activeStores: stores.filter(s => s.is_active).length,
        storesWithTokens: stores.filter(s => s.access_token).length
      };

      if (stores.filter(s => !s.access_token).length > 0) {
        diagnosis.issues.push('Some stores missing access tokens');
        diagnosis.recommendations.push('Run POST /api/debug/tiendanube-auth-fixer to auto-repair');
      }
    }
  } catch (error) {
    diagnosis.issues.push('Database check failed');
  }

  return NextResponse.json(diagnosis);
} 