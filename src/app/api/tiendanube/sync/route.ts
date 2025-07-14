import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { StoreService } from '@/lib/database/client';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Processing Tienda Nube sync request');
    
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

    const userId = session.user.id;

    // Parse request body
    const { storeId } = await request.json();

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }

    console.log('[INFO] Syncing store:', { userId, storeId });

    // Get store from database
    const storeResult = await StoreService.getStoresByUserId(userId);
    
    if (!storeResult.success) {
      console.error('[ERROR] Failed to get stores:', storeResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve stores'
      }, { status: 500 });
    }

    const store = storeResult.stores?.find(s => s.id === storeId);
    
    if (!store) {
      console.error('[ERROR] Store not found:', { storeId, userId });
      return NextResponse.json({
        success: false,
        error: 'Store not found'
      }, { status: 404 });
    }

    if (!store.access_token || !store.platform_store_id) {
      console.error('[ERROR] Store missing credentials:', { 
        storeId, 
        hasAccessToken: !!store.access_token,
        hasPlatformStoreId: !!store.platform_store_id 
      });
      return NextResponse.json({
        success: false,
        error: 'Store missing access credentials'
      }, { status: 400 });
    }

    console.log('[INFO] Starting sync for store:', { 
      storeId, 
      storeName: store.name,
      platformStoreId: store.platform_store_id 
    });

    // 🔥 FIX: Get valid token using Token Manager instead of using stale token
    let validToken: string | null = null;
    try {
      // Import TiendaNubeTokenManager dynamically to avoid import issues
      const { UniversalTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
              validToken = await UniversalTokenManager.getValidToken(store.id);
      
      if (!validToken) {
        console.error('[ERROR] No valid token available for store:', {
          storeId: store.id,
          hasStoredToken: !!store.access_token
        });
        return NextResponse.json({
          success: false,
          error: 'Store token is invalid or expired. Please reconnect your store.',
          requiresReconnection: true
        }, { status: 401 });
      }
      
      console.log('[INFO] Using validated/refreshed token for API calls');
    } catch (tokenError) {
      console.error('[ERROR] Failed to get valid token:', tokenError);
      return NextResponse.json({
        success: false,
        error: 'Failed to validate store credentials. Please reconnect your store.',
        requiresReconnection: true
      }, { status: 401 });
    }

    // Initialize Tienda Nube API client with valid token
    const tiendaNubeAPI = new TiendaNubeAPI(validToken, store.platform_store_id);

    // Test connection and sync store information
    let storeInfo;
    try {
      storeInfo = await tiendaNubeAPI.getStore();
      console.log('[INFO] Successfully fetched store info from Tienda Nube:', {
        id: storeInfo.id,
        name: storeInfo.name,
        url: storeInfo.url
      });
    } catch (apiError) {
      console.error('[ERROR] Failed to fetch store info from Tienda Nube:', apiError);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Tienda Nube API. Please check your store credentials.',
        details: apiError instanceof Error ? apiError.message : 'Unknown API error'
      }, { status: 500 });
    }

    // Update store with fresh data and sync timestamp
    const updateData = {
      name: storeInfo.name || store.name,
      domain: storeInfo.url || store.domain,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    };

    const updateResult = await StoreService.updateStore(storeId, updateData);

    if (!updateResult.success) {
      console.error('[ERROR] Failed to update store after sync:', updateResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update store data',
        details: updateResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Store sync completed successfully:', {
      storeId,
      storeName: updateData.name,
      lastSyncAt: updateData.last_sync_at
    });

    return NextResponse.json({
      success: true,
      data: {
        store: updateResult.store,
        syncedAt: updateData.last_sync_at,
        storeInfo: {
          id: storeInfo.id,
          name: storeInfo.name,
          url: storeInfo.url
        }
      },
      message: 'Store synced successfully'
    });

  } catch (error) {
    console.error('[ERROR] Store sync failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Tienda Nube Sync API',
    usage: {
      method: 'POST',
      endpoint: '/api/tiendanube/sync',
      body: {
        storeId: 'store-uuid'
      }
    },
    features: [
      'Sync store information from Tienda Nube',
      'Update store name and domain',
      'Update last sync timestamp',
      'Validate store credentials',
      'Test API connectivity'
    ]
  });
} 