import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('DebugDashboard');

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No authenticated user',
        authError
      }, { status: 401 });
    }

    logger.info('Debug dashboard data', { userId: user.id });

    // Get stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          aud: user.aud,
          role: user.role
        },
        stores: {
          count: stores?.length || 0,
          data: stores || [],
          error: storesError
        },
        profile: {
          data: profile,
          error: profileError
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Debug dashboard failed', { error });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 