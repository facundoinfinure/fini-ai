import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    console.log('[INFO] Generating Tienda Nube OAuth URL');
    
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
    console.log('[INFO] Generating OAuth URL for user:', userId);

    // Generate OAuth URL
    const clientId = process.env.TIENDANUBE_CLIENT_ID;

    if (!clientId) {
      console.error('[ERROR] TIENDANUBE_CLIENT_ID is not set in environment variables.');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error: Tienda Nube client ID is missing.'
      }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/tiendanube/oauth/callback`;
    const scope = 'read_products read_orders read_customers';
    
    const authUrl = `https://www.tiendanube.com/apps/authorize/token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${userId}`;

    console.log('[INFO] OAuth URL generated successfully');

    return NextResponse.json({
      success: true,
      data: {
        authUrl
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to generate OAuth URL:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 