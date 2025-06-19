/**
 * API para configurar números de WhatsApp del usuario
 * POST /api/whatsapp/configure
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/config';

interface _WhatsAppConfiguration {
  phoneNumbers: string[];
  webhookUrl: string;
  storeId: string;
}

export async function POST(request: NextRequest) {
  try {
    const _session = await getServerSession(authOptions);
    
    if (!_session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const _body = await request.json();
    const { phoneNumbers, webhookUrl } = _body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Phone numbers are required' },
        { status: 400 }
      );
    }

    // In production, this would configure WhatsApp with your provider (Twilio, etc.)
    console.log('[INFO] Configuring WhatsApp with:', { phoneNumbers, webhookUrl });

    // Mock successful configuration
    const _configuredWhatsApp = {
      phoneNumbers,
      webhookUrl: webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`,
      active: true,
      configured: true,
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Placeholder QR
      whatsappUrl: `https://wa.me/${phoneNumbers[0].replace('+', '')}?text=Hola%20Fini%20AI!`
    };

    return NextResponse.json({
      success: true,
      data: _configuredWhatsApp
    });

  } catch (error) {
    console.error('[ERROR] WhatsApp configure POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const _session = await getServerSession(authOptions);
    
    if (!_session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock data for now - in production this would come from your WhatsApp provider
    const _mockWhatsAppConfig = {
      phoneNumbers: ['+5491112345678'],
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`,
      active: true,
      configured: true,
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Placeholder QR
      whatsappUrl: 'https://wa.me/5491112345678?text=Hola%20Fini%20AI!'
    };

    return NextResponse.json({
      success: true,
      data: _mockWhatsAppConfig
    });

  } catch (error) {
    console.error('[ERROR] WhatsApp configure GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 