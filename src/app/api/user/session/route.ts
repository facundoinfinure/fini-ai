import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static build errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/session
 * Obtiene información de la sesión actual del usuario
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Checking user session');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[ERROR] Session error:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'Error getting session',
        authenticated: false
      }, { status: 401 });
    }

    if (!session?.user) {
      console.log('[INFO] No authenticated session found');
      return NextResponse.json({
        success: false,
        error: 'No authenticated session',
        authenticated: false
      }, { status: 401 });
    }

    // Get user profile data
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('[ERROR] Profile error:', profileError);
      return NextResponse.json({
        success: false,
        error: 'Error getting user profile',
        authenticated: true,
        session: {
          user: {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at
          }
        }
      }, { status: 500 });
    }

    console.log('[INFO] Session found for user:', session.user.id);
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at
        },
        profile: userProfile
      }
    });

  } catch (error) {
    console.error('[ERROR] Session check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false
    }, { status: 500 });
  }
} 