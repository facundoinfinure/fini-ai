import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { StoreService } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Processing Tienda Nube OAuth callback');
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[ERROR] OAuth error from Tienda Nube:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=${error}`);
    }

    if (!code || !state) {
      console.error('[ERROR] Missing code or state parameter');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=missing_parameters`);
    }

    // Extract user ID from state parameter
    const userId = state.split('_')[0];
    
    const supabase = createClient();
    
    // Verify user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user || session.user.id !== userId) {
      console.error('[ERROR] Invalid user session for OAuth callback');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=invalid_session`);
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

      // Save store to database
      const storeResult = await StoreService.createStore({
        user_id: userId,
        tiendanube_store_id: storeInfo.id.toString(),
        store_name: storeInfo.name,
        store_url: storeInfo.url,
        access_token: authResponse.access_token,
        refresh_token: '', // Tienda Nube doesn't provide refresh tokens
        token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        is_active: true,
        last_sync_at: new Date().toISOString()
      });

      if (!storeResult.success) {
        throw new Error(`Failed to save store: ${storeResult.error}`);
      }

      console.log('[INFO] Tienda Nube store connected successfully:', storeInfo.name);

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=store_connected&store_name=${encodeURIComponent(storeInfo.name)}`);

    } catch (oauthError) {
      console.error('[ERROR] OAuth token exchange failed:', oauthError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=token_exchange_failed`);
    }

  } catch (error) {
    console.error('[ERROR] OAuth callback processing failed:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=internal_error`);
  }
} 