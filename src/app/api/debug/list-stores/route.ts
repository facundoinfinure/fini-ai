import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('[DEBUG-LIST-STORES] Listing all stores...');

    const supabase = createClient();

    // Get all stores
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, platform, platform_store_id, user_id, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DEBUG-LIST-STORES] Error fetching stores:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores',
        details: error.message
      });
    }

    console.log('[DEBUG-LIST-STORES] Found stores:', stores?.length || 0);

    // Filter TiendaNube stores
    const tiendanubeStores = stores?.filter(store => store.platform === 'tiendanube') || [];

    return NextResponse.json({
      success: true,
      data: {
        totalStores: stores?.length || 0,
        tiendanubeStores: tiendanubeStores.length,
        stores: stores?.map(store => ({
          id: store.id,
          name: store.name,
          platform: store.platform,
          platformStoreId: store.platform_store_id,
          userId: store.user_id,
          isActive: store.is_active,
          createdAt: store.created_at,
          updatedAt: store.updated_at
        })) || []
      }
    });

  } catch (error) {
    console.error('[DEBUG-LIST-STORES] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 