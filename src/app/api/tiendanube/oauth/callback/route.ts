import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BulletproofTiendaNube } from '@/lib/integrations/bulletproof-tiendanube';

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

    console.log('🛡️ [OAUTH-CALLBACK] OAuth callback received:', { 
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
      console.error('❌ [OAUTH-CALLBACK] OAuth error from TiendaNube:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=${encodeURIComponent(error)}&debug=oauth_error_from_tn`);
    }

    if (!code || !state) {
      console.error('❌ [OAUTH-CALLBACK] Missing code or state in OAuth callback');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=missing_parameters&debug=missing_code_or_state`);
    }

    // Decode state parameter
    let stateData: { userId: string; storeUrl: string; storeName: string; context?: string; timestamp: number };
    try {
      const decodedState = decodeURIComponent(state);
      const stateJson = Buffer.from(decodedState, 'base64').toString();
      stateData = JSON.parse(stateJson);
      
      console.log('🛡️ [OAUTH-CALLBACK] Decoded state:', {
        userId: stateData.userId,
        storeUrl: stateData.storeUrl,
        storeName: stateData.storeName,
        context: stateData.context || 'onboarding',
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
      console.error('❌ [OAUTH-CALLBACK] Failed to decode state parameter:', stateError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=invalid_state&debug=state_decode_error`);
    }

    const { userId, storeUrl, storeName, context = 'onboarding' } = stateData;

    console.log('🛡️ [OAUTH-CALLBACK] Processing OAuth callback for user:', userId, 'store:', storeName, 'context:', context);

    // Verify user session
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user || session.user.id !== userId) {
      console.error('❌ [OAUTH-CALLBACK] Session verification failed:', {
        sessionError: sessionError?.message,
        hasSession: !!session,
        hasUser: !!session?.user,
        userIdMatch: session?.user?.id === userId,
        expectedUserId: userId,
        actualUserId: session?.user?.id
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=session_mismatch&debug=session_verification_failed`);
    }

    try {
      console.log('🛡️ [OAUTH-CALLBACK] Starting bulletproof store connection...');
      
      // Use bulletproof connection system
      const connectionResult = await BulletproofTiendaNube.connectStore({
        userId,
        storeUrl,
        storeName,
        authCode: code,
        context
      });

      if (!connectionResult.success) {
        console.error('❌ [OAUTH-CALLBACK] Bulletproof connection failed:', connectionResult.error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=connection_failed&message=${encodeURIComponent(connectionResult.error || 'Unknown error')}`);
      }

      const store = connectionResult.store!;
      const totalTime = Date.now() - startTime;
      
      console.log('✅ [OAUTH-CALLBACK] TiendaNube store connected successfully:', {
        storeName: store.name,
        storeId: store.id,
        platformStoreId: store.platform_store_id,
        context,
        totalTime: `${totalTime}ms`,
        syncStatus: connectionResult.syncStatus
      });

      // 🔄 Auto-sync initialization is now handled by BulletproofTiendaNube with proper delay
      console.log('✅ [OAUTH-CALLBACK] Auto-sync will be initialized with delay by BulletproofTiendaNube');

      // Redirect based on context
      if (context === 'configuration') {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=configuration&success=store_connected&store_name=${encodeURIComponent(store.name)}&store_id=${store.id}`);
      } else {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=2&success=store_connected&store_name=${encodeURIComponent(store.name)}&store_id=${store.id}`);
      }

    } catch (connectionError) {
      console.error('❌ [OAUTH-CALLBACK] Critical connection error:', connectionError);
      
      const errorMessage = connectionError instanceof Error ? connectionError.message : 'Unknown connection error';
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=connection_failed&message=${encodeURIComponent(errorMessage)}`);
    }

  } catch (error) {
    console.error('❌ [OAUTH-CALLBACK] Critical callback error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown callback error';
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=callback_failed&message=${encodeURIComponent(errorMessage)}`);
  }
} 