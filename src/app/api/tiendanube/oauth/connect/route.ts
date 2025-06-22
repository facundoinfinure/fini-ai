import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTiendaNubeAuthUrl } from '@/lib/integrations/tiendanube';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Initiating Tienda Nube OAuth connection');
    
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

    // Generate OAuth URL with state parameter for security
    const state = `${userId}_${Date.now()}`;
    const authUrl = getTiendaNubeAuthUrl(state);

    console.log('[INFO] Generated Tienda Nube OAuth URL for user:', userId);

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        state
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to initiate OAuth connection:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 