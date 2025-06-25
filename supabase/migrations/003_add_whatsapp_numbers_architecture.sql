-- Migration to add new WhatsApp numbers architecture (N:M relationship)
-- This replaces the old whatsapp_configs table with a more flexible structure

-- WhatsApp numbers table (nueva arquitectura N:M)
CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.whatsapp_store_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(whatsapp_number_id, store_id)
);

-- Additional WhatsApp-related tables for enhanced functionality
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  customer_number TEXT NOT NULL,
  conversation_sid TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'template')),
  content JSONB NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_user_id ON public.whatsapp_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_phone ON public.whatsapp_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_number_id ON public.whatsapp_store_connections(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_store_id ON public.whatsapp_store_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_id ON public.whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_number ON public.whatsapp_conversations(customer_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp);

-- Row Level Security (RLS) policies
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_store_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- WhatsApp numbers policies
CREATE POLICY "Users can view own whatsapp numbers" ON public.whatsapp_numbers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp numbers" ON public.whatsapp_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whatsapp numbers" ON public.whatsapp_numbers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own whatsapp numbers" ON public.whatsapp_numbers FOR DELETE USING (auth.uid() = user_id);

-- WhatsApp store connections policies
CREATE POLICY "Users can view own whatsapp store connections" ON public.whatsapp_store_connections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_numbers 
    WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
    AND public.whatsapp_numbers.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own whatsapp store connections" ON public.whatsapp_store_connections FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_numbers 
    WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
    AND public.whatsapp_numbers.user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM public.stores 
    WHERE public.stores.id = public.whatsapp_store_connections.store_id 
    AND public.stores.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own whatsapp store connections" ON public.whatsapp_store_connections FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_numbers 
    WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
    AND public.whatsapp_numbers.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own whatsapp store connections" ON public.whatsapp_store_connections FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_numbers 
    WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
    AND public.whatsapp_numbers.user_id = auth.uid()
  )
);

-- WhatsApp conversations policies
CREATE POLICY "Users can view own whatsapp conversations" ON public.whatsapp_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp conversations" ON public.whatsapp_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whatsapp conversations" ON public.whatsapp_conversations FOR UPDATE USING (auth.uid() = user_id);

-- WhatsApp messages policies
CREATE POLICY "Users can view messages from own whatsapp conversations" ON public.whatsapp_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations 
    WHERE public.whatsapp_conversations.id = public.whatsapp_messages.conversation_id 
    AND public.whatsapp_conversations.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert messages to own whatsapp conversations" ON public.whatsapp_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations 
    WHERE public.whatsapp_conversations.id = public.whatsapp_messages.conversation_id 
    AND public.whatsapp_conversations.user_id = auth.uid()
  )
);

-- Triggers for automatic updated_at
CREATE TRIGGER update_whatsapp_numbers_updated_at BEFORE UPDATE ON public.whatsapp_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_store_connections_updated_at BEFORE UPDATE ON public.whatsapp_store_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 