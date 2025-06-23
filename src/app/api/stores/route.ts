import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Get all stores for the current user
export async function GET() {
  try {
    console.log('[INFO] Fetching user stores from database');
    
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

    // Obtener las tiendas del usuario
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        domain,
        tiendanube_store_id,
        access_token,
        is_active,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storesError) {
      console.error('[ERROR] Failed to fetch stores:', storesError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }

    console.log(`[INFO] Found ${stores?.length || 0} stores for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: stores || []
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch stores:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[INFO] Creating new store:', body);

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

    // Validar datos requeridos
    const { name, domain, tiendanube_store_id, access_token } = body;
    
    if (!name || !domain || !tiendanube_store_id || !access_token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Crear la nueva tienda
    const { data: newStore, error: createError } = await supabase
      .from('stores')
      .insert({
        user_id: user.id,
        name,
        domain,
        tiendanube_store_id,
        access_token,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('[ERROR] Failed to create store:', createError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to create store' },
        { status: 500 }
      );
    }

    console.log('[INFO] Store created successfully:', newStore.id);

    return NextResponse.json({
      success: true,
      data: newStore
    });

  } catch (error) {
    console.error('[ERROR] Failed to create store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 