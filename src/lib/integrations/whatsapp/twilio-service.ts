/**
 * Twilio WhatsApp Service
 * Service for sending and receiving WhatsApp messages via Twilio
 */

import crypto from 'crypto';

import twilio from 'twilio';

import { WHATSAPP_CONFIG, PHONE_UTILS } from './config';
// import { MESSAGE_CONFIG } from './config';
import type { 
  WhatsAppService, 
  OutgoingWhatsAppMessage, 
  WhatsAppWebhook,
  MessageProcessingResult,
  WhatsAppConversation,
  WhatsAppMessage
} from './types';

import { _multiAgentSystem } from '@/lib/agents';
import type { AgentContext } from '@/lib/agents/types';

export class TwilioWhatsAppService implements WhatsAppService {
  private client: twilio.Twilio;
  private conversations: Map<string, WhatsAppConversation> = new Map();

  constructor() {
    this.client = twilio(
      WHATSAPP_CONFIG.twilio.accountSid,
      WHATSAPP_CONFIG.twilio.authToken
    );
    
    console.warn('[WHATSAPP] Twilio service initialized');
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(message: OutgoingWhatsAppMessage): Promise<{ sid: string; status: string }> {
    try {
      console.warn(`[WHATSAPP] Sending message to ${message.to}`);
      
      const _twilioMessage = await this.client.messages.create({
        from: WHATSAPP_CONFIG.twilio.whatsappNumber,
        to: `whatsapp:${PHONE_UTILS.formatPhoneNumber(message.to)}`,
        body: message.body.substring(0, WHATSAPP_CONFIG.features.maxMessageLength),
        mediaUrl: message.mediaUrl ? [message.mediaUrl] : undefined
      });

      console.warn(`[WHATSAPP] Message sent successfully: ${_twilioMessage.sid}`);
      
      return {
        sid: _twilioMessage.sid,
        status: _twilioMessage.status
      };
    } catch (error) {
      console.warn('[ERROR] Failed to send WhatsApp message:', error);
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
    const _startTime = Date.now();
    
    try {
      console.warn(`[WHATSAPP] Processing incoming message from ${webhook.From}`);
      
      // Extract phone number from Twilio format
      const _phoneNumber = webhook.From.replace('whatsapp:', '');
      const _cleanPhone = PHONE_UTILS.formatPhoneNumber(_phoneNumber);
      
      // Create WhatsApp message object
      const whatsappMessage: WhatsAppMessage = {
        id: webhook.MessageSid,
        from: _cleanPhone,
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
      const _conversation = await this.getOrCreateConversation(_cleanPhone, 'demo-store-123');
      
      // Add message to conversation history
      _conversation.context.conversationHistory.push(whatsappMessage);
      _conversation.messageCount++;
      _conversation.lastMessageAt = new Date().toISOString();

      // Create agent context
      const agentContext: AgentContext = {
        storeId: _conversation.storeId,
        userId: _conversation.userId,
        conversationId: _conversation.id,
        userMessage: whatsappMessage.body,
        messageHistory: _conversation.context.conversationHistory.map(msg => ({
          id: msg.id,
          role: msg.from === _cleanPhone ? 'user' : 'assistant',
          content: msg.body,
          agentType: _conversation.currentAgentType,
          timestamp: msg.timestamp
        })),
        metadata: {
          customerInfo: _conversation.context.customerInfo,
          sessionData: _conversation.context.sessionData
        }
      };

      // Process with multi-agent system
      const _agentResponse = await _multiAgentSystem.processMessage(agentContext);
      
      // Send response back to user
      if (_agentResponse.success && _agentResponse.response) {
        await this.sendMessage({
          to: _cleanPhone,
          body: _agentResponse.response
        });

        // Update conversation with agent response
        const responseMessage: WhatsAppMessage = {
          id: `response_${Date.now()}`,
          from: WHATSAPP_CONFIG.twilio.whatsappNumber,
          to: _cleanPhone,
          body: _agentResponse.response,
          timestamp: new Date().toISOString(),
          type: 'text',
          messageId: `response_${Date.now()}`,
          accountSid: webhook.AccountSid
        };

        _conversation.context.conversationHistory.push(responseMessage);
        _conversation.currentAgentType = _agentResponse.agentType;
        _conversation.metadata.updatedAt = new Date().toISOString();

        // Update conversation in memory (in production, save to database)
        this.conversations.set(_conversation.id, _conversation);
      }

      const _processingTime = Date.now() - _startTime;
      
      return {
        success: true,
        messageId: webhook.MessageSid,
        response: _agentResponse.success ? {
          text: _agentResponse.response || '',
          agentType: _agentResponse.agentType,
          confidence: _agentResponse.confidence,
          processingTime: _processingTime
        } : undefined,
        metadata: {
          conversationId: _conversation.id,
          routing: _agentResponse.metadata?.routingDecision,
          context: {
            messageCount: _conversation.messageCount,
            lastAgent: _conversation.currentAgentType
          }
        }
      };

    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[ERROR] Failed to process WhatsApp message:', error);
      
      // Send error message to user
      try {
        const _phoneNumber = webhook.From.replace('whatsapp:', '');
        await this.sendMessage({
          to: _phoneNumber,
          body: 'Lo siento, experimenté un problema técnico. Por favor intenta de nuevo en unos momentos.'
        });
      } catch (sendError) {
        console.warn('[ERROR] Failed to send error message:', sendError);
      }

      return {
        success: false,
        messageId: webhook.MessageSid,
        error: _errorMessage
      };
    }
  }

  /**
   * Get or create conversation
   */
  async getOrCreateConversation(phoneNumber: string, storeId: string): Promise<WhatsAppConversation> {
    const _conversationId = `${storeId}_${phoneNumber}`;
    
    // Check if conversation exists in memory
    let conversation = this.conversations.get(_conversationId);
    
    if (!conversation) {
      // Create new conversation
      conversation = {
        id: _conversationId,
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
      
      this.conversations.set(_conversationId, conversation);
      console.warn(`[WHATSAPP] Created new conversation: ${_conversationId}`);
    }
    
    return conversation;
  }

  /**
   * Update conversation
   */
  async updateConversation(conversationId: string, updates: Partial<WhatsAppConversation>): Promise<void> {
    const _conversation = this.conversations.get(conversationId);
    if (_conversation) {
      const _updated = { ..._conversation, ...updates };
      _updated.metadata.updatedAt = new Date().toISOString();
      this.conversations.set(conversationId, _updated);
    }
  }

  /**
   * End conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    const _conversation = this.conversations.get(conversationId);
    if (_conversation) {
      _conversation.status = 'ended';
      _conversation.metadata.updatedAt = new Date().toISOString();
      this.conversations.set(conversationId, _conversation);
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

      const _expectedSignature = crypto
        .createHmac('sha1', WHATSAPP_CONFIG.twilio.authToken)
        .update(Buffer.from(body, 'utf-8'))
        .digest('base64');

      const _twilioSignature = signature.replace('sha1=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(_expectedSignature, 'base64'),
        Buffer.from(_twilioSignature, 'base64')
      );
    } catch (error) {
      console.warn('[ERROR] Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{ healthy: boolean; details: unknown }> {
    try {
      // Test Twilio connection by getting account info
      const _account = await this.client.api.accounts(WHATSAPP_CONFIG.twilio.accountSid).fetch();
      
      return {
        healthy: true,
        details: {
          twilioAccount: {
            sid: _account.sid,
            status: _account.status,
            type: _account.type
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
      console.warn('[ERROR] WhatsApp service health check failed:', error);
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
    const _cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleared = 0;
    
    this.conversations.forEach((conversation, id) => {
      const _lastMessageTime = new Date(conversation.lastMessageAt).getTime();
      if (_lastMessageTime < _cutoffTime) {
        this.conversations.delete(id);
        cleared++;
      }
    });
    
    console.warn(`[WHATSAPP] Cleared ${cleared} old conversations`);
    return cleared;
  }
}

// Export singleton instance
export const _twilioWhatsAppService = new TwilioWhatsAppService(); 