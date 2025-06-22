import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';

// PUT - Update a store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Updating store:', params.id);
    
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

    const _userId = session.user.id;

    // Parse request body
    const updates = await request.json();

    // Validate required fields
    if (!updates.store_name && !updates.store_url && !updates.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 });
    }

    // Update store
    const storeResult = await StoreService.updateStore(params.id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    if (!storeResult.success) {
      console.error('[ERROR] Failed to update store:', storeResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update store',
        details: storeResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Store updated successfully:', params.id);

    return NextResponse.json({
      success: true,
      data: {
        store: storeResult.store
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to update store:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete a store (soft delete by setting is_active to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Deleting store:', params.id);
    
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

    const _userId = session.user.id;

    // Soft delete store by setting is_active to false
    const storeResult = await StoreService.updateStore(params.id, {
      is_active: false,
      updated_at: new Date().toISOString()
    });

    if (!storeResult.success) {
      console.error('[ERROR] Failed to delete store:', storeResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete store',
        details: storeResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Store deleted successfully:', params.id);

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully'
    });

  } catch (error) {
    console.error('[ERROR] Failed to delete store:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 