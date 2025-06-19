export interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: 'text' | 'image' | 'document' | 'audio' | 'video';
          context?: {
            from: string;
            id: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: 'messages';
    }>;
  }>;
}

export interface TwilioWhatsAppMessage {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  NumMedia: string;
  ProfileName?: string;
  WaId: string;
}

export interface WhatsAppConversation {
  id: string;
  customer_phone: string;
  customer_name?: string;
  conversation_type: 'business_initiated' | 'user_initiated';
  status: 'active' | 'closed' | 'archived';
  last_message_at: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageRecord {
  id: string;
  conversation_id: string;
  message_id: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
  content: {
    body?: string;
    media_url?: string;
    caption?: string;
    filename?: string;
    template_name?: string;
    template_params?: string[];
  };
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  created_at: string;
} 