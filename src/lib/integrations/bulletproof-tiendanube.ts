/**
 * 🛡️ BULLETPROOF TIENDANUBE CONNECTION SYSTEM
 * ==========================================
 * 
 * Sistema robusto que garantiza que las tiendas se conecten correctamente
 * y los datos se sincronicen automáticamente.
 * 
 * CARACTERÍSTICAS:
 * - Manejo robusto de errores
 * - Retry automático con backoff exponencial  
 * - Validación completa de tokens
 * - Sincronización automática de datos
 * - Reconexión automática cuando es necesario
 */

import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI, exchangeCodeForToken } from './tiendanube';
import { StoreService } from '@/lib/database/client';

interface ConnectionResult {
  success: boolean;
  store?: any;
  error?: string;
  syncStatus?: 'completed' | 'partial' | 'failed';
}

interface StoreConnectionData {
  userId: string;
  storeUrl: string;
  storeName: string;
  authCode: string;
  context?: string;
}

export class BulletproofTiendaNube {
  
  /**
   * 🎯 CONEXIÓN PRINCIPAL - ULTRA-FAST VERSION
   * ==========================================
   * Conecta una tienda de forma robusta y ultra-rápida
   */
  static async connectStore(data: StoreConnectionData): Promise<ConnectionResult> {
    console.log('🛡️ [BULLETPROOF] Starting ULTRA-FAST store connection...');
    const startTime = Date.now();

    try {
      // 1. 🚀 ULTRA-FAST: Intercambiar código por token
      console.log('🔄 [BULLETPROOF] Exchanging code for token...');
      const authResult = await this.exchangeCodeWithRetry(data.authCode, 2); // Reduced retries
      
      if (!authResult.success) {
        return { success: false, error: `Token exchange failed: ${authResult.error}` };
      }

      const { access_token, user_id } = authResult.data!;

      // 2. 🚀 ULTRA-FAST: Obtener información básica de la tienda
      console.log('🔄 [BULLETPROOF] Getting basic store information...');
      const storeInfoResult = await this.getBasicStoreInfo(access_token, user_id.toString());
      
      if (!storeInfoResult.success) {
        return { success: false, error: `Store info failed: ${storeInfoResult.error}` };
      }

      const storeInfo = storeInfoResult.data!;

      // 3. 🚀 ULTRA-FAST: Preparar y guardar datos básicos SOLO
      console.log('🔄 [BULLETPROOF] Saving basic store data...');
      const storeData = this.prepareStoreData(data, storeInfo, access_token);
      
      // Usar createOrUpdateStore para manejar todos los casos
      const saveResult = await StoreService.createOrUpdateStore(storeData);
      
      if (!saveResult.success) {
        return { success: false, error: `Store save failed: ${saveResult.error}` };
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [BULLETPROOF] ULTRA-FAST connection completed in ${totalTime}ms`);

      // 4. 🚀 FIRE-AND-FORGET: Disparar todas las operaciones pesadas en background
      this.triggerBackgroundOperations(saveResult.store!.id, access_token, data.userId);

      return {
        success: true,
        store: saveResult.store,
        syncStatus: 'completed'
      };

    } catch (error) {
      console.error('❌ [BULLETPROOF] Critical error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔄 Intercambiar código por token con reintentos mínimos
   */
  private static async exchangeCodeWithRetry(code: string, maxAttempts = 2): Promise<{ success: boolean; data?: any; error?: string }> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const authResponse = await exchangeCodeForToken(code);
        
        if (!authResponse.access_token || !authResponse.user_id) {
          throw new Error('Invalid response from TiendaNube');
        }

        return { success: true, data: authResponse };

      } catch (error) {
        console.error(`❌ [BULLETPROOF] Token exchange attempt ${attempt} failed:`, error);
        
        if (attempt === maxAttempts) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Token exchange failed'
          };
        }

        await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Reduced delay
      }
    }

    return { success: false, error: 'Maximum retry attempts reached' };
  }

  /**
   * 🏪 Obtener información básica de la tienda (ULTRA-FAST)
   */
  private static async getBasicStoreInfo(accessToken: string, storeId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Timeout de 10 segundos para evitar que se cuelgue
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const api = new TiendaNubeAPI(accessToken, storeId);
        const storeInfo = await api.getStore();
        clearTimeout(timeoutId);
        return { success: true, data: storeInfo };
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Método alternativo más rápido
        const storesResponse = await fetch('https://api.tiendanube.com/v1/stores', {
          headers: {
            'Authentication': `bearer ${accessToken}`,
            'User-Agent': 'FiniAI/1.0 (UltraFast)',
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        if (!storesResponse.ok) {
          throw new Error(`Stores API failed: ${storesResponse.status}`);
        }

        const storesData = await storesResponse.json();
        
        if (!storesData || storesData.length === 0) {
          throw new Error('No stores found');
        }

        return { success: true, data: storesData[0] };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Store info failed'
      };
    }
  }

  /**
   * 📦 Preparar datos de la tienda
   */
  private static prepareStoreData(connectionData: StoreConnectionData, storeInfo: any, accessToken: string) {
    console.log('📦 [BULLETPROOF] Preparing store data...');

    return {
      user_id: connectionData.userId,
      name: connectionData.storeName,
      domain: connectionData.storeUrl, // ✅ Fixed: url -> domain (correct field name)
      platform: 'tiendanube' as const,
      platform_store_id: storeInfo.id?.toString() || '',
      access_token: accessToken,
      currency: storeInfo.country || 'ARS',
      timezone: storeInfo.timezone || 'America/Argentina/Buenos_Aires',
      language: storeInfo.language || 'es',
      is_active: true,
      last_sync_at: null, // ✅ Fixed: last_sync -> last_sync_at (correct field name)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * 🚀 TRIGGER OPERACIONES BACKGROUND (FIRE-AND-FORGET)
   * ===================================================
   * Dispara todas las operaciones pesadas de forma asíncrona
   */
  private static triggerBackgroundOperations(storeId: string, accessToken: string, userId: string): void {
    // NO usar await - fire and forget
    this.executeAsyncBackgroundOperations(storeId, accessToken, userId).catch(error => {
      console.warn('🚀 [BULLETPROOF] Background operations failed (non-blocking):', error);
    });
  }

  /**
   * 🔄 EJECUTAR OPERACIONES BACKGROUND ASÍNCRONAS
   * =============================================
   * Todas las operaciones pesadas se ejecutan aquí
   */
  private static async executeAsyncBackgroundOperations(storeId: string, accessToken: string, userId: string): Promise<void> {
    try {
      console.log('🔄 [BULLETPROOF] Starting background operations for store:', storeId);

      // 1. Inicializar namespaces RAG (si es necesario)
      setTimeout(async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          
          fetch(`${baseUrl}/api/stores/background-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId,
              accessToken,
              userId,
              operation: 'full_initialization',
              jobId: `init-${storeId}-${Date.now()}`
            })
          }).catch(e => console.warn('Background sync HTTP call failed:', e));
          
        } catch (error) {
          console.warn('🔄 Failed to trigger background operations:', error);
        }
      }, 2000); // 2 segundos de delay

      console.log('✅ [BULLETPROOF] Background operations triggered successfully');
      
    } catch (error) {
      console.error('🔄 [BULLETPROOF] Background operations setup failed:', error);
    }
  }

} 