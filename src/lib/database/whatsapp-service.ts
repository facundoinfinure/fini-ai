import { createClient } from '@/lib/supabase/server';

export const WhatsAppService = {
  async deleteConfigByStoreId(storeId: string) {
    const supabase = createClient();
    try {
      console.log(`[INFO] Deleting WhatsApp config for store: ${storeId}`);
      
      const { data, error } = await supabase
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