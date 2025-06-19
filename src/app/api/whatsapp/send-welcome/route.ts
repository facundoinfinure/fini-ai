/**
 * API para enviar mensaje de bienvenida por WhatsApp
 * POST /api/whatsapp/send-welcome
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwilioWhatsAppService } from '@/lib/integrations/twilio';

interface WelcomeMessageRequest {
  to: string;
  storeId: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[WHATSAPP-WELCOME] Processing welcome message request');
    
    const body = await request.json();
    const { to, storeId, userId }: WelcomeMessageRequest = body;

    // Validate input
    if (!to) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }

    // Format phone number
    const formattedTo = to.startsWith('+') ? to : '+' + to;

    // Create welcome message
    const welcomeMessage = `¡Hola! 👋 

¡Bienvenido a Fini AI! 🤖 

Tu asistente de IA para tu tienda está listo. Puedo ayudarte con:

📊 **Analytics**: "¿Cuáles fueron mis ventas ayer?"
🚀 **Marketing**: "Dame ideas para promocionar mis productos"  
💬 **Atención**: "Ayúdame con atención al cliente"
❓ **Ayuda**: "¿Qué puedes hacer?"

Solo envíame un mensaje y empezaré a ayudarte con tu tienda.

¡Prueba ahora preguntándome por tus ventas! 📈`;

    // Initialize WhatsApp service
    const whatsappService = new TwilioWhatsAppService();

    try {
      // Send welcome message
      const result = await whatsappService.sendMessage(formattedTo, welcomeMessage);

      if (result.success) {
        console.log('[WHATSAPP-WELCOME] Welcome message sent successfully:', {
          to: formattedTo,
          messageId: result.messageId,
          storeId,
          userId
        });

        return NextResponse.json({
          success: true,
          data: {
            messageId: result.messageId,
            to: formattedTo,
            storeId,
            sentAt: new Date().toISOString(),
            message: 'Welcome message sent successfully'
          }
        });
      } else {
        console.error('[WHATSAPP-WELCOME] Failed to send welcome message:', result.error);
        
        return NextResponse.json({
          success: false,
          error: 'Failed to send welcome message',
          details: result.error
        }, { status: 500 });
      }

    } catch (twilioError) {
      console.error('[WHATSAPP-WELCOME] Twilio error:', twilioError);
      
      // Check if it's a development environment
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // In development, simulate successful sending
        console.log('[WHATSAPP-WELCOME] Development mode: simulating welcome message');
        
        return NextResponse.json({
          success: true,
          data: {
            messageId: 'DEV_WELCOME_' + Date.now(),
            to: formattedTo,
            storeId,
            sentAt: new Date().toISOString(),
            message: 'Welcome message simulated (development mode)',
            development: true
          }
        });
      } else {
        throw twilioError;
      }
    }

  } catch (error) {
    console.error('[WHATSAPP-WELCOME] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send welcome message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp Welcome Message API',
    usage: {
      method: 'POST',
      endpoint: '/api/whatsapp/send-welcome',
      body: {
        to: 'Phone number in international format (+1234567890)',
        storeId: 'Store identifier',
        userId: 'User identifier (optional)'
      }
    },
    welcome_message_template: {
      greeting: '¡Hola! 👋',
      introduction: '¡Bienvenido a Fini AI! 🤖',
      capabilities: [
        'Analytics: Datos de ventas y métricas',
        'Marketing: Ideas y estrategias de promoción',
        'Customer Service: Soporte y atención al cliente',
        'Help: Información sobre comandos disponibles'
      ],
      sample_commands: [
        '¿Cuáles fueron mis ventas ayer?',
        'Dame ideas para promocionar mis productos',
        'Ayúdame con atención al cliente',
        '¿Qué puedes hacer?'
      ]
    }
  });
} 