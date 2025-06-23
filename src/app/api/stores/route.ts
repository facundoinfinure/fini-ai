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

    console.log('[INFO] Testing column access for user:', user.id);

    // First, test which columns are available
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('[ERROR] Cannot access stores table:', testError);
      return NextResponse.json(
        { success: false, error: 'Cannot access stores table' },
        { status: 500 }
      );
    }

    const availableColumns = testData?.[0] ? Object.keys(testData[0]) : [];
    console.log('[INFO] Available columns:', availableColumns);

    // Use the actual column names that exist in the database
    const hasNewColumns = availableColumns.includes('domain') && availableColumns.includes('name');
    const hasOldColumns = availableColumns.includes('store_url') && availableColumns.includes('store_name');

    let selectQuery: string;
    
    if (hasNewColumns) {
      // Use new column names
      selectQuery = `
        id,
        name,
        domain,
        platform,
        platform_store_id,
        access_token,
        is_active,
        created_at,
        updated_at
      `;
    } else if (hasOldColumns) {
      // Use old column names and alias them
      selectQuery = `
        id,
        store_name,
        store_url,
        platform,
        platform_store_id,
        access_token,
        is_active,
        created_at,
        updated_at
      `;
    } else {
      // Fallback to basic columns
      selectQuery = `
        id,
        access_token,
        is_active,
        created_at,
        updated_at
      `;
    }

    console.log('[INFO] Using select query columns:', selectQuery.replace(/\s+/g, ' ').trim());

    // Obtener las tiendas del usuario
    const { data: rawStores, error: storesError } = await supabase
      .from('stores')
      .select(selectQuery)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storesError) {
      console.error('[ERROR] Failed to fetch stores:', storesError.message);
      return NextResponse.json(
        { success: false, error: `Failed to fetch stores: ${storesError.message}` },
        { status: 500 }
      );
    }

    // Normalize the data to use consistent field names
    const stores = rawStores?.map(store => ({
      id: (store as any).id,
      name: hasNewColumns ? (store as any).name : ((store as any).store_name || 'Mi Tienda'),
      domain: hasNewColumns ? (store as any).domain : ((store as any).store_url || ''),
      platform: (store as any).platform || 'tiendanube',
      platform_store_id: (store as any).platform_store_id || (store as any).tiendanube_store_id || '',
      access_token: (store as any).access_token,
      is_active: (store as any).is_active,
      created_at: (store as any).created_at,
      updated_at: (store as any).updated_at
    })) || [];

    console.log(`[INFO] Found ${stores.length} stores for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: stores
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
    const { name, domain, platform_store_id, access_token, platform = 'tiendanube' } = body;
    
    if (!name || !domain || !platform_store_id || !access_token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Test which columns are available for INSERT
    const { data: testData } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    const availableColumns = testData?.[0] ? Object.keys(testData[0]) : [];
    const hasNewColumns = availableColumns.includes('domain') && availableColumns.includes('name');

    let insertData: any;

    if (hasNewColumns) {
      // Use new column names
      insertData = {
        user_id: user.id,
        name,
        domain,
        platform,
        platform_store_id,
        access_token,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else {
      // Use old column names
      insertData = {
        user_id: user.id,
        store_name: name,
        store_url: domain,
        platform,
        platform_store_id,
        access_token,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Crear la nueva tienda
    const { data: newStore, error: createError } = await supabase
      .from('stores')
      .insert(insertData)
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

    // Normalize the response
    const normalizedStore = {
      id: (newStore as any).id,
      name: hasNewColumns ? (newStore as any).name : (newStore as any).store_name,
      domain: hasNewColumns ? (newStore as any).domain : (newStore as any).store_url,
      platform: (newStore as any).platform,
      platform_store_id: (newStore as any).platform_store_id,
      access_token: (newStore as any).access_token,
      is_active: (newStore as any).is_active,
      created_at: (newStore as any).created_at,
      updated_at: (newStore as any).updated_at
    };

    return NextResponse.json({
      success: true,
      data: normalizedStore
    });

  } catch (error) {
    console.error('[ERROR] Failed to create store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 