export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan_type: 'basic' | 'pro' | 'enterprise';
          subscription_status: 'active' | 'cancelled' | 'expired';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan_type?: 'basic' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan_type?: 'basic' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
      };
      tienda_nube_stores: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          store_name: string;
          store_url: string | null;
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          webhook_url: string | null;
          is_active: boolean;
          store_data: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          store_name: string;
          store_url?: string | null;
          access_token: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          webhook_url?: string | null;
          is_active?: boolean;
          store_data?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string;
          store_name?: string;
          store_url?: string | null;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          webhook_url?: string | null;
          is_active?: boolean;
          store_data?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_integrations: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          phone_number: string;
          whatsapp_business_account_id: string;
          phone_number_id: string;
          access_token: string;
          webhook_verify_token: string;
          is_verified: boolean;
          is_active: boolean;
          twilio_account_sid: string | null;
          twilio_auth_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          phone_number: string;
          whatsapp_business_account_id: string;
          phone_number_id: string;
          access_token: string;
          webhook_verify_token: string;
          is_verified?: boolean;
          is_active?: boolean;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string;
          phone_number?: string;
          whatsapp_business_account_id?: string;
          phone_number_id?: string;
          access_token?: string;
          webhook_verify_token?: string;
          is_verified?: boolean;
          is_active?: boolean;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_conversations: {
        Row: {
          id: string;
          integration_id: string;
          customer_phone: string;
          customer_name: string | null;
          conversation_type: 'business_initiated' | 'user_initiated';
          status: 'active' | 'closed' | 'archived';
          last_message_at: string;
          message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          integration_id: string;
          customer_phone: string;
          customer_name?: string | null;
          conversation_type?: 'business_initiated' | 'user_initiated';
          status?: 'active' | 'closed' | 'archived';
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          integration_id?: string;
          customer_phone?: string;
          customer_name?: string | null;
          conversation_type?: 'business_initiated' | 'user_initiated';
          status?: 'active' | 'closed' | 'archived';
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_messages: {
        Row: {
          id: string;
          conversation_id: string;
          message_id: string | null;
          direction: 'inbound' | 'outbound';
          message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
          content: unknown;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          message_id?: string | null;
          direction: 'inbound' | 'outbound';
          message_type?: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
          content: unknown;
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          message_id?: string | null;
          direction?: 'inbound' | 'outbound';
          message_type?: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
          content?: unknown;
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp?: string;
          created_at?: string;
        };
      };
      analytics_queries: {
        Row: {
          id: string;
          store_id: string;
          conversation_id: string;
          query_type: 'top_products' | 'revenue' | 'orders' | 'customers' | 'summary';
          query_params: unknown | null;
          response_data: unknown | null;
          execution_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          conversation_id: string;
          query_type: 'top_products' | 'revenue' | 'orders' | 'customers' | 'summary';
          query_params?: unknown | null;
          response_data?: unknown | null;
          execution_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          conversation_id?: string;
          query_type?: 'top_products' | 'revenue' | 'orders' | 'customers' | 'summary';
          query_params?: unknown | null;
          response_data?: unknown | null;
          execution_time_ms?: number | null;
          created_at?: string;
        };
      };
      automated_reports: {
        Row: {
          id: string;
          store_id: string;
          report_type: 'daily' | 'weekly' | 'monthly';
          schedule_time: string;
          timezone: string;
          is_enabled: boolean;
          last_sent_at: string | null;
          report_data: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          report_type: 'daily' | 'weekly' | 'monthly';
          schedule_time: string;
          timezone?: string;
          is_enabled?: boolean;
          last_sent_at?: string | null;
          report_data?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          report_type?: 'daily' | 'weekly' | 'monthly';
          schedule_time?: string;
          timezone?: string;
          is_enabled?: boolean;
          last_sent_at?: string | null;
          report_data?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Nuevas tablas para RAG y Agentes
      agent_conversations: {
        Row: {
          id: string;
          conversation_id: string;
          agent_type: string;
          context: unknown | null;
          memory: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          agent_type: string;
          context?: unknown | null;
          memory?: unknown | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          agent_type?: string;
          context?: unknown | null;
          memory?: unknown | null;
          created_at?: string;
        };
      };
      vector_documents: {
        Row: {
          id: string;
          store_id: string;
          document_type: string;
          content: string;
          metadata: unknown | null;
          vector_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          document_type: string;
          content: string;
          metadata?: unknown | null;
          vector_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          document_type?: string;
          content?: string;
          metadata?: unknown | null;
          vector_id?: string | null;
          created_at?: string;
        };
      };
      agent_actions: {
        Row: {
          id: string;
          conversation_id: string;
          agent_type: string;
          action_type: string;
          action_data: unknown | null;
          status: string;
          result: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          agent_type: string;
          action_type: string;
          action_data?: unknown | null;
          status?: string;
          result?: unknown | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          agent_type?: string;
          action_type?: string;
          action_data?: unknown | null;
          status?: string;
          result?: unknown | null;
          created_at?: string;
        };
      };
    };
  };
} 