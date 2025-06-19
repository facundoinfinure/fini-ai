/**
 * WhatsApp Integration Types
 * Types for WhatsApp Business API integration via Twilio
 */

export interface WhatsAppMessage {
  id: string;
  from: string; // Phone number with country code
  to: string;   // Your WhatsApp Business number
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts';
  mediaUrl?: string;
  mediaContentType?: string;
  messageId: string;
  accountSid: string;
  messagingServiceSid?: string;
  profileName?: string;
  metadata?: {
    latitude?: string;
    longitude?: string;
    address?: string;
    [key: string]: unknown;
  };
}

export interface WhatsAppWebhook {
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
  WaId: string; // WhatsApp ID (phone number)
  SmsMessageSid: string;
  NumSegments: string;
  ReferralNumMedia?: string;
  MessageStatus?: 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
  EventType?: 'message' | 'status';
  Latitude?: string;
  Longitude?: string;
  Address?: string;
  [key: string]: unknown;
}

export interface OutgoingWhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
  contentType?: string;
  persistentAction?: string[];
}

export interface WhatsAppConversation {
  id: string;
  phoneNumber: string;
  profileName?: string;
  storeId: string;
  userId: string;
  status: 'active' | 'paused' | 'ended';
  lastMessageAt: string;
  messageCount: number;
  currentAgentType?: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing';
  context: {
    customerInfo?: {
      name?: string;
      email?: string;
      preferences?: unknown;
    };
    conversationHistory: WhatsAppMessage[];
    sessionData?: {
      lastQuery?: string;
      intent?: string;
      followUp?: boolean;
      [key: string]: unknown;
    };
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    timezone?: string;
    language?: 'es' | 'en';
    businessHours?: boolean;
    [key: string]: unknown;
  };
}

export interface WhatsAppConfig {
  twilio: {
    accountSid: string;
    authToken: string;
    whatsappNumber: string; // Your Twilio WhatsApp number
  };
  webhook: {
    url: string;
    verifyToken: string;
  };
  features: {
    enableMediaSupport: boolean;
    enableLocationSupport: boolean;
    enableFileSupport: boolean;
    maxMessageLength: number;
    rateLimitPerMinute: number;
  };
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: {
      [day: string]: {
        open: string;
        close: string;
        enabled: boolean;
      };
    };
  };
}

export interface MessageProcessingResult {
  success: boolean;
  messageId: string;
  response?: {
    text: string;
    agentType: string;
    confidence: number;
    processingTime: number;
  };
  error?: string;
  metadata?: {
    conversationId: string;
    routing?: unknown;
    context?: unknown;
  };
}

export interface WhatsAppService {
  // Send messages
  sendMessage(message: OutgoingWhatsAppMessage): Promise<{ sid: string; status: string }>;
  sendMediaMessage(to: string, mediaUrl: string, caption?: string): Promise<{ sid: string; status: string }>;
  
  // Process incoming messages
  processIncomingMessage(webhook: WhatsAppWebhook): Promise<MessageProcessingResult>;
  
  // Conversation management
  getOrCreateConversation(phoneNumber: string, storeId: string): Promise<WhatsAppConversation>;
  updateConversation(conversationId: string, updates: Partial<WhatsAppConversation>): Promise<void>;
  endConversation(conversationId: string): Promise<void>;
  
  // Webhook verification
  verifyWebhook(signature: string, body: string): boolean;
  
  // Status and health
  getServiceStatus(): Promise<{ healthy: boolean; details: unknown }>;
}

export interface WhatsAppBot {
  // Main message processing
  handleMessage(webhook: WhatsAppWebhook): Promise<void>;
  
  // Auto-responses
  sendWelcomeMessage(phoneNumber: string): Promise<void>;
  sendBusinessHoursMessage(phoneNumber: string): Promise<void>;
  sendErrorMessage(phoneNumber: string, error: string): Promise<void>;
  
  // Analytics integration
  logConversation(conversation: WhatsAppConversation): Promise<void>;
  getConversationStats(storeId: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    averageResponseTime: number;
    topQueries: string[];
  }>;
}

export interface WhatsAppError {
  code: 'WEBHOOK_VERIFICATION_FAILED' | 'MESSAGE_SEND_FAILED' | 'CONVERSATION_NOT_FOUND' | 'AGENT_PROCESSING_FAILED' | 'RATE_LIMIT_EXCEEDED' | 'BUSINESS_HOURS_OUTSIDE' | 'INVALID_PHONE_NUMBER';
  message: string;
  details?: unknown;
  phoneNumber?: string;
  messageId?: string;
} 