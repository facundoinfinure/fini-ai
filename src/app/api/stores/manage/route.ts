import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreLifecycleManager } from '@/lib/services/store-lifecycle-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🏪 STORE MANAGEMENT API
 * ======================
 * 
 * Comprehensive endpoint for all store lifecycle operations:
 * - DELETE: Hard delete store + cleanup vectors
 * - PUT: Deactivate/Reactivate store
 * - GET: Get store status and health
 */

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID is required' 
      }, { status: 400 });
    }

    // Verify user session and store ownership
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', session.user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store not found or access denied' 
      }, { status: 404 });
    }

    console.log(`[STORE-MANAGE] Deleting store: ${storeId} for user: ${session.user.id}`);

    // Use StoreLifecycleManager for complete deletion
    const deleteResult = await StoreLifecycleManager.deleteStore(storeId);
    
    if (!deleteResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: deleteResult.error 
      }, { status: 500 });
    }

    console.log(`[STORE-MANAGE] ✅ Store deleted successfully: ${storeId}`);

    return NextResponse.json({
      success: true,
      storeId,
      operations: deleteResult.operations,
      message: 'Store deleted successfully'
    });

  } catch (error) {
    console.error('[STORE-MANAGE] ❌ Delete operation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Store deletion failed'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, action } = body;
    
    if (!storeId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID and action are required' 
      }, { status: 400 });
    }

    if (!['deactivate', 'reactivate'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use "deactivate" or "reactivate"' 
      }, { status: 400 });
    }

    // Verify user session and store ownership
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', session.user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store not found or access denied' 
      }, { status: 404 });
    }

    console.log(`[STORE-MANAGE] ${action} store: ${storeId} for user: ${session.user.id}`);

    // Use StoreLifecycleManager for activation/deactivation
    const result = action === 'deactivate' 
      ? await StoreLifecycleManager.deactivateStore(storeId)
      : await StoreLifecycleManager.reactivateStore(storeId);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }

    console.log(`[STORE-MANAGE] ✅ Store ${action} successful: ${storeId}`);

    return NextResponse.json({
      success: true,
      storeId,
      action,
      operations: result.operations,
      backgroundJobId: result.backgroundJobId,
      message: `Store ${action} successful`
    });

  } catch (error) {
    console.error('[STORE-MANAGE] ❌ Update operation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Store update failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID is required' 
      }, { status: 400 });
    }

    // Verify user session and store ownership
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', session.user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store not found or access denied' 
      }, { status: 404 });
    }

    console.log(`[STORE-MANAGE] Getting status for store: ${storeId}`);

    // Use StoreLifecycleManager to get store status
    const statusResult = await StoreLifecycleManager.getStoreStatus(storeId);
    
    if (!statusResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: statusResult.error 
      }, { status: 500 });
    }

    console.log(`[STORE-MANAGE] ✅ Store status retrieved: ${storeId}`);

    return NextResponse.json({
      success: true,
      storeId,
      status: statusResult.status,
      hasVectorData: statusResult.hasVectorData,
      lastSync: statusResult.lastSync,
      store: statusResult.store,
      message: 'Store status retrieved successfully'
    });

  } catch (error) {
    console.error('[STORE-MANAGE] ❌ Get status operation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get store status'
    }, { status: 500 });
  }
} 