import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Iniciando diagnóstico de tiendas');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('[DEBUG] No authenticated user found:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[DEBUG] Checking stores for user:', userId);

    // Get all stores for debugging
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId);

    if (storesError) {
      console.error('[DEBUG] Error fetching stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Error fetching stores',
        debug: storesError
      }, { status: 500 });
    }

    console.log('[DEBUG] Found stores:', stores?.length || 0);

    // Detailed analysis of each store
    const storeAnalysis = stores?.map(store => {
      const hasStoreId = !!store.tiendanube_store_id;
      const isActive = !!store.is_active;
      const hasSync = !!store.last_sync_at;
      
      let status = 'unknown';
      if (!hasStoreId) {
        status = 'no_tiendanube_id';
      } else if (!isActive) {
        status = 'inactive';
      } else if (hasSync) {
        const lastSync = new Date(store.last_sync_at);
        const now = new Date();
        const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
        
        if (diffHours < 24) {
          status = 'active_recent_sync';
        } else {
          status = 'active_old_sync';
        }
      } else {
        status = 'active_no_sync';
      }

      return {
        id: store.id,
        name: store.name,
        tiendanube_store_id: store.tiendanube_store_id,
        is_active: store.is_active,
        last_sync_at: store.last_sync_at,
        created_at: store.created_at,
        updated_at: store.updated_at,
        status,
        analysis: {
          hasStoreId,
          isActive,
          hasSync,
          syncHoursAgo: hasSync ? Math.round((Date.now() - new Date(store.last_sync_at).getTime()) / (1000 * 60 * 60)) : null
        }
      };
    }) || [];

    return NextResponse.json({
      success: true,
      debug: {
        userId,
        totalStores: stores?.length || 0,
        stores: storeAnalysis,
        summary: {
          active: storeAnalysis.filter(s => s.is_active).length,
          withStoreId: storeAnalysis.filter(s => s.analysis.hasStoreId).length,
          withRecentSync: storeAnalysis.filter(s => s.status === 'active_recent_sync').length,
          statusBreakdown: storeAnalysis.reduce((acc, store) => {
            acc[store.status] = (acc[store.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG] Failed to diagnose stores:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 