/**
 * API para configurar números de WhatsApp del usuario
 * POST /api/whatsapp/configure
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

interface WhatsAppConfiguration {
  phoneNumbers: string[];
  webhookUrl: string;
  storeId: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[WHATSAPP-CONFIGURE] Processing WhatsApp configuration');
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumbers, webhookUrl, storeId }: WhatsAppConfiguration = body;

    // Validate input
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one phone number is required'
      }, { status: 400 });
    }

    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        error: 'Webhook URL is required'
      }, { status: 400 });
    }

    // Format phone numbers
    const formattedNumbers = phoneNumbers.map(phone => {
      // Remove spaces and special characters
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      // Ensure it starts with +
      return cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;
    });

    // Validate phone numbers format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const invalidNumbers = formattedNumbers.filter(phone => !phoneRegex.test(phone));
    
    if (invalidNumbers.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Invalid phone numbers: ${invalidNumbers.join(', ')}`,
        details: 'Phone numbers must be in international format (+1234567890)'
      }, { status: 400 });
    }

    // TODO: Save to database
    // For now, we'll simulate saving to database
    const configuration = {
      userId: session.user.id,
      phoneNumbers: formattedNumbers,
      webhookUrl,
      storeId,
      createdAt: new Date().toISOString(),
      active: true
    };

    console.log('[WHATSAPP-CONFIGURE] Configuration saved:', {
      userId: session.user.id,
      phoneCount: formattedNumbers.length,
      webhookUrl,
      storeId
    });

    // Send welcome message to each phone number
    const welcomeMessages = [];
    for (const phoneNumber of formattedNumbers) {
      try {
        const welcomeResponse = await fetch(`${request.nextUrl.origin}/api/whatsapp/send-welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phoneNumber,
            storeId,
            userId: session.user.id
          })
        });

        if (welcomeResponse.ok) {
          welcomeMessages.push({
            phoneNumber,
            status: 'sent',
            message: 'Welcome message sent successfully'
          });
        } else {
          welcomeMessages.push({
            phoneNumber,
            status: 'failed',
            message: 'Failed to send welcome message'
          });
        }
      } catch (error) {
        console.error(`[WHATSAPP-CONFIGURE] Error sending welcome to ${phoneNumber}:`, error);
        welcomeMessages.push({
          phoneNumber,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        configuration,
        welcomeMessages,
        instructions: {
          whatsapp_number: process.env.TWILIO_WHATSAPP_NUMBER || '+14065002249',
          sample_message: 'Hola Fini, ¿cuáles fueron mis ventas ayer?',
          available_commands: [
            'Analytics: "¿Cuáles fueron mis ventas ayer?"',
            'Marketing: "Dame ideas para promocionar mis productos"',
            'Customer Service: "Ayúdame con atención al cliente"',
            'Help: "¿Qué puedes hacer?"'
          ]
        }
      },
      message: 'WhatsApp configuration completed successfully'
    });

  } catch (error) {
    console.error('[WHATSAPP-CONFIGURE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to configure WhatsApp',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    // TODO: Get configuration from database
    // For now, return mock configuration
    const configuration = {
      userId: session.user.id,
      phoneNumbers: ['+5491123456789'], // Mock data
      webhookUrl: 'https://legal-towns-grab.loca.lt/api/whatsapp/webhook',
      storeId: 'demo_store',
      active: true,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: configuration,
      instructions: {
        whatsapp_number: process.env.TWILIO_WHATSAPP_NUMBER || '+14065002249',
        webhook_url: configuration.webhookUrl,
        configured_numbers: configuration.phoneNumbers
      }
    });

  } catch (error) {
    console.error('[WHATSAPP-CONFIGURE] Error getting configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get WhatsApp configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 