import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationTitleService } from '@/lib/services/conversation-title-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversations/[id]/generate-title
 * Genera automáticamente un título para la conversación
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[INFO] Generating title for conversation: ${params.id}`);
    
    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Verificar que la conversación pertenece al usuario
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id, title')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !conversation) {
      console.error('[ERROR] Conversation not found or unauthorized:', fetchError?.message);
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener los mensajes de la conversación para generar el título
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('body, direction')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true })
      .limit(10); // Solo los primeros 10 mensajes

    if (messagesError) {
      console.error('[ERROR] Failed to fetch messages:', messagesError.message);
      return NextResponse.json(
        { success: false, error: 'Error obteniendo mensajes' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay mensajes suficientes para generar título' },
        { status: 400 }
      );
    }

    // Generar título usando el servicio
    const generatedTitle = await conversationTitleService.generateTitle(messages);

    // Actualizar la conversación con el nuevo título
    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update({ 
        title: generatedTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[ERROR] Failed to update conversation title:', updateError.message);
      return NextResponse.json(
        { success: false, error: 'Error actualizando título' },
        { status: 500 }
      );
    }

    console.log(`[INFO] Successfully generated title for conversation ${params.id}: "${generatedTitle}"`);

    return NextResponse.json({
      success: true,
      data: {
        title: generatedTitle,
        conversation: updatedConversation
      },
      message: 'Título generado exitosamente'
    });

  } catch (error) {
    console.error('[ERROR] Failed to generate conversation title:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 