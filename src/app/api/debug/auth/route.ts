import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    console.log('[DEBUG] Testing authentication');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('[DEBUG] Session error:', sessionError);
    console.log('[DEBUG] Session data:', {
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at
      } : null,
      expires_at: session?.expires_at
    });

    return NextResponse.json({
      success: true,
      data: {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        sessionError: sessionError?.message || null,
        expires_at: session?.expires_at || null
      }
    });

  } catch (error) {
    console.error('[DEBUG] Auth test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Auth test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 