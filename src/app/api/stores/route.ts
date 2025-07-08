import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStoreDataManager, type OAuthData } from '@/lib/services/store-data-manager';

export const dynamic = 'force-dynamic';

// GET - Get all stores for the current user
export async function GET() {
  try {
    console.log('[STORES-GET] 📋 Fetching user stores from database');
    
    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[STORES-GET] ❌ Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('[STORES-GET] 🔍 Testing column access for user:', user.id);

    // First, test which columns are available
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('[STORES-GET] ❌ Cannot access stores table:', testError);
      return NextResponse.json(
        { success: false, error: 'Cannot access stores table' },
        { status: 500 }
      );
    }

    const availableColumns = testData?.[0] ? Object.keys(testData[0]) : [];
    console.log('[STORES-GET] ✅ Available columns:', availableColumns);

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
        updated_at,
        last_sync_at
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

    console.log('[STORES-GET] 📝 Using select query columns:', selectQuery.replace(/\s+/g, ' ').trim());

    // Obtener las tiendas del usuario
    const { data: rawStores, error: storesError } = await supabase
      .from('stores')
      .select(selectQuery)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storesError) {
      console.error('[STORES-GET] ❌ Failed to fetch stores:', storesError.message);
      return NextResponse.json(
        { success: false, error: `Failed to fetch stores: ${storesError.message}` },
        { status: 500 }
      );
    }

    // Para cada store, obtener información de WhatsApp
    const storesWithWhatsApp = await Promise.all(
      (rawStores || []).map(async (store) => {
        // Buscar conexión de WhatsApp para este store
        const { data: whatsappConnection } = await supabase
          .from('whatsapp_store_connections')
          .select(`
            id,
            is_active,
            whatsapp_numbers(
              id,
              phone_number,
              display_name,
              is_verified,
              is_active
            )
          `)
          .eq('store_id', (store as any).id)
          .eq('is_active', true)
          .single();

        const whatsappInfo = whatsappConnection?.whatsapp_numbers as any;
        const hasWhatsApp = !!whatsappInfo;
        const isWhatsAppVerified = hasWhatsApp && whatsappInfo.is_verified && whatsappInfo.is_active;

        return {
          id: (store as any).id,
          name: hasNewColumns ? (store as any).name : ((store as any).store_name || 'Mi Tienda'),
          domain: hasNewColumns ? (store as any).domain : ((store as any).store_url || ''),
          platform: (store as any).platform || 'tiendanube',
          platform_store_id: (store as any).platform_store_id || (store as any).tiendanube_store_id || '',
          access_token: (store as any).access_token,
          is_active: (store as any).is_active,
          created_at: (store as any).created_at,
          updated_at: (store as any).updated_at,
          last_sync_at: (store as any).last_sync_at || null,
          // Información de WhatsApp
          whatsapp_number: hasWhatsApp ? whatsappInfo.phone_number : null,
          whatsapp_display_name: hasWhatsApp ? whatsappInfo.display_name : null,
          whatsapp_verified: isWhatsAppVerified,
          status: isWhatsAppVerified ? 'connected' : (hasWhatsApp ? 'pending' : 'disconnected')
        };
      })
    );

    const stores = storesWithWhatsApp;

    console.log(`[STORES-GET] ✅ Found ${stores.length} stores for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: stores
    });

  } catch (error) {
    console.error('[STORES-GET] ❌ Failed to fetch stores:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new store using unified architecture
export async function POST(request: NextRequest) {
  try {
    console.log('[STORES-POST] 🆕 Creating new store with unified architecture');
    
    const body = await request.json();
    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[STORES-POST] ❌ Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Validar datos requeridos
    const { 
      name, 
      domain, 
      platform_store_id, 
      access_token, 
      authorization_code,
      platform = 'tiendanube' 
    } = body;
    
    if (!name || !domain || !platform_store_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, domain, platform_store_id' },
        { status: 400 }
      );
    }

    if (!access_token && !authorization_code) {
      return NextResponse.json(
        { success: false, error: 'Either access_token or authorization_code is required' },
        { status: 400 }
      );
    }

    // Use unified StoreDataManager
    const storeManager = getStoreDataManager();
    
    const oauthData: OAuthData = {
      userId: user.id,
      authorizationCode: authorization_code || '',
      platformStoreId: platform_store_id,
      storeName: name,
      storeUrl: domain,
      accessToken: access_token
    };

    // Check if store already exists for reconnection logic
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('platform_store_id', platform_store_id)
      .eq('platform', platform)
      .single();

    let result;
    
    if (existingStore) {
      // Reconnect existing store
      console.log('[STORES-POST] 🔄 Reconnecting existing store:', existingStore.id);
      result = await storeManager.reconnectExistingStore(existingStore.id, oauthData);
    } else {
      // Create new store
      console.log('[STORES-POST] 🆕 Creating new store');
      result = await storeManager.createNewStore(oauthData);
    }

    if (!result.success) {
      console.error('[STORES-POST] ❌ Store operation failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    const store = result.store!;
    
    console.log(`[STORES-POST] ✅ Store operation completed: ${store.id}, job: ${result.backgroundJobId}`);

    // Return successful response with job information
    return NextResponse.json({
      success: true,
      data: {
        id: store.id,
        name: store.name,
        domain: store.domain,
        platform: store.platform,
        platform_store_id: store.platform_store_id,
        is_active: store.is_active,
        created_at: store.created_at,
        updated_at: store.updated_at,
        last_sync_at: store.last_sync_at
      },
      metadata: {
        operation: existingStore ? 'reconnected' : 'created',
        backgroundJobId: result.backgroundJobId,
        syncStatus: result.syncStatus,
        operations: result.operations
      }
    });

  } catch (error) {
    console.error('[STORES-POST] ❌ Failed to create/reconnect store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a store using unified architecture
export async function DELETE(request: NextRequest) {
  try {
    console.log('[STORES-DELETE] 🗑️ Deleting store with unified architecture');
    
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[STORES-DELETE] ❌ Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use unified StoreDataManager
    const storeManager = getStoreDataManager();
    
    const result = await storeManager.deleteStore(storeId, user.id);

    if (!result.success) {
      console.error('[STORES-DELETE] ❌ Store deletion failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`[STORES-DELETE] ✅ Store deleted: ${storeId}, cleanup job: ${result.backgroundJobId}`);

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully',
      metadata: {
        storeId,
        backgroundJobId: result.backgroundJobId,
        operations: result.operations
      }
    });

  } catch (error) {
    console.error('[STORES-DELETE] ❌ Failed to delete store:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 