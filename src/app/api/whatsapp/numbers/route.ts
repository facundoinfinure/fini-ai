import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WhatsAppConfigService } from '@/lib/database/client';

// GET - Get WhatsApp configuration for the current user
export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Getting WhatsApp configuration');
    
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

    // Get WhatsApp config for user
    const configResult = await WhatsAppConfigService.getConfigByUserId(userId);
    
    if (!configResult.success && configResult.error !== 'No rows found') {
      console.error('[ERROR] Failed to get WhatsApp config:', configResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get WhatsApp configuration',
        details: configResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Retrieved WhatsApp config for user');

    return NextResponse.json({
      success: true,
      data: {
        config: configResult.config || null
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to get WhatsApp configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Add new WhatsApp numbers
export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Adding WhatsApp numbers');
    
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

    // Parse request body
    const { phoneNumbers, storeId } = await request.json();

    // Validate required fields
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Phone numbers array is required and cannot be empty'
      }, { status: 400 });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const invalidNumbers = phoneNumbers.filter(num => !phoneRegex.test(num.replace(/\s+/g, '').replace(/[()-]/g, '')));
    
    if (invalidNumbers.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone number format',
        details: `Invalid numbers: ${invalidNumbers.join(', ')}`
      }, { status: 400 });
    }

    // Check if user already has a WhatsApp config
    const existingConfig = await WhatsAppConfigService.getConfigByUserId(userId);
    
    if (existingConfig.success && existingConfig.config) {
      // Update existing config with new numbers
      const updatedNumbers = [...(existingConfig.config.phone_numbers || []), ...phoneNumbers];
      
      const updateResult = await WhatsAppConfigService.updateConfig(existingConfig.config.id, {
        phone_numbers: updatedNumbers,
        updated_at: new Date().toISOString()
      });

      if (!updateResult.success) {
        console.error('[ERROR] Failed to update WhatsApp config:', updateResult.error);
        return NextResponse.json({
          success: false,
          error: 'Failed to update WhatsApp configuration',
          details: updateResult.error
        }, { status: 500 });
      }

      console.log('[INFO] WhatsApp numbers added to existing config');

      return NextResponse.json({
        success: true,
        data: {
          config: updateResult.config
        }
      });
    } else {
      // Create new config
      const configResult = await WhatsAppConfigService.createConfig({
        user_id: userId,
        store_id: storeId,
        phone_numbers: phoneNumbers,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`,
        twilio_account_sid: process.env.TWILIO_ACCOUNT_SID || null,
        twilio_auth_token: process.env.TWILIO_AUTH_TOKEN || null,
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || null,
        is_active: true,
        is_configured: true
      });

      if (!configResult.success) {
        console.error('[ERROR] Failed to create WhatsApp config:', configResult.error);
        return NextResponse.json({
          success: false,
          error: 'Failed to create WhatsApp configuration',
          details: configResult.error
        }, { status: 500 });
      }

      console.log('[INFO] WhatsApp config created successfully');

      return NextResponse.json({
        success: true,
        data: {
          config: configResult.config
        }
      });
    }

  } catch (error) {
    console.error('[ERROR] Failed to add WhatsApp numbers:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 