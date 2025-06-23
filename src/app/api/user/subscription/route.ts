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
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('subscription_plan, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError) {
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

    // Obtener conteo de mensajes del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        conversations!inner (
          user_id
        )
      `, { count: 'exact' })
      .eq('conversations.user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if (messagesError) {
      console.error('[ERROR] Failed to fetch messages count:', messagesError.message);
    }

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
        messages: messages?.length || 0,
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