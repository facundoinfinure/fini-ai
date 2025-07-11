import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/tiendanube';

// Force dynamic rendering to prevent static build errors
export const dynamic = 'force-dynamic';

/**
 * 🚀 ULTRA-SIMPLE OAuth Callback
 * ==============================
 * 
 * Callback que FUNCIONA DE VERDAD:
 * 1. Intercambia código por token
 * 2. Guarda tienda en DB
 * 3. Redirige con parámetros para mostrar progreso
 * 4. Frontend maneja sincronización visual
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('🚀 [SIMPLE-CALLBACK] OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [SIMPLE-CALLBACK] OAuth error from TiendaNube:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('❌ [SIMPLE-CALLBACK] Missing code or state');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=missing_parameters`);
    }

    // Decode state parameter
    let stateData: { userId: string; storeUrl: string; storeName: string; context?: string; timestamp: number };
    try {
      const decodedState = decodeURIComponent(state);
      const stateJson = Buffer.from(decodedState, 'base64').toString();
      stateData = JSON.parse(stateJson);
      
      if (!stateData.userId || !stateData.storeUrl || !stateData.storeName) {
        throw new Error('Invalid state data');
      }
      
    } catch (stateError) {
      console.error('❌ [SIMPLE-CALLBACK] State decode error:', stateError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=invalid_state`);
    }

    const { userId, storeUrl, storeName, context = 'dashboard' } = stateData;

    console.log('🚀 [SIMPLE-CALLBACK] Processing for user:', userId, 'store:', storeName);

    // Verificar sesión
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || session.user.id !== userId) {
      console.error('❌ [SIMPLE-CALLBACK] Session mismatch');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed&message=session_mismatch`);
    }

    try {
      console.log('🚀 [SIMPLE-CALLBACK] Exchanging code for token...');
      
      // PASO 1: Intercambiar código por token (RÁPIDO)
      const authResult = await Promise.race([
        exchangeCodeForToken(code),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Token exchange timeout')), 15000))
      ]) as any;

      if (!authResult || !authResult.access_token || !authResult.user_id) {
        throw new Error('Invalid token response');
      }

      console.log('✅ [SIMPLE-CALLBACK] Token exchange successful');

      // PASO 2: Verificar si la tienda ya existe
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id, name')
        .eq('user_id', userId)
        .eq('platform_store_id', authResult.user_id.toString())
        .eq('platform', 'tiendanube')
        .single();

      const isReconnection = !!existingStore;

      // PASO 3: Crear o actualizar tienda (ULTRA RÁPIDO)
      const storeData = {
        user_id: userId,
        platform: 'tiendanube' as const,
        platform_store_id: authResult.user_id.toString(),
        name: storeName,
        domain: storeUrl,
        access_token: authResult.access_token,
        refresh_token: null,
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        language: 'es',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let storeId: string;

      if (isReconnection) {
        // Actualizar tienda existente
        const { error: updateError } = await supabase
          .from('stores')
          .update({
            access_token: authResult.access_token,
            updated_at: new Date().toISOString(),
            is_active: true
          })
          .eq('id', existingStore.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        storeId = existingStore.id;
        console.log(`✅ [SIMPLE-CALLBACK] Store reconnected: ${storeId}`);
      } else {
        // Crear nueva tienda
        const { data: newStore, error: createError } = await supabase
          .from('stores')
          .insert([storeData])
          .select()
          .single();

        if (createError || !newStore) {
          throw new Error(`Creation failed: ${createError?.message}`);
        }

        storeId = newStore.id;
        console.log(`✅ [SIMPLE-CALLBACK] New store created: ${storeId}`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [SIMPLE-CALLBACK] Completed in ${totalTime}ms`);

      // PASO 4: Redirigir con parámetros para que el frontend maneje la sincronización
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      const redirectParams = new URLSearchParams({
        success: isReconnection ? 'store_reconnected' : 'store_connected',
        store_name: storeName,
        store_id: storeId,
        sync_needed: 'true', // Flag para que el frontend inicie sincronización
        tab: context === 'configuration' ? 'configuration' : 'chat'
      });

      const redirectUrl = context === 'configuration' 
        ? `${baseUrl}/dashboard?tab=configuration&${redirectParams.toString()}`
        : `${baseUrl}/dashboard?${redirectParams.toString()}`;

      console.log(`🎯 [SIMPLE-CALLBACK] Redirecting to: ${redirectUrl}`);

      return NextResponse.redirect(redirectUrl);

    } catch (error) {
      console.error('❌ [SIMPLE-CALLBACK] Processing failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=processing_failed&message=${encodeURIComponent(errorMessage)}`
      );
    }

  } catch (error) {
    console.error('❌ [SIMPLE-CALLBACK] Callback failed:', error);
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=internal_error&message=callback_failed`
    );
  }
} 