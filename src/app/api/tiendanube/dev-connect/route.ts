/**
 * API para conectar con tiendas de desarrollo de Tienda Nube
 * POST /api/tiendanube/dev-connect
 * GET /api/tiendanube/dev-connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

interface DevConnectRequest {
  storeUrl: string;
  storeId?: string;
  accessToken?: string;
  environment?: 'development' | 'staging' | 'production';
}

export async function POST(request: NextRequest) {
  try {
    console.log('[TIENDANUBE-DEV] Processing development connection request');
    
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: 'Development endpoint only available in development mode'
      }, { status: 403 });
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.supabaseId) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated or missing Supabase UUID'
      }, { status: 401 });
    }

    const body = await request.json();
    const { storeUrl, storeId, accessToken, environment = 'development' }: DevConnectRequest = body;

    // Validate input
    if (!storeUrl) {
      return NextResponse.json({
        success: false,
        error: 'Store URL is required'
      }, { status: 400 });
    }

    // Clean and validate store URL
    let cleanUrl = storeUrl.trim().toLowerCase();
    cleanUrl = cleanUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    
    // Permitir URLs de desarrollo más flexibles
    const validUrlPatterns = [
      /^[\w\-]+\.mitiendanube\.com$/,           // Producción
      /^[\w\-]+\.tiendanube\.com$/,             // Dominio alternativo
      /^[\w\-]+\.myshopify\.com$/,              // Shopify (para testing)
      /^localhost:\d+$/,                        // Localhost
      /^[\w\-]+\.ngrok\.io$/,                   // Ngrok tunnels
      /^[\w\-]+\.vercel\.app$/,                 // Vercel previews
    ];

    const isValidUrl = validUrlPatterns.some(pattern => pattern.test(cleanUrl));
    
    if (!isValidUrl) {
      return NextResponse.json({
        success: false,
        error: 'Invalid store URL format for development',
        details: 'URL must be in format: your-store.mitiendanube.com or similar development URL',
        validPatterns: validUrlPatterns.map(p => p.source)
      }, { status: 400 });
    }

    // Extract store name from URL
    const storeNameMatch = cleanUrl.match(/^([\w\-]+)/);
    const storeName = storeNameMatch ? storeNameMatch[1] : cleanUrl;

    // Configurar URLs según el entorno
    const config = {
      development: {
        apiBase: 'https://api.tiendanube.com/v1',
        authUrl: 'https://www.tiendanube.com/apps/authorize',
        tokenUrl: 'https://www.tiendanube.com/apps/authorize/token'
      },
      staging: {
        apiBase: 'https://api-staging.tiendanube.com/v1',
        authUrl: 'https://staging.tiendanube.com/apps/authorize',
        tokenUrl: 'https://staging.tiendanube.com/apps/authorize/token'
      },
      production: {
        apiBase: 'https://api.tiendanube.com/v1',
        authUrl: 'https://www.tiendanube.com/apps/authorize',
        tokenUrl: 'https://www.tiendanube.com/apps/authorize/token'
      }
    };

    const envConfig = config[environment];

    // Si tenemos access token y store ID, probar la conexión directamente
    if (accessToken && storeId) {
      try {
        console.log('[TIENDANUBE-DEV] Testing direct connection with provided credentials');
        
        const testResponse = await fetch(`${envConfig.apiBase}/${storeId}/store`, {
          headers: {
            'Authentication': `bearer ${accessToken}`,
            'User-Agent': 'FiniAI/1.0 (Development Testing)',
            'Content-Type': 'application/json',
          },
        });

        if (testResponse.ok) {
          const storeData = await testResponse.json();
          console.log('[TIENDANUBE-DEV] Direct connection successful:', storeData);

          return NextResponse.json({
            success: true,
            data: {
              storeUrl: cleanUrl,
              storeName: storeData.name || storeName,
              storeId: storeId,
              environment,
              apiBase: envConfig.apiBase,
              connectionType: 'direct',
              storeData
            },
            message: 'Direct connection successful'
          });
        } else {
          console.error('[TIENDANUBE-DEV] Direct connection failed:', testResponse.status);
          return NextResponse.json({
            success: false,
            error: 'Direct connection failed',
            details: `API returned ${testResponse.status}`,
            fallback: 'Try OAuth flow instead'
          }, { status: 400 });
        }
      } catch (error) {
        console.error('[TIENDANUBE-DEV] Direct connection error:', error);
        return NextResponse.json({
          success: false,
          error: 'Direct connection error',
          details: error instanceof Error ? error.message : 'Unknown error',
          fallback: 'Try OAuth flow instead'
        }, { status: 500 });
      }
    }

    // Si no tenemos credenciales, generar URL de OAuth
    const clientId = process.env.TIENDANUBE_CLIENT_ID || '18730'; // Fallback para desarrollo
    const redirectUri = process.env.TIENDANUBE_REDIRECT_URI || 'http://localhost:3000/api/tiendanube/oauth/callback';

    // Generate OAuth state parameter
    const stateData = {
      userId: session.user.supabaseId,
      storeUrl: cleanUrl,
      storeName,
      environment,
      timestamp: Date.now(),
      dev: true
    };
    
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Build OAuth authorization URL
    const scope = 'read_products,read_orders,read_customers,read_store';
    const oauthParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      state: encodedState
    });

    const authUrl = `${envConfig.authUrl}?${oauthParams.toString()}`;

    console.log('[TIENDANUBE-DEV] OAuth URL generated:', {
      userId: session.user.supabaseId,
      storeName,
      storeUrl: cleanUrl,
      environment,
      authUrl
    });

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        storeName,
        storeUrl: cleanUrl,
        environment,
        apiBase: envConfig.apiBase,
        redirectUri,
        scope,
        state: encodedState,
        expiresIn: 600 // 10 minutes
      },
      message: 'Development OAuth URL generated. Redirect user to authUrl.',
      instructions: [
        '1. Redirect user to authUrl',
        '2. User authorizes on Tienda Nube',
        '3. Tienda Nube redirects to callback with code',
        '4. Callback exchanges code for access token',
        '5. Store connection is established'
      ]
    });

  } catch (error) {
    console.error('[TIENDANUBE-DEV] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process development connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Tienda Nube Development Connection API',
    usage: {
      method: 'POST',
      endpoint: '/api/tiendanube/dev-connect',
      body: {
        storeUrl: 'your-store.mitiendanube.com',
        storeId: 'optional-store-id',
        accessToken: 'optional-access-token',
        environment: 'development | staging | production'
      }
    },
    features: [
      'Flexible URL validation for development',
      'Direct connection testing with credentials',
      'OAuth flow generation',
      'Environment-specific API endpoints',
      'Development-only access'
    ],
    validUrlPatterns: [
      'your-store.mitiendanube.com',
      'your-store.tiendanube.com', 
      'your-store.myshopify.com',
      'localhost:3000',
      'your-tunnel.ngrok.io',
      'your-preview.vercel.app'
    ],
    environments: {
      development: 'https://api.tiendanube.com/v1',
      staging: 'https://api-staging.tiendanube.com/v1',
      production: 'https://api.tiendanube.com/v1'
    }
  });
} 