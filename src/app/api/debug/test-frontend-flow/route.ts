import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Test Complete Frontend Flow
 * Este endpoint simula el flujo completo incluyendo autenticación
 */

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    console.log('[DEBUG-FRONTEND-FLOW] Starting frontend flow simulation');
    
    const { action, storeUrl, storeName } = await request.json();
    
    if (action === 'simulate-connect-store') {
      // Step 1: Validate input (same as frontend)
      if (!storeUrl?.trim()) {
        return NextResponse.json({
          success: false,
          error: 'Por favor ingresa la URL de tu tienda',
          step: 'input_validation'
        }, { status: 400 });
      }

      if (!storeUrl.includes('tiendanube.com') && !storeUrl.includes('mitiendanube.com')) {
        return NextResponse.json({
          success: false,
          error: 'La URL debe ser de Tienda Nube (ej: mitienda.mitiendanube.com)',
          step: 'url_validation'
        }, { status: 400 });
      }

      // Step 2: Extract store name (same as frontend)
      let finalStoreName = storeName?.trim();
      if (!finalStoreName) {
        try {
          const urlParts = storeUrl.replace(/^https?:\/\//, '').split('.');
          if (urlParts.length >= 2) {
            finalStoreName = urlParts[0].charAt(0).toUpperCase() + urlParts[0].slice(1);
          } else {
            finalStoreName = 'Mi Tienda';
          }
        } catch (e) {
          finalStoreName = 'Mi Tienda';
        }
      }

      // Step 3: Check authentication (simulate session)
      const simulatedUserId = 'debug-user-' + Date.now();
      
      // Step 4: Check environment variables
      if (!process.env.TIENDANUBE_CLIENT_ID || !process.env.TIENDANUBE_CLIENT_SECRET) {
        return NextResponse.json({
          success: false,
          error: 'Server configuration error: Tienda Nube credentials are missing',
          step: 'environment_check',
          details: {
            TIENDANUBE_CLIENT_ID: !!process.env.TIENDANUBE_CLIENT_ID,
            TIENDANUBE_CLIENT_SECRET: !!process.env.TIENDANUBE_CLIENT_SECRET
          }
        }, { status: 500 });
      }

      // Step 5: Generate OAuth state (same as real endpoint)
      const stateData = {
        userId: simulatedUserId,
        storeUrl: storeUrl.trim(),
        storeName: finalStoreName,
        context: 'configuration',
        timestamp: Date.now()
      };
      
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

      // Step 6: Generate OAuth URL (same as real endpoint)
      const authUrl = `https://www.tiendanube.com/apps/${process.env.TIENDANUBE_CLIENT_ID}/authorize?state=${encodeURIComponent(state)}`;

      return NextResponse.json({
        success: true,
        message: 'Simulation completed successfully - OAuth URL generated',
        data: {
          authUrl,
          stateData,
          simulatedUserId,
          step: 'oauth_url_generated'
        },
        frontend_next_steps: [
          '1. Frontend would store context in sessionStorage',
          '2. Frontend would redirect to authUrl',
          '3. User completes OAuth at TiendaNube',
          '4. TiendaNube redirects to callback with code',
          '5. Callback processes token exchange and creates store'
        ],
        frontend_code_equivalent: {
          sessionStorage: {
            'dashboard-store-connection': 'true',
            'configStoreUrl': storeUrl.trim(),
            'configStoreName': finalStoreName
          },
          redirect: `window.location.href = "${authUrl}"`
        }
      });
    }
    
    if (action === 'test-session-storage') {
      return NextResponse.json({
        success: true,
        message: 'Session storage test',
        data: {
          typical_keys: [
            'dashboard-store-connection',
            'configStoreUrl', 
            'configStoreName'
          ],
          note: 'These would be set by frontend before OAuth redirect'
        }
      });
    }
    
    if (action === 'test-database-access') {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();
        
        // Test stores table access
        const { data: stores, error: storesError } = await supabase
          .from('stores')
          .select('id, name', { count: 'exact' })
          .limit(1);
          
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .limit(1);
        
        return NextResponse.json({
          success: true,
          message: 'Database access test',
          data: {
            stores_table: {
              accessible: !storesError,
              error: storesError?.message,
              count: stores?.length || 0
            },
            users_table: {
              accessible: !usersError,
              error: usersError?.message,
              count: users?.length || 0
            }
          }
        });
        
      } catch (dbError) {
        return NextResponse.json({
          success: false,
          error: 'Database test failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown DB error'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown action',
      available_actions: [
        'simulate-connect-store',
        'test-session-storage', 
        'test-database-access'
      ]
    }, { status: 400 });
    
  } catch (error) {
    console.error('[DEBUG-FRONTEND-FLOW] Critical error:', error);
    
    return NextResponse.json({
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Frontend Flow Debug API',
    available_endpoints: {
      'POST /api/debug/test-frontend-flow': {
        'simulate-connect-store': 'Simulate complete store connection flow',
        'test-session-storage': 'Test session storage functionality', 
        'test-database-access': 'Test database access and permissions'
      }
    },
    usage_examples: [
      {
        action: 'simulate-connect-store',
        payload: {
          action: 'simulate-connect-store',
          storeUrl: 'https://test.tiendanube.com',
          storeName: 'Test Store'
        }
      },
      {
        action: 'test-database-access',
        payload: {
          action: 'test-database-access'
        }
      }
    ],
    notes: [
      'This endpoint simulates the complete frontend flow without requiring real authentication',
      'Use this to identify where the real flow might be breaking',
      'Compare the simulation results with actual frontend behavior'
    ]
  });
} 