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
      console.log('[TWILIO] Sending message to:', message.to);

      const twilioMessage = await this.client.messages.create({
        body: message.body,
        from: `whatsapp:${this.config.phoneNumber}`,
        to: `whatsapp:${message.to}`,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] })
      });

      console.log('[TWILIO] Message sent successfully:', twilioMessage.sid);

      return {
        success: true,
        messageSid: twilioMessage.sid
      };
    } catch (error) {
      console.error('[ERROR] Twilio send message failed:', error);
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
    const welcomeMessage = `¡Hola! Soy Fini AI, tu asistente de IA para ${storeName || 'tu tienda'}.

🤖 Puedo ayudarte con:
• 📊 Analytics y ventas
• 🛍️ Información de productos
• 👥 Atención al cliente
• 📈 Ideas de marketing

Escribe "hola" para comenzar o "ayuda" para ver todas mis funciones.

¡Estoy aquí para ayudarte a hacer crecer tu negocio! 🚀`;

    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: welcomeMessage
    });
  }

  /**
   * Send analytics response
   */
  async sendAnalyticsResponse(phoneNumber: string, analyticsData: any): Promise<{ success: boolean; error?: string }> {
    const message = `📊 *Analytics de tu tienda*

💰 Ventas: $${analyticsData.totalSales}
📦 Pedidos: ${analyticsData.totalOrders}
👥 Clientes nuevos: ${analyticsData.newCustomers}
🔥 Producto top: ${analyticsData.topProduct}

¿Te gustaría ver más detalles o comparar con otros períodos?`;

    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: message
    });
  }

  /**
   * Send marketing suggestions
   */
  async sendMarketingSuggestions(phoneNumber: string, suggestions: string[]): Promise<{ success: boolean; error?: string }> {
    const message = `🎯 *Ideas de Marketing*

${suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}

¿Cuál te interesa implementar? Puedo ayudarte a crear una campaña específica.`;

    return this.sendMessage({
      to: phoneNumber,
      from: this.config.phoneNumber,
      body: message
    });
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(body: string, signature: string, url: string): boolean {
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
      console.error('[ERROR] Webhook signature validation failed:', error);
      return false;
    }
  }

  /**
   * Parse incoming webhook
   */
  parseWebhook(body: any): WhatsAppWebhook {
    return {
      MessageSid: body.MessageSid,
      From: body.From.replace('whatsapp:', ''),
      To: body.To.replace('whatsapp:', ''),
      Body: body.Body,
      MediaUrl0: body.MediaUrl0,
      NumMedia: body.NumMedia,
      Timestamp: body.Timestamp
    };
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string): Promise<{ status: string; error?: string }> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return { status: message.status };
    } catch (error) {
      console.error('[ERROR] Get message status failed:', error);
      return { 
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Create Twilio WhatsApp service instance
 */
export function createTwilioWhatsAppService(): TwilioWhatsAppService {
  const config: TwilioConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
  };

  return new TwilioWhatsAppService(config);
} 