import twilio from 'twilio';

import type { TwilioWhatsAppMessage } from '@/types/whatsapp';

const _accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const _authToken = process.env.TWILIO_AUTH_TOKEN || "";
const _whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";

// Initialize Twilio client only if credentials are available
let twilioClient: twilio.Twilio | null = null;

// Development mode - simulate WhatsApp without real credentials
const _isDevelopmentMode = process.env.NODE_ENV === 'development' && (!_accountSid || !_authToken || !_whatsappNumber);

if (_accountSid && _authToken && !_isDevelopmentMode) {
  try {
    twilioClient = twilio(_accountSid, _authToken);
    console.warn('[INFO] Twilio client initialized successfully');
  } catch (error) {
    console.warn('[ERROR] Failed to initialize Twilio client:', error);
  }
} else {
  if (_isDevelopmentMode) {
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
    if (_isDevelopmentMode) {
      console.warn(`[DEV] Simulating WhatsApp message to ${to}: "${body}"`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const _mockMessageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.warn(`[DEV] Simulated WhatsApp message sent successfully. Mock SID: ${_mockMessageId}`);
      return { 
        success: true, 
        messageId: _mockMessageId 
      };
    }

    if (!twilioClient || !_whatsappNumber) {
      console.warn('[ERROR] Twilio not configured properly');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      console.warn(`[INFO] Sending WhatsApp message to ${to}`);
      
      const _message = await twilioClient.messages.create({
        from: _whatsappNumber,
        to: `whatsapp:${to}`,
        body,
      });

      console.warn(`[INFO] WhatsApp message sent successfully. SID: ${_message.sid}`);
      return { success: true, messageId: _message.sid };
    } catch (error) {
      console.warn('[ERROR] Failed to send WhatsApp message:', error);
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
    if (!twilioClient || !_whatsappNumber) {
      console.warn('[ERROR] Twilio not configured properly');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      console.warn(`[INFO] Sending WhatsApp template ${templateName} to ${to}`);
      
      const _message = await twilioClient.messages.create({
        from: _whatsappNumber,
        to: `whatsapp:${to}`,
        contentSid: templateName,
        contentVariables: JSON.stringify(variables.reduce((acc, val, idx) => {
          acc[`${idx + 1}`] = val;
          return acc;
        }, {} as Record<string, string>)),
      });

      console.warn(`[INFO] WhatsApp template sent successfully. SID: ${_message.sid}`);
      return { success: true, messageId: _message.sid };
    } catch (error) {
      console.warn('[ERROR] Failed to send WhatsApp template:', error);
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
    if (!twilioClient || !_whatsappNumber) {
      console.warn('[ERROR] Twilio not configured properly');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      console.warn(`[INFO] Sending WhatsApp media message to ${to}`);
      
      const _message = await twilioClient.messages.create({
        from: _whatsappNumber,
        to: `whatsapp:${to}`,
        mediaUrl: [mediaUrl],
        ...(caption && { body: caption }),
      });

      console.warn(`[INFO] WhatsApp media message sent successfully. SID: ${_message.sid}`);
      return { success: true, messageId: _message.sid };
    } catch (error) {
      console.warn('[ERROR] Failed to send WhatsApp media message:', error);
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
    if (!twilioClient || !_whatsappNumber) {
      console.warn('[ERROR] Twilio not configured properly');
      return recipients.map(to => ({ 
        to, 
        success: false, 
        error: 'WhatsApp service not configured' 
      }));
    }

    console.warn(`[INFO] Sending bulk WhatsApp messages to ${recipients.length} recipients`);
    
    const _results = await Promise.allSettled(
      recipients.map(async (_to) => {
        const result = await this.sendMessage(_to, body);
        return { to: _to, ...result };
      })
    );

    return _results.map((result, index) => {
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
  async checkServiceHealth(): Promise<{ configured: boolean; accountInfo?: unknown; error?: string }> {
    // Development mode
    if (_isDevelopmentMode) {
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
      const _account = await twilioClient.api.accounts(_accountSid).fetch();
      return {
        configured: true,
        accountInfo: {
          friendlyName: _account.friendlyName,
          status: _account.status,
          type: _account.type,
        },
      };
    } catch (error) {
      console.warn('[ERROR] Twilio health check failed:', error);
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
    const _data = new URLSearchParams(body);
    
    return {
      From: _data.get('From') || '',
      To: _data.get('To') || '',
      Body: _data.get('Body') || '',
      MessageSid: _data.get('MessageSid') || '',
      AccountSid: _data.get('AccountSid') || '',
      MessagingServiceSid: _data.get('MessagingServiceSid') || undefined,
      NumMedia: _data.get('NumMedia') || '0',
      ProfileName: _data.get('ProfileName') || undefined,
      WaId: _data.get('WaId') || '',
    };
  }

        /**
    * Validate Twilio webhook signature (for security)
    */
   validateWebhookSignature(signature: string, url: string, params: Record<string, unknown>): boolean {
     if (!_authToken) {
       console.warn('[WARN] Cannot validate webhook signature - auth token not configured');
       return false;
     }

     try {
       const _webhookSecret = process.env.WEBHOOK_SECRET || _authToken;
       return twilio.validateRequestWithBody(_webhookSecret, JSON.stringify(params), url, signature);
     } catch (error) {
       console.warn('[ERROR] Webhook signature validation failed:', error);
       return false;
     }
   }
}

// Export singleton instance
export const _whatsappService = new TwilioWhatsAppService();

/**
 * Validate if Twilio WhatsApp is properly configured
 */
export const _isTwilioConfigured = (): boolean => {
  return !!(_accountSid && _authToken && _whatsappNumber);
};

/**
 * Get Twilio configuration status
 */
export const _getTwilioConfig = () => {
  return {
    configured: _isTwilioConfigured(),
    hasAccountSid: !!_accountSid,
    hasAuthToken: !!_authToken,
    hasWhatsAppNumber: !!_whatsappNumber,
  };
}; 