-- ================================================
-- FINI AI - Initial Database Schema
-- ================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- USERS TABLE
-- ================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  avatar_url VARCHAR,
  plan_type VARCHAR DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
  subscription_status VARCHAR DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TIENDA NUBE STORES
-- ================================================
CREATE TABLE tienda_nube_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id VARCHAR NOT NULL UNIQUE,
  store_name VARCHAR NOT NULL,
  store_url VARCHAR,
  access_token VARCHAR NOT NULL,
  refresh_token VARCHAR,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  webhook_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  store_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- WHATSAPP INTEGRATIONS
-- ================================================
CREATE TABLE whatsapp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES tienda_nube_stores(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  whatsapp_business_account_id VARCHAR NOT NULL,
  phone_number_id VARCHAR NOT NULL,
  access_token VARCHAR NOT NULL,
  webhook_verify_token VARCHAR NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  twilio_account_sid VARCHAR,
  twilio_auth_token VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- WHATSAPP CONVERSATIONS
-- ================================================
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES whatsapp_integrations(id) ON DELETE CASCADE,
  customer_phone VARCHAR NOT NULL,
  customer_name VARCHAR,
  conversation_type VARCHAR DEFAULT 'business_initiated' CHECK (conversation_type IN ('business_initiated', 'user_initiated')),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- WHATSAPP MESSAGES
-- ================================================
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id VARCHAR UNIQUE,
  direction VARCHAR NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'template')),
  content JSONB NOT NULL,
  status VARCHAR DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ANALYTICS QUERIES
-- ================================================
CREATE TABLE analytics_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES tienda_nube_stores(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  query_type VARCHAR NOT NULL CHECK (query_type IN ('top_products', 'revenue', 'orders', 'customers', 'summary')),
  query_params JSONB,
  response_data JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- AUTOMATED REPORTS
-- ================================================
CREATE TABLE automated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES tienda_nube_stores(id) ON DELETE CASCADE,
  report_type VARCHAR NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  schedule_time TIME NOT NULL,
  timezone VARCHAR DEFAULT 'America/Argentina/Buenos_Aires',
  is_enabled BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- RAG & AGENTS TABLES
-- ================================================

-- Agent Conversations (for multi-agent context)
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  agent_type VARCHAR NOT NULL,
  context JSONB,
  memory JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector Documents (for RAG)
CREATE TABLE vector_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES tienda_nube_stores(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  vector_id VARCHAR, -- Reference to vector DB
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Actions (for tracking agent operations)
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  agent_type VARCHAR NOT NULL,
  action_type VARCHAR NOT NULL,
  action_data JSONB,
  status VARCHAR DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan_type ON users(plan_type);

-- Tienda Nube Stores
CREATE INDEX idx_stores_user_id ON tienda_nube_stores(user_id);
CREATE INDEX idx_stores_store_id ON tienda_nube_stores(store_id);
CREATE INDEX idx_stores_is_active ON tienda_nube_stores(is_active);

-- WhatsApp Integrations
CREATE INDEX idx_whatsapp_integrations_user_id ON whatsapp_integrations(user_id);
CREATE INDEX idx_whatsapp_integrations_store_id ON whatsapp_integrations(store_id);
CREATE INDEX idx_whatsapp_integrations_phone ON whatsapp_integrations(phone_number);

-- WhatsApp Conversations
CREATE INDEX idx_conversations_integration_id ON whatsapp_conversations(integration_id);
CREATE INDEX idx_conversations_customer_phone ON whatsapp_conversations(customer_phone);
CREATE INDEX idx_conversations_status ON whatsapp_conversations(status);
CREATE INDEX idx_conversations_last_message ON whatsapp_conversations(last_message_at);

-- WhatsApp Messages
CREATE INDEX idx_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX idx_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX idx_messages_message_id ON whatsapp_messages(message_id);

-- Analytics Queries
CREATE INDEX idx_analytics_store_id ON analytics_queries(store_id);
CREATE INDEX idx_analytics_conversation_id ON analytics_queries(conversation_id);
CREATE INDEX idx_analytics_query_type ON analytics_queries(query_type);
CREATE INDEX idx_analytics_created_at ON analytics_queries(created_at);

-- Agent Tables
CREATE INDEX idx_agent_conversations_conversation_id ON agent_conversations(conversation_id);
CREATE INDEX idx_agent_conversations_agent_type ON agent_conversations(agent_type);
CREATE INDEX idx_vector_documents_store_id ON vector_documents(store_id);
CREATE INDEX idx_vector_documents_type ON vector_documents(document_type);
CREATE INDEX idx_agent_actions_conversation_id ON agent_actions(conversation_id);
CREATE INDEX idx_agent_actions_agent_type ON agent_actions(agent_type);

-- ================================================
-- RLS (Row Level Security) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_nube_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

-- Users: Can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Tienda Nube Stores: Users can only see their own stores
CREATE POLICY "Users can view own stores" ON tienda_nube_stores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stores" ON tienda_nube_stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores" ON tienda_nube_stores
  FOR UPDATE USING (auth.uid() = user_id);

-- WhatsApp Integrations: Users can only access their own integrations
CREATE POLICY "Users can view own whatsapp integrations" ON whatsapp_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp integrations" ON whatsapp_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp integrations" ON whatsapp_integrations
  FOR UPDATE USING (auth.uid() = user_id);

-- Conversations: Users can see conversations for their stores
CREATE POLICY "Users can view conversations for their stores" ON whatsapp_conversations
  FOR SELECT USING (
    integration_id IN (
      SELECT id FROM whatsapp_integrations WHERE user_id = auth.uid()
    )
  );

-- Messages: Users can see messages for their conversations
CREATE POLICY "Users can view messages for their conversations" ON whatsapp_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT wc.id FROM whatsapp_conversations wc
      JOIN whatsapp_integrations wi ON wc.integration_id = wi.id
      WHERE wi.user_id = auth.uid()
    )
  );

-- Analytics: Users can see analytics for their stores
CREATE POLICY "Users can view analytics for their stores" ON analytics_queries
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM tienda_nube_stores WHERE user_id = auth.uid()
    )
  );

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON tienda_nube_stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON whatsapp_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON automated_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 