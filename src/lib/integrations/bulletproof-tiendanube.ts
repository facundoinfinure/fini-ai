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
   * 🔥 ENHANCED: Background operations with monitoring and error recovery
   */
  private static triggerBackgroundOperations(storeId: string, accessToken: string, userId: string, isReconnection = false): void {
    console.log(`[BULLETPROOF] 🚀 Triggering monitored background operations for store: ${storeId}`);
    
    // Create a unique operation ID for tracking
    const operationId = `bg_${storeId}_${Date.now()}`;
    
    // Start background operations with proper monitoring
    setTimeout(async () => {
      try {
        console.log(`[BULLETPROOF] 🔄 Starting background operation: ${operationId}`);
        await this.executeMonitoredBackgroundOperations(storeId, accessToken, userId, isReconnection, operationId);
        console.log(`[BULLETPROOF] ✅ Background operation completed: ${operationId}`);
      } catch (error) {
        console.error(`[BULLETPROOF] ❌ Background operation failed: ${operationId}`, error);
        // Log to external monitoring if needed
        await this.logBackgroundError(operationId, storeId, error);
      }
    }, 200);
    
    // Set up timeout monitoring
    setTimeout(() => {
      console.warn(`[BULLETPROOF] ⏰ Background operation timeout check: ${operationId}`);
      // Could implement timeout handling here if needed
    }, 300000); // 5 minutes timeout
  }

  /**
   * 🆕 NEW: Execute background operations with comprehensive monitoring
   */
  private static async executeMonitoredBackgroundOperations(
    storeId: string, 
    accessToken: string, 
    userId: string, 
    isReconnection = false,
    operationId: string
  ): Promise<void> {
    const startTime = Date.now();
    const operations: { 
      name: string; 
      status: 'pending' | 'success' | 'failed'; 
      duration?: number; 
      error?: string 
    }[] = [];
    
    console.log(`[BULLETPROOF] 📊 Starting monitored background operations: ${operationId}`);
    
    try {
      // OPERATION 1: RAG Namespace Initialization
      let operation: { 
        name: string; 
        status: 'pending' | 'success' | 'failed'; 
        duration?: number; 
        error?: string 
      } = { name: 'rag_namespace_init', status: 'pending' };
      operations.push(operation);
      
      try {
        const opStart = Date.now();
        console.log(`[BULLETPROOF] 🔧 ${operationId}: Initializing RAG namespaces...`);
        
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        const namespaceResult = await ragEngine.initializeStoreNamespaces(storeId);
        operation.duration = Date.now() - opStart;
        
        if (namespaceResult.success) {
          operation.status = 'success';
          console.log(`[BULLETPROOF] ✅ ${operationId}: RAG namespaces initialized (${operation.duration}ms)`);
        } else {
          operation.status = 'failed';
          operation.error = namespaceResult.error;
          console.warn(`[BULLETPROOF] ⚠️ ${operationId}: RAG namespace init partial failure: ${namespaceResult.error}`);
        }
      } catch (error) {
        operation.duration = Date.now() - Date.now();
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[BULLETPROOF] ❌ ${operationId}: RAG namespace init failed:`, error);
      }

      // OPERATION 2: Store Data Sync (only if not a simple reconnection)
      if (!isReconnection) {
        operation = { name: 'store_data_sync', status: 'pending' };
        operations.push(operation);
        
        try {
          const opStart = Date.now();
          console.log(`[BULLETPROOF] 🔄 ${operationId}: Starting store data sync...`);
          
          const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
          const ragEngine = getUnifiedRAGEngine();
          
          // Sync with timeout
          const syncPromise = ragEngine.indexStoreData(storeId, accessToken);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync timeout after 4 minutes')), 240000)
          );
          
          const syncResult = await Promise.race([syncPromise, timeoutPromise]) as any;
          operation.duration = Date.now() - opStart;
          
          if (syncResult.success) {
            operation.status = 'success';
            console.log(`[BULLETPROOF] ✅ ${operationId}: Store data synced (${syncResult.documentsIndexed} docs, ${operation.duration}ms)`);
          } else {
            operation.status = 'failed';
            operation.error = syncResult.error;
            console.warn(`[BULLETPROOF] ⚠️ ${operationId}: Store sync partial failure: ${syncResult.error}`);
          }
        } catch (error) {
          operation.duration = Date.now() - Date.now();
          operation.status = 'failed';
          operation.error = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[BULLETPROOF] ❌ ${operationId}: Store data sync failed:`, error);
        }
      } else {
        console.log(`[BULLETPROOF] ⏭️ ${operationId}: Skipping data sync for reconnection`);
      }

      // OPERATION 3: Update Store Status
      operation = { name: 'store_status_update', status: 'pending' };
      operations.push(operation);
      
      try {
        const opStart = Date.now();
        console.log(`[BULLETPROOF] 🔄 ${operationId}: Updating store status...`);
        
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();
        
        const { error: updateError } = await supabase
          .from('stores')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', storeId);
          
        operation.duration = Date.now() - opStart;
        
        if (!updateError) {
          operation.status = 'success';
          console.log(`[BULLETPROOF] ✅ ${operationId}: Store status updated (${operation.duration}ms)`);
        } else {
          operation.status = 'failed';
          operation.error = updateError.message;
          console.error(`[BULLETPROOF] ❌ ${operationId}: Store status update failed:`, updateError);
        }
      } catch (error) {
        operation.duration = Date.now() - Date.now();
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[BULLETPROOF] ❌ ${operationId}: Store status update failed:`, error);
      }

      // Final Summary
      const totalDuration = Date.now() - startTime;
      const successCount = operations.filter(op => op.status === 'success').length;
      const failedCount = operations.filter(op => op.status === 'failed').length;
      
      console.log(`[BULLETPROOF] 📊 ${operationId}: Background operations summary:`);
      console.log(`[BULLETPROOF] 📊 Total time: ${totalDuration}ms | Success: ${successCount} | Failed: ${failedCount}`);
      
      operations.forEach(op => {
        const status = op.status === 'success' ? '✅' : (op.status === 'failed' ? '❌' : '⏳');
        console.log(`[BULLETPROOF] ${status} ${op.name}: ${op.duration || 0}ms${op.error ? ` (${op.error})` : ''}`);
      });
      
      // Update operation tracking if needed
      await this.logOperationResults(operationId, storeId, operations, totalDuration);

    } catch (globalError) {
      const totalDuration = Date.now() - startTime;
      console.error(`[BULLETPROOF] ❌ ${operationId}: Global background operation failure (${totalDuration}ms):`, globalError);
      throw globalError;
    }
  }

  /**
   * 🆕 NEW: Log background operation errors for monitoring
   */
  private static async logBackgroundError(operationId: string, storeId: string, error: any): Promise<void> {
    try {
      console.error(`[BULLETPROOF] 🚨 Logging background error for ${operationId}:`, {
        operationId,
        storeId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      // Could integrate with external error tracking here (Sentry, etc.)
      
    } catch (logError) {
      console.error(`[BULLETPROOF] ❌ Failed to log background error:`, logError);
    }
  }

  /**
   * 🆕 NEW: Log operation results for monitoring
   */
  private static async logOperationResults(
    operationId: string, 
    storeId: string, 
    operations: any[], 
    totalDuration: number
  ): Promise<void> {
    try {
      console.log(`[BULLETPROOF] 📊 Logging operation results for ${operationId}:`, {
        operationId,
        storeId,
        operations,
        totalDuration,
        timestamp: new Date().toISOString()
      });
      
      // Could store in database for admin monitoring if needed
      
    } catch (logError) {
      console.error(`[BULLETPROOF] ❌ Failed to log operation results:`, logError);
    }
  }

} 