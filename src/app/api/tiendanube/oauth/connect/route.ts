import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkStoreLimit, createPlanErrorResponse } from '@/lib/middleware/plan-restrictions';

interface ConnectRequest {
  storeUrl: string;
  storeName: string;
  context?: 'onboarding' | 'configuration';
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
    
    // Check current store count and plan limits
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (storesError) {
      console.error('[ERROR] Failed to check store count:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check store count'
      }, { status: 500 });
    }
    
    const currentStoreCount = stores?.length || 0;
    
    // Check store limit based on plan
    const storeLimitCheck = await checkStoreLimit(request, currentStoreCount);
    
    if (!storeLimitCheck.success) {
      console.log(`[INFO] Store limit exceeded for user ${userId}. Current count: ${currentStoreCount}, Plan: ${storeLimitCheck.plan || 'unknown'}`);
      return createPlanErrorResponse(storeLimitCheck.error!);
    }
    
    console.log(`[INFO] Store limit check passed for user ${userId}. Current count: ${currentStoreCount}, Plan: ${storeLimitCheck.plan}`);
    
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

    // Detectar contexto: si no se especifica, detectar por referer
    let context = storeData.context || 'onboarding';
    
    // Si no se especificó contexto, intentar detectar por referer
    if (!storeData.context) {
      const referer = request.headers.get('referer') || '';
      if (referer.includes('/dashboard') || referer.includes('configuration')) {
        context = 'configuration';
      } else {
        context = 'onboarding';
      }
    }

    console.log('[INFO] Generating OAuth URL for user:', userId, 'store:', storeData.storeName, 'context:', context);

    // Validate environment variables
    const clientId = process.env.TIENDANUBE_CLIENT_ID;
    const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[ERROR] Tienda Nube credentials not configured properly:');
      console.error('- TIENDANUBE_CLIENT_ID exists:', !!clientId);
      console.error('- TIENDANUBE_CLIENT_SECRET exists:', !!clientSecret);
      
      return NextResponse.json({
        success: false,
        error: 'Server configuration error: Tienda Nube credentials are missing. Please configure TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET in your environment variables.'
      }, { status: 500 });
    }

    // Create state parameter with user ID, store information, and context
    const stateData = {
      userId,
      storeUrl: storeData.storeUrl,
      storeName: storeData.storeName,
      context: context,
      timestamp: Date.now()
    };
    
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // The redirect URI and scope are configured in the Tienda Nube Partner Dashboard.
    // We only need to construct the initial authorization URL here.
    // The `state` parameter is used to pass the user's ID and store info through the OAuth process for security.
    // Reference: https://dev.tiendanube.com/docs/applications/authentication
    const authUrl = `https://www.tiendanube.com/apps/${clientId}/authorize?state=${encodeURIComponent(state)}`;

    console.log('[INFO] OAuth URL generated successfully for store:', storeData.storeName, 'context:', context);
    console.log('[DEBUG] Generated auth URL:', authUrl);

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