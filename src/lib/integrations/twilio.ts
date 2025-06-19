import twilio from 'twilio';
import type { TwilioWhatsAppMessage } from '@/types/whatsapp';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

// Initialize Twilio client only if credentials are available
let twilioClient: twilio.Twilio | null = null;

// Development mode - simulate WhatsApp without real credentials
const isDevelopmentMode = process.env.NODE_ENV === 'development' && (!accountSid || !authToken || !whatsappNumber);

if (accountSid && authToken && !isDevelopmentMode) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('[INFO] Twilio client initialized successfully');
  } catch (error) {
    console.error('[ERROR] Failed to initialize Twilio client:', error);
  }
} else {
  if (isDevelopmentMode) {
    console.warn('[WARN] Twilio running in DEVELOPMENT MODE - messages will be simulated');
  } else {
    console.warn('[WARN] Twilio credentials not configured. WhatsApp functionality will be limited.');
  }
}

/**
 * Twilio WhatsApp Service
 * Handles all WhatsApp message sending and template management
 */
export class TwilioWhatsAppService {
  /**
   * Send a simple text message via WhatsApp
   */
  async sendMessage(to: string, body: string): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
    // Development mode simulation
    if (isDevelopmentMode) {
      console.log(`[DEV] Simulating WhatsApp message to ${to}: "${body}"`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockMessageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`[DEV] Simulated WhatsApp message sent successfully. Mock SID: ${mockMessageId}`);
      return { 
        success: true, 
        messageId: mockMessageId 
      };
    }

    if (!twilioClient || !whatsappNumber) {
      console.error('[ERROR] Twilio not configured properly');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      console.log(`[INFO] Sending WhatsApp message to ${to}`);
      
      const message = await twilioClient.messages.create({
        from: whatsappNumber,
        to: `whatsapp:${to}`,
        body: body,
      });

      console.log(`[INFO] WhatsApp message sent successfully. SID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('[ERROR] Failed to send WhatsApp message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Send a template message via WhatsApp
   */
  async sendTemplate(
    to: string, 
    templateName: string, 
    variables: string[] = []
  ): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
    if (!twilioClient || !whatsappNumber) {
      console.error('[ERROR] Twilio not configured properly');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      console.log(`[INFO] Sending WhatsApp template ${templateName} to ${to}`);
      
      const message = await twilioClient.messages.create({
        from: whatsappNumber,
        to: `whatsapp:${to}`,
        contentSid: templateName,
        contentVariables: JSON.stringify(variables.reduce((acc, val, idx) => {
          acc[`${idx + 1}`] = val;
          return acc;
        }, {} as Record<string, string>)),
      });

      console.log(`[INFO] WhatsApp template sent successfully. SID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('[ERROR] Failed to send WhatsApp template:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Send a media message (image, document, etc.)
   */
  async sendMediaMessage(
    to: string, 
    mediaUrl: string, 
    caption?: string
  ): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
    if (!twilioClient || !whatsappNumber) {
      console.error('[ERROR] Twilio not configured properly');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      console.log(`[INFO] Sending WhatsApp media message to ${to}`);
      
      const message = await twilioClient.messages.create({
        from: whatsappNumber,
        to: `whatsapp:${to}`,
        mediaUrl: [mediaUrl],
        ...(caption && { body: caption }),
      });

      console.log(`[INFO] WhatsApp media message sent successfully. SID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('[ERROR] Failed to send WhatsApp media message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Send a bulk message to multiple recipients
   */
  async sendBulkMessages(
    recipients: string[], 
    body: string
  ): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
    if (!twilioClient || !whatsappNumber) {
      console.error('[ERROR] Twilio not configured properly');
      return recipients.map(to => ({ 
        to, 
        success: false, 
        error: 'WhatsApp service not configured' 
      }));
    }

    console.log(`[INFO] Sending bulk WhatsApp messages to ${recipients.length} recipients`);
    
    const results = await Promise.allSettled(
      recipients.map(async (to) => {
        const result = await this.sendMessage(to, body);
        return { to, ...result };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          to: recipients[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  /**
   * Check WhatsApp service health
   */
  async checkServiceHealth(): Promise<{ configured: boolean; accountInfo?: any; error?: string }> {
    // Development mode
    if (isDevelopmentMode) {
      return {
        configured: true,
        accountInfo: {
          friendlyName: "Development Mode (Simulated)",
          status: "active",
          type: "development",
          mode: "simulation"
        }
      };
    }

    if (!twilioClient) {
      return { 
        configured: false, 
        error: 'Twilio client not initialized' 
      };
    }

    try {
      const account = await twilioClient.api.accounts(accountSid).fetch();
      return {
        configured: true,
        accountInfo: {
          friendlyName: account.friendlyName,
          status: account.status,
          type: account.type,
        },
      };
    } catch (error) {
      console.error('[ERROR] Twilio health check failed:', error);
      return {
        configured: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse incoming Twilio webhook data
   */
  parseWebhookData(body: string): TwilioWhatsAppMessage {
    const data = new URLSearchParams(body);
    
    return {
      From: data.get('From') || '',
      To: data.get('To') || '',
      Body: data.get('Body') || '',
      MessageSid: data.get('MessageSid') || '',
      AccountSid: data.get('AccountSid') || '',
      MessagingServiceSid: data.get('MessagingServiceSid') || undefined,
      NumMedia: data.get('NumMedia') || '0',
      ProfileName: data.get('ProfileName') || undefined,
      WaId: data.get('WaId') || '',
    };
  }

        /**
    * Validate Twilio webhook signature (for security)
    */
   validateWebhookSignature(signature: string, url: string, params: Record<string, any>): boolean {
     if (!authToken) {
       console.warn('[WARN] Cannot validate webhook signature - auth token not configured');
       return false;
     }

     try {
       const webhookSecret = process.env.WEBHOOK_SECRET || authToken;
       return twilio.validateRequestWithBody(webhookSecret, JSON.stringify(params), url, signature);
     } catch (error) {
       console.error('[ERROR] Webhook signature validation failed:', error);
       return false;
     }
   }
}

// Export singleton instance
export const whatsappService = new TwilioWhatsAppService();

/**
 * Validate if Twilio WhatsApp is properly configured
 */
export const isTwilioConfigured = (): boolean => {
  return !!(accountSid && authToken && whatsappNumber);
};

/**
 * Get Twilio configuration status
 */
export const getTwilioConfig = () => {
  return {
    configured: isTwilioConfigured(),
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasWhatsAppNumber: !!whatsappNumber,
  };
}; 