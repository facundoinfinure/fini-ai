export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          created_at: string;
          updated_at: string;
          onboarding_completed: boolean;
          subscription_plan: 'free' | 'pro' | 'enterprise';
          subscription_status: 'active' | 'inactive' | 'cancelled';
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          image?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean;
          subscription_plan?: 'free' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'inactive' | 'cancelled';
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          image?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean;
          subscription_plan?: 'free' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'inactive' | 'cancelled';
        };
      };
      stores: {
        Row: {
          id: string;
          user_id: string;
          tiendanube_store_id: string;
          name: string;
          domain: string;
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_sync_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          tiendanube_store_id: string;
          name: string;
          domain: string;
          access_token: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_sync_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          tiendanube_store_id?: string;
          name?: string;
          domain?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_sync_at?: string | null;
        };
      };
      whatsapp_configs: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          phone_numbers: string[];
          webhook_url: string;
          twilio_account_sid: string | null;
          twilio_auth_token: string | null;
          twilio_phone_number: string | null;
          is_active: boolean;
          is_configured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          phone_numbers: string[];
          webhook_url: string;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          twilio_phone_number?: string | null;
          is_active?: boolean;
          is_configured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string | null;
          phone_numbers?: string[];
          webhook_url?: string;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          twilio_phone_number?: string | null;
          is_active?: boolean;
          is_configured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          whatsapp_number: string;
          customer_number: string;
          conversation_id: string;
          title: string | null;
          status: 'active' | 'closed' | 'archived';
          last_message_at: string;
          message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          whatsapp_number: string;
          customer_number: string;
          conversation_id: string;
          title?: string | null;
          status?: 'active' | 'closed' | 'archived';
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string | null;
          whatsapp_number?: string;
          customer_number?: string;
          conversation_id?: string;
          title?: string | null;
          status?: 'active' | 'closed' | 'archived';
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          twilio_message_sid: string | null;
          direction: 'inbound' | 'outbound';
          body: string;
          media_url: string | null;
          agent_type: string | null;
          confidence: number | null;
          processing_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          twilio_message_sid?: string | null;
          direction: 'inbound' | 'outbound';
          body: string;
          media_url?: string | null;
          agent_type?: string | null;
          confidence?: number | null;
          processing_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          twilio_message_sid?: string | null;
          direction?: 'inbound' | 'outbound';
          body?: string;
          media_url?: string | null;
          agent_type?: string | null;
          confidence?: number | null;
          processing_time_ms?: number | null;
          created_at?: string;
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
      whatsapp_numbers: {
        Row: {
          id: string;
          user_id: string;
          phone_number: string;
          display_name: string | null;
          twilio_account_sid: string | null;
          twilio_auth_token: string | null;
          webhook_url: string | null;
          is_active: boolean;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          phone_number: string;
          display_name?: string | null;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          webhook_url?: string | null;
          is_active?: boolean;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          phone_number?: string;
          display_name?: string | null;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          webhook_url?: string | null;
          is_active?: boolean;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_store_connections: {
        Row: {
          id: string;
          whatsapp_number_id: string;
          store_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          whatsapp_number_id: string;
          store_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          whatsapp_number_id?: string;
          store_id?: string;
          is_active?: boolean;
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