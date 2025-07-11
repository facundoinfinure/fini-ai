/**
 * 🚀 SIMPLE STORE SYNC
 * ===================
 * 
 * Sistema de sincronización ultra-simple que FUNCIONA DE VERDAD.
 * Sin locks, sin abstracciones complejas, sin race conditions.
 * 
 * OBJETIVO: Usuario conecta tienda → datos reales aparecen en Pinecone INMEDIATAMENTE
 */

import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { Pinecone } from '@pinecone-database/pinecone';
import { EmbeddingsService } from '@/lib/rag/embeddings';
import type { TiendaNubeProduct, TiendaNubeOrder, TiendaNubeCustomer } from '@/types/tiendanube';

export interface SyncProgress {
  step: string;
  progress: number;
  message: string;
  data?: any;
}

export interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
  stats?: {
    products: number;
    orders: number;
    customers: number;
    totalDocuments: number;
  };
}

export class SimpleStoreSync {
  private pinecone: Pinecone;
  private embeddings: EmbeddingsService;
  private progressCallback?: (progress: SyncProgress) => void;

  constructor(progressCallback?: (progress: SyncProgress) => void) {
    this.pinecone = new Pinecone({ 
      apiKey: process.env.PINECONE_API_KEY! 
    });
    this.embeddings = new EmbeddingsService();
    this.progressCallback = progressCallback;
  }

  /**
   * 🎯 FUNCIÓN PRINCIPAL: Sincronizar tienda completa
   */
  async syncStore(storeId: string): Promise<SyncResult> {
    try {
      console.log(`[SIMPLE-SYNC] 🚀 Starting complete sync for store: ${storeId}`);
      
      this.updateProgress('init', 0, 'Iniciando sincronización...');

      // PASO 1: Obtener datos de la tienda y token
      this.updateProgress('store-info', 10, 'Obteniendo información de la tienda...');
      const storeData = await this.getStoreData(storeId);
      
      if (!storeData) {
        throw new Error('No se pudo obtener la información de la tienda');
      }

      // PASO 2: Inicializar API de TiendaNube
      this.updateProgress('api-init', 20, 'Conectando con TiendaNube...');
      const api = new TiendaNubeAPI(storeData.access_token, storeData.platform_store_id);

      // PASO 3: Crear namespaces en Pinecone
      this.updateProgress('namespaces', 30, 'Preparando almacenamiento de datos...');
      await this.createNamespaces(storeId);

      // PASO 4: Sincronizar productos
      this.updateProgress('products', 40, 'Obteniendo catálogo de productos...');
      const products = await this.syncProducts(api, storeId);

      // PASO 5: Sincronizar pedidos
      this.updateProgress('orders', 60, 'Obteniendo historial de ventas...');
      const orders = await this.syncOrders(api, storeId);

      // PASO 6: Sincronizar clientes
      this.updateProgress('customers', 80, 'Obteniendo información de clientes...');
      const customers = await this.syncCustomers(api, storeId);

      // PASO 7: Sincronizar información de la tienda
      this.updateProgress('store-details', 90, 'Guardando información general...');
      await this.syncStoreInfo(api, storeId);

      // PASO 8: Completar
      this.updateProgress('complete', 100, '¡Sincronización completada!');

      const result: SyncResult = {
        success: true,
        message: 'Tienda sincronizada exitosamente',
        stats: {
          products,
          orders,
          customers,
          totalDocuments: products + orders + customers + 1 // +1 para store info
        }
      };

      console.log(`[SIMPLE-SYNC] ✅ Sync completed for store ${storeId}:`, result.stats);
      return result;

    } catch (error) {
      console.error(`[SIMPLE-SYNC] ❌ Sync failed for store ${storeId}:`, error);
      
      this.updateProgress('error', 0, 'Error en la sincronización');
      
      return {
        success: false,
        message: 'Error durante la sincronización',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * 📊 Obtener datos de la tienda desde la base de datos
   */
  private async getStoreData(storeId: string) {
    const supabase = createClient();
    
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('is_active', true)
      .single();

    if (error || !store) {
      console.error(`[SIMPLE-SYNC] Store not found: ${storeId}`, error);
      return null;
    }

    return store;
  }

  /**
   * 🏗️ Crear namespaces en Pinecone (simple y directo)
   */
  private async createNamespaces(storeId: string) {
    const indexName = process.env.PINECONE_INDEX_NAME!;
    const index = this.pinecone.Index(indexName);

    const namespaces = [
      `store-${storeId}`,
      `store-${storeId}-products`,
      `store-${storeId}-orders`,
      `store-${storeId}-customers`,
      `store-${storeId}-analytics`,
      `store-${storeId}-conversations`
    ];

    // Crear documentos placeholder para inicializar namespaces
    for (const namespace of namespaces) {
      try {
        const placeholderContent = `Namespace inicializado para ${namespace.split('-').pop()} en tienda ${storeId}`;
        const embedding = await this.embeddings.generateEmbedding(placeholderContent);
        
        if (embedding && embedding.embedding) {
          await index.namespace(namespace).upsert([{
            id: `placeholder-${namespace}`,
            values: embedding.embedding,
            metadata: {
              type: 'placeholder',
              storeId,
              content: placeholderContent,
              timestamp: new Date().toISOString()
            }
          }]);
        }
      } catch (error) {
        console.warn(`[SIMPLE-SYNC] Failed to create namespace ${namespace}:`, error);
      }
    }

    console.log(`[SIMPLE-SYNC] ✅ Created ${namespaces.length} namespaces for store ${storeId}`);
  }

  /**
   * 🛍️ Sincronizar productos
   */
  private async syncProducts(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const products: TiendaNubeProduct[] = await api.getProducts();
      const indexName = process.env.PINECONE_INDEX_NAME!;
      const index = this.pinecone.Index(indexName);
      const namespace = `store-${storeId}-products`;

      let processedCount = 0;

      for (const product of products) {
        try {
          // Crear contenido rico para el embedding
          const content = `
            Producto: ${product.name}
            Descripción: ${product.description || 'Sin descripción'}
            Precio: $${product.variants?.[0]?.price || 'No disponible'}
            Categorías: ${product.categories?.map(c => c.name).join(', ') || 'Sin categoría'}
            Estado: ${product.published ? 'Publicado' : 'No publicado'}
            SKU: ${product.variants?.[0]?.sku || 'Sin SKU'}
          `.trim();

          const embedding = await this.embeddings.generateEmbedding(content);

          if (embedding && embedding.embedding) {
            await index.namespace(namespace).upsert([{
              id: `product-${product.id}`,
              values: embedding.embedding,
              metadata: {
                type: 'product',
                storeId,
                productId: product.id,
                name: product.name,
                price: parseFloat(product.variants?.[0]?.price || '0'),
                published: product.published,
                content,
                timestamp: new Date().toISOString()
              }
            }]);

            processedCount++;
          }
        } catch (error) {
          console.warn(`[SIMPLE-SYNC] Failed to process product ${product.id}:`, error);
        }
      }

      console.log(`[SIMPLE-SYNC] ✅ Processed ${processedCount} products for store ${storeId}`);
      return processedCount;

    } catch (error) {
      console.error(`[SIMPLE-SYNC] Failed to sync products for store ${storeId}:`, error);
      return 0;
    }
  }

  /**
   * 📦 Sincronizar pedidos
   */
  private async syncOrders(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const orders: TiendaNubeOrder[] = await api.getOrders({ limit: 50 }); // Últimos 50 pedidos
      const indexName = process.env.PINECONE_INDEX_NAME!;
      const index = this.pinecone.Index(indexName);
      const namespace = `store-${storeId}-orders`;

      let processedCount = 0;

      for (const order of orders) {
        try {
          // Crear contenido rico para el embedding
          const content = `
            Pedido #${order.number || order.id}
            Total: $${order.total}
            Estado: ${order.status}
            Estado de pago: ${order.payment_status}
            Cliente: ${order.customer?.name || 'Cliente sin nombre'}
            Email: ${order.customer?.email || 'Sin email'}
            Fecha: ${order.created_at}
            Productos: ${order.products?.map(p => `${p.name} (x${p.quantity})`).join(', ') || 'Sin productos'}
          `.trim();

          const embedding = await this.embeddings.generateEmbedding(content);

          if (embedding && embedding.embedding) {
            await index.namespace(namespace).upsert([{
              id: `order-${order.id}`,
              values: embedding.embedding,
              metadata: {
                type: 'order',
                storeId,
                orderId: order.id,
                orderNumber: order.number,
                total: parseFloat(order.total),
                status: order.status,
                customerEmail: order.customer?.email,
                content,
                timestamp: new Date().toISOString()
              }
            }]);

            processedCount++;
          }
        } catch (error) {
          console.warn(`[SIMPLE-SYNC] Failed to process order ${order.id}:`, error);
        }
      }

      console.log(`[SIMPLE-SYNC] ✅ Processed ${processedCount} orders for store ${storeId}`);
      return processedCount;

    } catch (error) {
      console.error(`[SIMPLE-SYNC] Failed to sync orders for store ${storeId}:`, error);
      return 0;
    }
  }

  /**
   * 👥 Sincronizar clientes
   */
  private async syncCustomers(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const customers: TiendaNubeCustomer[] = await api.getCustomers({ limit: 100 }); // Últimos 100 clientes
      const indexName = process.env.PINECONE_INDEX_NAME!;
      const index = this.pinecone.Index(indexName);
      const namespace = `store-${storeId}-customers`;

      let processedCount = 0;

      for (const customer of customers) {
        try {
          // Crear contenido rico para el embedding
          const content = `
            Cliente: ${customer.name || 'Sin nombre'}
            Email: ${customer.email}
            Teléfono: ${customer.phone || 'Sin teléfono'}
            Total gastado: $${customer.total_spent || '0'}
            Último pedido ID: ${customer.last_order_id || 'Ninguno'}
            Activo: ${customer.active ? 'Sí' : 'No'}
            Primera interacción: ${customer.first_interaction}
          `.trim();

          const embedding = await this.embeddings.generateEmbedding(content);

          if (embedding && embedding.embedding) {
            await index.namespace(namespace).upsert([{
              id: `customer-${customer.id}`,
              values: embedding.embedding,
              metadata: {
                type: 'customer',
                storeId,
                customerId: customer.id,
                email: customer.email,
                name: customer.name,
                totalSpent: parseFloat(customer.total_spent || '0'),
                content,
                timestamp: new Date().toISOString()
              }
            }]);

            processedCount++;
          }
        } catch (error) {
          console.warn(`[SIMPLE-SYNC] Failed to process customer ${customer.id}:`, error);
        }
      }

      console.log(`[SIMPLE-SYNC] ✅ Processed ${processedCount} customers for store ${storeId}`);
      return processedCount;

    } catch (error) {
      console.error(`[SIMPLE-SYNC] Failed to sync customers for store ${storeId}:`, error);
      return 0;
    }
  }

  /**
   * 🏪 Sincronizar información de la tienda
   */
  private async syncStoreInfo(api: TiendaNubeAPI, storeId: string): Promise<void> {
    try {
      const storeInfo = await api.getStore();
      const indexName = process.env.PINECONE_INDEX_NAME!;
      const index = this.pinecone.Index(indexName);
      const namespace = `store-${storeId}`;

      // Crear contenido rico para el embedding
      const content = `
        Tienda: ${storeInfo.name}
        Descripción: ${storeInfo.description || 'Sin descripción'}
        URL: ${storeInfo.url}
        País: ${storeInfo.country}
        Moneda: ${storeInfo.currency}
        Idioma: ${storeInfo.language}
        Email: ${storeInfo.email}
        Activa desde: ${storeInfo.created_at}
      `.trim();

      const embedding = await this.embeddings.generateEmbedding(content);

      if (embedding && embedding.embedding) {
        await index.namespace(namespace).upsert([{
          id: `store-info-${storeId}`,
          values: embedding.embedding,
          metadata: {
            type: 'store_info',
            storeId,
            name: storeInfo.name,
            country: storeInfo.country,
            currency: storeInfo.currency,
            content,
            timestamp: new Date().toISOString()
          }
        }]);
      }

      console.log(`[SIMPLE-SYNC] ✅ Store info synchronized for store ${storeId}`);

    } catch (error) {
      console.error(`[SIMPLE-SYNC] Failed to sync store info for store ${storeId}:`, error);
    }
  }

  /**
   * 📊 Actualizar progreso
   */
  private updateProgress(step: string, progress: number, message: string, data?: any) {
    console.log(`[SIMPLE-SYNC] ${progress}% - ${message}`);
    
    if (this.progressCallback) {
      this.progressCallback({
        step,
        progress,
        message,
        data
      });
    }
  }
}

/**
 * 🚀 Función helper para uso fácil
 */
export async function syncStoreNow(storeId: string, progressCallback?: (progress: SyncProgress) => void): Promise<SyncResult> {
  const sync = new SimpleStoreSync(progressCallback);
  return await sync.syncStore(storeId);
} 