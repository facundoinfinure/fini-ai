import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[INFO] Fetching dashboard summary from database');
    
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

    // Obtener todas las tiendas activas del usuario
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, domain, tiendanube_store_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (storesError) {
      console.error('[ERROR] Failed to fetch stores:', storesError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }

    // Obtener números de WhatsApp activos del usuario
    const { data: whatsappNumbers, error: numbersError } = await supabase
      .from('whatsapp_numbers')
      .select(`
        id,
        phone_number,
        display_name,
        is_verified,
        whatsapp_store_connections!inner (
          id,
          store_id,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (numbersError) {
      console.error('[ERROR] Failed to fetch WhatsApp numbers:', numbersError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch WhatsApp numbers' },
        { status: 500 }
      );
    }

    // Calcular conexiones activas
    const activeConnections = whatsappNumbers?.reduce((count, number) => {
      const activeConns = number.whatsapp_store_connections?.filter(conn => conn.is_active) || [];
      return count + activeConns.length;
    }, 0) || 0;

    // TODO: Implementar consultas para métricas reales cuando estén las tablas
    // Por ahora usamos datos básicos disponibles
    const dashboardSummary = {
      stores: {
        total: stores?.length || 0,
        active: stores?.length || 0,
        connected_to_whatsapp: activeConnections > 0 ? Math.min(stores?.length || 0, activeConnections) : 0
      },
      whatsapp: {
        total_numbers: whatsappNumbers?.length || 0,
        verified_numbers: whatsappNumbers?.filter(n => n.is_verified).length || 0,
        active_connections: activeConnections,
        total_conversations: 0, // TODO: Implementar cuando esté la tabla de conversaciones
        unread_messages: 0 // TODO: Implementar cuando esté la tabla de mensajes
      },
      analytics: {
        total_sales: 0, // TODO: Implementar cuando se sincronicen datos de Tienda Nube
        orders_today: 0,
        revenue_this_month: 0,
        growth_percentage: 0
      },
      recent_activity: [], // TODO: Implementar cuando esté la tabla de actividades
      subscription: {
        plan: 'basic', // TODO: Obtener del perfil del usuario
        status: 'active',
        expires_at: null
      }
    };

    console.log(`[INFO] Dashboard summary generated for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: dashboardSummary
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch dashboard summary:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 