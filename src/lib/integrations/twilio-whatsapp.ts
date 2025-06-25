/**
 * Twilio WhatsApp Integration
 * Real integration with Twilio WhatsApp Business API
 */

import twilio from 'twilio';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl: string;
}

export interface WhatsAppMessage {
  to: string;
  from: string;
  body: string;
  mediaUrl?: string;
}

export interface WhatsAppWebhook {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  MediaUrl0?: string;
  NumMedia?: string;
  Timestamp: string;
}

export class TwilioWhatsAppService {
  private client: twilio.Twilio;
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      console.warn('[TWILIO] Sending message to:', message.to);

      const _twilioMessage = await this.client.messages.create({
        body: message.body,
        from: `whatsapp:${this.config.phoneNumber}`,
        to: `whatsapp:${message.to}`,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] })
      });

      console.warn('[TWILIO] Message sent successfully:', _twilioMessage.sid);

      return {
        success: true,
        messageSid: _twilioMessage.sid
      };
    } catch (error) {
      console.warn('[ERROR] Twilio send message failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send welcome message to activate Fini AI
   */
  async sendWelcomeMessage(phoneNumber: string, storeName?: string): Promise<{ success: boolean; error?: string }> {
    const _welcomeMessage = `¡Hola Soy Fini AI, tu asistente de IA para ${storeName || 'tu tienda'}.

🤖 Puedo ayudarte con:
• 📊 Analytics y ventas
• 🛍️ Información de productos
• 👥 Atención al cliente
• 📈 Ideas de marketing

Escribe "hola" para comenzar o "ayuda" para ver todas mis funciones.

¡Estoy aquí para ayudarte a hacer crecer tu negocio 🚀`;

    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: _welcomeMessage
    });
  }

  /**
   * Send analytics response
   */
  async sendAnalyticsResponse(phoneNumber: string, analyticsData: unknown): Promise<{ success: boolean; error?: string }> {
    let _message = '';
    if (
      analyticsData &&
      typeof analyticsData === 'object' &&
      'totalSales' in analyticsData &&
      'totalOrders' in analyticsData &&
      'newCustomers' in analyticsData &&
      'topProduct' in analyticsData
    ) {
      const data = analyticsData as {
        totalSales: number;
        totalOrders: number;
        newCustomers: number;
        topProduct: string;
      };
      _message = `📊 *Analytics de tu tienda*

💰 Ventas: $${data.totalSales}
📦 Pedidos: ${data.totalOrders}
👥 Clientes nuevos: ${data.newCustomers}
🔥 Producto top: ${data.topProduct}

¿Te gustaría ver más detalles o comparar con otros períodos?`;
    } else {
      _message = 'No se pudo obtener analytics de la tienda.';
    }
    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: _message
    });
  }

  /**
   * Send marketing suggestions
   */
  async sendMarketingSuggestions(phoneNumber: string, suggestions: string[]): Promise<{ success: boolean; error?: string }> {
    const _message = `🎯 *Ideas de Marketing*

${suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}

¿Cuál te interesa implementar? Puedo ayudarte a crear una campaña específica.`;

    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: _message
    });
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(_body: string, _signature: string, _url: string): boolean {
    try {
      // For now, we'll skip signature validation in development
      // In production, you should implement proper signature validation
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
      // TODO: Implement proper signature validation for production
      console.warn('[WARNING] Webhook signature validation not implemented');
      return true;
    } catch (error) {
      console.warn('[ERROR] Webhook signature validation failed:', error);
      return false;
    }
  }

  /**
   * Parse incoming webhook
   */
  parseWebhook(body: unknown): WhatsAppWebhook {
    if (
      body &&
      typeof body === 'object' &&
      'MessageSid' in body &&
      'From' in body &&
      'To' in body &&
      'Body' in body &&
      'Timestamp' in body
    ) {
      const b = body as Record<string, any>;
      return {
        MessageSid: b.MessageSid,
        From: b.From.replace('whatsapp:', ''),
        To: b.To.replace('whatsapp:', ''),
        Body: b.Body,
        MediaUrl0: b.MediaUrl0,
        NumMedia: b.NumMedia,
        Timestamp: b.Timestamp
      };
    }
    throw new Error('Invalid webhook body');
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string): Promise<{ status: string; error?: string }> {
    try {
      const _message = await this.client.messages(messageSid).fetch();
      return { status: _message.status };
    } catch (error) {
      console.warn('[ERROR] Get message status failed:', error);
      return { 
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send OTP verification code to WhatsApp number
   */
  async sendOTPCode(phoneNumber: string, otpCode: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    const otpMessage = `🔐 *Código de Verificación Fini AI*

Tu código de verificación es: *${otpCode}*

Por favor, ingresa este código en la aplicación para completar la configuración de tu número de WhatsApp.

Este código expira en 10 minutos.

⚠️ No compartas este código con nadie.`;

    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: otpMessage
    });
  }

  /**
   * Send verification success and welcome message
   */
  async sendVerificationSuccessMessage(phoneNumber: string, displayName: string, storeName?: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    const successMessage = `✅ *¡Verificación Exitosa!*

¡Hola ${displayName}! Tu número de WhatsApp ha sido verificado correctamente.

🎉 *¡Bienvenido a Fini AI!*

Soy tu asistente de IA especializado en ${storeName || 'tu tienda'}. 

🤖 *¿Qué puedo hacer por ti?*
• 📊 Analytics en tiempo real
• 🛍️ Información de productos
• 👥 Atención al cliente 24/7
• 📈 Ideas de marketing personalizadas
• 💡 Insights de ventas

*Comandos principales:*
• Escribe "analytics" para ver tus métricas
• Escribe "productos" para gestionar inventario
• Escribe "marketing" para ideas de promoción
• Escribe "ayuda" para ver todos los comandos

¡Estoy aquí para ayudarte a hacer crecer tu negocio! 🚀

_Puedes escribirme en cualquier momento._`;

    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: successMessage
    });
  }
}

/**
 * Create Twilio WhatsApp service instance
 */
export function createTwilioWhatsAppService(): TwilioWhatsAppService {
  const config: TwilioConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
  };

  return new TwilioWhatsAppService(config);
} 