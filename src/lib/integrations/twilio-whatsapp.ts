/**
 * Twilio WhatsApp Integration
 * Enhanced with proper Message Template support for business-initiated messages
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

// WhatsApp Message Templates Configuration
// Updated to use Content Template Builder API with dynamic Content SIDs
export const WHATSAPP_TEMPLATES = {
  // OTP Verification Template - Created via Content Template Builder API
  OTP_VERIFICATION: {
    contentSid: process.env.TWILIO_OTP_CONTENTSID || 'HXc00fd0971da921a1e4ca16cf99903a31',
    friendlyName: 'fini_otp_verification_v3',
    category: 'AUTHENTICATION',
    variables: (otpCode: string) => ({
      1: otpCode,
      2: '10' // Expiry in minutes
    })
  },
  
  // Welcome Message Template - Created via Content Template Builder API
  WELCOME: {
    contentSid: process.env.TWILIO_WELCOME_CONTENTSID || 'HX375350016ecc645927aca568343a747',
    friendlyName: 'fini_welcome_v3',
    category: 'MARKETING',
    variables: (displayName: string, storeName: string) => ({
      1: displayName,
      2: storeName
    })
  },
  
  // General Analytics Template - Created via Content Template Builder API
  ANALYTICS: {
    contentSid: process.env.TWILIO_ANALYTICS_CONTENTSID || 'HX21a8906e743b3fd022adf6683b9ff46c',
    friendlyName: 'fini_analytics_v3',
    category: 'UTILITY',
    variables: (sales: string, orders: string, storeName: string) => ({
      1: sales,
      2: orders, 
      3: storeName
    })
  },
  
  // Marketing Ideas Template - Created via Content Template Builder API
  MARKETING: {
    contentSid: process.env.TWILIO_MARKETING_CONTENTSID || 'HXf914f35a15c4341B0c7c7940d7ef7bfc',
    friendlyName: 'fini_marketing_v3',
    category: 'MARKETING',
    variables: (storeName: string, idea1: string, idea2: string) => ({
      1: storeName,
      2: idea1,
      3: idea2
    })
  },
  
  // Error/Support Template - Created via Content Template Builder API
  ERROR_SUPPORT: {
    contentSid: process.env.TWILIO_ERROR_CONTENTSID || 'HXa5d6a66578456c49a9c00f9ad08c06af',
    friendlyName: 'fini_error_v3',
    category: 'UTILITY',
    variables: (errorType: string) => ({
      1: 'Usuario',
      2: errorType
    })
  },
  
  // Daily Summary Template - New template created via Content Template Builder API
  DAILY_SUMMARY: {
    contentSid: process.env.TWILIO_DAILY_SUMMARY_CONTENTSID || 'HX_NEW_DAILY_SUMMARY',
    friendlyName: 'fini_daily_summary_v3',
    category: 'UTILITY',
    variables: (storeName: string, sales: string, orders: string, topProduct: string) => ({
      1: storeName,
      2: sales,
      3: orders,
      4: topProduct
    })
  }
};

export class TwilioWhatsAppService {
  private client: twilio.Twilio;
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  /**
   * Send a WhatsApp message - Now with smart template/freeform selection
   */
  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      console.warn(`[WHATSAPP] Sending message to ${message.to}`);

      const twilioMessage = await this.client.messages.create({
        body: message.body,
        from: `whatsapp:${message.from}`,
        to: `whatsapp:${message.to}`,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] })
      });

      console.warn(`[WHATSAPP] Message sent successfully: ${twilioMessage.sid}`);

      return {
        success: true,
        messageSid: twilioMessage.sid
      };
    } catch (error) {
      console.error('[ERROR] Twilio send message failed:', error);
      
      // If error 63016 (freeform outside window), attempt template fallback
      if (error instanceof Error && error.message.includes('63016')) {
        console.warn('[WHATSAPP] Freeform failed (63016), attempting template fallback...');
        return await this.sendWithTemplateFallback(message);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Smart message sending with automatic template fallback
   */
  async sendSmartMessage(
    phoneNumber: string, 
    messageContent: string, 
    messageType: 'response' | 'analytics' | 'marketing' | 'error' | 'welcome' = 'response',
    templateData?: Record<string, string>
  ): Promise<{ success: boolean; messageSid?: string; error?: string; usedTemplate?: boolean }> {
    
    // First try freeform message (works within 24h window)
    try {
      const result = await this.sendMessage({
        to: phoneNumber,
        from: this.config.phoneNumber,
        body: messageContent
      });
      
      if (result.success) {
        return { ...result, usedTemplate: false };
      }
    } catch (error) {
      console.warn('[WHATSAPP] Freeform failed, checking for template fallback...');
    }

    // If freeform fails, try template based on message type
    return await this.sendTemplateByType(phoneNumber, messageType, templateData);
  }

  /**
   * Send template message by type
   */
  private async sendTemplateByType(
    phoneNumber: string, 
    messageType: string, 
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageSid?: string; error?: string; usedTemplate?: boolean }> {
    try {
      let templateConfig;
      let variables;

      switch (messageType) {
        case 'otp':
          templateConfig = WHATSAPP_TEMPLATES.OTP_VERIFICATION;
          variables = templateConfig.variables(
            data?.otpCode || '123456'
          );
          break;

        case 'analytics':
          templateConfig = WHATSAPP_TEMPLATES.ANALYTICS;
          variables = templateConfig.variables(
            data?.sales || '$0', 
            data?.orders || '0', 
            data?.storeName || 'tu tienda'
          );
          break;

        case 'marketing':
          templateConfig = WHATSAPP_TEMPLATES.MARKETING;
          variables = templateConfig.variables(
            data?.storeName || 'tu tienda',
            data?.idea1 || 'Promoción especial',
            data?.idea2 || 'Descuento por volumen'
          );
          break;

        case 'error':
          templateConfig = WHATSAPP_TEMPLATES.ERROR_SUPPORT;
          variables = templateConfig.variables(data?.errorType || 'temporal');
          break;

        case 'welcome':
          templateConfig = WHATSAPP_TEMPLATES.WELCOME;
          variables = templateConfig.variables(
            data?.displayName || 'Usuario',
            data?.storeName || 'tu tienda'
          );
          break;

        default:
          // No template available for this type
          return {
            success: false,
            error: 'No template available for message type: ' + messageType,
            usedTemplate: false
          };
      }

      const twilioMessage = await this.client.messages.create({
        from: `whatsapp:${this.config.phoneNumber}`,
        to: `whatsapp:${phoneNumber}`,
        contentSid: templateConfig.contentSid,
        contentVariables: JSON.stringify(variables)
      });

      console.warn(`[WHATSAPP] Template sent successfully: ${twilioMessage.sid}`);
      
      return {
        success: true,
        messageSid: twilioMessage.sid,
        usedTemplate: true
      };

    } catch (error) {
      console.error('[ERROR] Template send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template send failed',
        usedTemplate: true
      };
    }
  }

  /**
   * Fallback when freeform fails with 63016 error
   */
  private async sendWithTemplateFallback(message: WhatsAppMessage): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    // Analyze message content to determine best template
    const content = message.body.toLowerCase();
    
    // Check for welcome-type messages FIRST (more specific)
    if (content.includes('bienvenid') || content.includes('hola') || content.includes('soy fini') || 
        content.includes('asistente') || content.includes('ayudarte') || content.includes('crecer') ||
        content.includes('negocio') || content.includes('🚀') || content.includes('🤖') ||
        content.includes('verificación exitosa') || content.includes('estoy aquí') ||
        content.includes('🎉')) {
      return await this.sendTemplateByType(message.to, 'welcome', {
        displayName: 'Usuario',
        storeName: 'tu tienda'
      });
    }
    
    // Check for OTP/verification messages (after welcome to avoid conflicts)
    if (content.includes('código') || content.includes('🔐') || content.includes('expira') || 
        content.includes('minutos') || content.includes('no lo compartas') ||
        /\*\d{5,6}\*/.test(content) || /\d{5,6}/.test(content)) {
      return await this.sendTemplateByType(message.to, 'otp', {
        otpCode: content.match(/\*(\d{5,6})\*/)?.[1] || content.match(/(\d{5,6})/)?.[1] || '123456',
        expiryMinutes: '10'
      });
    }
    
    if (content.includes('ventas') || content.includes('analytics') || content.includes('$')) {
      return await this.sendTemplateByType(message.to, 'analytics', {
        sales: '$0',
        orders: '0',
        storeName: 'tu tienda'
      });
    }
    
    if (content.includes('marketing') || content.includes('promoción') || content.includes('campaña')) {
      return await this.sendTemplateByType(message.to, 'marketing', {
        storeName: 'tu tienda',
        idea1: 'Promoción especial',
        idea2: 'Descuento por volumen'
      });
    }
    
    if (content.includes('error') || content.includes('problema')) {
      return await this.sendTemplateByType(message.to, 'error', {
        errorType: 'temporal'
      });
    }

    // Default fallback - try welcome template
    return await this.sendTemplateByType(message.to, 'welcome', {
      displayName: 'Usuario',
      storeName: 'tu tienda'
    });
  }

  /**
   * Send welcome message to activate Fini AI
   */
  async sendWelcomeMessage(phoneNumber: string, storeName?: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.sendSmartMessage(
      phoneNumber,
      `¡Hola! Soy Fini AI, tu asistente de IA para ${storeName || 'tu tienda'}.

🤖 Puedo ayudarte con:
• 📊 Analytics y ventas
• 🛍️ Información de productos
• 👥 Atención al cliente
• 📈 Ideas de marketing

Escribe "hola" para comenzar o "ayuda" para ver todas mis funciones.

¡Estoy aquí para ayudarte a hacer crecer tu negocio 🚀`,
      'welcome',
      {
        displayName: 'Usuario',
        storeName: storeName || 'tu tienda'
      }
    );

    return {
      success: result.success,
      error: result.error
    };
  }

  /**
   * Send analytics response
   */
  async sendAnalyticsResponse(phoneNumber: string, analyticsData: unknown): Promise<{ success: boolean; error?: string }> {
    let message = '';
    let templateData = { sales: '$0', orders: '0', storeName: 'tu tienda' };
    
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
      
      message = `📊 *Analytics de tu tienda*

💰 Ventas: $${data.totalSales}
📦 Pedidos: ${data.totalOrders}
👥 Clientes nuevos: ${data.newCustomers}
🔥 Producto top: ${data.topProduct}

¿Te gustaría ver más detalles o comparar con otros períodos?`;

      templateData = {
        sales: `$${data.totalSales}`,
        orders: `${data.totalOrders}`,
        storeName: 'tu tienda'
      };
    } else {
      message = 'No se pudo obtener analytics de la tienda.';
    }
    
    const result = await this.sendSmartMessage(phoneNumber, message, 'analytics', templateData);
    
    return {
      success: result.success,
      error: result.error
    };
  }

  /**
   * Send marketing suggestions
   */
  async sendMarketingSuggestions(phoneNumber: string, suggestions: string[]): Promise<{ success: boolean; error?: string }> {
    const message = `🎯 *Ideas de Marketing*

${suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}

¿Cuál te interesa implementar? Puedo ayudarte a crear una campaña específica.`;

    const result = await this.sendSmartMessage(
      phoneNumber, 
      message, 
      'marketing',
      {
        storeName: 'tu tienda',
        idea1: suggestions[0] || 'Promoción especial',
        idea2: suggestions[1] || 'Descuento por volumen'
      }
    );

    return {
      success: result.success,
      error: result.error
    };
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
   * Send OTP verification code using DIRECT template (resolves error 63016)
   * 🚨 CRITICAL: Must use contentSid, NEVER body (freeform)
   */
  async sendOTPCode(phoneNumber: string, otpCode: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    console.log('🔥 [CRITICAL] sendOTPCode called - MUST use template to avoid 63016');
    console.log(`🔥 [DEBUG] Phone: ${phoneNumber}, OTP: ${otpCode}`);
    
    try {
      // Get template config
      const templateConfig = WHATSAPP_TEMPLATES.OTP_VERIFICATION;
      const variables = templateConfig.variables(otpCode);
      
      console.log(`🎯 [TEMPLATE] Using contentSid: ${templateConfig.contentSid}`);
      console.log(`🎯 [TEMPLATE] Variables: ${JSON.stringify(variables)}`);
      
      // Send DIRECTLY using Twilio client with contentSid (NO body field)
      const twilioMessage = await this.client.messages.create({
        from: `whatsapp:${this.config.phoneNumber}`,
        to: `whatsapp:${phoneNumber}`,
        contentSid: templateConfig.contentSid,
        contentVariables: JSON.stringify(variables)
        // 🚨 CRITICAL: NO 'body' field - this would cause 63016
      });

      console.log('✅ [SUCCESS] OTP template sent directly:', twilioMessage.sid);
      console.log('✅ [SUCCESS] NO ERROR 63016 - Used contentSid directly');
      
      return {
        success: true,
        messageSid: twilioMessage.sid
      };

    } catch (error) {
      console.error('❌ [ERROR] Direct template send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template send failed'
      };
    }
  }

  /**
   * Send verification success and welcome message using DIRECT template (resolves error 63016)
   */
  async sendVerificationSuccessMessage(phoneNumber: string, displayName: string, storeName?: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    console.log('[TWILIO] Sending welcome using direct template to avoid 63016 error');
    
    // Send DIRECTLY using template, no fallback needed
    const result = await this.sendTemplateByType(
      phoneNumber,
      'welcome',
      {
        displayName: displayName,
        storeName: storeName || 'tu tienda'
      }
    );

    if (result.success) {
      console.log('[TWILIO] Welcome template sent successfully:', result.messageSid);
    } else {
      console.error('[TWILIO] Welcome template failed:', result.error);
    }

    return {
      success: result.success,
      messageSid: result.messageSid,
      error: result.error
    };
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