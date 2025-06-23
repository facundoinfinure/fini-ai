import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[INFO] Fetching conversations from database');
    
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

    // Obtener conversaciones del usuario con sus mensajes
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        whatsapp_number,
        customer_number,
        conversation_id,
        status,
        last_message_at,
        message_count,
        created_at,
        messages (
          id,
          body,
          direction,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(20);

    if (conversationsError) {
      console.error('[ERROR] Failed to fetch conversations:', conversationsError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Transformar los datos para el formato esperado por el frontend
    const formattedConversations = (conversations || []).map(conv => {
      const messages = (conv.messages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.body,
        timestamp: msg.created_at,
        direction: msg.direction,
        type: 'text',
        status: 'read'
      }));

      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        id: conv.id,
        customerName: `Cliente ${conv.customer_number.slice(-4)}`, // Mostrar solo últimos 4 dígitos
        customerPhone: conv.customer_number,
        lastMessage: lastMessage?.content || 'Sin mensajes',
        lastMessageTime: conv.last_message_at,
        status: conv.status,
        unreadCount: 0, // TODO: Implementar conteo de no leídos
        messages
      };
    });

    console.log(`[INFO] Found ${formattedConversations.length} conversations for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: formattedConversations
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 