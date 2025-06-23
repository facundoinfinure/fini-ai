/**
 * API para verificar y configurar la base de datos inicial
 * También valida la configuración de variables de entorno
 * GET /api/setup-database
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

interface ConfigurationStatus {
  database: boolean;
  tiendanube: boolean;
  whatsapp: boolean;
  stripe: boolean;
  errors: string[];
  warnings: string[];
}

export async function GET(request: NextRequest) {
  try {
    console.log('[SETUP] Checking system configuration');
    
    const status: ConfigurationStatus = {
      database: false,
      tiendanube: false,
      whatsapp: false,
      stripe: false,
      errors: [],
      warnings: []
    };

    // Check database configuration
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) {
        status.errors.push(`Database connection failed: ${error.message}`);
      } else {
        status.database = true;
        console.log('[SETUP] Database connection: OK');
      }
    } catch (dbError) {
      status.errors.push(`Database configuration error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // Check Tienda Nube configuration
    const tiendanubeClientId = process.env.TIENDANUBE_CLIENT_ID;
    const tiendanubeClientSecret = process.env.TIENDANUBE_CLIENT_SECRET;
    const tiendanubeRedirectUri = process.env.TIENDANUBE_REDIRECT_URI;

    if (!tiendanubeClientId) {
      status.errors.push('TIENDANUBE_CLIENT_ID is not configured');
    }
    if (!tiendanubeClientSecret) {
      status.errors.push('TIENDANUBE_CLIENT_SECRET is not configured');
    }
    if (!tiendanubeRedirectUri) {
      status.warnings.push('TIENDANUBE_REDIRECT_URI is not configured (will use default)');
    }

    if (tiendanubeClientId && tiendanubeClientSecret) {
      status.tiendanube = true;
      console.log('[SETUP] Tienda Nube configuration: OK');
    }

    // Check WhatsApp/Twilio configuration
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioAccountSid) {
      status.warnings.push('TWILIO_ACCOUNT_SID is not configured (WhatsApp features will be limited)');
    }
    if (!twilioAuthToken) {
      status.warnings.push('TWILIO_AUTH_TOKEN is not configured (WhatsApp features will be limited)');
    }

    if (twilioAccountSid && twilioAuthToken) {
      status.whatsapp = true;
      console.log('[SETUP] WhatsApp/Twilio configuration: OK');
    }

    // Check Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!stripeSecretKey) {
      status.warnings.push('STRIPE_SECRET_KEY is not configured (subscription features will be limited)');
    }
    if (!stripePublishableKey) {
      status.warnings.push('STRIPE_PUBLISHABLE_KEY is not configured (subscription features will be limited)');
    }

    if (stripeSecretKey && stripePublishableKey) {
      status.stripe = true;
      console.log('[SETUP] Stripe configuration: OK');
    }

    // Overall system status
    const hasConfigurationErrors = status.errors.length > 0;
    const isMinimallyConfigured = status.database && status.tiendanube;

    console.log('[SETUP] Configuration check completed:', {
      database: status.database,
      tiendanube: status.tiendanube,
      whatsapp: status.whatsapp,
      stripe: status.stripe,
      errors: status.errors.length,
      warnings: status.warnings.length
    });

    return NextResponse.json({
      success: !hasConfigurationErrors,
      configured: isMinimallyConfigured,
      status,
      message: hasConfigurationErrors
        ? 'Configuration errors found'
        : isMinimallyConfigured
        ? 'System is properly configured'
        : 'Minimal configuration missing'
    });

  } catch (error) {
    console.error('[SETUP] Configuration check failed:', error);
    return NextResponse.json({
      success: false,
      configured: false,
      status: {
        database: false,
        tiendanube: false,
        whatsapp: false,
        stripe: false,
        errors: [error instanceof Error ? error.message : 'Unknown configuration error'],
        warnings: []
      },
      message: 'Configuration check failed'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('[INFO] Configurando base de datos...')
    
    // SQL para crear las tablas y políticas
    const setupSQL = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Users table (extends Supabase auth.users)
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
      CREATE TABLE IF NOT EXISTS public.stores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        tiendanube_store_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT, -- Nullable because Tienda Nube doesn't provide refresh tokens
        token_expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_sync_at TIMESTAMP WITH TIME ZONE
      );

      -- WhatsApp configurations table
      CREATE TABLE IF NOT EXISTS public.whatsapp_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
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
      CREATE TABLE IF NOT EXISTS public.conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
        whatsapp_number TEXT NOT NULL,
        customer_number TEXT NOT NULL,
        conversation_id TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
        twilio_message_sid TEXT,
        direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        body TEXT NOT NULL,
        media_url TEXT,
        agent_type TEXT CHECK (agent_type IN ('orchestrator', 'analytics', 'customer_service', 'marketing')),
        confidence DECIMAL(3,2),
        processing_time_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Analytics cache table
      CREATE TABLE IF NOT EXISTS public.analytics_cache (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
        data_type TEXT NOT NULL CHECK (data_type IN ('sales', 'products', 'customers', 'orders')),
        period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
        data JSONB NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- User settings table
      CREATE TABLE IF NOT EXISTS public.user_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
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
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
      CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
      CREATE INDEX IF NOT EXISTS idx_stores_tiendanube_id ON public.stores(tiendanube_store_id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_user_id ON public.whatsapp_configs(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_customer_number ON public.conversations(customer_number);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_cache_store_id ON public.analytics_cache(store_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON public.analytics_cache(expires_at);

      -- Row Level Security (RLS) policies
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

      -- Users can only access their own data
      DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
      DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
      DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
      
      CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
      CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
      CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

      -- Stores policies
      DROP POLICY IF EXISTS "Users can view own stores" ON public.stores;
      DROP POLICY IF EXISTS "Users can insert own stores" ON public.stores;
      DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
      DROP POLICY IF EXISTS "Users can delete own stores" ON public.stores;
      
      CREATE POLICY "Users can view own stores" ON public.stores FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own stores" ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own stores" ON public.stores FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "Users can delete own stores" ON public.stores FOR DELETE USING (auth.uid() = user_id);

      -- WhatsApp configs policies
      DROP POLICY IF EXISTS "Users can view own whatsapp configs" ON public.whatsapp_configs;
      DROP POLICY IF EXISTS "Users can insert own whatsapp configs" ON public.whatsapp_configs;
      DROP POLICY IF EXISTS "Users can update own whatsapp configs" ON public.whatsapp_configs;
      DROP POLICY IF EXISTS "Users can delete own whatsapp configs" ON public.whatsapp_configs;
      
      CREATE POLICY "Users can view own whatsapp configs" ON public.whatsapp_configs FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own whatsapp configs" ON public.whatsapp_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own whatsapp configs" ON public.whatsapp_configs FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "Users can delete own whatsapp configs" ON public.whatsapp_configs FOR DELETE USING (auth.uid() = user_id);

      -- Conversations policies
      DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
      DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
      DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
      
      CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);

      -- Messages policies
      DROP POLICY IF EXISTS "Users can view messages from own conversations" ON public.messages;
      DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON public.messages;
      
      CREATE POLICY "Users can view messages from own conversations" ON public.messages FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.conversations 
          WHERE public.conversations.id = public.messages.conversation_id 
          AND public.conversations.user_id = auth.uid()
        )
      );
      CREATE POLICY "Users can insert messages to own conversations" ON public.messages FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.conversations 
          WHERE public.conversations.id = public.messages.conversation_id 
          AND public.conversations.user_id = auth.uid()
        )
      );

      -- Analytics cache policies
      DROP POLICY IF EXISTS "Users can view own analytics cache" ON public.analytics_cache;
      DROP POLICY IF EXISTS "Users can insert own analytics cache" ON public.analytics_cache;
      
      CREATE POLICY "Users can view own analytics cache" ON public.analytics_cache FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.stores 
          WHERE public.stores.id = public.analytics_cache.store_id 
          AND public.stores.user_id = auth.uid()
        )
      );
      CREATE POLICY "Users can insert own analytics cache" ON public.analytics_cache FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.stores 
          WHERE public.stores.id = public.analytics_cache.store_id 
          AND public.stores.user_id = auth.uid()
        )
      );

      -- User settings policies
      DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
      DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
      DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
      
      CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

      -- Functions for automatic timestamps
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Triggers for automatic updated_at
      DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
      DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
      DROP TRIGGER IF EXISTS update_whatsapp_configs_updated_at ON public.whatsapp_configs;
      DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
      DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
      
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_whatsapp_configs_updated_at BEFORE UPDATE ON public.whatsapp_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Function to handle new user creation
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.users (id, email, name, image)
        VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'avatar_url');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Trigger to create user profile on signup
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `

    // Split the SQL into individual statements and execute them
    const statements = setupSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: `${statement.trim()};` });
        if (error) {
          console.error('[ERROR] Error executing statement:', statement.trim(), error);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('[SUCCESS] Base de datos configurada correctamente')
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos configurada correctamente'
    })
    
  } catch (error) {
    console.error('[ERROR] Error en setup-database:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 