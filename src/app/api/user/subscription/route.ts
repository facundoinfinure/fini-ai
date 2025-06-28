import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[INFO] Fetching user subscription from database');
    
    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Obtener información del usuario desde la base de datos
    // Manejo resiliente: intentar con columnas nuevas, fallback a defaults
    let userProfile = null;
    let profileError = null;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('subscription_plan, subscription_status')
        .eq('id', user.id)
        .single();
      
      userProfile = data;
      profileError = error;
    } catch (error) {
      // Si las columnas no existen, usar valores por defecto
      console.log('[INFO] Using default subscription values (columns may not exist yet)');
      userProfile = {
        subscription_plan: 'free',
        subscription_status: 'active'
      };
      profileError = null;
    }

    if (profileError && !profileError.message?.includes('column')) {
      console.error('[ERROR] Failed to fetch user profile:', profileError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Obtener métricas de uso
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (storesError) {
      console.error('[ERROR] Failed to fetch stores count:', storesError.message);
    }

    // Obtener conteo de conversaciones del mes actual (usando conversaciones como proxy para mensajes)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, message_count', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if (conversationsError) {
      console.error('[ERROR] Failed to fetch conversations count:', conversationsError.message);
    }

    // Calcular total de mensajes desde las conversaciones
    const totalMessages = conversations?.reduce((total, conv) => total + (conv.message_count || 0), 0) || 0;

    // Determinar límites según el plan
    const plan = userProfile?.subscription_plan || 'free';
    let maxStores = 1;
    let maxMessages = 500;
    let maxAnalytics = 100;

    switch (plan) {
      case 'pro':
        maxStores = 5;
        maxMessages = 5000;
        maxAnalytics = 1000;
        break;
      case 'enterprise':
        maxStores = 999;
        maxMessages = 99999;
        maxAnalytics = 99999;
        break;
    }

    const subscription = {
      plan: plan,
      status: userProfile?.subscription_status || 'active',
      usage: {
        stores: stores?.length || 0,
        maxStores,
        messages: totalMessages,
        maxMessages,
        analytics: 0, // TODO: Implementar conteo de consultas analytics
        maxAnalytics
      }
    };

    console.log(`[INFO] Subscription info retrieved for user ${user.id}, plan: ${plan}`);

    return NextResponse.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch user subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 