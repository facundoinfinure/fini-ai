import { Database } from './database';

export type Store = Database['public']['Tables']['tienda_nube_stores']['Row'];
export type WhatsAppConfig = Database['public']['Tables']['whatsapp_integrations']['Row']; 