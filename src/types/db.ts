import { Database } from './database';

export interface Store {
  id: string;
  user_id: string;
  platform: 'tiendanube' | 'shopify' | 'woocommerce' | 'other';
  platform_store_id: string;
  name: string;
  domain: string;
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  currency?: string;
  timezone?: string;
  language?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sync_at?: string | null;
}

export type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row']; 