import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * 🐛 DEBUG ENDPOINT: List All Stores
 * ==================================
 * 
 * Lists all stores in the database for debugging purposes.
 * Only works in development mode.
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: 'This endpoint is only available in development mode'
      }, { status: 403 });
    }

    console.log('[DEBUG] 📋 Listing all stores...');
    
    const supabase = createServiceClient();

    // Get all stores
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('[DEBUG] ❌ Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    console.log(`[DEBUG] 📊 Found ${stores?.length || 0} stores`);

    return NextResponse.json({
      success: true,
      message: `Found ${stores?.length || 0} stores`,
      stores: stores?.map(store => ({
        id: store.id,
        name: store.name,
        user_id: store.user_id,
        platform: store.platform,
        is_active: store.is_active,
        created_at: store.created_at,
        updated_at: store.updated_at,
        last_sync_at: store.last_sync_at,
        has_token: !!store.access_token
      })) || []
    });

  } catch (error) {
    console.error('[DEBUG] ❌ Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 