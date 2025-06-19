/**
 * Twilio WhatsApp Service
 * Service for sending and receiving WhatsApp messages via Twilio
 */

import twilio from 'twilio';
import crypto from 'crypto';
import type { 
  WhatsAppService, 
  OutgoingWhatsAppMessage, 
  WhatsAppWebhook,
  MessageProcessingResult,
  WhatsAppConversation,
  WhatsAppMessage
} from './types';
import { WHATSAPP_CONFIG, PHONE_UTILS, MESSAGE_CONFIG } from './config';
import { multiAgentSystem } from '@/lib/agents';
import type { AgentContext } from '@/lib/agents/types';

export class TwilioWhatsAppService implements WhatsAppService {
  private client: twilio.Twilio;
  private conversations: Map<string, WhatsAppConversation> = new Map();

  constructor() {
    this.client = twilio(
      WHATSAPP_CONFIG.twilio.accountSid,
      WHATSAPP_CONFIG.twilio.authToken
    );
    
    console.log('[WHATSAPP] Twilio service initialized');
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(message: OutgoingWhatsAppMessage): Promise<{ sid: string; status: string }> {
    try {
      console.log(`[WHATSAPP] Sending message to ${message.to}`);
      
      const twilioMessage = await this.client.messages.create({
        from: WHATSAPP_CONFIG.twilio.whatsappNumber,
        to: `whatsapp:${PHONE_UTILS.formatPhoneNumber(message.to)}`,
        body: message.body.substring(0, WHATSAPP_CONFIG.features.maxMessageLength),
        mediaUrl: message.mediaUrl ? [message.mediaUrl] : undefined
      });

      console.log(`[WHATSAPP] Message sent successfully: ${twilioMessage.sid}`);
      
      return {
        sid: twilioMessage.sid,
        status: twilioMessage.status
      };
    } catch (error) {
      console.error('[ERROR] Failed to send WhatsApp message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a media message
   */
  async sendMediaMessage(to: string, mediaUrl: string, caption?: string): Promise<{ sid: string; status: string }> {
    return this.sendMessage({
      to,
      body: caption || '',
      mediaUrl
    });
  }

  /**
   * Process incoming WhatsApp message
   */
  async processIncomingMessage(webhook: WhatsAppWebhook): Promise<MessageProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[WHATSAPP] Processing incoming message from ${webhook.From}`);
      
      // Extract phone number from Twilio format
      const phoneNumber = webhook.From.replace('whatsapp:', '');
      const cleanPhone = PHONE_UTILS.formatPhoneNumber(phoneNumber);
      
      // Create WhatsApp message object
      const whatsappMessage: WhatsAppMessage = {
        id: webhook.MessageSid,
        from: cleanPhone,
        to: webhook.To.replace('whatsapp:', ''),
        body: webhook.Body || '',
        timestamp: new Date().toISOString(),
        type: 'text', // TODO: Detect media types
        messageId: webhook.MessageSid,
        accountSid: webhook.AccountSid,
        profileName: webhook.ProfileName,
        metadata: {
          latitude: webhook.Latitude,
          longitude: webhook.Longitude,
          address: webhook.Address
        }
      };

      // Get or create conversation
      // For demo purposes, we'll use a default store ID
      const conversation = await this.getOrCreateConversation(cleanPhone, 'demo-store-123');
      
      // Add message to conversation history
      conversation.context.conversationHistory.push(whatsappMessage);
      conversation.messageCount++;
      conversation.lastMessageAt = new Date().toISOString();

      // Create agent context
      const agentContext: AgentContext = {
        storeId: conversation.storeId,
        userId: conversation.userId,
        conversationId: conversation.id,
        userMessage: whatsappMessage.body,
        messageHistory: conversation.context.conversationHistory.map(msg => ({
          id: msg.id,
          role: msg.from === cleanPhone ? 'user' : 'assistant',
          content: msg.body,
          agentType: conversation.currentAgentType,
          timestamp: msg.timestamp
        })),
        metadata: {
          customerInfo: conversation.context.customerInfo,
          sessionData: conversation.context.sessionData
        }
      };

      // Process with multi-agent system
      const agentResponse = await multiAgentSystem.processMessage(agentContext);
      
      // Send response back to user
      if (agentResponse.success && agentResponse.response) {
        await this.sendMessage({
          to: cleanPhone,
          body: agentResponse.response
        });

        // Update conversation with agent response
        const responseMessage: WhatsAppMessage = {
          id: `response_${Date.now()}`,
          from: WHATSAPP_CONFIG.twilio.whatsappNumber,
          to: cleanPhone,
          body: agentResponse.response,
          timestamp: new Date().toISOString(),
          type: 'text',
          messageId: `response_${Date.now()}`,
          accountSid: webhook.AccountSid
        };

        conversation.context.conversationHistory.push(responseMessage);
        conversation.currentAgentType = agentResponse.agentType;
        conversation.metadata.updatedAt = new Date().toISOString();

        // Update conversation in memory (in production, save to database)
        this.conversations.set(conversation.id, conversation);
      }

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        messageId: webhook.MessageSid,
        response: agentResponse.success ? {
          text: agentResponse.response || '',
          agentType: agentResponse.agentType,
          confidence: agentResponse.confidence,
          processingTime
        } : undefined,
        metadata: {
          conversationId: conversation.id,
          routing: agentResponse.metadata?.routingDecision,
          context: {
            messageCount: conversation.messageCount,
            lastAgent: conversation.currentAgentType
          }
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ERROR] Failed to process WhatsApp message:', error);
      
      // Send error message to user
      try {
        const phoneNumber = webhook.From.replace('whatsapp:', '');
        await this.sendMessage({
          to: phoneNumber,
          body: 'Lo siento, experimenté un problema técnico. Por favor intenta de nuevo en unos momentos.'
        });
      } catch (sendError) {
        console.error('[ERROR] Failed to send error message:', sendError);
      }

      return {
        success: false,
        messageId: webhook.MessageSid,
        error: errorMessage
      };
    }
  }

  /**
   * Get or create conversation
   */
  async getOrCreateConversation(phoneNumber: string, storeId: string): Promise<WhatsAppConversation> {
    const conversationId = `${storeId}_${phoneNumber}`;
    
    // Check if conversation exists in memory
    let conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      // Create new conversation
      conversation = {
        id: conversationId,
        phoneNumber,
        storeId,
        userId: `user_${phoneNumber.replace(/\D/g, '')}`, // Generate user ID from phone
        status: 'active',
        lastMessageAt: new Date().toISOString(),
        messageCount: 0,
        context: {
          conversationHistory: [],
          sessionData: {
            intent: 'unknown',
            followUp: false
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          language: 'es',
          businessHours: true
        }
      };
      
      this.conversations.set(conversationId, conversation);
      console.log(`[WHATSAPP] Created new conversation: ${conversationId}`);
    }
    
    return conversation;
  }

  /**
   * Update conversation
   */
  async updateConversation(conversationId: string, updates: Partial<WhatsAppConversation>): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const updated = { ...conversation, ...updates };
      updated.metadata.updatedAt = new Date().toISOString();
      this.conversations.set(conversationId, updated);
    }
  }

  /**
   * End conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'ended';
      conversation.metadata.updatedAt = new Date().toISOString();
      this.conversations.set(conversationId, conversation);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(signature: string, body: string): boolean {
    try {
      if (!WHATSAPP_CONFIG.webhook.verifyToken) {
        console.warn('[WHATSAPP] No verify token configured, skipping verification');
        return true;
      }

      const expectedSignature = crypto
        .createHmac('sha1', WHATSAPP_CONFIG.twilio.authToken)
        .update(Buffer.from(body, 'utf-8'))
        .digest('base64');

      const twilioSignature = signature.replace('sha1=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'base64'),
        Buffer.from(twilioSignature, 'base64')
      );
    } catch (error) {
      console.error('[ERROR] Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Test Twilio connection by getting account info
      const account = await this.client.api.accounts(WHATSAPP_CONFIG.twilio.accountSid).fetch();
      
      return {
        healthy: true,
        details: {
          twilioAccount: {
            sid: account.sid,
            status: account.status,
            type: account.type
          },
          configuration: {
            whatsappNumber: WHATSAPP_CONFIG.twilio.whatsappNumber,
            webhookConfigured: !!WHATSAPP_CONFIG.webhook.url,
            verifyTokenSet: !!WHATSAPP_CONFIG.webhook.verifyToken
          },
          activeConversations: this.conversations.size
        }
      };
    } catch (error) {
      console.error('[ERROR] WhatsApp service health check failed:', error);
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          configuration: {
            hasAccountSid: !!WHATSAPP_CONFIG.twilio.accountSid,
            hasAuthToken: !!WHATSAPP_CONFIG.twilio.authToken,
            hasWhatsAppNumber: !!WHATSAPP_CONFIG.twilio.whatsappNumber
          }
        }
      };
    }
  }

  /**
   * Get active conversations
   */
  getActiveConversations(): WhatsAppConversation[] {
    return Array.from(this.conversations.values()).filter(conv => conv.status === 'active');
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): WhatsAppConversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Clear old conversations (cleanup utility)
   */
  clearOldConversations(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleared = 0;
    
    this.conversations.forEach((conversation, id) => {
      const lastMessageTime = new Date(conversation.lastMessageAt).getTime();
      if (lastMessageTime < cutoffTime) {
        this.conversations.delete(id);
        cleared++;
      }
    });
    
    console.log(`[WHATSAPP] Cleared ${cleared} old conversations`);
    return cleared;
  }
}

// Export singleton instance
export const twilioWhatsAppService = new TwilioWhatsAppService(); 