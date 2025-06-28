import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversations/new
 * Crear una nueva conversación vacía
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Creating new conversation');
    
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
    const { storeId, title = null } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el store pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      console.error('[ERROR] Store not found or unauthorized:', storeError?.message);
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    // Crear conversación nueva
    const newConversation = {
      user_id: user.id,
      store_id: storeId,
      whatsapp_number: process.env.TWILIO_PHONE_NUMBER || 'dashboard-new',
      customer_number: user.email || 'new-conversation',
      conversation_id: `new_${user.id}_${storeId}_${Date.now()}`,
      title: title || null, // Si no se proporciona título, será auto-generado después
      status: 'active' as const,
      last_message_at: new Date().toISOString(),
      message_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert([newConversation])
      .select()
      .single();

    if (createError) {
      console.error('[ERROR] Failed to create conversation:', createError.message);
      return NextResponse.json(
        { success: false, error: 'Error creando conversación' },
        { status: 500 }
      );
    }

    console.log(`[INFO] Successfully created new conversation: ${conversation.id}`);

    return NextResponse.json({
      success: true,
      data: conversation,
      message: 'Nueva conversación creada exitosamente'
    });

  } catch (error) {
    console.error('[ERROR] Failed to create new conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 