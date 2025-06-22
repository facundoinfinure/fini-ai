import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WhatsAppConfigService } from '@/lib/database/client';

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
    const { phoneNumber, accountSid, authToken, webhookUrl, is_active } = await request.json();

    // Validate phone numbers if provided
    if (phoneNumber && !phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone number format'
      }, { status: 400 });
    }

    // Update WhatsApp configuration
    const { data: config, error: configError } = await supabase
      .from('whatsapp_configs')
      .update({
        phone_number: phoneNumber,
        account_sid: accountSid,
        auth_token: authToken,
        webhook_url: webhookUrl,
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

// DELETE - Remove specific phone numbers from WhatsApp configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Deleting WhatsApp configuration');
    
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

    console.log('[INFO] Deleting WhatsApp config:', configId);

    // Delete WhatsApp configuration
    const { error: deleteError } = await supabase
      .from('whatsapp_configs')
      .delete()
      .eq('id', configId);

    if (deleteError) {
      console.error('[ERROR] Failed to delete WhatsApp config:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete WhatsApp configuration'
      }, { status: 500 });
    }

    console.log('[INFO] WhatsApp config deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'WhatsApp configuration deleted successfully'
    });

  } catch (error) {
    console.error('[ERROR] Failed to delete WhatsApp config:', error);
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
    const { data: config, error: configError } = await supabase
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