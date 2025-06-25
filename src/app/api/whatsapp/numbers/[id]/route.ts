import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// PUT - Update WhatsApp configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Updating WhatsApp configuration:', params.id);
    
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
    const configId = params.id;

    // Parse request body
    const { phone_numbers, is_active } = await request.json();

    // Validate phone numbers if provided
    if (!phone_numbers || !Array.isArray(phone_numbers)) {
      return NextResponse.json({
        success: false,
        error: 'An array of phone numbers is required'
      }, { status: 400 });
    }

    // Update WhatsApp configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('whatsapp_configs')
      .update({
        phone_numbers,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', configId)
      .select()
      .single();

    if (configError) {
      console.error('[ERROR] Failed to update WhatsApp config:', configError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update WhatsApp configuration'
      }, { status: 500 });
    }

    console.log('[INFO] WhatsApp config updated successfully');

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('[ERROR] Failed to update WhatsApp config:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE - Remove a WhatsApp number completely
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Deleting WhatsApp number:', params.id);
    
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
    const numberId = params.id;

    // First, deactivate any connections to stores
    const { error: connectionsError } = await supabase
      .from('whatsapp_store_connections')
      .update({ is_active: false })
      .eq('whatsapp_number_id', numberId);

    if (connectionsError) {
      console.warn('[WARNING] Failed to deactivate store connections:', connectionsError);
    }

    // Delete the WhatsApp number
    const { error: deleteError } = await supabase
      .from('whatsapp_numbers')
      .delete()
      .eq('id', numberId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[ERROR] Failed to delete WhatsApp number:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete WhatsApp number'
      }, { status: 500 });
    }

    console.log('[INFO] WhatsApp number deleted successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'WhatsApp number deleted successfully' 
    });

  } catch (error) {
    console.error('[ERROR] Failed to delete WhatsApp number:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Fetching WhatsApp configuration');
    
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
    const configId = params.id;

    console.log('[INFO] Fetching WhatsApp config:', configId);

    // Get WhatsApp configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('whatsapp_configs')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError) {
      console.error('[ERROR] Failed to fetch WhatsApp config:', configError);
      return NextResponse.json({
        success: false,
        error: 'WhatsApp configuration not found'
      }, { status: 404 });
    }

    console.log('[INFO] WhatsApp config found successfully');

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch WhatsApp config:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PATCH - Update specific fields of a WhatsApp number (like status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Updating WhatsApp number status:', params.id);
    
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
    const numberId = params.id;

    // Parse request body
    const updateData = await request.json();
    console.log('[INFO] Update data:', updateData);

    // Update WhatsApp number
    const { data: updatedNumber, error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update(updateData)
      .eq('id', numberId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[ERROR] Failed to update WhatsApp number:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update WhatsApp number'
      }, { status: 500 });
    }

    console.log('[INFO] WhatsApp number updated successfully');

    return NextResponse.json({
      success: true,
      data: updatedNumber
    });

  } catch (error) {
    console.error('[ERROR] Failed to update WhatsApp number:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 