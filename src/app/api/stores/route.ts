import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';

// GET - Get all stores for the current user
export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Getting user stores');
    
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

    // Get stores for user
    const storesResult = await StoreService.getStoresByUserId(userId);
    
    if (!storesResult.success) {
      console.error('[ERROR] Failed to get stores:', storesResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get stores',
        details: storesResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Retrieved stores for user:', storesResult.stores?.length || 0);

    return NextResponse.json({
      success: true,
      data: {
        stores: storesResult.stores || []
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to get stores:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create a new store
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Creating new store');
    
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
    const { storeName, storeUrl, accessToken, storeId } = await request.json();

    // Validate required fields
    if (!storeName || !storeUrl || !accessToken || !storeId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: storeName, storeUrl, accessToken, storeId'
      }, { status: 400 });
    }

    // Create store
    const storeResult = await StoreService.createStore({
      user_id: userId,
      tiendanube_store_id: storeId,
      store_name: storeName,
      store_url: storeUrl,
      access_token: accessToken,
      refresh_token: '', // Tienda Nube doesn't provide refresh tokens
      token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      is_active: true,
      last_sync_at: new Date().toISOString()
    });

    if (!storeResult.success) {
      console.error('[ERROR] Failed to create store:', storeResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create store',
        details: storeResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Store created successfully:', storeResult.store?.id);

    return NextResponse.json({
      success: true,
      data: {
        store: storeResult.store
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to create store:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 