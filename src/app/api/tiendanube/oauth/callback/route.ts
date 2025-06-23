import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { StoreService } from '@/lib/database/client';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[INFO] OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error,
      url: request.url,
      timestamp: new Date().toISOString()
    });

    // Log environment variables status (without exposing sensitive data)
    console.log('[DEBUG] Environment check:', {
      CLIENT_ID_exists: !!process.env.TIENDANUBE_CLIENT_ID,
      CLIENT_SECRET_exists: !!process.env.TIENDANUBE_CLIENT_SECRET,
      REDIRECT_URI: process.env.TIENDANUBE_REDIRECT_URI,
      APP_URL: process.env.NEXT_PUBLIC_APP_URL
    });

    if (error) {
      console.error('[ERROR] OAuth error from Tienda Nube:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=${encodeURIComponent(error)}&debug=oauth_error_from_tn`);
    }

    if (!code || !state) {
      console.error('[ERROR] Missing code or state in OAuth callback');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=missing_parameters&debug=missing_code_or_state`);
    }

    // Decode state parameter to get user ID and store information
    let stateData: { userId: string; storeUrl: string; storeName: string; timestamp: number };
    try {
      const decodedState = decodeURIComponent(state);
      const stateJson = Buffer.from(decodedState, 'base64').toString();
      stateData = JSON.parse(stateJson);
      
      console.log('[DEBUG] Decoded state:', {
        userId: stateData.userId,
        storeUrl: stateData.storeUrl,
        storeName: stateData.storeName,
        stateAge: Date.now() - stateData.timestamp
      });
      
      // Validate state data
      if (!stateData.userId || !stateData.storeUrl || !stateData.storeName) {
        throw new Error('Invalid state data: missing required fields');
      }
      
      // Check if state is not too old (5 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 5 * 60 * 1000) {
        throw new Error(`OAuth state expired: ${stateAge}ms old`);
      }
      
    } catch (stateError) {
      console.error('[ERROR] Failed to decode state parameter:', stateError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=invalid_state&debug=state_decode_error`);
    }

    const userId = stateData.userId;
    const storeUrl = stateData.storeUrl;
    const storeName = stateData.storeName;

    console.log('[INFO] Processing OAuth callback for user:', userId, 'store:', storeName);

    const supabase = createClient();
    
    // Verify user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user || session.user.id !== userId) {
      console.error('[ERROR] Session verification failed:', {
        sessionError: sessionError?.message,
        hasSession: !!session,
        hasUser: !!session?.user,
        userIdMatch: session?.user?.id === userId,
        expectedUserId: userId,
        actualUserId: session?.user?.id
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=session_mismatch&debug=session_verification_failed`);
    }

    try {
      console.log('[INFO] Starting token exchange with code:', code.substring(0, 10) + '...');
      
      // Exchange authorization code for access token
      const authResponse = await exchangeCodeForToken(code);
      
      if (!authResponse.access_token) {
        throw new Error('No access token received from Tienda Nube');
      }

      console.log('[INFO] Token exchange successful, user_id:', authResponse.user_id);

      // Get store information using the access token
      const tiendaNubeAPI = new TiendaNubeAPI(authResponse.access_token, authResponse.user_id.toString());
      const storeInfo = await tiendaNubeAPI.getStore();

      console.log('[INFO] Store info retrieved:', {
        storeId: storeInfo.id,
        storeName: storeInfo.name || 'No name available'
      });

      // Save store to database with the user-provided information
      const storeResult = await StoreService.createStore({
        user_id: userId,
        tiendanube_store_id: storeInfo.id.toString(),
        store_name: storeName, // Use user-provided name
        store_url: storeUrl,   // Use user-provided URL
        access_token: authResponse.access_token,
        refresh_token: null, // Tienda Nube doesn't provide refresh tokens
        token_expires_at: new Date(Date.now() + (parseInt(process.env.TIENDANUBE_TOKEN_EXPIRY_HOURS || '24') * 60 * 60 * 1000)).toISOString(),
        is_active: true,
        last_sync_at: new Date().toISOString()
      });

      if (!storeResult.success) {
        throw new Error(`Failed to save store: ${storeResult.error}`);
      }

      const totalTime = Date.now() - startTime;
      console.log('[INFO] Tienda Nube store connected successfully:', {
        storeName,
        storeId: storeInfo.id,
        totalTime: `${totalTime}ms`
      });

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=store_connected&store_name=${encodeURIComponent(storeName)}&store_id=${storeInfo.id}`);

    } catch (oauthError) {
      const totalTime = Date.now() - startTime;
      console.error('[ERROR] OAuth token exchange failed:', {
        error: oauthError instanceof Error ? oauthError.message : oauthError,
        code: code ? code.substring(0, 10) + '...' : 'missing',
        totalTime: `${totalTime}ms`,
        stack: oauthError instanceof Error ? oauthError.stack : undefined
      });
      
      // Provide more specific error information
      const errorMessage = oauthError instanceof Error ? oauthError.message : 'Unknown error';
      const debugInfo = encodeURIComponent(`${errorMessage}|time:${totalTime}ms`);
      
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=token_exchange_failed&message=token_exchange_failed&debug=${debugInfo}`);
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('[ERROR] OAuth callback processing failed:', {
      error: error instanceof Error ? error.message : error,
      totalTime: `${totalTime}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=internal_error&debug=callback_processing_failed`);
  }
} 