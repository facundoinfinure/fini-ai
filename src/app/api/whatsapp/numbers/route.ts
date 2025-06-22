import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get WhatsApp configuration for the current user
export async function GET(_request: NextRequest) {
  try {
    console.log('[INFO] Fetching WhatsApp numbers');
    
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
    console.log('[INFO] Fetching WhatsApp numbers for user:', userId);

    // Get user's WhatsApp configurations
    const { data: configs, error: configsError } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (configsError) {
      console.error('[ERROR] Failed to fetch WhatsApp configs:', configsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch WhatsApp configurations'
      }, { status: 500 });
    }

    console.log('[INFO] Found WhatsApp configs:', configs?.length || 0);

    // A user should only have one config. Return the first one found, or null.
    const config = configs && configs.length > 0 ? configs[0] : null;

    return NextResponse.json({
      success: true,
      data: { config }
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch WhatsApp numbers:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST - Add a new WhatsApp number to the user's configuration
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Adding new WhatsApp number to configuration');
    
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
    const { phoneNumber, webhookUrl } = await request.json();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!phoneNumber) {
        return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }
    
    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: 'Phone number, Account SID, and Auth Token are required'
      }, { status: 400 });
    }

    // Check for an existing configuration for this user
    const { data: existingConfig, error: fetchError } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError) {
        console.error('[ERROR] Failed to fetch existing WhatsApp config:', fetchError);
        return NextResponse.json({ success: false, error: 'Failed to check for existing configuration' }, { status: 500 });
    }

    if (existingConfig) {
        // Config exists, update it by adding the new phone number
        const updatedNumbers = [...existingConfig.phone_numbers, phoneNumber];
        
        const { data: updatedConfig, error: updateError } = await supabase
            .from('whatsapp_configs')
            .update({ phone_numbers: updatedNumbers })
            .eq('id', existingConfig.id)
            .select()
            .single();

        if (updateError) {
            console.error('[ERROR] Failed to update WhatsApp config:', updateError);
            return NextResponse.json({ success: false, error: 'Failed to update WhatsApp configuration' }, { status: 500 });
        }

        console.log('[INFO] WhatsApp configuration updated successfully:', updatedConfig.id);
        return NextResponse.json({ success: true, data: updatedConfig });

    } else {
        // No config exists, create a new one
        const { data: newConfig, error: createError } = await supabase
            .from('whatsapp_configs')
            .insert({
                user_id: userId,
                phone_numbers: [phoneNumber],
                twilio_account_sid: accountSid,
                twilio_auth_token: authToken,
                webhook_url: webhookUrl || '/api/whatsapp/webhook', // Default webhook
                is_active: true,
                is_configured: false, // Mark as not fully configured until tested
            })
            .select()
            .single();

        if (createError) {
            console.error('[ERROR] Failed to create WhatsApp config:', createError);
            return NextResponse.json({ success: false, error: 'Failed to create WhatsApp configuration' }, { status: 500 });
        }

        console.log('[INFO] WhatsApp configuration created successfully:', newConfig.id);
        return NextResponse.json({ success: true, data: newConfig });
    }

  } catch (error) {
    console.error('[ERROR] Failed to create/update WhatsApp configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 