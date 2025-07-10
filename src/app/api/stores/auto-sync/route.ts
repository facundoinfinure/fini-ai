import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';

export const dynamic = 'force-dynamic';

interface SyncResult {
  storeId: string;
  storeName: string;
  success: boolean;
  error?: string;
  syncedData: {
    products: number;
    orders: number;
    customers: number;
  };
}

/**
 * 🔄 SISTEMA DE SINCRONIZACIÓN AUTOMÁTICA
 * =====================================
 * 
 * Este endpoint sincroniza automáticamente los datos de todas las tiendas activas.
 * Se puede llamar:
 * 1. Manualmente desde el dashboard
 * 2. Por un cron job periódico
 * 3. Por webhooks de TiendaNube
 */
export async function POST(request: NextRequest) {
  console.log('🔄 [AUTO-SYNC] Starting automatic store synchronization...');
  
  const startTime = Date.now();
  const results: SyncResult[] = [];
  
  try {
    const supabase = createClient();
    
    // Obtener todas las tiendas activas de TiendaNube
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .eq('is_active', true)  // 🔥 CONFIRMADO: Ya filtra por tiendas activas

    if (storesError) {
      console.error('❌ [AUTO-SYNC] Failed to fetch stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores from database'
      }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      console.log('ℹ️ [AUTO-SYNC] No active TiendaNube stores found');
      return NextResponse.json({
        success: true,
        message: 'No active stores to sync',
        results: []
      });
    }

    console.log(`🔄 [AUTO-SYNC] Found ${stores.length} active stores to sync`);

    // Sincronizar cada tienda
    for (const store of stores) {
      const storeResult = await syncSingleStore(store);
      results.push(storeResult);
      
      // Pequeña pausa entre tiendas
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`✅ [AUTO-SYNC] Synchronization completed in ${totalTime}ms`);
    console.log(`📊 [AUTO-SYNC] Results: ${successCount} successful, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      summary: {
        totalStores: stores.length,
        successful: successCount,
        failed: failureCount,
        totalTime: `${totalTime}ms`
      },
      results
    });

  } catch (error) {
    console.error('❌ [AUTO-SYNC] Critical error during auto-sync:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sync',
      results
    }, { status: 500 });
  }
}

/**
 * 🏪 Sincronizar una tienda individual
 */
async function syncSingleStore(store: any): Promise<SyncResult> {
  const result: SyncResult = {
    storeId: store.id,
    storeName: store.name || 'Unnamed Store',
    success: false,
    syncedData: {
      products: 0,
      orders: 0,
      customers: 0
    }
  };

  try {
    console.log(`🔄 [AUTO-SYNC] Syncing store: ${result.storeName} (${store.id})`);

    // 1. Obtener token válido
    const tokenData = await TiendaNubeTokenManager.getValidTokenWithStoreData(store.id);
    
    if (!tokenData) {
      result.error = 'No valid token available - store needs reconnection';
      console.warn(`⚠️ [AUTO-SYNC] ${result.storeName}: ${result.error}`);
      return result;
    }

    // 2. Inicializar API de TiendaNube
    const api = new TiendaNubeAPI(tokenData.token, tokenData.platformStoreId);

    // 3. Sincronizar datos en paralelo
    const syncTasks = [
      syncProducts(api, store.id),
      syncOrders(api, store.id),
      syncCustomers(api, store.id)
    ];

    const syncResults = await Promise.allSettled(syncTasks);

    // 4. Procesar resultados
    syncResults.forEach((taskResult, index) => {
      const taskNames = ['products', 'orders', 'customers'] as const;
      const taskName = taskNames[index];

      if (taskResult.status === 'fulfilled') {
        result.syncedData[taskName] = taskResult.value;
        console.log(`✅ [AUTO-SYNC] ${result.storeName}: Synced ${taskResult.value} ${taskName}`);
      } else {
        console.warn(`⚠️ [AUTO-SYNC] ${result.storeName}: Failed to sync ${taskName}:`, taskResult.reason);
      }
    });

    // 5. Actualizar timestamp de última sincronización
    const supabase = createClient();
    await supabase
      .from('stores')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', store.id);

    result.success = true;
    console.log(`✅ [AUTO-SYNC] ${result.storeName}: Sync completed successfully`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown sync error';
    console.error(`❌ [AUTO-SYNC] ${result.storeName}: Sync failed:`, error);
  }

  return result;
}

/**
 * 📦 Sincronizar productos
 */
async function syncProducts(api: TiendaNubeAPI, storeId: string): Promise<number> {
  try {
    const products = await api.getProducts({ 
      limit: 100,
      updated_at_min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
    });
    
    return products.length;

  } catch (error) {
    console.error('Failed to sync products:', error);
    throw error;
  }
}

/**
 * 🛒 Sincronizar órdenes
 */
async function syncOrders(api: TiendaNubeAPI, storeId: string): Promise<number> {
  try {
    const orders = await api.getOrders({ 
      limit: 50,
      updated_at_min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    return orders.length;

  } catch (error) {
    console.error('Failed to sync orders:', error);
    throw error;
  }
}

/**
 * 👥 Sincronizar clientes
 */
async function syncCustomers(api: TiendaNubeAPI, storeId: string): Promise<number> {
  try {
    const customers = await api.getCustomers({ 
      limit: 50
    });

    return customers.length;

  } catch (error) {
    console.error('Failed to sync customers:', error);
    throw error;
  }
}

/**
 * GET endpoint para verificar el estado de sincronización
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, updated_at, is_active')
      .eq('platform', 'tiendanube')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    const storeStatus = stores.map(store => ({
      id: store.id,
      name: store.name,
      isActive: store.is_active,
      lastUpdated: store.updated_at,
      needsSync: new Date(store.updated_at) < new Date(Date.now() - 24 * 60 * 60 * 1000) // Más de 24 horas
    }));

    return NextResponse.json({
      success: true,
      stores: storeStatus,
      summary: {
        total: stores.length,
        active: stores.filter(s => s.is_active).length,
        needsSync: storeStatus.filter(s => s.needsSync).length
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 