import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const WhatsAppService = {
  async deleteConfigByStoreId(storeId: string) {
    try {
      console.log(`[INFO] Deleting WhatsApp config for store: ${storeId}`);
      
      const { data, error } = await _supabaseAdmin
        .from('whatsapp_configs')
        .delete()
        .eq('store_id', storeId);

      if (error) {
        console.error(`[ERROR] Failed to delete WhatsApp config for store ${storeId}:`, error);
        return { success: false, error: error.message };
      }

      console.log(`[INFO] Successfully deleted WhatsApp config for store ${storeId}.`);
      return { success: true, data };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERROR] Exception when deleting WhatsApp config for store ${storeId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  },
}; 