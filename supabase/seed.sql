-- ================================================
-- FINI AI - Seed Data for Development
-- ================================================

-- Insert demo user
INSERT INTO users (id, email, full_name, plan_type, subscription_status) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'demo@fini-ai.com', 'Demo User', 'pro', 'active');

-- Insert demo Tienda Nube store
INSERT INTO tienda_nube_stores (
  id, 
  user_id, 
  store_id, 
  store_name, 
  store_url, 
  access_token, 
  is_active,
  store_data
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  '12345',
  'Demo Store - Ropa y Accesorios',
  'https://demostore.tiendanube.com',
  'demo_access_token_12345',
  true,
  '{"currency": "ARS", "country": "AR", "language": "es", "category": "fashion"}'::jsonb
);

-- Insert demo WhatsApp integration
INSERT INTO whatsapp_integrations (
  id,
  user_id,
  store_id,
  phone_number,
  whatsapp_business_account_id,
  phone_number_id,
  access_token,
  webhook_verify_token,
  is_verified,
  is_active
) VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440001',
  '+5491123456789',
  'demo_business_account_123',
  'demo_phone_number_id_456',
  'demo_whatsapp_token_789',
  'demo_verify_token_abc',
  true,
  true
);

-- Insert demo conversation
INSERT INTO whatsapp_conversations (
  id,
  integration_id,
  customer_phone,
  customer_name,
  conversation_type,
  status,
  message_count
) VALUES (
  '880e8400-e29b-41d4-a716-446655440003',
  '770e8400-e29b-41d4-a716-446655440002',
  '+5491187654321',
  'María González',
  'user_initiated',
  'active',
  5
);

-- Insert demo messages
INSERT INTO whatsapp_messages (
  conversation_id,
  message_id,
  direction,
  message_type,
  content,
  status,
  timestamp
) VALUES 
  (
    '880e8400-e29b-41d4-a716-446655440003',
    'msg_001',
    'inbound',
    'text',
    '{"body": "Hola, ¿cuáles son los productos más vendidos esta semana?"}'::jsonb,
    'delivered',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    'msg_002',
    'outbound',
    'text',
    '{"body": "¡Hola María! 📊 Top productos esta semana:\n\n1. Remera Básica Negra - 25 vendidas\n2. Jean Slim Fit - 18 vendidas\n3. Zapatillas Deportivas - 15 vendidas\n\n💰 Total vendido: $87,500"}'::jsonb,
    'delivered',
    NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    'msg_003',
    'inbound',
    'text',
    '{"body": "Perfecto! ¿Y el revenue de hoy?"}'::jsonb,
    'delivered',
    NOW() - INTERVAL '1 hour'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    'msg_004',
    'outbound',
    'text',
    '{"body": "💰 Revenue de hoy:\n\n💵 Total: $12,450\n📦 Órdenes: 8\n📊 Promedio por orden: $1,556\n\n🔥 ¡Un 15% más que ayer!"}'::jsonb,
    'delivered',
    NOW() - INTERVAL '1 hour' + INTERVAL '15 seconds'
  );

-- Insert demo analytics queries
INSERT INTO analytics_queries (
  store_id,
  conversation_id,
  query_type,
  query_params,
  response_data,
  execution_time_ms
) VALUES 
  (
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    'top_products',
    '{"period": "week", "limit": 5}'::jsonb,
    '{"products": [{"name": "Remera Básica Negra", "sold": 25}, {"name": "Jean Slim Fit", "sold": 18}]}'::jsonb,
    245
  ),
  (
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    'revenue',
    '{"period": "day"}'::jsonb,
    '{"total": 12450, "orders": 8, "average": 1556}'::jsonb,
    180
  );

-- Insert demo automated report
INSERT INTO automated_reports (
  store_id,
  report_type,
  schedule_time,
  timezone,
  is_enabled
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  'daily',
  '09:00:00',
  'America/Argentina/Buenos_Aires',
  true
);

-- Insert demo agent conversation
INSERT INTO agent_conversations (
  conversation_id,
  agent_type,
  context,
  memory
) VALUES (
  '880e8400-e29b-41d4-a716-446655440003',
  'analytics',
  '{"intent": "revenue_query", "confidence": 0.95, "entities": [{"type": "time_period", "value": "today"}]}'::jsonb,
  '{"previous_queries": ["top_products"], "customer_preferences": {"language": "es", "time_format": "24h"}}'::jsonb
);

-- Insert demo vector document
INSERT INTO vector_documents (
  store_id,
  document_type,
  content,
  metadata
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  'product_catalog',
  'Remera Básica Negra - Prenda de algodón 100%, disponible en talles S a XL. Ideal para uso diario. Color negro clásico que combina con todo.',
  '{"product_id": "prod_001", "category": "remeras", "tags": ["básico", "algodón", "negro"], "price": 2500}'::jsonb
);

-- Insert demo agent action
INSERT INTO agent_actions (
  conversation_id,
  agent_type,
  action_type,
  action_data,
  status,
  result
) VALUES (
  '880e8400-e29b-41d4-a716-446655440003',
  'analytics',
  'query_execution',
  '{"query_type": "revenue", "parameters": {"period": "day"}}'::jsonb,
  'completed',
  '{"success": true, "execution_time": 180, "data_points": 8}'::jsonb
);

-- Fini AI - Seed Data for Development & Testing
-- File: supabase/seed.sql

-- ============================================================================
-- DEMO USERS & PROFILES
-- ============================================================================

-- Insert demo user profiles (these will need to be created in auth.users first)
-- For development, you'll need to sign up these users through the UI first

-- Demo user 1: Basic plan user
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  phone, 
  plan_type, 
  trial_ends_at,
  onboarding_completed
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'demo@example.com',
  'Demo Usuario',
  '+5491123456789',
  'basic',
  NOW() + INTERVAL '14 days',
  true
) ON CONFLICT (id) DO NOTHING;

-- Demo user 2: Pro plan user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  phone,
  plan_type,
  plan_expires_at,
  onboarding_completed
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'pro@example.com',
  'Pro Usuario',
  '+5491123456790',
  'pro',
  NOW() + INTERVAL '30 days',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO TIENDA NUBE STORES
-- ============================================================================

-- Demo store 1 (Basic plan user)
INSERT INTO public.tiendanube_stores (
  id,
  user_id,
  store_id,
  store_url,
  store_name,
  access_token,
  last_sync_at,
  sync_status,
  webhook_url,
  webhook_secret,
  settings
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  'demo-store-123',
  'https://demo-store.mitiendanube.com',
  'Demo Store - Ropa y Accesorios',
  'encrypted_demo_token_123',
  NOW() - INTERVAL '1 hour',
  'completed',
  'https://fini-ai.vercel.app/api/webhooks/tiendanube',
  'demo_webhook_secret_123',
  '{"auto_sync": true, "sync_frequency": "hourly", "categories": ["clothing", "accessories"]}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Demo store 2 (Pro plan user)
INSERT INTO public.tiendanube_stores (
  id,
  user_id,
  store_id,
  store_url,
  store_name,
  access_token,
  last_sync_at,
  sync_status,
  webhook_url,
  webhook_secret,
  settings
) VALUES (
  '660e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440002',
  'pro-store-456',
  'https://pro-store.mitiendanube.com',
  'Pro Electronics Store',
  'encrypted_pro_token_456',
  NOW() - INTERVAL '30 minutes',
  'completed',
  'https://fini-ai.vercel.app/api/webhooks/tiendanube',
  'pro_webhook_secret_456',
  '{"auto_sync": true, "sync_frequency": "realtime", "categories": ["electronics", "gadgets", "computers"]}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SYNC HISTORY
-- ============================================================================

-- Recent sync history for demo stores
INSERT INTO public.sync_history (store_id, sync_type, status, records_processed, started_at, completed_at) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'products', 'completed', 45, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes'),
('660e8400-e29b-41d4-a716-446655440001', 'orders', 'completed', 12, NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 25 minutes'),
('660e8400-e29b-41d4-a716-446655440001', 'customers', 'completed', 8, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '58 minutes'),
('660e8400-e29b-41d4-a716-446655440002', 'full', 'completed', 234, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes');

-- ============================================================================
-- WHATSAPP CONFIGURATIONS
-- ============================================================================

-- WhatsApp config for demo store 1
INSERT INTO public.whatsapp_configs (
  id,
  user_id,
  store_id,
  phone_number,
  phone_number_id,
  business_account_id,
  access_token,
  webhook_verify_token,
  webhook_url,
  is_verified,
  settings
) VALUES (
  '770e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440001',
  '+5491123456789',
  'demo_phone_id_123',
  'demo_business_123',
  'encrypted_whatsapp_token_123',
  'demo_webhook_verify_123',
  'https://fini-ai.vercel.app/api/whatsapp/webhook',
  true,
  '{"business_hours": {"start": "09:00", "end": "18:00", "timezone": "America/Argentina/Buenos_Aires"}, "auto_reply": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- WhatsApp config for demo store 2
INSERT INTO public.whatsapp_configs (
  id,
  user_id,
  store_id,
  phone_number,
  phone_number_id,
  business_account_id,
  access_token,
  webhook_verify_token,
  webhook_url,
  is_verified,
  settings
) VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440002',
  '+5491123456790',
  'pro_phone_id_456',
  'pro_business_456',
  'encrypted_whatsapp_token_456',
  'pro_webhook_verify_456',
  'https://fini-ai.vercel.app/api/whatsapp/webhook',
  true,
  '{"business_hours": {"start": "08:00", "end": "20:00", "timezone": "America/Argentina/Buenos_Aires"}, "auto_reply": true, "advanced_routing": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO CONVERSATIONS
-- ============================================================================

-- Active conversation 1 (Demo store)
INSERT INTO public.conversations (
  id,
  store_id,
  whatsapp_config_id,
  customer_phone,
  customer_name,
  customer_id,
  status,
  last_message_at,
  context
) VALUES (
  '880e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440001',
  '770e8400-e29b-41d4-a716-446655440001',
  '+5491987654321',
  'María González',
  'customer_123',
  'active',
  NOW() - INTERVAL '15 minutes',
  '{"last_agent": "analytics", "context_summary": "Cliente preguntando por ventas y stock", "conversation_stage": "active_inquiry", "customer_preferences": ["analytics", "sales_data"]}'::jsonb
) ON CONFLICT (store_id, customer_phone) DO NOTHING;

-- Resolved conversation 2 (Demo store)
INSERT INTO public.conversations (
  id,
  store_id,
  whatsapp_config_id,
  customer_phone,
  customer_name,
  status,
  last_message_at,
  context
) VALUES (
  '880e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440001',
  '770e8400-e29b-41d4-a716-446655440001',
  '+5491987654322',
  'Carlos Pérez',
  'resolved',
  NOW() - INTERVAL '2 hours',
  '{"last_agent": "customer_service", "context_summary": "Consulta sobre pedido resuelto", "resolution": "order_status_provided", "satisfaction": "high"}'::jsonb
) ON CONFLICT (store_id, customer_phone) DO NOTHING;

-- Active conversation 3 (Pro store)
INSERT INTO public.conversations (
  id,
  store_id,
  whatsapp_config_id,
  customer_phone,
  customer_name,
  customer_id,
  status,
  last_message_at,
  context
) VALUES (
  '880e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440002',
  '770e8400-e29b-41d4-a716-446655440002',
  '+5491987654323',
  'Ana Rodríguez',
  'pro_customer_456',
  'active',
  NOW() - INTERVAL '5 minutes',
  '{"last_agent": "marketing", "context_summary": "Interesada en estrategias de marketing", "conversation_stage": "consultation", "expertise_level": "advanced"}'::jsonb
) ON CONFLICT (store_id, customer_phone) DO NOTHING;

-- ============================================================================
-- DEMO MESSAGES
-- ============================================================================

-- Messages for conversation 1 (Analytics inquiry)
INSERT INTO public.messages (conversation_id, whatsapp_message_id, direction, message_type, content, agent_type, processing_time_ms, confidence_score, rag_context, sent_at) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'msg_001', 'inbound', 'text', 'Hola! Cuánto vendí la semana pasada?', null, null, null, '{}'::jsonb, NOW() - INTERVAL '20 minutes'),
('880e8400-e29b-41d4-a716-446655440001', 'msg_002', 'outbound', 'text', '¡Hola María! Te ayudo con esos datos. La semana pasada vendiste $45,230 pesos en 12 órdenes. Tu producto más vendido fue "Remera Basic Cotton" con 8 unidades. ¿Te gustaría ver más detalles?', 'analytics', 2340, 0.89, '{"products_sold": 8, "revenue_week": 45230, "orders_count": 12}'::jsonb, NOW() - INTERVAL '19 minutes'),
('880e8400-e29b-41d4-a716-446655440001', 'msg_003', 'inbound', 'text', 'Sí! Y también me gustaría saber qué productos están con poco stock', null, null, null, '{}'::jsonb, NOW() - INTERVAL '18 minutes'),
('880e8400-e29b-41d4-a716-446655440001', 'msg_004', 'outbound', 'text', 'Perfecto! Estos son tus productos con stock bajo (menos de 5 unidades):\n\n📦 Remera Basic Cotton: 2 unidades\n📦 Jeans Slim Fit: 1 unidad\n📦 Zapatillas Urbanas: 3 unidades\n\n¿Necesitas ayuda para planificar la reposición?', 'analytics', 1890, 0.92, '{"low_stock_products": 3, "critical_stock": 1, "inventory_alert": true}'::jsonb, NOW() - INTERVAL '17 minutes'),
('880e8400-e29b-41d4-a716-446655440001', 'msg_005', 'inbound', 'text', 'Perfecto, gracias! Una consulta más: tenés alguna idea de marketing para aumentar ventas?', null, null, null, '{}'::jsonb, NOW() - INTERVAL '15 minutes');

-- Messages for conversation 2 (Customer service)
INSERT INTO public.messages (conversation_id, whatsapp_message_id, direction, message_type, content, agent_type, processing_time_ms, confidence_score, rag_context, sent_at) VALUES
('880e8400-e29b-41d4-a716-446655440002', 'msg_006', 'inbound', 'text', 'Hola, consulta por mi pedido #12345', null, null, null, '{}'::jsonb, NOW() - INTERVAL '3 hours'),
('880e8400-e29b-41d4-a716-446655440002', 'msg_007', 'outbound', 'text', 'Hola Carlos! Tu pedido #12345 fue despachado ayer y está en camino. El código de seguimiento es TN789456123. Llegaría mañana entre 14-18hs. ¿Algo más en lo que pueda ayudarte?', 'customer_service', 1560, 0.94, '{"order_id": "12345", "status": "shipped", "tracking": "TN789456123", "eta": "tomorrow"}'::jsonb, NOW() - INTERVAL '2 hours 58 minutes'),
('880e8400-e29b-41d4-a716-446655440002', 'msg_008', 'inbound', 'text', 'Perfecto! Muchas gracias por la info 👍', null, null, null, '{}'::jsonb, NOW() - INTERVAL '2 hours 55 minutes'),
('880e8400-e29b-41d4-a716-446655440002', 'msg_009', 'outbound', 'text', '¡De nada! Cualquier otra consulta, estoy aquí para ayudarte 😊', 'customer_service', 890, 0.88, '{}'::jsonb, NOW() - INTERVAL '2 hours 54 minutes');

-- Messages for conversation 3 (Marketing consultation)
INSERT INTO public.messages (conversation_id, whatsapp_message_id, direction, message_type, content, agent_type, processing_time_ms, confidence_score, rag_context, sent_at) VALUES
('880e8400-e29b-41d4-a716-446655440003', 'msg_010', 'inbound', 'text', 'Hola! Necesito ideas de marketing para mi tienda de electrónicos', null, null, null, '{}'::jsonb, NOW() - INTERVAL '10 minutes'),
('880e8400-e29b-41d4-a716-446655440003', 'msg_011', 'outbound', 'text', '¡Hola Ana! Te ayudo con estrategias de marketing para electrónicos. Basándome en tus datos, te sugiero:\n\n🎯 **Email marketing**: Tus clientes compran gadgets cada 3-4 meses\n📱 **Retargeting**: Productos complementarios (cables, fundas)\n🔥 **Ofertas flash**: Los martes son tu mejor día de ventas\n💡 **Content marketing**: Reviews y tutoriales\n\n¿Te interesa profundizar en alguna estrategia?', 'marketing', 3240, 0.87, '{"customer_behavior": "repeat_buyer", "avg_purchase_cycle": "3_months", "best_day": "tuesday", "category": "electronics"}'::jsonb, NOW() - INTERVAL '8 minutes'),
('880e8400-e29b-41d4-a716-446655440003', 'msg_012', 'inbound', 'text', 'Me interesa mucho el email marketing! Cómo empiezo?', null, null, null, '{}'::jsonb, NOW() - INTERVAL '5 minutes');

-- ============================================================================
-- RAG DOCUMENTS (Demo indexed content)
-- ============================================================================

-- Products indexed in RAG
INSERT INTO public.rag_documents (store_id, document_type, external_id, vector_namespace, chunk_count, checksum, metadata) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'product', 'prod_123', 'store-demo-store-123-products', 2, 'abc123', '{"name": "Remera Basic Cotton", "price": 2500, "stock": 2}'::jsonb),
('660e8400-e29b-41d4-a716-446655440001', 'product', 'prod_124', 'store-demo-store-123-products', 2, 'def456', '{"name": "Jeans Slim Fit", "price": 8900, "stock": 1}'::jsonb),
('660e8400-e29b-41d4-a716-446655440001', 'product', 'prod_125', 'store-demo-store-123-products', 1, 'ghi789', '{"name": "Zapatillas Urbanas", "price": 12500, "stock": 3}'::jsonb);

-- Orders indexed in RAG
INSERT INTO public.rag_documents (store_id, document_type, external_id, vector_namespace, chunk_count, checksum, metadata) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'order', 'order_12345', 'store-demo-store-123-orders', 1, 'ord123', '{"total": 15400, "status": "shipped", "customer": "Carlos Pérez"}'::jsonb),
('660e8400-e29b-41d4-a716-446655440002', 'order', 'order_67890', 'store-pro-store-456-orders', 1, 'ord456', '{"total": 45600, "status": "delivered", "customer": "Ana Rodríguez"}'::jsonb);

-- ============================================================================
-- ANALYTICS & METRICS
-- ============================================================================

-- Usage analytics for the last 7 days
INSERT INTO public.usage_analytics (user_id, store_id, metric_type, metric_value, date) VALUES
-- Demo store metrics
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'messages_sent', 15, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'messages_received', 18, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'agent_requests', 8, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'rag_queries', 12, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'messages_sent', 22, CURRENT_DATE - 1),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'messages_received', 25, CURRENT_DATE - 1),
-- Pro store metrics
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'messages_sent', 45, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'messages_received', 52, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'agent_requests', 28, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'rag_queries', 34, CURRENT_DATE);

-- Agent performance metrics
INSERT INTO public.agent_metrics (store_id, agent_type, conversation_id, processing_time_ms, confidence_score, success, context_used, tokens_used) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'analytics', '880e8400-e29b-41d4-a716-446655440001', 2340, 0.89, true, 3, 245),
('660e8400-e29b-41d4-a716-446655440001', 'analytics', '880e8400-e29b-41d4-a716-446655440001', 1890, 0.92, true, 5, 198),
('660e8400-e29b-41d4-a716-446655440001', 'customer_service', '880e8400-e29b-41d4-a716-446655440002', 1560, 0.94, true, 2, 167),
('660e8400-e29b-41d4-a716-446655440001', 'customer_service', '880e8400-e29b-41d4-a716-446655440002', 890, 0.88, true, 0, 89),
('660e8400-e29b-41d4-a716-446655440002', 'marketing', '880e8400-e29b-41d4-a716-446655440003', 3240, 0.87, true, 8, 456);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

-- Current subscriptions
INSERT INTO public.subscriptions (user_id, plan_type, status, current_period_start, current_period_end, trial_ends_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'basic', 'trial', NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days'),
('550e8400-e29b-41d4-a716-446655440002', 'pro', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', null);

-- ============================================================================
-- FUNCTIONS FOR DEMO DATA
-- ============================================================================

-- Function to generate more demo conversations
CREATE OR REPLACE FUNCTION generate_demo_conversation(
  p_store_id UUID,
  p_whatsapp_config_id UUID,
  p_customer_phone TEXT,
  p_customer_name TEXT DEFAULT 'Cliente Demo'
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Insert conversation
  INSERT INTO public.conversations (
    store_id,
    whatsapp_config_id,
    customer_phone,
    customer_name,
    status,
    last_message_at,
    context
  ) VALUES (
    p_store_id,
    p_whatsapp_config_id,
    p_customer_phone,
    p_customer_name,
    'active',
    NOW(),
    '{"demo": true, "generated": true}'::jsonb
  ) RETURNING id INTO conversation_id;
  
  -- Insert a demo message
  INSERT INTO public.messages (
    conversation_id,
    direction,
    message_type,
    content,
    sent_at
  ) VALUES (
    conversation_id,
    'inbound',
    'text',
    'Hola! Es una conversación de demo',
    NOW()
  );
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql; 