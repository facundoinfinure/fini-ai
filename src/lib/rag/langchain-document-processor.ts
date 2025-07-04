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
   * Enhanced store content builder with comprehensive information
   */
  private buildStoreContent(store: Record<string, any>): string {
    const parts = [];
    
    // Basic store info
    const name = this.sanitizeText(store.name || 'Tienda sin nombre');
    const description = this.sanitizeText(store.description || '');
    
    parts.push(`TIENDA: ${name}`);
    
    if (description) {
      const cleanDesc = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanDesc.length > 10) {
        parts.push(`DESCRIPCIÓN: ${cleanDesc}`);
      }
    }
    
    // Store URL and domain
    if (store.url) {
      parts.push(`SITIO WEB: ${store.url}`);
    }
    
    // Contact information
    if (store.email) {
      parts.push(`EMAIL: ${store.email}`);
    }
    
    if (store.phone) {
      parts.push(`TELÉFONO: ${store.phone}`);
    }
    
    // Address information
    if (store.address) {
      const addressParts = [];
      if (store.address.address) addressParts.push(store.address.address);
      if (store.address.city) addressParts.push(store.address.city);
      if (store.address.province) addressParts.push(store.address.province);
      if (store.address.country) addressParts.push(store.address.country);
      
      if (addressParts.length > 0) {
        parts.push(`DIRECCIÓN: ${addressParts.join(', ')}`);
      }
    }
    
    // Currency and language
    if (store.currency) {
      parts.push(`MONEDA: ${store.currency}`);
    }
    
    if (store.language) {
      parts.push(`IDIOMA: ${store.language}`);
    }
    
    // Store status and configuration
    if (store.plan_name) {
      parts.push(`PLAN: ${store.plan_name}`);
    }
    
    // Business information
    if (store.business_name) {
      parts.push(`RAZÓN SOCIAL: ${this.sanitizeText(store.business_name)}`);
    }
    
    if (store.business_id) {
      parts.push(`CUIT/CUIL: ${store.business_id}`);
    }
    
    // Social media and marketing
    if (store.facebook) {
      parts.push(`FACEBOOK: ${store.facebook}`);
    }
    
    if (store.twitter) {
      parts.push(`TWITTER: ${store.twitter}`);
    }
    
    if (store.instagram) {
      parts.push(`INSTAGRAM: ${store.instagram}`);
    }
    
    // Store policies
    if (store.shipping_policy) {
      const policy = this.sanitizeText(store.shipping_policy).replace(/<[^>]*>/g, ' ');
      if (policy.length > 10) {
        parts.push(`POLÍTICA DE ENVÍO: ${policy}`);
      }
    }
    
    if (store.return_policy) {
      const policy = this.sanitizeText(store.return_policy).replace(/<[^>]*>/g, ' ');
      if (policy.length > 10) {
        parts.push(`POLÍTICA DE DEVOLUCIÓN: ${policy}`);
      }
    }
    
    return this.cleanContent(parts.join('\n'));
  }

  /**
   * Enhanced product content builder with semantic information
   */
  private buildProductContent(product: Record<string, any>): string {
    const parts = [];
    
    // Basic product info
    const name = this.sanitizeText(product.name || 'Producto sin nombre');
    const description = this.sanitizeText(product.description || '');
    const price = this.parseNumber(product.price);
    const stock = this.parseNumber(product.stock);
    
    parts.push(`PRODUCTO: ${name}`);
    
    // Enhanced description processing
    if (description) {
      // Remove HTML tags and clean up
      const cleanDesc = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanDesc.length > 10) {
        parts.push(`DESCRIPCIÓN: ${cleanDesc}`);
      }
    }
    
    // Price information with context
    if (price !== undefined && price > 0) {
      parts.push(`PRECIO: $${price.toLocaleString('es-AR')}`);
      
      // Add price category context
      if (price < 1000) parts.push('CATEGORÍA DE PRECIO: Económico');
      else if (price < 5000) parts.push('CATEGORÍA DE PRECIO: Medio');
      else if (price < 20000) parts.push('CATEGORÍA DE PRECIO: Alto');
      else parts.push('CATEGORÍA DE PRECIO: Premium');
    }
    
    // Stock information with availability context
    if (stock !== undefined) {
      parts.push(`STOCK: ${stock} unidades`);
      
      if (stock === 0) parts.push('DISPONIBILIDAD: Sin stock');
      else if (stock < 5) parts.push('DISPONIBILIDAD: Stock limitado');
      else if (stock < 20) parts.push('DISPONIBILIDAD: Stock moderado');
      else parts.push('DISPONIBILIDAD: Stock abundante');
    }
    
    // Category information
    const category = this.sanitizeText(product.categories?.[0]?.name || 'Sin categoría');
    if (category && category !== 'Sin categoría') {
      parts.push(`CATEGORÍA: ${category}`);
    }
    
    // Variants information
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 1) {
      const variantInfo = product.variants.map((v: any) => {
        const variantParts = [];
        if (v.option1) variantParts.push(v.option1);
        if (v.option2) variantParts.push(v.option2);
        if (v.option3) variantParts.push(v.option3);
        return variantParts.join(' - ');
      }).filter(Boolean);
      
      if (variantInfo.length > 0) {
        parts.push(`VARIANTES: ${variantInfo.slice(0, 5).join(', ')}`);
      }
    }
    
    // SEO information
    if (product.seo_title) {
      parts.push(`TÍTULO SEO: ${this.sanitizeText(product.seo_title)}`);
    }
    
    if (product.seo_description) {
      parts.push(`DESCRIPCIÓN SEO: ${this.sanitizeText(product.seo_description)}`);
    }
    
    // Tags and keywords
    if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
      const tags = product.tags.map(tag => this.sanitizeText(tag)).filter(Boolean);
      if (tags.length > 0) {
        parts.push(`ETIQUETAS: ${tags.join(', ')}`);
      }
    }
    
    // Weight and dimensions
    if (product.weight) {
      parts.push(`PESO: ${product.weight}g`);
    }
    
    // Status and visibility
    if (product.published !== undefined) {
      parts.push(`ESTADO: ${product.published ? 'Publicado' : 'No publicado'}`);
    }
    
    // Images information
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      parts.push(`IMÁGENES: ${product.images.length} imagen${product.images.length > 1 ? 'es' : ''}`);
    }
    
    return this.cleanContent(parts.join('\n'));
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
   * Enhanced analytics content builder with insights
   */
  private buildAnalyticsContent(analytics: unknown, period: string): string {
    if (!analytics || typeof analytics !== 'object') {
      return '';
    }
    
    const data = analytics as Record<string, any>;
    const parts = [];
    
    parts.push(`ANALYTICS PERÍODO: ${period.toUpperCase()}`);
    
    // Sales metrics
    if (data.totalSales !== undefined) {
      const sales = this.parseNumber(data.totalSales) || 0;
      parts.push(`VENTAS TOTALES: $${sales.toLocaleString('es-AR')}`);
      
      // Add context
      if (sales === 0) parts.push('ESTADO VENTAS: Sin ventas en el período');
      else if (sales < 10000) parts.push('ESTADO VENTAS: Ventas bajas');
      else if (sales < 100000) parts.push('ESTADO VENTAS: Ventas moderadas');
      else parts.push('ESTADO VENTAS: Ventas altas');
    }
    
    if (data.totalOrders !== undefined) {
      const orders = this.parseNumber(data.totalOrders) || 0;
      parts.push(`ÓRDENES TOTALES: ${orders}`);
      
      if (orders === 0) parts.push('ESTADO ÓRDENES: Sin órdenes');
      else if (orders < 10) parts.push('ESTADO ÓRDENES: Pocas órdenes');
      else if (orders < 50) parts.push('ESTADO ÓRDENES: Órdenes moderadas');
      else parts.push('ESTADO ÓRDENES: Muchas órdenes');
    }
    
    // Calculate average order value
    if (data.totalSales && data.totalOrders) {
      const avgOrder = (data.totalSales / data.totalOrders);
      if (avgOrder > 0) {
        parts.push(`TICKET PROMEDIO: $${avgOrder.toLocaleString('es-AR')}`);
        
        if (avgOrder < 1000) parts.push('TICKET PROMEDIO: Bajo');
        else if (avgOrder < 5000) parts.push('TICKET PROMEDIO: Medio');
        else parts.push('TICKET PROMEDIO: Alto');
      }
    }
    
    // Customer metrics
    if (data.totalCustomers !== undefined) {
      const customers = this.parseNumber(data.totalCustomers) || 0;
      parts.push(`CLIENTES TOTALES: ${customers}`);
    }
    
    if (data.newCustomers !== undefined) {
      const newCustomers = this.parseNumber(data.newCustomers) || 0;
      parts.push(`CLIENTES NUEVOS: ${newCustomers}`);
    }
    
    // Product metrics
    if (data.totalProducts !== undefined) {
      const products = this.parseNumber(data.totalProducts) || 0;
      parts.push(`PRODUCTOS TOTALES: ${products}`);
      
      if (products === 0) parts.push('CATÁLOGO: Sin productos');
      else if (products < 10) parts.push('CATÁLOGO: Catálogo pequeño');
      else if (products < 100) parts.push('CATÁLOGO: Catálogo mediano');
      else parts.push('CATÁLOGO: Catálogo amplio');
    }
    
    // Top products
    if (data.topProducts && Array.isArray(data.topProducts)) {
      const topProductNames = data.topProducts
        .slice(0, 5)
        .map((p: any) => this.sanitizeText(p.name || p.title))
        .filter(Boolean);
      
      if (topProductNames.length > 0) {
        parts.push(`PRODUCTOS MÁS VENDIDOS: ${topProductNames.join(', ')}`);
      }
    }
    
    // Conversion and performance metrics
    if (data.conversionRate !== undefined) {
      const rate = this.parseNumber(data.conversionRate) || 0;
      parts.push(`TASA DE CONVERSIÓN: ${(rate * 100).toFixed(2)}%`);
      
      if (rate < 0.01) parts.push('CONVERSIÓN: Muy baja');
      else if (rate < 0.03) parts.push('CONVERSIÓN: Baja');
      else if (rate < 0.05) parts.push('CONVERSIÓN: Buena');
      else parts.push('CONVERSIÓN: Excelente');
    }
    
    // Traffic metrics
    if (data.pageViews !== undefined) {
      const views = this.parseNumber(data.pageViews) || 0;
      parts.push(`VISITAS: ${views.toLocaleString('es-AR')}`);
    }
    
    if (data.uniqueVisitors !== undefined) {
      const visitors = this.parseNumber(data.uniqueVisitors) || 0;
      parts.push(`VISITANTES ÚNICOS: ${visitors.toLocaleString('es-AR')}`);
    }
    
    return this.cleanContent(parts.join('\n'));
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