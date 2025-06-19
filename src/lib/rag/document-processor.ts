/**
 * Document Processor
 * Handles text chunking and document processing for RAG
 */

import type { DocumentChunk, DocumentProcessor } from './types';
import { RAG_CONFIG } from './config';
import { v4 as uuidv4 } from 'uuid';

export class RAGDocumentProcessor implements DocumentProcessor {
  private maxChunkSize: number;
  private chunkOverlap: number;

  constructor() {
    this.maxChunkSize = RAG_CONFIG.search.maxChunkSize;
    this.chunkOverlap = RAG_CONFIG.search.chunkOverlap;
  }

  /**
   * Process a document into chunks with metadata
   */
  processDocument(content: string, metadata: Partial<DocumentChunk['metadata']>): DocumentChunk[] {
    try {
      console.log(`[RAG:processor] Processing document of type: ${metadata.type}`);
      
      if (!content.trim()) {
        console.log('[RAG:processor] Empty content, skipping');
        return [];
      }

      // Clean and preprocess content
      const cleanContent = this.cleanText(content);
      
      // Split into chunks
      const textChunks = this.chunkText(cleanContent, this.maxChunkSize, this.chunkOverlap);
      
      // Create document chunks with metadata
      const documentChunks: DocumentChunk[] = textChunks.map((chunk, index) => {
        const baseId = metadata.storeId ? `${metadata.storeId}` : 'unknown';
        const typePrefix = metadata.type || 'unknown';
        const specificId = metadata.productId || metadata.orderId || metadata.customerId || 'doc';
        
        return {
          id: `${typePrefix}_${baseId}_${specificId}_${index}_${uuidv4().slice(0, 8)}`,
          content: chunk,
          metadata: {
            source: metadata.source || 'unknown',
            type: metadata.type || 'store',
            storeId: metadata.storeId || '',
            timestamp: metadata.timestamp || new Date().toISOString(),
            chunkIndex: index,
            totalChunks: textChunks.length,
            ...metadata,
          },
        };
      });

      console.log(`[RAG:processor] Created ${documentChunks.length} chunks from document`);
      return documentChunks;
    } catch (error) {
      console.error('[ERROR] Failed to process document:', error);
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Split text into overlapping chunks
   */
  chunkText(text: string, maxSize: number, overlap: number): string[] {
    if (!text.trim()) {
      return [];
    }

    // If text is smaller than max size, return as single chunk
    if (text.length <= maxSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed max size
      if (currentChunk.length + sentence.length + 1 > maxSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          
          // Start new chunk with overlap
          currentChunk = this.getOverlap(currentChunk, overlap) + sentence;
        } else {
          // Single sentence is too long, split it by characters
          const longSentenceChunks = this.splitLongSentence(sentence, maxSize, overlap);
          chunks.push(...longSentenceChunks);
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with processing
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Trim
      .trim();
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be improved with more sophisticated NLP
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlap(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }
    
    const overlapText = text.slice(-overlapSize);
    
    // Try to start at a word boundary
    const spaceIndex = overlapText.indexOf(' ');
    if (spaceIndex > 0) {
      return overlapText.slice(spaceIndex + 1);
    }
    
    return overlapText;
  }

  /**
   * Split very long sentences that exceed max chunk size
   */
  private splitLongSentence(sentence: string, maxSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let remaining = sentence;
    
    while (remaining.length > maxSize) {
      let chunkEnd = maxSize;
      
      // Try to break at a word boundary
      const lastSpace = remaining.lastIndexOf(' ', maxSize);
      if (lastSpace > maxSize * 0.7) { // Don't break too early
        chunkEnd = lastSpace;
      }
      
      const chunk = remaining.slice(0, chunkEnd);
      chunks.push(chunk);
      
      // Prepare next chunk with overlap
      const overlapStart = Math.max(0, chunkEnd - overlap);
      remaining = remaining.slice(overlapStart);
    }
    
    if (remaining.trim()) {
      chunks.push(remaining.trim());
    }
    
    return chunks;
  }

  /**
   * Process Tienda Nube product data into searchable text
   */
  processProductData(product: any): string {
    const parts: string[] = [];
    
    // Basic product info
    if (product.name) parts.push(`Producto: ${product.name}`);
    if (product.description) parts.push(`Descripción: ${product.description}`);
    if (product.category) parts.push(`Categoría: ${product.category}`);
    if (product.brand) parts.push(`Marca: ${product.brand}`);
    
    // Pricing
    if (product.price) parts.push(`Precio: $${product.price}`);
    if (product.compare_at_price) parts.push(`Precio anterior: $${product.compare_at_price}`);
    
    // Variants
    if (product.variants && product.variants.length > 0) {
      const variantTexts = product.variants.map((variant: any) => {
        const variantParts: string[] = [];
        if (variant.values) variantParts.push(`Variante: ${variant.values.join(', ')}`);
        if (variant.price) variantParts.push(`Precio: $${variant.price}`);
        if (variant.stock_quantity) variantParts.push(`Stock: ${variant.stock_quantity}`);
        return variantParts.join(' - ');
      });
      parts.push(`Variantes: ${variantTexts.join('. ')}`);
    }
    
    // SEO and additional info
    if (product.seo_title) parts.push(`SEO título: ${product.seo_title}`);
    if (product.seo_description) parts.push(`SEO descripción: ${product.seo_description}`);
    if (product.tags) parts.push(`Tags: ${product.tags.join(', ')}`);
    
    return parts.join('\n');
  }

  /**
   * Process Tienda Nube order data into searchable text
   */
  processOrderData(order: any): string {
    const parts: string[] = [];
    
    // Basic order info
    if (order.id) parts.push(`Orden ID: ${order.id}`);
    if (order.number) parts.push(`Número de orden: ${order.number}`);
    if (order.status) parts.push(`Estado: ${order.status}`);
    if (order.payment_status) parts.push(`Estado de pago: ${order.payment_status}`);
    if (order.shipping_status) parts.push(`Estado de envío: ${order.shipping_status}`);
    
    // Financial info
    if (order.total) parts.push(`Total: $${order.total}`);
    if (order.subtotal) parts.push(`Subtotal: $${order.subtotal}`);
    if (order.discount) parts.push(`Descuento: $${order.discount}`);
    if (order.shipping_cost) parts.push(`Costo de envío: $${order.shipping_cost}`);
    
    // Customer info
    if (order.customer) {
      const customer = order.customer;
      if (customer.name) parts.push(`Cliente: ${customer.name}`);
      if (customer.email) parts.push(`Email: ${customer.email}`);
    }
    
    // Products in order
    if (order.products && order.products.length > 0) {
      const productTexts = order.products.map((item: any) => {
        const itemParts: string[] = [];
        if (item.name) itemParts.push(item.name);
        if (item.quantity) itemParts.push(`Cantidad: ${item.quantity}`);
        if (item.price) itemParts.push(`Precio: $${item.price}`);
        return itemParts.join(' - ');
      });
      parts.push(`Productos: ${productTexts.join(', ')}`);
    }
    
    // Dates
    if (order.created_at) parts.push(`Creado: ${order.created_at}`);
    if (order.updated_at) parts.push(`Actualizado: ${order.updated_at}`);
    
    return parts.join('\n');
  }

  /**
   * Process customer data into searchable text
   */
  processCustomerData(customer: any): string {
    const parts: string[] = [];
    
    // Basic customer info
    if (customer.id) parts.push(`Cliente ID: ${customer.id}`);
    if (customer.name) parts.push(`Nombre: ${customer.name}`);
    if (customer.email) parts.push(`Email: ${customer.email}`);
    if (customer.phone) parts.push(`Teléfono: ${customer.phone}`);
    
    // Customer stats
    if (customer.total_spent) parts.push(`Total gastado: $${customer.total_spent}`);
    if (customer.orders_count) parts.push(`Número de órdenes: ${customer.orders_count}`);
    if (customer.last_order_date) parts.push(`Última orden: ${customer.last_order_date}`);
    
    // Address info
    if (customer.default_address) {
      const address = customer.default_address;
      const addressParts: string[] = [];
      if (address.city) addressParts.push(address.city);
      if (address.province) addressParts.push(address.province);
      if (address.country) addressParts.push(address.country);
      if (addressParts.length > 0) {
        parts.push(`Ubicación: ${addressParts.join(', ')}`);
      }
    }
    
    // Dates
    if (customer.created_at) parts.push(`Registrado: ${customer.created_at}`);
    if (customer.updated_at) parts.push(`Actualizado: ${customer.updated_at}`);
    
    return parts.join('\n');
  }

  /**
   * Process analytics data into searchable text
   */
  processAnalyticsData(analytics: any, period: string): string {
    const parts: string[] = [];
    
    parts.push(`Reporte de Analytics - Período: ${period}`);
    
    // Revenue data
    if (analytics.revenue) {
      parts.push(`Ingresos totales: $${analytics.revenue}`);
    }
    
    // Orders data
    if (analytics.totalOrders) {
      parts.push(`Total de órdenes: ${analytics.totalOrders}`);
    }
    
    if (analytics.averageOrderValue) {
      parts.push(`Valor promedio de orden: $${analytics.averageOrderValue}`);
    }
    
    // Top products
    if (analytics.topProducts && analytics.topProducts.length > 0) {
      const productTexts = analytics.topProducts.map((item: any) => {
        return `${item.product.name} (${item.quantity} vendidos, $${item.revenue} ingresos)`;
      });
      parts.push(`Productos más vendidos: ${productTexts.join(', ')}`);
    }
    
    return parts.join('\n');
  }
} 