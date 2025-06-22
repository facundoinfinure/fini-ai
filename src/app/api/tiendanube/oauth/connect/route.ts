import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ConnectRequest {
  storeUrl: string;
  storeName: string;
}

export async function POST(request: NextRequest) {
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
    
    // Parse request body to get store information
    let storeData: ConnectRequest;
    try {
      storeData = await request.json();
    } catch (parseError) {
      console.error('[ERROR] Failed to parse request body:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid request body'
      }, { status: 400 });
    }

    // Validate store data
    if (!storeData.storeUrl || !storeData.storeName) {
      console.error('[ERROR] Missing store URL or name');
      return NextResponse.json({
        success: false,
        error: 'Store URL and name are required'
      }, { status: 400 });
    }

    console.log('[INFO] Generating OAuth URL for user:', userId, 'store:', storeData.storeName);

    // Generate OAuth URL
    const clientId = process.env.TIENDANUBE_CLIENT_ID;

    if (!clientId) {
      console.error('[ERROR] TIENDANUBE_CLIENT_ID is not set in environment variables.');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error: Tienda Nube client ID is missing.'
      }, { status: 500 });
    }

    // Create state parameter with user ID and store information
    // We'll encode the store info in the state to retrieve it in the callback
    const stateData = {
      userId,
      storeUrl: storeData.storeUrl,
      storeName: storeData.storeName,
      timestamp: Date.now()
    };
    
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // The redirect URI and scope are configured in the Tienda Nube Partner Dashboard.
    // We only need to construct the initial authorization URL here.
    // The `state` parameter is used to pass the user's ID and store info through the OAuth process for security.
    // Reference: https://dev.tiendanube.com/docs/applications/authentication
    const authUrl = `https://www.tiendanube.com/apps/${clientId}/authorize?state=${encodeURIComponent(state)}`;

    console.log('[INFO] OAuth URL generated successfully for store:', storeData.storeName);

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