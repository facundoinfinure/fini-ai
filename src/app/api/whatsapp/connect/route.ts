import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST - Connect WhatsApp number to store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { whatsappNumberId, storeId, whatsapp_number_id, store_id } = body;
    
    // Soportar tanto camelCase como snake_case
    const finalWhatsappNumberId = whatsappNumberId || whatsapp_number_id;
    const finalStoreId = storeId || store_id;
    
    console.log('[INFO] Connecting WhatsApp number to store:', { whatsappNumberId: finalWhatsappNumberId, storeId: finalStoreId });

    if (!finalWhatsappNumberId || !finalStoreId) {
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
      .eq('id', finalWhatsappNumberId)
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
      .eq('id', finalStoreId)
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

    // Verificar si ya existe una conexión
    const { data: existingConnection } = await supabase
      .from('whatsapp_store_connections')
      .select('id, is_active')
      .eq('whatsapp_number_id', finalWhatsappNumberId)
      .eq('store_id', finalStoreId)
      .single();

    if (existingConnection) {
      if (existingConnection.is_active) {
        return NextResponse.json(
          { success: false, error: 'Connection already exists and is active' },
          { status: 409 }
        );
      } else {
        // Reactivar conexión existente
        const { error: updateError } = await supabase
          .from('whatsapp_store_connections')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConnection.id);

        if (updateError) {
          console.error('[ERROR] Failed to reactivate connection:', updateError.message);
          return NextResponse.json(
            { success: false, error: 'Failed to reactivate connection' },
            { status: 500 }
          );
        }

        console.log('[INFO] Connection reactivated successfully');
        return NextResponse.json({
          success: true,
          message: `WhatsApp number ${whatsappNumber.display_name} connected to store ${store.name}`
        });
      }
    }

    // Crear nueva conexión
    const { error: createError } = await supabase
      .from('whatsapp_store_connections')
      .insert({
              whatsapp_number_id: finalWhatsappNumberId,
      store_id: finalStoreId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (createError) {
      console.error('[ERROR] Failed to create connection:', createError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to create connection' },
        { status: 500 }
      );
    }

    console.log(`[INFO] WhatsApp number ${whatsappNumber.display_name} connected to store ${store.name}`);

    return NextResponse.json({
      success: true,
      message: `WhatsApp number ${whatsappNumber.display_name} connected to store ${store.name}`
    });

  } catch (error) {
    console.error('[ERROR] Failed to connect WhatsApp number to store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 