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

    const userId = session.user.id;

    // Parse request body
    const updates = await request.json();

    // Validate phone numbers if provided
    if (updates.phone_numbers && Array.isArray(updates.phone_numbers)) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const invalidNumbers = updates.phone_numbers.filter(num => !phoneRegex.test(num.replace(/\s+/g, '').replace(/[()-]/g, '')));
      
      if (invalidNumbers.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid phone number format',
          details: `Invalid numbers: ${invalidNumbers.join(', ')}`
        }, { status: 400 });
      }
    }

    // Update WhatsApp config
    const configResult = await WhatsAppConfigService.updateConfig(params.id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    if (!configResult.success) {
      console.error('[ERROR] Failed to update WhatsApp config:', configResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update WhatsApp configuration',
        details: configResult.error
      }, { status: 500 });
    }

    console.log('[INFO] WhatsApp configuration updated successfully:', params.id);

    return NextResponse.json({
      success: true,
      data: {
        config: configResult.config
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to update WhatsApp configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Remove specific phone numbers from WhatsApp configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[INFO] Removing phone numbers from WhatsApp config:', params.id);
    
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

    // Parse request body to get numbers to remove
    const { phoneNumbers } = await request.json();

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return NextResponse.json({
        success: false,
        error: 'Phone numbers array is required'
      }, { status: 400 });
    }

    // Get current config
    const currentConfig = await WhatsAppConfigService.getConfigByUserId(userId);
    
    if (!currentConfig.success || !currentConfig.config) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp configuration not found'
      }, { status: 404 });
    }

    // Remove specified numbers
    const updatedNumbers = currentConfig.config.phone_numbers.filter(
      num => !phoneNumbers.includes(num)
    );

    // If no numbers left, deactivate the config
    const updates: any = {
      phone_numbers: updatedNumbers,
      updated_at: new Date().toISOString()
    };

    if (updatedNumbers.length === 0) {
      updates.is_active = false;
      updates.is_configured = false;
    }

    // Update config
    const configResult = await WhatsAppConfigService.updateConfig(params.id, updates);

    if (!configResult.success) {
      console.error('[ERROR] Failed to remove phone numbers:', configResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to remove phone numbers',
        details: configResult.error
      }, { status: 500 });
    }

    console.log('[INFO] Phone numbers removed successfully:', params.id);

    return NextResponse.json({
      success: true,
      data: {
        config: configResult.config,
        removedNumbers: phoneNumbers
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to remove phone numbers:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 