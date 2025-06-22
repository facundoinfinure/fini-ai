import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';

// GET - Get all stores for the current user
export async function GET(_request: NextRequest) {
  try {
    console.log('[INFO] Fetching user stores');
    
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
    console.log('[INFO] Fetching stores for user:', userId);

    // Get user's stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (storesError) {
      console.error('[ERROR] Failed to fetch stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores'
      }, { status: 500 });
    }

    console.log('[INFO] Found stores:', stores?.length || 0);

    return NextResponse.json({
      success: true,
      data: stores || []
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch stores:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST - Create a new store
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Creating new store');
    
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
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Store name is required'
      }, { status: 400 });
    }

    // Create new store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        name,
        description: description || '',
        user_id: userId,
        is_active: true
      })
      .select()
      .single();

    if (storeError) {
      console.error('[ERROR] Failed to create store:', storeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create store'
      }, { status: 500 });
    }

    console.log('[INFO] Store created successfully:', store.id);

    return NextResponse.json({
      success: true,
      data: store
    });

  } catch (error) {
    console.error('[ERROR] Failed to create store:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 