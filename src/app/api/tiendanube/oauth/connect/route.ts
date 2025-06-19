/**
 * API para iniciar el flujo OAuth con Tienda Nube
 * POST /api/tiendanube/oauth/connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import crypto from 'crypto';

interface ConnectRequest {
  storeUrl: string;
  redirectUri: string;
}

export async function POST(request: NextRequest) {
  try {
    console.warn('[TIENDANUBE-OAUTH] Processing OAuth connection request');
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.supabaseId) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated or missing Supabase UUID'
      }, { status: 401 });
    }

    const body = await request.json();
    const { storeUrl, redirectUri }: ConnectRequest = body;

    // Validate input
    if (!storeUrl) {
      return NextResponse.json({
        success: false,
        error: 'Store URL is required'
      }, { status: 400 });
    }

    if (!redirectUri) {
      return NextResponse.json({
        success: false,
        error: 'Redirect URI is required'
      }, { status: 400 });
    }

    // Validate store URL format
    const storeUrlRegex = /^https?:\/\/[\w\-]+\.mitiendanube\.com/;
    if (!storeUrlRegex.test(storeUrl)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Tienda Nube store URL format',
        details: 'URL must be in format: https://your-store.mitiendanube.com'
      }, { status: 400 });
    }

    // Extract store name from URL
    const storeNameMatch = storeUrl.match(/https?:\/\/([\w\-]+)\.mitiendanube\.com/);
    const storeName = storeNameMatch ? storeNameMatch[1] : null;

    if (!storeName) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract store name from URL'
      }, { status: 400 });
    }

    // Get Tienda Nube OAuth configuration
    const clientId = process.env.TIENDANUBE_CLIENT_ID;
    const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[TIENDANUBE-OAUTH] Missing OAuth configuration');
      
      // Fallback to demo connection for development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[TIENDANUBE-OAUTH] Development mode: using demo connection');
        
        return NextResponse.json({
          success: false,
          error: 'OAuth not configured - using demo mode',
          fallback: true,
          demo_endpoint: '/api/test/tiendanube-connect'
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Tienda Nube OAuth not configured'
      }, { status: 500 });
    }

    // Generate OAuth state parameter for security
    const _state = crypto.randomBytes(32).toString('hex');
    
    // Store state and store info temporarily (in production, use Redis or database)
    // For now, we'll pass it in the state parameter
    const stateData = {
      userId: session.user.supabaseId,
      storeUrl,
      storeName,
      timestamp: Date.now()
    };
    
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Build OAuth authorization URL
    const scope = 'read_products,read_orders,read_customers,read_store'; // Adjust scopes as needed
    const oauthParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state: encodedState
    });

    // La URL correcta de OAuth de Tienda Nube incluye el app_id
    const authUrl = `https://www.tiendanube.com/apps/${clientId}/authorize?${oauthParams.toString()}`;

    console.warn('[TIENDANUBE-OAUTH] OAuth URL generated:', {
      userId: session.user.supabaseId,
      storeName,
      redirectUri,
      scope
    });

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        storeName,
        storeUrl,
        redirectUri,
        scope,
        state: encodedState,
        expiresIn: 600 // 10 minutes
      },
      message: 'OAuth authorization URL generated. Redirect user to authUrl.'
    });

  } catch (error) {
    console.error('[TIENDANUBE-OAUTH] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate OAuth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Tienda Nube OAuth Connection API',
    usage: {
      method: 'POST',
      endpoint: '/api/tiendanube/oauth/connect',
      body: {
        storeUrl: 'https://your-store.mitiendanube.com',
        redirectUri: 'https://your-app.com/api/tiendanube/oauth/callback'
      }
    },
    flow: [
      '1. POST to this endpoint with store URL',
      '2. Get authUrl in response',
      '3. Redirect user to authUrl',
      '4. User authorizes on Tienda Nube',
      '5. Tienda Nube redirects to callback with code',
      '6. Callback exchanges code for access token',
      '7. Store connection is established'
    ],
    required_env_vars: [
      'TIENDANUBE_CLIENT_ID',
      'TIENDANUBE_CLIENT_SECRET'
    ]
  });
} 