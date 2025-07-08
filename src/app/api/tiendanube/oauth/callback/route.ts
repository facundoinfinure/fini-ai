import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';

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

    console.log('🚀 [ULTRA-FAST-CALLBACK] OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [ULTRA-FAST-CALLBACK] OAuth error from TiendaNube:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('❌ [ULTRA-FAST-CALLBACK] Missing code or state');
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
      console.error('❌ [ULTRA-FAST-CALLBACK] State decode error:', stateError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=invalid_state`);
    }

    const { userId, storeUrl, storeName, context = 'onboarding' } = stateData;

    console.log('🚀 [ULTRA-FAST-CALLBACK] Processing for user:', userId, 'store:', storeName);

    // ULTRA-FAST: Solo verificar sesión básica
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || session.user.id !== userId) {
      console.error('❌ [ULTRA-FAST-CALLBACK] Session mismatch');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=oauth_failed&message=session_mismatch`);
    }

    try {
      console.log('🚀 [ULTRA-FAST-CALLBACK] Exchanging code for token...');
      
      // PASO 1: Solo exchange de token (ULTRA-FAST)
      const authResult = await Promise.race([
        exchangeCodeForToken(code),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Token exchange timeout')), 15000))
      ]) as any;

      if (!authResult || !authResult.access_token || !authResult.user_id) {
        throw new Error('Invalid token response');
      }

      console.log('✅ [ULTRA-FAST-CALLBACK] Token exchange successful');

      // PASO 2: Guardar datos MÍNIMOS en DB (ULTRA-FAST)
      const storeData = {
        user_id: userId,
        name: storeName,
        url: storeUrl,
        platform: 'tiendanube' as const,
        platform_store_id: authResult.user_id.toString(),
        access_token: authResult.access_token,
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        language: 'es',
        is_active: true,
        last_sync: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert directo sin validaciones complejas
      const { data: store, error: insertError } = await supabase
        .from('stores')
        .upsert(storeData, { 
          onConflict: 'user_id,platform_store_id'
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [ULTRA-FAST-CALLBACK] DB insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [ULTRA-FAST-CALLBACK] Completed in ${totalTime}ms, store ID: ${store.id}`);

      // PASO 3: Fire-and-forget background operations
      setTimeout(() => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/stores/background-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: store.id,
            accessToken: authResult.access_token,
            userId,
            operation: 'full_sync',
            jobId: `callback-${store.id}-${Date.now()}`
          })
        }).catch(e => console.warn('🚀 Background sync call failed:', e));
      }, 100); // Fire inmediatamente en background

      // PASO 4: Redirect inmediato
      if (context === 'configuration') {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=configuration&success=store_connected&store_name=${encodeURIComponent(store.name)}&store_id=${store.id}`);
      } else {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=2&success=store_connected&store_name=${encodeURIComponent(store.name)}&store_id=${store.id}`);
      }

    } catch (connectionError) {
      console.error('❌ [ULTRA-FAST-CALLBACK] Connection error:', connectionError);
      
      const errorMessage = connectionError instanceof Error ? connectionError.message : 'Connection failed';
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=connection_failed&message=${encodeURIComponent(errorMessage)}`);
    }

  } catch (error) {
    console.error('❌ [ULTRA-FAST-CALLBACK] Critical error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Callback failed';
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=1&error=callback_failed&message=${encodeURIComponent(errorMessage)}`);
  }
} 