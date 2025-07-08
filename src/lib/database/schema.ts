/**
 * Database Schema
 * Supabase PostgreSQL schema for Fini AI
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
  subscription_plan: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'cancelled';
}

export interface Store {
  id: string;
  user_id: string;
  platform: 'tiendanube' | 'shopify' | 'woocommerce' | 'other';
  platform_store_id: string;
  name: string;
  domain: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  currency?: string;
  timezone?: string;
  language?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
}

// NUEVA ARQUITECTURA N:M PARA WHATSAPP
export interface WhatsAppNumber {
  id: string;
  user_id: string;
  phone_number: string;
  display_name?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  webhook_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppStoreConnection {
  id: string;
  whatsapp_number_id: string;
  store_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// DEPRECATED - Mantener por compatibilidad pero migrar
export interface WhatsAppConfig {
  id: string;
  user_id: string;
  store_id?: string;
  phone_numbers: string[];
  webhook_url: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  is_active: boolean;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  store_id?: string;
  whatsapp_number: string;
  customer_number: string;
  conversation_id: string;
  title?: string;
  status: 'active' | 'closed' | 'archived';
  last_message_at: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  twilio_message_sid?: string;
  direction: 'inbound' | 'outbound';
  body: string;
  media_url?: string;
  agent_type?: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing';
  confidence?: number;
  processing_time_ms?: number;
  reasoning?: string;  // 🔥 NEW: Agent reasoning for transparency
  created_at: string;
}

export interface AnalyticsCache {
  id: string;
  store_id: string;
  data_type: 'sales' | 'products' | 'customers' | 'orders';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  data: unknown;
  expires_at: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  language: 'es' | 'pt' | 'en';
  timezone: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeToken {
  id: string;
  store_id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// SQL Schema for Supabase
export const SQL_SCHEMA = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled'))
);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'tiendanube' CHECK (platform IN ('tiendanube', 'shopify', 'woocommerce', 'other')),
  platform_store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  currency TEXT DEFAULT 'ARS',
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  language TEXT DEFAULT 'es',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, platform, platform_store_id)
);

-- WhatsApp numbers table (nueva arquitectura N:M)
CREATE TABLE IF NOT EXISTS whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp store connections table (relación N:M)
CREATE TABLE IF NOT EXISTS whatsapp_store_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_number_id UUID REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(whatsapp_number_id, store_id)
);

-- WhatsApp configurations table (DEPRECATED - mantener por compatibilidad)
CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  phone_numbers TEXT[] NOT NULL,
  webhook_url TEXT NOT NULL,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_configured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  whatsapp_number TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  conversation_id TEXT UNIQUE NOT NULL,
  title TEXT, -- Título auto-generado o personalizado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  twilio_message_sid TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  media_url TEXT,
  agent_type TEXT CHECK (agent_type IN ('orchestrator', 'analytics', 'customer_service', 'marketing')),
  confidence DECIMAL(3,2),
  processing_time_ms INTEGER,
  reasoning TEXT,  -- Agent reasoning for transparency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics cache table
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('sales', 'products', 'customers', 'orders')),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  language TEXT DEFAULT 'es' CHECK (language IN ('es', 'pt', 'en')),
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  whatsapp_notifications BOOLEAN DEFAULT TRUE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_platform_store_id ON stores(platform_store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_user_id ON whatsapp_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_phone ON whatsapp_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_number_id ON whatsapp_store_connections(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_store_id ON whatsapp_store_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_user_id ON whatsapp_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_number ON conversations(customer_number);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_store_id ON analytics_cache(store_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON analytics_cache(expires_at);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_store_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Stores policies
CREATE POLICY "Users can view own stores" ON stores FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own stores" ON stores FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own stores" ON stores FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own stores" ON stores FOR DELETE USING (auth.uid()::text = user_id::text);

-- WhatsApp numbers policies
CREATE POLICY "Users can view own whatsapp numbers" ON whatsapp_numbers FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own whatsapp numbers" ON whatsapp_numbers FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own whatsapp numbers" ON whatsapp_numbers FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own whatsapp numbers" ON whatsapp_numbers FOR DELETE USING (auth.uid()::text = user_id::text);

-- WhatsApp store connections policies
CREATE POLICY "Users can view own whatsapp store connections" ON whatsapp_store_connections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM whatsapp_numbers 
    WHERE whatsapp_numbers.id = whatsapp_store_connections.whatsapp_number_id 
    AND whatsapp_numbers.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can insert own whatsapp store connections" ON whatsapp_store_connections FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM whatsapp_numbers 
    WHERE whatsapp_numbers.id = whatsapp_store_connections.whatsapp_number_id 
    AND whatsapp_numbers.user_id::text = auth.uid()::text
  ) AND EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = whatsapp_store_connections.store_id 
    AND stores.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can update own whatsapp store connections" ON whatsapp_store_connections FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM whatsapp_numbers 
    WHERE whatsapp_numbers.id = whatsapp_store_connections.whatsapp_number_id 
    AND whatsapp_numbers.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can delete own whatsapp store connections" ON whatsapp_store_connections FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM whatsapp_numbers 
    WHERE whatsapp_numbers.id = whatsapp_store_connections.whatsapp_number_id 
    AND whatsapp_numbers.user_id::text = auth.uid()::text
  )
);

-- WhatsApp configs policies
CREATE POLICY "Users can view own whatsapp configs" ON whatsapp_configs FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own whatsapp configs" ON whatsapp_configs FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own whatsapp configs" ON whatsapp_configs FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own whatsapp configs" ON whatsapp_configs FOR DELETE USING (auth.uid()::text = user_id::text);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Messages policies
CREATE POLICY "Users can view messages from own conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can insert messages to own conversations" ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id::text = auth.uid()::text
  )
);

-- Analytics cache policies
CREATE POLICY "Users can view own analytics cache" ON analytics_cache FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = analytics_cache.store_id 
    AND stores.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can insert own analytics cache" ON analytics_cache FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = analytics_cache.store_id 
    AND stores.user_id::text = auth.uid()::text
  )
);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_numbers_updated_at BEFORE UPDATE ON whatsapp_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_store_connections_updated_at BEFORE UPDATE ON whatsapp_store_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_configs_updated_at BEFORE UPDATE ON whatsapp_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TiendaNube tokens table (para OAuth tokens)
CREATE TABLE IF NOT EXISTS tiendanube_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

-- Índice para tiendanube_tokens
CREATE INDEX IF NOT EXISTS idx_tiendanube_tokens_store_id ON tiendanube_tokens(store_id);
CREATE INDEX IF NOT EXISTS idx_tiendanube_tokens_user_id ON tiendanube_tokens(user_id);

-- RLS para tiendanube_tokens
ALTER TABLE tiendanube_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own tokens" ON tiendanube_tokens FOR ALL USING (auth.uid()::text = user_id::text);

-- Trigger para tiendanube_tokens
CREATE TRIGGER update_tiendanube_tokens_updated_at BEFORE UPDATE ON tiendanube_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`; 