import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[INFO] Fetching conversation stats from database');
    
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

    // Obtener estadísticas básicas de conversaciones
    const { data: totalConversations, error: totalError } = await supabase
      .from('conversations')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id);

    if (totalError) {
      console.error('[ERROR] Failed to fetch total conversations:', totalError.message);
    }

    const { data: activeConversations, error: activeError } = await supabase
      .from('conversations')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (activeError) {
      console.error('[ERROR] Failed to fetch active conversations:', activeError.message);
    }

    // Obtener estadísticas de mensajes
    const { data: totalMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        direction,
        agent_type,
        created_at,
        conversations!inner (
          user_id
        )
      `, { count: 'exact' })
      .eq('conversations.user_id', user.id);

    if (messagesError) {
      console.error('[ERROR] Failed to fetch messages stats:', messagesError.message);
    }

    // Calcular métricas
    const stats = {
      totalConversations: totalConversations?.length || 0,
      activeChats: activeConversations?.length || 0,
      avgResponseTime: 45, // TODO: Calcular tiempo real de respuesta
      satisfactionRate: 0, // TODO: Implementar rating system
      automatedResponses: (totalMessages || []).filter((msg: any) => msg.agent_type).length
    };

    console.log(`[INFO] Conversation stats generated for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch conversation stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 