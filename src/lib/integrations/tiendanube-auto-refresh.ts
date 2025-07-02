/**
 * TiendaNube Token Auto-Refresh System
 */
import { createClient } from '@supabase/supabase-js';
import { TiendaNubeTokenManager } from './tiendanube-token-manager';

export class TiendaNubeAutoRefresh {
  private static instance: TiendaNubeAutoRefresh;
  private refreshQueue = new Map<string, Promise<string>>();
  
  static getInstance(): TiendaNubeAutoRefresh {
    if (!TiendaNubeAutoRefresh.instance) {
      TiendaNubeAutoRefresh.instance = new TiendaNubeAutoRefresh();
    }
    return TiendaNubeAutoRefresh.instance;
  }
  
  async getValidToken(storeId: string, userId: string): Promise<string> {
    try {
      const token = await TiendaNubeTokenManager.getValidToken(storeId);
      if (!token) {
        throw new Error('Token not found - user needs to reconnect TiendaNube');
      }
      return token;
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.includes('expired')) {
        console.log('[AUTO-REFRESH] Token expired, attempting refresh...');
        return this.handleTokenRefresh(storeId, userId);
      }
      throw error;
    }
  }
  
  private async handleTokenRefresh(storeId: string, userId: string): Promise<string> {
    const key = storeId + ':' + userId;
    
    if (this.refreshQueue.has(key)) {
      return this.refreshQueue.get(key)!;
    }
    
    const refreshPromise = this.performTokenRefresh(storeId, userId);
    this.refreshQueue.set(key, refreshPromise);
    
    try {
      const result = await refreshPromise;
      this.refreshQueue.delete(key);
      return result;
    } catch (error) {
      this.refreshQueue.delete(key);
      throw error;
    }
  }
  
  private async performTokenRefresh(storeId: string, userId: string): Promise<string> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: tokenData, error } = await supabase
      .from('tiendanube_tokens')
      .select('*')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .single();
      
    if (error || !tokenData?.refresh_token) {
      throw new Error('Token not found - user needs to reconnect TiendaNube');
    }
    
    const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: process.env.TIENDANUBE_CLIENT_ID!,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET!,
      }),
    });
    
    if (!response.ok) throw new Error('Failed to refresh token');
    
    const refreshData = await response.json();
    
    await supabase.from('tiendanube_tokens').update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token || tokenData.refresh_token,
      expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('store_id', storeId).eq('user_id', userId);
    
    console.log('[AUTO-REFRESH] ✅ Token refreshed successfully');
    return refreshData.access_token;
  }
}

export const tiendaNubeAutoRefresh = TiendaNubeAutoRefresh.getInstance();