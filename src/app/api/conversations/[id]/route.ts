import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations/[id]
 * Obtener una conversación específica con sus mensajes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[INFO] Fetching conversation: ${params.id}`);
    
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

    // Obtener la conversación con sus mensajes
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        id,
        whatsapp_number,
        customer_number,
        conversation_id,
        title,
        status,
        last_message_at,
        message_count,
        created_at,
        messages (
          id,
          body,
          direction,
          agent_type,
          confidence,
          created_at
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (conversationError || !conversation) {
      console.error('[ERROR] Conversation not found or unauthorized:', conversationError?.message);
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Formatear los mensajes
    const messages = (conversation.messages || []).map((msg: any) => ({
      id: msg.id,
      body: msg.body,
      direction: msg.direction,
      agent_type: msg.agent_type,
      confidence: msg.confidence,
      created_at: msg.created_at
    }));

    const formattedConversation = {
      id: conversation.id,
      title: conversation.title || `Cliente ${conversation.customer_number.slice(-4)}`,
      customerName: `Cliente ${conversation.customer_number.slice(-4)}`,
      customerPhone: conversation.customer_number,
      status: conversation.status,
      lastMessageTime: conversation.last_message_at,
      messageCount: conversation.message_count,
      messages
    };

    console.log(`[INFO] Successfully fetched conversation: ${params.id} with ${messages.length} messages`);

    return NextResponse.json({
      success: true,
      data: formattedConversation
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]
 * Eliminar una conversación específica
 * 🔥 FIXED: Eliminación garantizada incluso si RAG falla
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[INFO] Deleting conversation: ${params.id}`);
    
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

    // 🔥 CRITICAL FIX: Base de datos SIEMPRE primero, RAG secundario y opcional
    console.log(`[INFO] Eliminating database records for conversation: ${params.id}`);

    // 1. ELIMINAR MENSAJES PRIMERO (FK constraint)
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', params.id);

    if (messagesError) {
      console.error('[ERROR] Failed to delete messages:', messagesError.message);
      return NextResponse.json(
        { success: false, error: 'Error eliminando mensajes' },
        { status: 500 }
      );
    }

    console.log(`[INFO] Messages deleted for conversation: ${params.id}`);

    // 2. ELIMINAR LA CONVERSACIÓN
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[ERROR] Failed to delete conversation:', deleteError.message);
      return NextResponse.json(
        { success: false, error: 'Error eliminando conversación' },
        { status: 500 }
      );
    }

    console.log(`[INFO] ✅ DATABASE DELETION COMPLETED for conversation: ${params.id}`);

    // 3. 🔥 RAG CLEANUP - OPCIONAL Y NO BLOQUEANTE
    // Si falla, NO debe impedir que la conversación se considere eliminada
    try {
      console.log(`[INFO] Attempting RAG cleanup for conversation: ${params.id}`);
      
      // Import dinámico para evitar errores de build
      const { ragEngine } = await import('@/lib/rag');
      
      if (ragEngine && ragEngine.deleteDocuments) {
        // Intentar limpiar vectores relacionados con la conversación
        const vectorIds = [`conversation-${params.id}`, `conv-${params.id}`, `msg-${params.id}`];
        await ragEngine.deleteDocuments(vectorIds);
        console.log(`[INFO] ✅ RAG cleanup completed for conversation: ${params.id}`);
      } else {
        console.warn(`[WARNING] RAG engine or deleteDocuments method not available, skipping vector cleanup for: ${params.id}`);
      }
    } catch (ragError: any) {
      // 🛡️ CRÍTICO: RAG failures NO deben impedir eliminación exitosa
      console.warn(`[WARNING] RAG cleanup failed for conversation ${params.id}, but deletion was successful:`, ragError?.message || ragError);
      
      // Log específico para errores de Pinecone que estaban causando los problemas
      if (ragError?.message?.includes('Pinecone') || ragError?.message?.includes('deleteVectors')) {
        console.warn(`[WARNING] Pinecone vector deletion failed - this is expected if vectors don't exist: ${ragError.message}`);
      }
      
      // NO retornar error - la conversación fue eliminada exitosamente de la base de datos
    }

    console.log(`[INFO] ✅ CONVERSATION DELETION COMPLETED SUCCESSFULLY: ${params.id}`);

    return NextResponse.json({
      success: true,
      message: 'Conversación eliminada exitosamente',
      deletedConversation: {
        id: params.id,
        title: conversation.title
      }
    });

  } catch (error) {
    console.error('[ERROR] Unexpected error during conversation deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/conversations/[id]
 * Actualizar una conversación (principalmente el título)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[INFO] Updating conversation: ${params.id}`);
    
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

    const body = await request.json();
    const { title, status } = body;

    // Validar que al menos se proporcione un campo para actualizar
    if (!title && !status) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos title o status para actualizar' },
        { status: 400 }
      );
    }

    // Verificar que la conversación pertenece al usuario
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id')
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

    // Preparar datos para actualizar
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title) updateData.title = title;
    if (status) updateData.status = status;

    // Actualizar la conversación
    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[ERROR] Failed to update conversation:', updateError.message);
      return NextResponse.json(
        { success: false, error: 'Error actualizando conversación' },
        { status: 500 }
      );
    }

    console.log(`[INFO] Successfully updated conversation: ${params.id}`);

    return NextResponse.json({
      success: true,
      data: updatedConversation,
      message: 'Conversación actualizada exitosamente'
    });

  } catch (error) {
    console.error('[ERROR] Failed to update conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 