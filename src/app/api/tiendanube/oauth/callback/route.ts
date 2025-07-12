import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';
import { getStoreDataManager, type OAuthData } from '@/lib/services/store-data-manager';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 🔥 FIX: Configuración de timeouts para cumplir con límites de Vercel (max 10s)
const VERCEL_SAFE_TIMEOUT = 8000; // 8 segundos - margen de seguridad de 2s
const TOKEN_EXCHANGE_TIMEOUT = 5000; // 5 segundos para token exchange
const STORE_CHECK_TIMEOUT = 2000; // 2 segundos para verificar store existente

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('🚀 [UNIFIED-CALLBACK] OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [UNIFIED-CALLBACK] OAuth error from TiendaNube:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('❌ [UNIFIED-CALLBACK] Missing code or state');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=missing_parameters`);
    }

    // Decode state parameter FAST
    let stateData: { userId: string; storeUrl: string; storeName: string; context?: string; timestamp: number };
    try {
      const decodedState = decodeURIComponent(state);
      const stateJson = Buffer.from(decodedState, 'base64').toString();
      stateData = JSON.parse(stateJson);
      
      if (!stateData.userId || !stateData.storeUrl || !stateData.storeName) {
        throw new Error('Invalid state data');
      }
      
    } catch (stateError) {
      console.error('❌ [UNIFIED-CALLBACK] State decode error:', stateError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=invalid_state`);
    }

    const { userId, storeUrl, storeName, context = 'onboarding' } = stateData;

    console.log('🚀 [UNIFIED-CALLBACK] Processing for user:', userId, 'store:', storeName);

    // ULTRA-FAST: Solo verificar sesión básica
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || session.user.id !== userId) {
      console.error('❌ [UNIFIED-CALLBACK] Session mismatch');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=session_mismatch`);
    }

    try {
      console.log('🚀 [UNIFIED-CALLBACK] Using ultra-fast architecture...');
      
      // 🔥 FIX: PASO 1 - Exchange code for token (TIMEOUT REDUCIDO)
      const authResult = await Promise.race([
        exchangeCodeForToken(code),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Token exchange timeout')), TOKEN_EXCHANGE_TIMEOUT))
      ]) as any;

      if (!authResult || !authResult.access_token || !authResult.user_id) {
        throw new Error('Invalid token response');
      }

      console.log('✅ [UNIFIED-CALLBACK] Token exchange successful');

      // 🔥 FIX: PASO 2 - Check existing store (TIMEOUT ULTRA-REDUCIDO) 
      const { data: existingStore } = await Promise.race([
        supabase
          .from('stores')
          .select('id, name')
          .eq('user_id', userId)
          .eq('platform_store_id', authResult.user_id.toString())
          .eq('platform', 'tiendanube')
          .single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Store check timeout')), STORE_CHECK_TIMEOUT))
      ]).catch(error => {
        console.warn('⚠️ [UNIFIED-CALLBACK] Store check failed, proceeding as new store:', error);
        return { data: null };
      }) as any;

      // PASO 3: Use unified StoreDataManager
      const storeManager = getStoreDataManager();
      
      const oauthData: OAuthData = {
        userId,
        authorizationCode: code,
        platformStoreId: authResult.user_id.toString(),
        storeName,
        storeUrl,
        accessToken: authResult.access_token
      };

      let result;
      
      // 🔥 FIX: PASO 4 - Store operations (TIMEOUT SEGURO PARA VERCEL)
      if (existingStore) {
        // Reconnect existing store
        console.log('🔄 [UNIFIED-CALLBACK] Reconnecting existing store:', existingStore.id);
        result = await Promise.race([
          storeManager.reconnectExistingStore(existingStore.id, oauthData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Store reconnection timeout')), VERCEL_SAFE_TIMEOUT))
        ]);
      } else {
        // Create new store
        console.log('🆕 [UNIFIED-CALLBACK] Creating new store');
        result = await Promise.race([
          storeManager.createNewStore(oauthData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Store creation timeout')), VERCEL_SAFE_TIMEOUT))
        ]);
      }

      if (!result.success) {
        console.error('❌ [UNIFIED-CALLBACK] Store operation failed:', result.error);
        throw new Error(`Store operation failed: ${result.error}`);
      }

      const store = result.store!;
      const totalTime = Date.now() - startTime;
      console.log(`✅ [UNIFIED-CALLBACK] Completed in ${totalTime}ms, store ID: ${store.id}, job: ${result.backgroundJobId}`);

      // PASO 5: Redirect inmediato con información del background job
      const baseParams = new URLSearchParams({
        success: existingStore ? 'store_reconnected' : 'store_connected',
        store_name: store.name,
        store_id: store.id,
        sync_status: result.syncStatus || 'pending'
      });

      if (result.backgroundJobId) {
        baseParams.set('job_id', result.backgroundJobId);
      }

      if (context === 'configuration') {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=configuration&${baseParams.toString()}`);
      } else {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=2&${baseParams.toString()}`);
      }

    } catch (connectionError) {
      console.error('❌ [UNIFIED-CALLBACK] Connection error:', connectionError);
      
      const errorMessage = connectionError instanceof Error ? connectionError.message : 'Connection failed';
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=connection_failed&message=${encodeURIComponent(errorMessage)}`);
    }

  } catch (error) {
    console.error('❌ [UNIFIED-CALLBACK] Critical error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Callback failed';
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=callback_failed&message=${encodeURIComponent(errorMessage)}`);
  }
} 