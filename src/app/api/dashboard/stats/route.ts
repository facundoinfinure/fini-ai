import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Fetching dashboard stats');
    
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
    console.log('[INFO] Fetching stats for user:', userId);

    // Get user's stores - using correct column names
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, platform_store_id, created_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (storesError) {
      console.error('[ERROR] Failed to fetch stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores'
      }, { status: 500 });
    }

    console.log('[INFO] Found stores:', stores?.length || 0);

    // Calculate basic stats
    const totalStores = stores?.length || 0;
    const activeStores = stores?.filter(store => store.platform_store_id)?.length || 0;
    const totalRevenue = 0; // TODO: Calculate from orders
    const totalOrders = 0; // TODO: Calculate from orders

    const stats = {
      totalStores,
      activeStores,
      totalRevenue,
      totalOrders,
      stores: stores || []
    };

    console.log('[INFO] Dashboard stats calculated successfully');

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 