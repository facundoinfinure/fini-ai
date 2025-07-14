export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Test auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return Response.json({
        success: false,
        error: 'User not authenticated',
        component: 'config-diagnostic',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Test stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, is_active')
      .eq('user_id', user.id)
      .limit(5);

    return Response.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        stores: stores || [],
        storesCount: stores?.length || 0,
        hasStoresError: !!storesError,
        storesError: storesError?.message || null
      },
      component: 'config-diagnostic',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      component: 'config-diagnostic',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}