import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// DELETE - Disconnect WhatsApp number from store
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { whatsapp_number_id, store_id } = body;
    
    console.log('[INFO] Disconnecting WhatsApp number from store:', { whatsapp_number_id, store_id });

    if (!whatsapp_number_id || !store_id) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp number ID and store ID are required' },
        { status: 400 }
      );
    }

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

    // Verificar que el número de WhatsApp pertenece al usuario
    const { data: whatsappNumber, error: numberError } = await supabase
      .from('whatsapp_numbers')
      .select('id, phone_number, display_name')
      .eq('id', whatsapp_number_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (numberError || !whatsappNumber) {
      console.error('[ERROR] WhatsApp number not found or unauthorized:', numberError?.message);
      return NextResponse.json(
        { success: false, error: 'WhatsApp number not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verificar que la tienda pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, domain')
      .eq('id', store_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      console.error('[ERROR] Store not found or unauthorized:', storeError?.message);
      return NextResponse.json(
        { success: false, error: 'Store not found or unauthorized' },
        { status: 404 }
      );
    }

    // Buscar y desactivar la conexión
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_store_connections')
      .select('id')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('store_id', store_id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.error('[ERROR] Active connection not found:', connectionError?.message);
      return NextResponse.json(
        { success: false, error: 'Active connection not found' },
        { status: 404 }
      );
    }

    // Desactivar la conexión
    const { error: updateError } = await supabase
      .from('whatsapp_store_connections')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('[ERROR] Failed to disconnect:', updateError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect' },
        { status: 500 }
      );
    }

    console.log(`[INFO] WhatsApp number ${whatsappNumber.display_name} disconnected from store ${store.name}`);

    return NextResponse.json({
      success: true,
      message: `WhatsApp number ${whatsappNumber.display_name} disconnected from store ${store.name}`
    });

  } catch (error) {
    console.error('[ERROR] Failed to disconnect WhatsApp number from store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 