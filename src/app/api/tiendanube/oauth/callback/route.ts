import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { StoreService } from '@/lib/database/client';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[INFO] OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error 
    });

    if (error) {
      console.error('[ERROR] OAuth error from Tienda Nube:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('[ERROR] Missing code or state in OAuth callback');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=missing_parameters`);
    }

    // Decode state parameter to get user ID and store information
    let stateData: { userId: string; storeUrl: string; storeName: string; timestamp: number };
    try {
      const decodedState = decodeURIComponent(state);
      const stateJson = Buffer.from(decodedState, 'base64').toString();
      stateData = JSON.parse(stateJson);
      
      // Validate state data
      if (!stateData.userId || !stateData.storeUrl || !stateData.storeName) {
        throw new Error('Invalid state data');
      }
      
      // Check if state is not too old (5 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 5 * 60 * 1000) {
        throw new Error('OAuth state expired');
      }
      
    } catch (stateError) {
      console.error('[ERROR] Failed to decode state parameter:', stateError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=invalid_state`);
    }

    const userId = stateData.userId;
    const storeUrl = stateData.storeUrl;
    const storeName = stateData.storeName;

    console.log('[INFO] Processing OAuth callback for user:', userId, 'store:', storeName);

    const supabase = createClient();
    
    // Verify user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user || session.user.id !== userId) {
      console.error('[ERROR] Session verification failed:', sessionError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=session_mismatch`);
    }

    try {
      // Exchange authorization code for access token
      const authResponse = await exchangeCodeForToken(code);
      
      if (!authResponse.access_token) {
        throw new Error('No access token received from Tienda Nube');
      }

      // Get store information using the access token
      const tiendaNubeAPI = new TiendaNubeAPI(authResponse.access_token, authResponse.user_id.toString());
      const storeInfo = await tiendaNubeAPI.getStore();

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

      console.log('[INFO] Tienda Nube store connected successfully:', storeName);

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=store_connected&store_name=${encodeURIComponent(storeName)}`);

    } catch (oauthError) {
      console.error('[ERROR] OAuth token exchange failed:', oauthError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=token_exchange_failed`);
    }

  } catch (error) {
    console.error('[ERROR] OAuth callback processing failed:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=internal_error`);
  }
} 