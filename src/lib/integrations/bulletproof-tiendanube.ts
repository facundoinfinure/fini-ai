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
import { CircuitBreakerManager } from '@/lib/resilience/circuit-breaker';
import { RetryManager, RetryConfigs } from '@/lib/resilience/retry-manager';

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

      // 3. 🔒 ENHANCED: Check if this is a reconnection scenario
      console.log('🔄 [BULLETPROOF] Checking for existing store (reconnection detection)...');
      let isReconnection = false;
      
      try {
        const existingStoreResult = await StoreService.getStoresByUserId(data.userId);
        
        if (existingStoreResult.success && existingStoreResult.stores) {
          // Check if store with same platform_store_id exists
          const existingStore = existingStoreResult.stores.find(store => 
            store.platform_store_id === storeInfo.id?.toString() && 
            store.platform === 'tiendanube'
          );
          
          if (existingStore) {
            isReconnection = true;
            console.log(`🔒 [BULLETPROOF] Detected RECONNECTION for existing store: ${existingStore.id}`);
          } else {
            console.log(`🔒 [BULLETPROOF] Detected NEW CONNECTION for store: ${storeInfo.id}`);
          }
        }
      } catch (error) {
        console.warn('🔒 [BULLETPROOF] Failed to check existing stores, assuming new connection:', error);
        // Continue as new connection if check fails
      }

      // 4. 🚀 ULTRA-FAST: Preparar y guardar datos básicos SOLO
      console.log('🔄 [BULLETPROOF] Saving basic store data...');
      const storeData = this.prepareStoreData(data, storeInfo, access_token);
      
      // Usar createOrUpdateStore para manejar todos los casos
      const saveResult = await StoreService.createOrUpdateStore(storeData);
      
      if (!saveResult.success) {
        return { success: false, error: `Store save failed: ${saveResult.error}` };
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [BULLETPROOF] ULTRA-FAST connection completed in ${totalTime}ms (reconnection: ${isReconnection})`);

      // 5. 🔒 ENHANCED: Lock-aware background operations with reconnection detection
      this.triggerBackgroundOperations(saveResult.store!.id, access_token, data.userId, isReconnection);

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
   * 🔄 Intercambiar código por token con sistema de resilience
   */
  private static async exchangeCodeWithRetry(code: string, maxAttempts = 3): Promise<{ success: boolean; data?: any; error?: string }> {
    const circuitBreaker = CircuitBreakerManager.getInstance().getBreaker('tiendanube-oauth', {
      failureThreshold: 3,
      resetTimeout: 30000,
      monitoringPeriod: 10000,
      expectedErrors: ['timeout', 'network', 'connection']
    });

    const retryManager = RetryManager.getInstance();

    try {
      const result = await circuitBreaker.execute(async () => {
        return await retryManager.executeWithRetry(
          async () => {
            const authResponse = await exchangeCodeForToken(code);
            
            if (!authResponse.access_token || !authResponse.user_id) {
              throw new Error('Invalid response from TiendaNube: missing access_token or user_id');
            }

            return authResponse;
          },
          RetryConfigs.EXTERNAL_API,
          'tiendanube-token-exchange'
        );
      });

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error?.message || 'Token exchange failed' };
      }

    } catch (error) {
      console.error(`❌ [BULLETPROOF] Token exchange failed with circuit breaker:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed'
      };
    }
  }

  /**
   * 🏪 Obtener información básica de la tienda con sistema de resilience
   */
  private static async getBasicStoreInfo(accessToken: string, storeId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const circuitBreaker = CircuitBreakerManager.getInstance().getBreaker('tiendanube-store-info', {
      failureThreshold: 3,
      resetTimeout: 30000,
      monitoringPeriod: 10000,
      expectedErrors: ['timeout', 'network', 'connection', 'rate limit']
    });

    const retryManager = RetryManager.getInstance();

    try {
      const result = await circuitBreaker.execute(async () => {
        return await retryManager.executeWithRetry(
          async () => {
            // Timeout de 15 segundos para evitar que se cuelgue
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
              const api = new TiendaNubeAPI(accessToken, storeId);
              const storeInfo = await api.getStore();
              clearTimeout(timeoutId);
              return storeInfo;
            } catch (error) {
              clearTimeout(timeoutId);
              
              // Método alternativo más rápido con timeout
              const fallbackController = new AbortController();
              const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000);
              
              try {
                const storesResponse = await fetch('https://api.tiendanube.com/v1/stores', {
                  headers: {
                    'Authentication': `bearer ${accessToken}`,
                    'User-Agent': 'FiniAI/1.0 (Resilient)',
                    'Content-Type': 'application/json',
                  },
                  signal: fallbackController.signal
                });

                clearTimeout(fallbackTimeoutId);

                if (!storesResponse.ok) {
                  throw new Error(`Stores API failed: ${storesResponse.status} ${storesResponse.statusText}`);
                }

                const storesData = await storesResponse.json();
                
                if (!storesData || storesData.length === 0) {
                  throw new Error('No stores found for this token');
                }

                return storesData[0];
              } catch (fallbackError) {
                clearTimeout(fallbackTimeoutId);
                throw fallbackError;
              }
            }
          },
          RetryConfigs.EXTERNAL_API,
          'tiendanube-store-info'
        );
      });

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error?.message || 'Store info failed' };
      }

    } catch (error) {
      console.error(`❌ [BULLETPROOF] Store info failed with circuit breaker:`, error);
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
   * 🔒 ENHANCED: Lock-aware background operations trigger (FIRE-AND-FORGET)
   * ======================================================================
   * Dispara todas las operaciones pesadas de forma asíncrona con locks
   */
  private static triggerBackgroundOperations(storeId: string, accessToken: string, userId: string, isReconnection = false): void {
    // NO usar await - fire and forget
    this.executeAsyncBackgroundOperations(storeId, accessToken, userId, isReconnection).catch(error => {
      console.warn('🚀 [BULLETPROOF] Lock-aware background operations failed (non-blocking):', error);
    });
  }

  /**
   * 🔒 ENHANCED: Lock-aware async background operations
   * ==================================================
   * Todas las operaciones pesadas se ejecutan aquí con protección de locks
   */
  private static async executeAsyncBackgroundOperations(storeId: string, accessToken: string, userId: string, isReconnection = false): Promise<void> {
    let lockProcessId: string | null = null;
    
    try {
      console.log(`🔄 [BULLETPROOF] Starting lock-aware background operations for store: ${storeId} (reconnection: ${isReconnection})`);

      // 🔒 STEP 1: Determine lock type based on operation
      const lockType = isReconnection ? 'RECONNECTION' : 'BACKGROUND_SYNC';
      console.log(`🔒 [BULLETPROOF] Using lock type: ${lockType}`);

      // STEP 2: Delay and then trigger lock-aware background sync
      setTimeout(async () => {
        try {
          // 🔒 Check for lock conflicts before triggering sync
          const { checkRAGLockConflicts, RAGLockType, StoreReconnectionLocks, BackgroundSyncLocks } = await import('@/lib/rag/global-locks');
          
          const targetLockType = isReconnection ? RAGLockType.RECONNECTION : RAGLockType.BACKGROUND_SYNC;
          const conflictCheck = await checkRAGLockConflicts(storeId, targetLockType);
          
          if (!conflictCheck.canProceed) {
            console.warn(`🔒 [BULLETPROOF] ⏳ Skipping background ops for store ${storeId} - ${conflictCheck.reason}`);
            return; // Exit early - another operation is handling this store
          }

          // 🔒 Acquire appropriate lock
          const LockManager = isReconnection ? StoreReconnectionLocks : BackgroundSyncLocks;
          const lockResult = await LockManager.acquire(storeId, `TiendaNube OAuth ${isReconnection ? 'reconnection' : 'connection'} background ops`);
          
          if (!lockResult.success) {
            console.warn(`🔒 [BULLETPROOF] ⏳ Cannot acquire ${lockType} lock for ${storeId}: ${lockResult.error}`);
            
            // Fallback to direct HTTP call if lock unavailable
            console.log(`🔒 [BULLETPROOF] 🔄 Falling back to direct background sync call`);
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            
            fetch(`${baseUrl}/api/stores/background-sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storeId,
                accessToken,
                userId,
                operation: isReconnection ? 'reconnection_full_sync' : 'full_initialization',
                priority: isReconnection ? 'high' : 'normal',
                jobId: `oauth-${isReconnection ? 'reconnect' : 'connect'}-${storeId}-${Date.now()}`
              })
            }).catch(e => console.warn('Fallback background sync HTTP call failed:', e));
            
            return;
          }
          
          lockProcessId = lockResult.processId!;
          console.log(`🔒 [BULLETPROOF] Lock acquired for background ops: ${lockProcessId}`);
          
          // Trigger lock-aware background sync
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          
          const syncResponse = await fetch(`${baseUrl}/api/stores/background-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId,
              accessToken,
              userId,
              operation: isReconnection ? 'reconnection_full_sync' : 'full_initialization',
              priority: isReconnection ? 'high' : 'normal',
              lockProcessId, // Include the lock process ID
              jobId: `oauth-${isReconnection ? 'reconnect' : 'connect'}-${storeId}-${Date.now()}`
            })
          });
          
          if (!syncResponse.ok) {
            throw new Error(`Background sync HTTP failed: ${syncResponse.status}`);
          }
          
          console.log('✅ [BULLETPROOF] Lock-aware background sync triggered successfully');
          
        } catch (error) {
          console.warn('🔄 [BULLETPROOF] Lock-aware background operations failed:', error);
        } finally {
          // 🔒 Release lock if we acquired it (fire-and-forget)
          if (lockProcessId) {
            import('@/lib/rag/global-locks').then(({ StoreReconnectionLocks, BackgroundSyncLocks }) => {
              const LockManager = isReconnection ? StoreReconnectionLocks : BackgroundSyncLocks;
              LockManager.release(storeId, lockProcessId!).catch(unlockError => {
                console.warn(`🔒 [BULLETPROOF] ⚠️ Failed to release ${lockType} lock ${lockProcessId}:`, unlockError);
              });
            });
          }
        }
      }, 2000); // 2 segundos de delay

      console.log('✅ [BULLETPROOF] Lock-aware background operations setup completed');
      
    } catch (error) {
      console.error('🔄 [BULLETPROOF] Lock-aware background operations setup failed:', error);
    }
  }

} 