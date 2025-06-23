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

// DELETE - Remove specific phone numbers from WhatsApp configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Deleting number from WhatsApp configuration');
    
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
    const configId = params.id;
    const { phoneNumbers: numbersToDelete } = await request.json();

    if (!numbersToDelete || !Array.isArray(numbersToDelete) || numbersToDelete.length === 0) {
        return NextResponse.json({ success: false, error: 'Phone numbers to delete are required' }, { status: 400 });
    }

    // Get the current config
    const { data: currentConfig, error: fetchError } = await supabaseAdmin
        .from('whatsapp_configs')
        .select('phone_numbers')
        .eq('id', configId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !currentConfig) {
        console.error('[ERROR] Failed to fetch WhatsApp config for deletion:', fetchError);
        return NextResponse.json({ success: false, error: 'Configuration not found' }, { status: 404 });
    }

    const updatedNumbers = currentConfig.phone_numbers.filter(num => !numbersToDelete.includes(num));

    // Update the numbers list, even if it becomes empty
    const { error: updateError } = await supabaseAdmin
        .from('whatsapp_configs')
        .update({ phone_numbers: updatedNumbers })
        .eq('id', configId);

    if (updateError) {
        console.error('[ERROR] Failed to update phone numbers in WhatsApp config:', updateError);
        return NextResponse.json({ success: false, error: 'Failed to update configuration' }, { status: 500 });
    }

    if (updatedNumbers.length === 0) {
        console.log('[INFO] Last phone number removed, config kept for future use');
    }

    console.log('[INFO] Phone numbers deleted successfully from config');
    return NextResponse.json({ success: true, message: 'Phone numbers removed successfully' });

  } catch (error) {
    console.error('[ERROR] Failed to delete from WhatsApp config:', error);
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