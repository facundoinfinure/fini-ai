import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';
import { WhatsAppService } from '@/lib/database/whatsapp-service';

// PUT - Update a store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Updating store:', params.id);
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('[ERROR] No authenticated user found:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    const _userId = session.user.id;

    // Parse request body
    const updates = await request.json();

    // Validate required fields
    if (!updates.store_name && !updates.store_url && !updates.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 });
    }

    // Update store
    const storeResult = await StoreService.updateStore(params.id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    if (!storeResult.success) {
      console.error('[ERROR] Failed to update store:', storeResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update store',
        details: storeResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Store updated successfully:', params.id);

    return NextResponse.json({
      success: true,
      data: {
        store: storeResult.store
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to update store:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete a store (soft delete by setting is_active to false)
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    console.log('[INFO] Deleting store:', storeId);

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

    // Verificar que la tienda pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id, name')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      console.error('[ERROR] Store not found or unauthorized:', storeError?.message);
      return NextResponse.json(
        { success: false, error: 'Store not found or unauthorized' },
        { status: 404 }
      );
    }

    // Primero desconectar todos los números de WhatsApp asociados
    const { error: disconnectError } = await supabase
      .from('whatsapp_store_connections')
      .update({ is_active: false })
      .eq('store_id', storeId);

    if (disconnectError) {
      console.error('[ERROR] Failed to disconnect WhatsApp numbers:', disconnectError.message);
    }

    // Realizar soft delete de la tienda
    const { error: deleteError } = await supabase
      .from('stores')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[ERROR] Failed to delete store:', deleteError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to delete store' },
        { status: 500 }
      );
    }

    console.log(`[INFO] Store ${store.name} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: `Store ${store.name} deleted successfully`
    });

  } catch (error) {
    console.error('[ERROR] Failed to delete store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 