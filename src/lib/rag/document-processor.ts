/**
 * Document Processor
 * Handles text chunking and document processing for RAG
 */

import { v4 as uuidv4 } from 'uuid';

import { RAG_CONFIG } from './config';
import type { DocumentChunk, DocumentProcessor } from './types';

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
      console.warn(`[RAG:processor] Processing document of type: ${metadata.type}`);
      
      if (!content.trim()) {
        console.warn('[RAG:processor] Empty content, skipping');
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

      console.warn(`[RAG:processor] Created ${documentChunks.length} chunks from document`);
      return documentChunks;
    } catch (error) {
      console.warn('[ERROR] Failed to process document:', error);
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
  processProductData(product: unknown): string {
    const parts: string[] = [];
    const p = product as Record<string, any>;
    // Basic product info
    if (p && typeof p === 'object') {
      if (p.name) parts.push(`Producto: ${p.name}`);
      if (p.description) parts.push(`Descripción: ${p.description}`);
      if (p.category) parts.push(`Categoría: ${p.category}`);
      if (p.brand) parts.push(`Marca: ${p.brand}`);
      // Pricing
      if (p.price) parts.push(`Precio: $${p.price}`);
      if (p.compare_at_price) parts.push(`Precio anterior: $${p.compare_at_price}`);
      // Variants
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        const variantTexts = p.variants.map((variant: unknown) => {
          const v = variant as Record<string, any>;
          const variantParts: string[] = [];
          if (v.values) variantParts.push(`Variante: ${Array.isArray(v.values) ? v.values.join(', ') : v.values}`);
          if (v.price) variantParts.push(`Precio: $${v.price}`);
          if (v.stock_quantity) variantParts.push(`Stock: ${v.stock_quantity}`);
          return variantParts.join(' - ');
        });
        parts.push(`Variantes: ${variantTexts.join('. ')}`);
      }
      // SEO and additional info
      if (p.seo_title) parts.push(`SEO título: ${p.seo_title}`);
      if (p.seo_description) parts.push(`SEO descripción: ${p.seo_description}`);
      if (Array.isArray(p.tags)) parts.push(`Tags: ${p.tags.join(', ')}`);
    }
    return parts.join('\n');
  }

  /**
   * Process Tienda Nube order data into searchable text
   */
  processOrderData(order: unknown): string {
    const parts: string[] = [];
    const o = order as Record<string, any>;
    if (o && typeof o === 'object') {
      if (o.id) parts.push(`Orden ID: ${o.id}`);
      if (o.number) parts.push(`Número de orden: ${o.number}`);
      if (o.status) parts.push(`Estado: ${o.status}`);
      if (o.payment_status) parts.push(`Estado de pago: ${o.payment_status}`);
      if (o.shipping_status) parts.push(`Estado de envío: ${o.shipping_status}`);
      if (o.total) parts.push(`Total: $${o.total}`);
      if (o.subtotal) parts.push(`Subtotal: $${o.subtotal}`);
      if (o.discount) parts.push(`Descuento: $${o.discount}`);
      if (o.shipping_cost) parts.push(`Costo de envío: $${o.shipping_cost}`);
      if (o.customer && typeof o.customer === 'object') {
        const customer = o.customer as Record<string, any>;
        if (customer.name) parts.push(`Cliente: ${customer.name}`);
        if (customer.email) parts.push(`Email: ${customer.email}`);
      }
      if (Array.isArray(o.products) && o.products.length > 0) {
        const productTexts = o.products.map((item: unknown) => {
          const i = item as Record<string, any>;
          const itemParts: string[] = [];
          if (i.name) itemParts.push(i.name);
          if (i.quantity) itemParts.push(`Cantidad: ${i.quantity}`);
          if (i.price) itemParts.push(`Precio: $${i.price}`);
          return itemParts.join(' - ');
        });
        parts.push(`Productos: ${productTexts.join(', ')}`);
      }
      if (o.created_at) parts.push(`Creado: ${o.created_at}`);
      if (o.updated_at) parts.push(`Actualizado: ${o.updated_at}`);
    }
    return parts.join('\n');
  }

  /**
   * Process customer data into searchable text
   */
  processCustomerData(customer: unknown): string {
    const parts: string[] = [];
    const c = customer as Record<string, any>;
    if (c && typeof c === 'object') {
      if (c.id) parts.push(`Cliente ID: ${c.id}`);
      if (c.name) parts.push(`Nombre: ${c.name}`);
      if (c.email) parts.push(`Email: ${c.email}`);
      if (c.phone) parts.push(`Teléfono: ${c.phone}`);
      if (c.total_spent) parts.push(`Total gastado: $${c.total_spent}`);
      if (c.orders_count) parts.push(`Número de órdenes: ${c.orders_count}`);
      if (c.last_order_date) parts.push(`Última orden: ${c.last_order_date}`);
      if (c.default_address && typeof c.default_address === 'object') {
        const address = c.default_address as Record<string, any>;
        const addressParts: string[] = [];
        if (address.city) addressParts.push(address.city);
        if (address.province) addressParts.push(address.province);
        if (address.country) addressParts.push(address.country);
        if (addressParts.length > 0) {
          parts.push(`Ubicación: ${addressParts.join(', ')}`);
        }
      }
      if (c.created_at) parts.push(`Registrado: ${c.created_at}`);
      if (c.updated_at) parts.push(`Actualizado: ${c.updated_at}`);
    }
    return parts.join('\n');
  }

  /**
   * Process analytics data into searchable text
   */
  processAnalyticsData(analytics: unknown, period: string): string {
    const parts: string[] = [];
    const a = analytics as Record<string, any>;
    parts.push(`Reporte de Analytics - Período: ${period}`);
    if (a && typeof a === 'object') {
      if (a.revenue) parts.push(`Ingresos totales: $${a.revenue}`);
      if (a.totalOrders) parts.push(`Total de órdenes: ${a.totalOrders}`);
      if (a.averageOrderValue) parts.push(`Valor promedio de orden: $${a.averageOrderValue}`);
      if (Array.isArray(a.topProducts) && a.topProducts.length > 0) {
        const productTexts = a.topProducts.map((item: unknown) => {
          const i = item as Record<string, any>;
          return `${i.product?.name || ''} (${i.quantity || 0} vendidos, $${i.revenue || 0} ingresos)`;
        });
        parts.push(`Productos más vendidos: ${productTexts.join(', ')}`);
      }
    }
    return parts.join('\n');
  }
} 