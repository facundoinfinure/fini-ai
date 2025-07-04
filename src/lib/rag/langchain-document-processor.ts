/**
 * LangChain Document Processor
 * Advanced document processing using LangChain text splitters and loaders
 * Optimized for Tienda Nube ecommerce data
 */

import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { v4 as uuidv4 } from 'uuid';

import { LANGCHAIN_CONFIG, LangChainFactory } from './langchain-config';

/**
 * Metadata for Tienda Nube documents
 */
export interface TiendaNubeDocumentMetadata {
  storeId: string;
  type: 'store' | 'product' | 'order' | 'customer' | 'analytics' | 'conversation';
  source: string;
  timestamp: string;
  language?: 'es' | 'en';
  
  // Product specific
  productId?: string;
  productName?: string;
  category?: string;
  price?: number;
  stock?: number;
  
  // Order specific
  orderId?: string;
  orderValue?: number;
  orderStatus?: string;
  customerId?: string;
  
  // Customer specific
  customerEmail?: string;
  customerLocation?: string;
  
  // Analytics specific
  period?: string;
  metric?: string;
  value?: number;
  
  // Additional metadata
  [key: string]: unknown;
}

/**
 * Enhanced document processor with LangChain integration
 */
export class LangChainDocumentProcessor {
  private textSplitter: RecursiveCharacterTextSplitter;
  
  constructor() {
    this.textSplitter = LangChainFactory.createTextSplitter();
  }

  /**
   * Process Tienda Nube store data into LangChain documents
   */
  async processStoreData(
    storeData: unknown,
    storeId: string
  ): Promise<Document[]> {
    try {
      const store = storeData as Record<string, any>;
      if (!store || typeof store !== 'object') {
        console.warn('[LANGCHAIN-PROCESSOR] Invalid store data provided');
        return [];
      }

      // Create comprehensive store description
      const storeContent = this.buildStoreContent(store);
      
      if (!storeContent.trim()) {
        console.warn('[LANGCHAIN-PROCESSOR] No meaningful store content found');
        return [];
      }

      const metadata: TiendaNubeDocumentMetadata = {
        storeId,
        type: 'store',
        source: 'tiendanube_store',
        timestamp: new Date().toISOString(),
        language: 'es',
      };

      return this.createDocuments(storeContent, metadata);
    } catch (error) {
      console.error('[LANGCHAIN-PROCESSOR] Failed to process store data:', error);
      return [];
    }
  }

  /**
   * Process product data into LangChain documents
   */
  async processProductData(
    products: unknown[],
    storeId: string
  ): Promise<Document[]> {
    try {
      if (!Array.isArray(products)) {
        console.warn('[LANGCHAIN-PROCESSOR] Invalid products data provided');
        return [];
      }

      const allDocuments: Document[] = [];

      for (const product of products) {
        const productData = product as Record<string, any>;
        const productContent = this.buildProductContent(productData);
        
        if (!productContent.trim()) continue;

        const metadata: TiendaNubeDocumentMetadata = {
          storeId,
          type: 'product',
          source: 'tiendanube_products',
          timestamp: new Date().toISOString(),
          language: 'es',
          productId: productData.id?.toString(),
          productName: this.sanitizeText(productData.name || 'Producto sin nombre'),
          category: this.sanitizeText(productData.categories?.[0]?.name || 'Sin categoría'),
          price: this.parseNumber(productData.price),
          stock: this.parseNumber(productData.stock),
        };

        const documents = await this.createDocuments(productContent, metadata);
        allDocuments.push(...documents);
      }

      console.log(`[LANGCHAIN-PROCESSOR] Processed ${products.length} products into ${allDocuments.length} documents`);
      return allDocuments;
    } catch (error) {
      console.error('[LANGCHAIN-PROCESSOR] Failed to process products:', error);
      return [];
    }
  }

  /**
   * Process order data into LangChain documents
   */
  async processOrderData(
    orders: unknown[],
    storeId: string
  ): Promise<Document[]> {
    try {
      if (!Array.isArray(orders)) {
        console.warn('[LANGCHAIN-PROCESSOR] Invalid orders data provided');
        return [];
      }

      const allDocuments: Document[] = [];

      for (const order of orders) {
        const orderData = order as Record<string, any>;
        const orderContent = this.buildOrderContent(orderData);
        
        if (!orderContent.trim()) continue;

        const metadata: TiendaNubeDocumentMetadata = {
          storeId,
          type: 'order',
          source: 'tiendanube_orders',
          timestamp: new Date().toISOString(),
          language: 'es',
          orderId: orderData.id?.toString(),
          orderValue: this.parseNumber(orderData.total),
          orderStatus: this.sanitizeText(orderData.status || 'unknown'),
          customerId: orderData.customer?.id?.toString(),
        };

        const documents = await this.createDocuments(orderContent, metadata);
        allDocuments.push(...documents);
      }

      console.log(`[LANGCHAIN-PROCESSOR] Processed ${orders.length} orders into ${allDocuments.length} documents`);
      return allDocuments;
    } catch (error) {
      console.error('[LANGCHAIN-PROCESSOR] Failed to process orders:', error);
      return [];
    }
  }

  /**
   * Process analytics data into LangChain documents
   */
  async processAnalyticsData(
    analytics: unknown,
    storeId: string,
    period = 'current'
  ): Promise<Document[]> {
    try {
      const analyticsContent = this.buildAnalyticsContent(analytics, period);
      
      if (!analyticsContent.trim()) {
        console.warn('[LANGCHAIN-PROCESSOR] No meaningful analytics content found');
        return [];
      }

      const metadata: TiendaNubeDocumentMetadata = {
        storeId,
        type: 'analytics',
        source: 'tiendanube_analytics',
        timestamp: new Date().toISOString(),
        language: 'es',
        period,
      };

      return this.createDocuments(analyticsContent, metadata);
    } catch (error) {
      console.error('[LANGCHAIN-PROCESSOR] Failed to process analytics:', error);
      return [];
    }
  }

  /**
   * Create LangChain documents with intelligent chunking
   */
  private async createDocuments(
    content: string,
    metadata: TiendaNubeDocumentMetadata
  ): Promise<Document[]> {
    try {
      // Clean and prepare content
      const cleanContent = this.cleanContent(content);
      
      if (cleanContent.length <= LANGCHAIN_CONFIG.textSplitter.chunkSize) {
        // Content is small enough, create single document
        return [new Document({
          pageContent: cleanContent,
          metadata: {
            ...metadata,
            id: this.generateDocumentId(metadata),
            chunkIndex: 0,
            totalChunks: 1,
            contentLength: cleanContent.length,
          },
        })];
      }

      // Split content into chunks
      const textChunks = await this.textSplitter.splitText(cleanContent);
      
      // Create documents for each chunk
      const documents = textChunks.map((chunk, index) => {
        return new Document({
          pageContent: chunk,
          metadata: {
            ...metadata,
            id: this.generateDocumentId(metadata, index),
            chunkIndex: index,
            totalChunks: textChunks.length,
            contentLength: chunk.length,
          },
        });
      });

      console.log(`[LANGCHAIN-PROCESSOR] Created ${documents.length} document chunks from ${cleanContent.length} characters`);
      return documents;
    } catch (error) {
      console.error('[LANGCHAIN-PROCESSOR] Failed to create documents:', error);
      return [];
    }
  }

  /**
   * Build comprehensive store content
   */
  private buildStoreContent(store: Record<string, any>): string {
    const parts: string[] = [];
    
    if (store.name) parts.push(`Tienda: ${this.sanitizeText(store.name)}`);
    if (store.description) parts.push(`Descripción: ${this.sanitizeText(store.description)}`);
    if (store.url) parts.push(`URL: ${store.url}`);
    if (store.domain) parts.push(`Dominio: ${store.domain}`);
    if (store.country) parts.push(`País: ${store.country}`);
    if (store.currency) parts.push(`Moneda: ${store.currency}`);
    if (store.business_name) parts.push(`Nombre del negocio: ${this.sanitizeText(store.business_name)}`);
    if (store.business_id) parts.push(`ID de negocio: ${store.business_id}`);
    
    // Add category information if available
    if (store.main_category) parts.push(`Categoría principal: ${this.sanitizeText(store.main_category)}`);
    if (store.categories && Array.isArray(store.categories)) {
      const categories = store.categories.map((cat: any) => this.sanitizeText(cat.name || cat)).join(', ');
      parts.push(`Categorías: ${categories}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Build detailed product content
   */
  private buildProductContent(product: Record<string, any>): string {
    const parts: string[] = [];
    
    if (product.name) parts.push(`Producto: ${this.sanitizeText(product.name)}`);
    if (product.description) parts.push(`Descripción: ${this.sanitizeText(product.description)}`);
    if (product.price) parts.push(`Precio: $${product.price}`);
    if (product.stock !== undefined) parts.push(`Stock: ${product.stock} unidades`);
    if (product.sku) parts.push(`SKU: ${product.sku}`);
    
    // Categories
    if (product.categories && Array.isArray(product.categories)) {
      const categories = product.categories.map((cat: any) => this.sanitizeText(cat.name || cat)).join(', ');
      parts.push(`Categorías: ${categories}`);
    }
    
    // Variants
    if (product.variants && Array.isArray(product.variants)) {
      const variants = product.variants.map((variant: any) => {
        const variantParts: string[] = [];
        if (variant.size) variantParts.push(`Talle: ${variant.size}`);
        if (variant.color) variantParts.push(`Color: ${variant.color}`);
        if (variant.price) variantParts.push(`Precio: $${variant.price}`);
        return variantParts.join(', ');
      }).filter(Boolean);
      
      if (variants.length > 0) {
        parts.push(`Variantes: ${variants.join('; ')}`);
      }
    }
    
    // Tags
    if (product.tags && Array.isArray(product.tags)) {
      const tags = product.tags.map((tag: any) => this.sanitizeText(tag.name || tag)).join(', ');
      parts.push(`Etiquetas: ${tags}`);
    }
    
    // Attributes
    if (product.attributes && Array.isArray(product.attributes)) {
      const attributes = product.attributes.map((attr: any) => 
        `${attr.name}: ${attr.value}`
      ).join(', ');
      parts.push(`Atributos: ${attributes}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Build order content for analysis
   */
  private buildOrderContent(order: Record<string, any>): string {
    const parts: string[] = [];
    
    parts.push(`Pedido ID: ${order.id}`);
    if (order.total) parts.push(`Total: $${order.total}`);
    if (order.status) parts.push(`Estado: ${this.sanitizeText(order.status)}`);
    if (order.created_at) parts.push(`Fecha: ${new Date(order.created_at).toLocaleDateString('es-AR')}`);
    
    // Customer info
    if (order.customer) {
      const customer = order.customer;
      if (customer.name) parts.push(`Cliente: ${this.sanitizeText(customer.name)}`);
      if (customer.email) parts.push(`Email: ${customer.email}`);
      if (customer.location) parts.push(`Ubicación: ${this.sanitizeText(customer.location)}`);
    }
    
    // Products in order
    if (order.products && Array.isArray(order.products)) {
      const products = order.products.map((item: any) => {
        const itemParts: string[] = [];
        if (item.name) itemParts.push(this.sanitizeText(item.name));
        if (item.quantity) itemParts.push(`Cantidad: ${item.quantity}`);
        if (item.price) itemParts.push(`Precio: $${item.price}`);
        return itemParts.join(' - ');
      }).filter(Boolean);
      
      if (products.length > 0) {
        parts.push(`Productos: ${products.join('; ')}`);
      }
    }
    
    // Shipping info
    if (order.shipping) {
      const shipping = order.shipping;
      if (shipping.method) parts.push(`Envío: ${this.sanitizeText(shipping.method)}`);
      if (shipping.cost) parts.push(`Costo envío: $${shipping.cost}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Build analytics content
   */
  private buildAnalyticsContent(analytics: unknown, period: string): string {
    const parts: string[] = [];
    const data = analytics as Record<string, any>;
    
    if (!data || typeof data !== 'object') {
      return '';
    }
    
    parts.push(`Análisis del período: ${period}`);
    
    // Sales metrics
    if (data.sales) {
      if (data.sales.total) parts.push(`Ventas totales: $${data.sales.total}`);
      if (data.sales.count) parts.push(`Número de ventas: ${data.sales.count}`);
      if (data.sales.average) parts.push(`Venta promedio: $${data.sales.average}`);
    }
    
    // Traffic metrics
    if (data.traffic) {
      if (data.traffic.visits) parts.push(`Visitas: ${data.traffic.visits}`);
      if (data.traffic.conversion_rate) parts.push(`Tasa de conversión: ${data.traffic.conversion_rate}%`);
    }
    
    // Product metrics
    if (data.products) {
      if (data.products.top_selling && Array.isArray(data.products.top_selling)) {
        const topProducts = data.products.top_selling.map((product: any) => 
          this.sanitizeText(product.name || product)
        ).join(', ');
        parts.push(`Productos más vendidos: ${topProducts}`);
      }
    }
    
    return parts.join('\n');
  }

  /**
   * Clean and sanitize content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,;:!?¿¡\-()]/g, '') // Remove special chars except punctuation
      .trim();
  }

  /**
   * Sanitize text fields
   */
  private sanitizeText(text: unknown): string {
    if (typeof text === 'string') {
      return text.replace(/[<>]/g, '').trim();
    }
    if (typeof text === 'object' && text !== null) {
      // Handle objects that might contain localized text
      const obj = text as Record<string, any>;
      return obj.es || obj.en || obj.name || obj.description || String(text);
    }
    return String(text || '');
  }

  /**
   * Parse numeric values safely
   */
  private parseNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(metadata: TiendaNubeDocumentMetadata, chunkIndex?: number): string {
    const parts = [
      metadata.type,
      metadata.storeId,
      metadata.productId || metadata.orderId || metadata.customerId || 'general',
    ];
    
    if (chunkIndex !== undefined) {
      parts.push(chunkIndex.toString());
    }
    
    parts.push(uuidv4().slice(0, 8));
    
    return parts.join('_');
  }
}

console.log('[LANGCHAIN-PROCESSOR] Advanced document processor initialized'); 