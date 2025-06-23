import { Database } from './database';

export type Store = Database['public']['Tables']['stores']['Row'];
export type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row']; 