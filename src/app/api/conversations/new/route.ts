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

    let body;
    try {
      const rawBody = await request.text();
      if (!rawBody.trim()) {
        console.log('[INFO] Empty request body, using default values');
        body = {};
      } else {
        body = JSON.parse(rawBody);
      }
    } catch (parseError) {
      console.error('[ERROR] Invalid JSON in request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Formato de request inválido' },
        { status: 400 }
      );
    }

    const { storeId, title = null } = body;

    if (!storeId) {
      // Si no hay storeId, intentar obtener la primera tienda del usuario
      console.log('[INFO] No storeId provided, finding user\'s first store');
      
      const { data: userStores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .limit(1);

      if (storesError || !userStores || userStores.length === 0) {
        console.error('[ERROR] No connected stores found for user:', user.id);
        return NextResponse.json(
          { success: false, error: 'No tienes tiendas conectadas. Conecta una tienda primero.' },
          { status: 400 }
        );
      }

      body.storeId = userStores[0].id;
      console.log('[INFO] Using user\'s first store:', body.storeId);
    }

    // Verificar que el store pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id')
      .eq('id', body.storeId)
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
      store_id: body.storeId,
      whatsapp_number: process.env.TWILIO_PHONE_NUMBER || 'dashboard-new',
      customer_number: user.email || 'new-conversation',
      conversation_id: `new_${user.id}_${body.storeId}_${Date.now()}`,
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