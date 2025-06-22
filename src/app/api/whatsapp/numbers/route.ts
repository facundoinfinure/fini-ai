import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WhatsAppConfigService } from '@/lib/database/client';

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

    return NextResponse.json({
      success: true,
      data: configs || []
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch WhatsApp numbers:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST - Add new WhatsApp numbers
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Creating WhatsApp configuration');
    
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
    const { phoneNumber, accountSid, authToken, webhookUrl } = await request.json();

    if (!phoneNumber || !accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: 'Phone number, Account SID, and Auth Token are required'
      }, { status: 400 });
    }

    // Create WhatsApp configuration
    const { data: config, error: configError } = await supabase
      .from('whatsapp_configs')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        account_sid: accountSid,
        auth_token: authToken,
        webhook_url: webhookUrl || '',
        is_active: true
      })
      .select()
      .single();

    if (configError) {
      console.error('[ERROR] Failed to create WhatsApp config:', configError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create WhatsApp configuration'
      }, { status: 500 });
    }

    console.log('[INFO] WhatsApp configuration created successfully:', config.id);

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('[ERROR] Failed to create WhatsApp configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 