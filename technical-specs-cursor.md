# Especificaciones Técnicas - App Tienda Nube + WhatsApp

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
```
Frontend: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
Backend: Next.js API Routes + tRPC
Base de Datos: Supabase (PostgreSQL)
WhatsApp API: Twilio
Auth: NextAuth.js + Supabase Auth
Deployment: Vercel
State Management: Zustand
Forms: React Hook Form + Zod
```

---

## 📁 Estructura del Proyecto

```
tienda-nube-whatsapp/
├── .env.local
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── webhooks/
│   │   │   ├── tiendanube/
│   │   │   └── whatsapp/
│   │   ├── dashboard/
│   │   ├── onboarding/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── chat/
│   │   └── analytics/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── twilio.ts
│   │   ├── tiendanube.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   ├── types/
│   │   ├── tiendanube.ts
│   │   ├── whatsapp.ts
│   │   └── database.ts
│   ├── hooks/
│   ├── stores/
│   └── utils/
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── docs/
    ├── api.md
    └── deployment.md
```

---

## 🗄️ Esquema de Base de Datos (Supabase)

### 1. Tabla: users
```sql
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
```

### 2. Tabla: tienda_nube_stores
```sql
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
```

### 3. Tabla: whatsapp_integrations
```sql
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
```

### 4. Tabla: whatsapp_conversations
```sql
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
```

### 5. Tabla: whatsapp_messages
```sql
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
```

### 6. Tabla: analytics_queries
```sql
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
```

### 7. Tabla: automated_reports
```sql
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
```

---

## 🔧 Variables de Entorno

### .env.example
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Tienda Nube
TIENDANUBE_CLIENT_ID=your_tiendanube_client_id
TIENDANUBE_CLIENT_SECRET=your_tiendanube_client_secret
TIENDANUBE_REDIRECT_URI=http://localhost:3000/api/auth/tiendanube/callback

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# WhatsApp Business API (for production)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key

# App Config
APP_URL=http://localhost:3000
WEBHOOK_SECRET=your_webhook_secret
```

---

## 📋 Tipos TypeScript

### types/tiendanube.ts
```typescript
export interface TiendaNubeStore {
  id: number;
  name: string;
  url: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeProduct {
  id: number;
  name: string;
  description: string;
  handle: string;
  attributes: Array<{
    id: number;
    name: string;
    value: string;
  }>;
  published: boolean;
  free_shipping: boolean;
  requires_shipping: boolean;
  canonical_url: string;
  seo_title: string;
  seo_description: string;
  brand: string;
  created_at: string;
  updated_at: string;
  variants: TiendaNubeVariant[];
  images: TiendaNubeImage[];
  categories: TiendaNubeCategory[];
}

export interface TiendaNubeVariant {
  id: number;
  product_id: number;
  sku: string;
  barcode: string;
  price: string;
  promotional_price: string | null;
  stock_management: boolean;
  stock: number;
  weight: string;
  width: string;
  height: string;
  depth: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeOrder {
  id: number;
  number: number;
  token: string;
  status: 'open' | 'closed' | 'cancelled';
  payment_status: 'pending' | 'authorized' | 'paid' | 'voided' | 'refunded' | 'partially_refunded';
  gateway_status: string;
  subtotal: string;
  discount: string;
  total: string;
  total_usd: string;
  checkout_enabled: boolean;
  weight: string;
  currency: string;
  language: string;
  gateway: string;
  shipping: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  next_action: string;
  payment_details: any;
  attributes: any[];
  note: string;
  customer: TiendaNubeCustomer;
  products: TiendaNubeOrderProduct[];
  billing_address: TiendaNubeAddress;
  shipping_address: TiendaNubeAddress;
}

export interface TiendaNubeCustomer {
  id: number;
  name: string;
  email: string;
  identification: string;
  phone: string;
  note: string;
  default_address: TiendaNubeAddress;
  addresses: TiendaNubeAddress[];
  billing_name: string;
  billing_phone: string;
  billing_address: TiendaNubeAddress;
  extra: any;
  total_spent: string;
  total_spent_currency: string;
  last_order_id: number | null;
  active: boolean;
  first_interaction: string;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeAddress {
  address: string;
  city: string;
  country: string;
  created_at: string;
  default: boolean;
  floor: string;
  id: number;
  locality: string;
  number: string;
  phone: string;
  province: string;
  updated_at: string;
  zipcode: string;
}

export interface TiendaNubeAuthResponse {
  access_token: string;
  token_type: 'bearer';
  scope: string;
  user_id: number;
}
```

### types/whatsapp.ts
```typescript
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
```

### types/database.ts
```typescript
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
          store_data: any | null;
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
          store_data?: any | null;
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
          store_data?: any | null;
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
    };
  };
}
```

---

## 🔌 Configuración de APIs

### lib/supabase.ts
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### lib/twilio.ts
```typescript
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

export const twilioClient = twilio(accountSid, authToken);

export class TwilioWhatsAppService {
  async sendMessage(to: string, body: string) {
    try {
      const message = await twilioClient.messages.create({
        from: whatsappNumber,
        to: `whatsapp:${to}`,
        body: body,
      });
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTemplate(to: string, templateName: string, variables: string[] = []) {
    try {
      const message = await twilioClient.messages.create({
        from: whatsappNumber,
        to: `whatsapp:${to}`,
        contentSid: templateName,
        contentVariables: JSON.stringify(variables.reduce((acc, val, idx) => {
          acc[`${idx + 1}`] = val;
          return acc;
        }, {} as Record<string, string>)),
      });
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('Error sending WhatsApp template:', error);
      return { success: false, error: error.message };
    }
  }
}

export const whatsappService = new TwilioWhatsAppService();
```

### lib/tiendanube.ts
```typescript
import type { TiendaNubeStore, TiendaNubeProduct, TiendaNubeOrder, TiendaNubeAuthResponse } from '@/types/tiendanube';

const TIENDA_NUBE_API_BASE = 'https://api.tiendanube.com/v1';
const CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID!;
const CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.TIENDANUBE_REDIRECT_URI!;

export class TiendaNubeAPI {
  private accessToken: string;
  private storeId: string;

  constructor(accessToken: string, storeId: string) {
    this.accessToken = accessToken;
    this.storeId = storeId;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${TIENDA_NUBE_API_BASE}/${this.storeId}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authentication': `bearer ${this.accessToken}`,
        'User-Agent': 'WhatsAppAnalytics/1.0 (support@yourapp.com)',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`TiendaNube API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Store Info
  async getStore(): Promise<TiendaNubeStore> {
    return this.makeRequest<TiendaNubeStore>('/store');
  }

  // Products
  async getProducts(params?: {
    since_id?: number;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    published?: boolean;
    fields?: string;
    limit?: number;
    page?: number;
  }): Promise<TiendaNubeProduct[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/products${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.makeRequest<TiendaNubeProduct[]>(endpoint);
  }

  async getProduct(productId: number): Promise<TiendaNubeProduct> {
    return this.makeRequest<TiendaNubeProduct>(`/products/${productId}`);
  }

  // Orders
  async getOrders(params?: {
    since_id?: number;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    status?: string;
    payment_status?: string;
    shipping_status?: string;
    fields?: string;
    limit?: number;
    page?: number;
  }): Promise<TiendaNubeOrder[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/orders${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.makeRequest<TiendaNubeOrder[]>(endpoint);
  }

  async getOrder(orderId: number): Promise<TiendaNubeOrder> {
    return this.makeRequest<TiendaNubeOrder>(`/orders/${orderId}`);
  }

  // Analytics methods
  async getTopProducts(period: 'day' | 'week' | 'month' = 'week', limit: number = 5) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const orders = await this.getOrders({
      created_at_min: startDate.toISOString(),
      created_at_max: endDate.toISOString(),
      status: 'closed',
      limit: 250,
    });

    // Process orders to get top products
    const productSales = new Map<number, { product: any; quantity: number; revenue: number }>();
    
    orders.forEach(order => {
      order.products.forEach(product => {
        const existing = productSales.get(product.product_id);
        if (existing) {
          existing.quantity += product.quantity;
          existing.revenue += parseFloat(product.price) * product.quantity;
        } else {
          productSales.set(product.product_id, {
            product: product,
            quantity: product.quantity,
            revenue: parseFloat(product.price) * product.quantity,
          });
        }
      });
    });

    return Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  async getRevenue(period: 'day' | 'week' | 'month' = 'week') {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const orders = await this.getOrders({
      created_at_min: startDate.toISOString(),
      created_at_max: endDate.toISOString(),
      status: 'closed',
      payment_status: 'paid',
      limit: 250,
    });

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.total);
    }, 0);

    return {
      period,
      totalRevenue,
      totalOrders: orders.length,
      averageOrderValue: totalRevenue / (orders.length || 1),
      orders: orders.slice(0, 10), // Return latest 10 orders
    };
  }

  async getPendingOrders() {
    return this.getOrders({
      status: 'open',
      limit: 50,
    });
  }
}

// OAuth Flow
export const getTiendaNubeAuthUrl = (state?: string) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'read_products read_orders read_customers read_shipping',
    ...(state && { state }),
  });

  return `https://www.tiendanube.com/apps/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<TiendaNubeAuthResponse> => {
  const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
};
```

---

## 🤖 Servicio de ChatBot

### lib/chatbot.ts
```typescript
import { TiendaNubeAPI } from './tiendanube';
import { whatsappService } from './twilio';
import { supabaseAdmin } from './supabase';

export interface ChatbotContext {
  storeId: string;
  accessToken: string;
  phoneNumber: string;
  conversationId: string;
}

export class ChatbotService {
  private tiendaNubeAPI: TiendaNubeAPI;
  private context: ChatbotContext;

  constructor(context: ChatbotContext) {
    this.context = context;
    this.tiendaNubeAPI = new TiendaNubeAPI(context.accessToken, context.storeId);
  }

  async processMessage(incomingMessage: string): Promise<string> {
    const message = incomingMessage.toLowerCase().trim();

    // Log the query
    await this.logQuery(message);

    // Determine intent and respond
    if (message.includes('productos') || message.includes('vendidos') || message.includes('top')) {
      return this.handleTopProductsQuery(message);
    }
    
    if (message.includes('revenue') || message.includes('ventas') || message.includes('dinero') || message.includes('ingresos')) {
      return this.handleRevenueQuery(message);
    }
    
    if (message.includes('ordenes') || message.includes('pedidos') || message.includes('orders')) {
      return this.handleOrdersQuery(message);
    }
    
    if (message.includes('resumen') || message.includes('summary') || message.includes('reporte')) {
      return this.handleSummaryQuery();
    }
    
    if (message.includes('ayuda') || message.includes('help') || message.includes('opciones')) {
      return this.getHelpMessage();
    }

    // Default response with options
    return this.getWelcomeMessage();
  }

  private async handleTopProductsQuery(message: string): Promise<string> {
    try {
      const period = this.extractPeriod(message);
      const topProducts = await this.tiendaNubeAPI.getTopProducts(period, 5);

      if (topProducts.length === 0) {
        return `📊 No hay ventas registradas en el período de ${period === 'day' ? 'hoy' : period === 'week' ? 'esta semana' : 'este mes'}.`;
      }

      let response = `📊 *Top 5 productos más vendidos (${period === 'day' ? 'hoy' : period === 'week' ? 'esta semana' : 'este mes'}):*\n\n`;
      
      topProducts.forEach((item, index) => {
        response += `${index + 1}. *${item.product.name}*\n`;
        response += `   • Vendidos: ${item.quantity} unidades\n`;
        response += `   • Revenue: $${item.revenue.toFixed(2)}\n\n`;
      });

      await this.logQuery('top_products', { period, count: topProducts.length });
      return response;
    } catch (error) {
      console.error('Error getting top products:', error);
      return '❌ Error al obtener los productos más vendidos. Intenta de nuevo más tarde.';
    }
  }

  private async handleRevenueQuery(message: string): Promise<string> {
    try {
      const period = this.extractPeriod(message);
      const revenueData = await this.tiendaNubeAPI.getRevenue(period);

      const periodText = period === 'day' ? 'hoy' : period === 'week' ? 'esta semana' : 'este mes';
      
      let response = `💰 *Revenue ${periodText}:*\n\n`;
      response += `💵 Total: $${revenueData.totalRevenue.toFixed(2)}\n`;
      response += `📦 Órdenes: ${revenueData.totalOrders}\n`;
      response += `📊 Promedio por orden: $${revenueData.averageOrderValue.toFixed(2)}\n\n`;

      if (revenueData.orders.length > 0) {
        response += `🔥 *Últimas órdenes:*\n`;
        revenueData.orders.slice(0, 3).forEach(order => {
          response += `• Orden #${order.number}: $${order.total}\n`;
        });
      }

      await this.logQuery('revenue', { period, revenue: revenueData.totalRevenue });
      return response;
    } catch (error) {
      console.error('Error getting revenue:', error);
      return '❌ Error al obtener el revenue. Intenta de nuevo más tarde.';
    }
  }

  private async handleOrdersQuery(message: string): Promise<string> {
    try {
      const pendingOrders = await this.tiendaNubeAPI.getPendingOrders();

      if (pendingOrders.length === 0) {
        return '✅ ¡Genial! No hay órdenes pendientes en este momento.';
      }

      let response = `📋 *Órdenes pendientes (${pendingOrders.length}):*\n\n`;
      
      pendingOrders.slice(0, 10).forEach(order => {
        response += `• Orden #${order.number}\n`;
        response += `  💰 Total: $${order.total}\n`;
        response += `  📧 Cliente: ${order.customer.email}\n`;
        response += `  📅 Fecha: ${new Date(order.created_at).toLocaleDateString()}\n\n`;
      });

      if (pendingOrders.length > 10) {
        response += `... y ${pendingOrders.length - 10} órdenes más.`;
      }

      await this.logQuery('orders', { count: pendingOrders.length });
      return response;
    } catch (error) {
      console.error('Error getting orders:', error);
      return '❌ Error al obtener las órdenes. Intenta de nuevo más tarde.';
    }
  }

  private async handleSummaryQuery(): Promise<string> {
    try {
      const [revenueToday, revenueWeek, topProducts, pendingOrders] = await Promise.all([
        this.tiendaNubeAPI.getRevenue('day'),
        this.tiendaNubeAPI.getRevenue('week'),
        this.tiendaNubeAPI.getTopProducts('week', 3),
        this.tiendaNubeAPI.getPendingOrders(),
      ]);

      let response = `📊 *Resumen Ejecutivo*\n\n`;
      
      response += `💰 *Revenue:*\n`;
      response += `• Hoy: $${revenueToday.totalRevenue.toFixed(2)} (${revenueToday.totalOrders} órdenes)\n`;
      response += `• Esta semana: $${revenueWeek.totalRevenue.toFixed(2)} (${revenueWeek.totalOrders} órdenes)\n\n`;
      
      response += `🔥 *Top productos (semana):*\n`;
      topProducts.forEach((item, index) => {
        response += `${index + 1}. ${item.product.name} (${item.quantity} vendidos)\n`;
      });
      
      response += `\n📋 *Órdenes pendientes:* ${pendingOrders.length}\n\n`;
      response += `📈 *Promedio por orden:* $${revenueWeek.averageOrderValue.toFixed(2)}`;

      await this.logQuery('summary');
      return response;
    } catch (error) {
      console.error('Error getting summary:', error);
      return '❌ Error al generar el resumen. Intenta de nuevo más tarde.';
    }
  }

  private getWelcomeMessage(): string {
    return `👋 ¡Hola! Soy el asistente de tu tienda.\n\n` +
           `¿Qué quieres saber?\n\n` +
           `📊 *Productos más vendidos*\n` +
           `💰 *Revenue y ventas*\n` +
           `📋 *Órdenes pendientes*\n` +
           `📈 *Resumen ejecutivo*\n\n` +
           `Escribe "ayuda" para ver todas las opciones.`;
  }

  private getHelpMessage(): string {
    return `🆘 *Comandos disponibles:*\n\n` +
           `📊 *Productos:*\n` +
           `• "productos más vendidos"\n` +
           `• "top productos hoy/semana/mes"\n\n` +
           `💰 *Revenue:*\n` +
           `• "revenue de hoy/semana/mes"\n` +
           `• "cuánto vendí"\n\n` +
           `📋 *Órdenes:*\n` +
           `• "órdenes pendientes"\n` +
           `• "pedidos por procesar"\n\n` +
           `📈 *Reportes:*\n` +
           `• "resumen ejecutivo"\n` +
           `• "reporte completo"\n\n` +
           `💡 También puedes preguntarme en lenguaje natural.`;
  }

  private extractPeriod(message: string): 'day' | 'week' | 'month' {
    if (message.includes('hoy') || message.includes('today') || message.includes('día')) {
      return 'day';
    }
    if (message.includes('mes') || message.includes('month') || message.includes('mensual')) {
      return 'month';
    }
    return 'week'; // default
  }

  private async logQuery(queryType: string, params?: any) {
    try {
      await supabaseAdmin
        .from('analytics_queries')
        .insert({
          store_id: this.context.storeId,
          conversation_id: this.context.conversationId,
          query_type: queryType,
          query_params: params,
          response_data: null,
          execution_time_ms: 0,
        });
    } catch (error) {
      console.error('Error logging query:', error);
    }
  }
}
```

---

## 🔗 API Routes

### app/api/webhooks/whatsapp/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ChatbotService } from '@/lib/chatbot';
import { whatsappService } from '@/lib/twilio';
import type { TwilioWhatsAppMessage } from '@/types/whatsapp';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge);
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = new URLSearchParams(body);
    
    const message: TwilioWhatsAppMessage = {
      From: data.get('From') || '',
      To: data.get('To') || '',
      Body: data.get('Body') || '',
      MessageSid: data.get('MessageSid') || '',
      AccountSid: data.get('AccountSid') || '',
      NumMedia: data.get('NumMedia') || '0',
      ProfileName: data.get('ProfileName') || '',
      WaId: data.get('WaId') || '',
    };

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = message.From.replace('whatsapp:', '');
    
    // Find the integration for this phone number
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('whatsapp_integrations')
      .select(`
        *,
        tienda_nube_stores!inner(*)
      `)
      .eq('phone_number', phoneNumber)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found for phone:', phoneNumber);
      return new NextResponse('Integration not found', { status: 404 });
    }

    // Find or create conversation
    let { data: conversation, error: conversationError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('*')
      .eq('integration_id', integration.id)
      .eq('customer_phone', message.WaId)
      .eq('status', 'active')
      .single();

    if (conversationError || !conversation) {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from('whatsapp_conversations')
        .insert({
          integration_id: integration.id,
          customer_phone: message.WaId,
          customer_name: message.ProfileName,
          conversation_type: 'user_initiated',
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return new NextResponse('Error creating conversation', { status: 500 });
      }

      conversation = newConversation;
    }

    // Save incoming message
    await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        message_id: message.MessageSid,
        direction: 'inbound',
        message_type: 'text',
        content: { body: message.Body },
        status: 'delivered',
        timestamp: new Date().toISOString(),
      });

    // Process message with chatbot
    const chatbot = new ChatbotService({
      storeId: integration.tienda_nube_stores.store_id,
      accessToken: integration.tienda_nube_stores.access_token,
      phoneNumber: phoneNumber,
      conversationId: conversation.id,
    });

    const response = await chatbot.processMessage(message.Body);

    // Send response
    const sendResult = await whatsappService.sendMessage(message.WaId, response);

    if (sendResult.success) {
      // Save outbound message
      await supabaseAdmin
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          message_id: sendResult.messageId,
          direction: 'outbound',
          message_type: 'text',
          content: { body: response },
          status: 'sent',
          timestamp: new Date().toISOString(),
        });

      // Update conversation
      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: conversation.message_count + 2, // +1 for incoming, +1 for outgoing
        })
        .eq('id', conversation.id);
    }

    return new NextResponse('OK');
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

### app/api/auth/tiendanube/callback/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, TiendaNubeAPI } from '@/lib/tiendanube';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url));
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);

    // Get store information
    const tiendaNubeAPI = new TiendaNubeAPI(tokenData.access_token, tokenData.user_id.toString());
    const storeInfo = await tiendaNubeAPI.getStore();

    // Get current user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin?error=no_session', request.url));
    }

    // Find user in database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.redirect(new URL('/dashboard?error=user_not_found', request.url));
    }

    // Save store integration
    const { error: storeError } = await supabaseAdmin
      .from('tienda_nube_stores')
      .upsert({
        user_id: user.id,
        store_id: tokenData.user_id.toString(),
        store_name: storeInfo.name,
        store_url: storeInfo.url,
        access_token: tokenData.access_token,
        is_active: true,
        store_data: storeInfo,
      });

    if (storeError) {
      console.error('Error saving store:', storeError);
      return NextResponse.redirect(new URL('/dashboard?error=store_save_failed', request.url));
    }

    return NextResponse.redirect(new URL('/dashboard?success=store_connected', request.url));
  } catch (error) {
    console.error('Error in TiendaNube callback:', error);
    return NextResponse.redirect(new URL('/dashboard?error=callback_failed', request.url));
  }
}
```

---

## 📦 package.json

```json
{
  "name": "tienda-nube-whatsapp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.2",
    "@next-auth/supabase-adapter": "^0.1.0",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-button": "^2.0.3",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/supabase-js": "^2.38.4",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.294.0",
    "next": "14.0.4",
    "next-auth": "^4.24.5",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7.48.2",
    "recharts": "^2.8.0",
    "tailwind-merge": "^2.1.0",
    "tailwindcss-animate": "^1.0.7",
    "twilio": "^4.19.3",
    "typescript": "^5",
    "zod": "^3.22.4",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/twilio": "^3.19.0",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.0.4",
    "postcss": "^8",
    "tailwindcss": "^3.3.0"
  }
}
```

---

## 🚀 Instrucciones de Desarrollo con Cursor

### Paso 1: Configuración Inicial
```bash
# Crear proyecto
npx create-next-app@latest tienda-nube-whatsapp --typescript --tailwind --eslint --app

# Instalar dependencias
cd tienda-nube-whatsapp
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install twilio @types/twilio
npm install next-auth @next-auth/supabase-adapter
npm install react-hook-form @hookform/resolvers zod
npm install zustand recharts lucide-react
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge tailwindcss-animate

# Configurar variables de entorno
cp .env.example .env.local
```

### Paso 2: Configurar Supabase
1. Crear proyecto en supabase.com
2. Ejecutar migraciones SQL del esquema de base de datos
3. Obtener URL y claves del proyecto
4. Actualizar .env.local

### Paso 3: Configurar Twilio
1. Crear cuenta en Twilio
2. Configurar WhatsApp Sandbox o obtener número aprobado
3. Configurar webhook URL: `https://tudominio.com/api/webhooks/whatsapp`
4. Obtener Account SID y Auth Token

### Paso 4: Configurar Tienda Nube
1. Registrarse como socio tecnológico
2. Crear aplicación en el portal
3. Configurar OAuth redirect URI: `https://tudominio.com/api/auth/tiendanube/callback`
4. Obtener Client ID y Client Secret

### Paso 5: Desarrollar con Cursor
1. Abrir el proyecto en Cursor
2. Usar las especificaciones técnicas como referencia
3. Implementar componente por componente
4. Testear integraciones paso a paso

### Comandos Útiles para Cursor
```bash
# Generar tipos de Supabase
npm run db:generate

# Desarrollo local
npm run dev

# Build para producción
npm run build
```

---

## 🎯 Próximos Pasos

1. **Setup inicial**: Configurar proyecto Next.js con las dependencias
2. **Base de datos**: Crear esquemas en Supabase 
3. **Autenticación**: Implementar OAuth con Tienda Nube
4. **WhatsApp**: Configurar webhook de Twilio
5. **Chatbot**: Desarrollar lógica de procesamiento de mensajes
6. **Dashboard**: Crear interfaz de administración
7. **Testing**: Probar integración completa
8. **Deploy**: Subir a Vercel

¿Te gustaría que empiece con alguna sección específica o necesitas aclaración sobre algún punto técnico?