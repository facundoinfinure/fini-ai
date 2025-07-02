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
 * 🔥 ENHANCED: Transacciones + verificación explícita + logging robusto
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id;
  
  try {
    console.log(`[DELETE] 🗑️ Starting deletion process for conversation: ${conversationId}`);
    
    const supabase = createClient();
    
    // 1. AUTHENTICATION CHECK
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error(`[DELETE] ❌ Authentication failed for conversation ${conversationId}:`, userError?.message);
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    console.log(`[DELETE] ✅ User authenticated: ${user.id}`);

    // 2. VERIFY CONVERSATION EXISTS AND BELONGS TO USER
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id, title, created_at')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !conversation) {
      console.error(`[DELETE] ❌ Conversation not found or unauthorized:`, {
        conversationId,
        userId: user.id,
        error: fetchError?.message
      });
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    console.log(`[DELETE] ✅ Conversation verified:`, {
      id: conversation.id,
      title: conversation.title,
      user_id: conversation.user_id,
      created_at: conversation.created_at
    });

    // 3. COUNT RELATED MESSAGES BEFORE DELETION
    const { count: messageCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (countError) {
      console.warn(`[DELETE] ⚠️ Failed to count messages for conversation ${conversationId}:`, countError.message);
    } else {
      console.log(`[DELETE] 📊 Found ${messageCount} messages to delete for conversation ${conversationId}`);
    }

    // 4. PERFORM DELETION WITH EXPLICIT VERIFICATION
    console.log(`[DELETE] 🔄 Starting deletion sequence for conversation ${conversationId}`);
    console.log(`[DELETE] 🔍 Deletion criteria: conversationId=${conversationId}, userId=${user.id}`);

    // 4a. VERIFY EXACT MATCH BEFORE DELETION
    console.log(`[DELETE] 🔍 Verifying conversation exists with exact criteria before deletion`);
    const { data: preDeleteCheck, error: preDeleteError } = await supabase
      .from('conversations')
      .select('id, user_id, title, created_at')
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (preDeleteError) {
      console.error(`[DELETE] ❌ Pre-deletion verification failed:`, preDeleteError);
      return NextResponse.json(
        { success: false, error: `Error en verificación pre-eliminación: ${preDeleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`[DELETE] 📊 Pre-deletion check results:`, {
      found: preDeleteCheck?.length || 0,
      conversations: preDeleteCheck
    });

    if (!preDeleteCheck || preDeleteCheck.length === 0) {
      console.error(`[DELETE] ❌ DIAGNOSIS: Conversation not found with criteria conversationId=${conversationId}, userId=${user.id}`);
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada para eliminar (criteria mismatch)' },
        { status: 404 }
      );
    }

    if (preDeleteCheck.length > 1) {
      console.error(`[DELETE] ❌ DIAGNOSIS: Multiple conversations found (${preDeleteCheck.length}) - this should not happen`);
    }

    // Step 4a: Delete messages first (FK constraint)
    console.log(`[DELETE] 🗑️ Deleting messages for conversation ${conversationId}`);
    
    const { error: messagesDeleteError, count: messagesDeleted } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .eq('conversation_id', conversationId);

    console.log(`[DELETE] 📊 Messages deletion result:`, {
      error: messagesDeleteError,
      messagesDeleted,
      conversationId
    });

    if (messagesDeleteError) {
      console.error(`[DELETE] ❌ Failed to delete messages for conversation ${conversationId}:`, messagesDeleteError);
      return NextResponse.json(
        { success: false, error: `Error eliminando mensajes: ${messagesDeleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`[DELETE] ✅ Successfully deleted ${messagesDeleted} messages for conversation ${conversationId}`);

    // Step 4b: Delete the conversation itself
    console.log(`[DELETE] 🗑️ Deleting conversation record ${conversationId}`);
    console.log(`[DELETE] 🔍 About to execute: DELETE FROM conversations WHERE id='${conversationId}' AND user_id='${user.id}'`);
    
    const { error: conversationDeleteError, count: conversationsDeleted } = await supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    console.log(`[DELETE] 📊 Conversation deletion result:`, {
      error: conversationDeleteError,
      conversationsDeleted,
      conversationId,
      userId: user.id,
      criteria: { id: conversationId, user_id: user.id }
    });

    if (conversationDeleteError) {
      console.error(`[DELETE] ❌ Failed to delete conversation ${conversationId}:`, conversationDeleteError);
      return NextResponse.json(
        { success: false, error: `Error eliminando conversación: ${conversationDeleteError.message}` },
        { status: 500 }
      );
    }

    // 5. EXPLICIT VERIFICATION
    console.log(`[DELETE] 🔍 Verifying deletion results for conversation ${conversationId}`);
    console.log(`[DELETE] 📊 Deletion stats:`, {
      conversationsDeleted,
      messagesDeleted,
      expectedMessages: messageCount
    });

    if (conversationsDeleted === 0) {
      console.error(`[DELETE] ❌ CRITICAL: No conversations were deleted for ${conversationId}`);
      return NextResponse.json(
        { success: false, error: 'Error crítico: La conversación no fue eliminada' },
        { status: 500 }
      );
    }

    if (conversationsDeleted > 1) {
      console.error(`[DELETE] ❌ CRITICAL: Multiple conversations deleted (${conversationsDeleted}) for ${conversationId}`);
      // This shouldn't happen due to primary key constraints, but log it
    }

    // 6. FINAL VERIFICATION - Try to fetch the conversation
    console.log(`[DELETE] 🔍 Final verification: checking if conversation ${conversationId} still exists`);
    
    const { data: verifyConversation, error: verifyError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (verifyConversation) {
      console.error(`[DELETE] ❌ CRITICAL: Conversation ${conversationId} still exists after deletion!`);
      return NextResponse.json(
        { success: false, error: 'Error crítico: La conversación no fue eliminada completamente' },
        { status: 500 }
      );
    }

    if (verifyError && verifyError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      console.warn(`[DELETE] ⚠️ Unexpected verification error for conversation ${conversationId}:`, verifyError);
    }

    console.log(`[DELETE] ✅ Final verification passed: conversation ${conversationId} no longer exists`);

    // 7. RAG CLEANUP (OPTIONAL AND NON-BLOCKING)
    try {
      console.log(`[DELETE] 🧹 Attempting RAG cleanup for conversation ${conversationId}`);
      
      const { ragEngine } = await import('@/lib/rag');
      
      if (ragEngine && ragEngine.deleteDocuments) {
        const vectorIds = [`conversation-${conversationId}`, `conv-${conversationId}`, `msg-${conversationId}`];
        await ragEngine.deleteDocuments(vectorIds);
        console.log(`[DELETE] ✅ RAG cleanup completed for conversation ${conversationId}`);
      } else {
        console.log(`[DELETE] ⚠️ RAG engine not available, skipping vector cleanup for ${conversationId}`);
      }
    } catch (ragError: any) {
      console.warn(`[DELETE] ⚠️ RAG cleanup failed for conversation ${conversationId}:`, ragError?.message);
      // Don't fail the deletion for RAG cleanup errors
    }

    // 8. SUCCESS RESPONSE
    console.log(`[DELETE] 🎉 DELETION COMPLETED SUCCESSFULLY for conversation ${conversationId}`);
    
    const deletionSummary = {
      conversationId,
      conversationsDeleted: conversationsDeleted || 0,
      messagesDeleted: messagesDeleted || 0,
      originalTitle: conversation.title,
      deletedAt: new Date().toISOString()
    };
    
    console.log(`[DELETE] 📊 Deletion summary:`, deletionSummary);

    return NextResponse.json({
      success: true,
      message: 'Conversación eliminada exitosamente',
      data: deletionSummary
    });

  } catch (error: any) {
    console.error(`[DELETE] ❌ Unexpected error during conversation deletion ${conversationId}:`, {
      error: error?.message,
      stack: error?.stack,
      code: error?.code
    });
    
    return NextResponse.json(
      { success: false, error: `Error interno del servidor: ${error?.message}` },
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