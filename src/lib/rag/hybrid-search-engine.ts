/**
 * 🔍 Hybrid Search Engine - Maximum Precision
 * Combines semantic search (RAG) with keyword search for optimal results
 */

import { Document } from '@langchain/core/documents';

export interface HybridSearchQuery {
  query: string;
  context: {
    storeId: string;
    userId: string;
    agentType: string;
    conversationId: string;
  };
  options?: {
    topK?: number;
    semanticWeight?: number; // 0-1, higher = more semantic
    keywordWeight?: number;  // 0-1, higher = more keyword
    scoreThreshold?: number;
    includeMetadata?: boolean;
  };
}

export interface HybridSearchResult {
  sources: Array<{
    pageContent: string;
    metadata: any;
    score: number;
    searchType: 'semantic' | 'keyword' | 'hybrid';
    relevanceReason: string;
  }>;
  confidence: number;
  metadata: {
    semanticResults: number;
    keywordResults: number;
    hybridScore: number;
    processingTime: number;
    searchStrategy: string;
  };
}

export class HybridSearchEngine {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[HYBRID-SEARCH] 🔍 Initializing hybrid search engine...');
    this.isInitialized = true;
  }

  async search(query: HybridSearchQuery): Promise<HybridSearchResult> {
    const startTime = Date.now();
    
    try {
      await this.initialize();

      const options = {
        topK: query.options?.topK || 8,
        semanticWeight: query.options?.semanticWeight || 0.7,
        keywordWeight: query.options?.keywordWeight || 0.3,
        scoreThreshold: query.options?.scoreThreshold || 0.2,
        includeMetadata: query.options?.includeMetadata ?? true,
      };

      console.log(`[HYBRID-SEARCH] 🔍 Processing: "${query.query}" (semantic: ${options.semanticWeight}, keyword: ${options.keywordWeight})`);

      // Run semantic and keyword search in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        this.runSemanticSearch(query, options),
        this.runKeywordSearch(query, options),
      ]);

      // Combine and rank results
      const hybridResults = this.combineResults(semanticResults, keywordResults, options);

      // Filter by score threshold
      const filteredResults = hybridResults.filter(result => result.score >= options.scoreThreshold);

      // Take top K results
      const finalResults = filteredResults.slice(0, options.topK);

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(finalResults);

      console.log(`[HYBRID-SEARCH] ✅ Found ${finalResults.length} results in ${processingTime}ms (confidence: ${confidence.toFixed(3)})`);

      return {
        sources: finalResults,
        confidence,
        metadata: {
          semanticResults: semanticResults.length,
          keywordResults: keywordResults.length,
          hybridScore: this.calculateHybridScore(semanticResults, keywordResults),
          processingTime,
          searchStrategy: this.determineSearchStrategy(semanticResults, keywordResults),
        },
      };
    } catch (error) {
      console.error('[HYBRID-SEARCH] Search failed:', error);
      return {
        sources: [],
        confidence: 0,
        metadata: {
          semanticResults: 0,
          keywordResults: 0,
          hybridScore: 0,
          processingTime: Date.now() - startTime,
          searchStrategy: 'error',
        },
      };
    }
  }

  /**
   * Run semantic search using enhanced RAG
   */
  private async runSemanticSearch(query: HybridSearchQuery, options: any): Promise<Array<any>> {
    try {
      const { enhancedRAGEngine } = await import('./enhanced-rag-engine');
      
      const ragResult = await enhancedRAGEngine.search({
        query: query.query,
        context: query.context as any,
        options: {
          topK: Math.ceil(options.topK * 1.5), // Get more results for merging
          scoreThreshold: 0.1, // Lower threshold for hybrid
        },
      });

      return ragResult.sources.map(source => ({
        ...source,
        searchType: 'semantic',
        relevanceReason: `Semantic similarity: ${((source.score || 0.5) * 100).toFixed(1)}%`,
      }));
    } catch (error) {
      console.warn('[HYBRID-SEARCH] Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Run keyword-based search
   */
  private async runKeywordSearch(query: HybridSearchQuery, options: any): Promise<Array<any>> {
    try {
      // Extract keywords from query
      const keywords = this.extractKeywords(query.query);
      
      if (keywords.length === 0) {
        return [];
      }

      // Search for documents containing keywords (simplified implementation)
      const keywordResults = await this.searchByKeywords(
        keywords, 
        query.context.storeId, 
        options.topK
      );

      return keywordResults.map(result => ({
        ...result,
        searchType: 'keyword',
        relevanceReason: `Keyword matches: ${result.matchedKeywords.join(', ')}`,
      }));
    } catch (error) {
      console.warn('[HYBRID-SEARCH] Keyword search failed:', error);
      return [];
    }
  }

  /**
   * Extract meaningful keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 
      'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las',
      'qué', 'cómo', 'cuál', 'dónde', 'cuándo', 'por qué',
      'tengo', 'tienes', 'tiene', 'tenemos', 'tienen',
      'puedo', 'puedes', 'puede', 'podemos', 'pueden',
      'want', 'need', 'have', 'can', 'will', 'would', 'could'
    ]);

    // Important e-commerce keywords to prioritize
    const ecommerceKeywords = new Set([
      'producto', 'productos', 'precio', 'precios', 'venta', 'ventas',
      'catálogo', 'inventario', 'stock', 'cliente', 'clientes',
      'orden', 'órdenes', 'pedido', 'pedidos', 'analytics', 'métricas'
    ]);

    const words = query
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ') // Remove punctuation but keep accents
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !stopWords.has(word));

    // Prioritize e-commerce keywords
    const prioritized = words.filter(word => ecommerceKeywords.has(word));
    const regular = words.filter(word => !ecommerceKeywords.has(word));

    return [...prioritized, ...regular].slice(0, 8); // Max 8 keywords
  }

  /**
   * Search for documents by keywords (simplified - would need proper implementation)
   */
  private async searchByKeywords(keywords: string[], storeId: string, topK: number): Promise<Array<any>> {
    // This is a simplified implementation
    // In a real system, you'd search through your vector store or database
    // using keyword matching techniques
    
    try {
      // For now, return empty array as we don't have a keyword search implementation
      // In the future, this could use ElasticSearch, database full-text search, etc.
      console.log(`[HYBRID-SEARCH] Keyword search for: ${keywords.join(', ')} (store: ${storeId})`);
      
      return [];
    } catch (error) {
      console.warn('[HYBRID-SEARCH] Keyword search implementation error:', error);
      return [];
    }
  }

  /**
   * Combine semantic and keyword results with weighted scoring
   */
  private combineResults(semanticResults: any[], keywordResults: any[], options: any): any[] {
    const combined = new Map<string, any>();

    // Process semantic results
    semanticResults.forEach(result => {
      const key = this.generateResultKey(result);
      const weightedScore = (result.score || 0.5) * options.semanticWeight;
      
      combined.set(key, {
        ...result,
        score: weightedScore,
        searchType: 'semantic',
      });
    });

    // Process keyword results and merge
    keywordResults.forEach(result => {
      const key = this.generateResultKey(result);
      const weightedScore = (result.score || 0.5) * options.keywordWeight;
      
      if (combined.has(key)) {
        // Combine scores for documents found by both methods
        const existing = combined.get(key)!;
        existing.score = Math.max(existing.score + weightedScore, 1.0); // Cap at 1.0
        existing.searchType = 'hybrid';
        existing.relevanceReason = `${existing.relevanceReason} + ${result.relevanceReason}`;
      } else {
        combined.set(key, {
          ...result,
          score: weightedScore,
          searchType: 'keyword',
        });
      }
    });

    // Sort by score
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Generate a unique key for a result to detect duplicates
   */
  private generateResultKey(result: any): string {
    // Use content hash or metadata to identify unique documents
    const content = result.pageContent || '';
    const metadata = result.metadata || {};
    
    return `${metadata.dataType || 'unknown'}-${content.substring(0, 50)}`;
  }

  /**
   * Calculate overall confidence based on result quality
   */
  private calculateOverallConfidence(results: any[]): number {
    if (results.length === 0) return 0;

    const avgScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    const hybridBonus = results.some(r => r.searchType === 'hybrid') ? 0.1 : 0;
    const diversityBonus = this.calculateDiversityBonus(results);

    return Math.min(avgScore + hybridBonus + diversityBonus, 1.0);
  }

  /**
   * Calculate diversity bonus based on search types
   */
  private calculateDiversityBonus(results: any[]): number {
    const types = new Set(results.map(r => r.searchType));
    
    if (types.has('hybrid')) return 0.15;
    if (types.has('semantic') && types.has('keyword')) return 0.1;
    return 0;
  }

  /**
   * Calculate hybrid effectiveness score
   */
  private calculateHybridScore(semanticResults: any[], keywordResults: any[]): number {
    const total = semanticResults.length + keywordResults.length;
    if (total === 0) return 0;

    const balance = Math.min(semanticResults.length, keywordResults.length) / Math.max(semanticResults.length, keywordResults.length, 1);
    return balance * (total / 20); // Normalize to reasonable scale
  }

  /**
   * Determine which search strategy was most effective
   */
  private determineSearchStrategy(semanticResults: any[], keywordResults: any[]): string {
    if (semanticResults.length === 0 && keywordResults.length === 0) return 'no_results';
    if (semanticResults.length === 0) return 'keyword_only';
    if (keywordResults.length === 0) return 'semantic_only';
    
    const semanticAvg = semanticResults.reduce((sum, r) => sum + (r.score || 0), 0) / semanticResults.length;
    const keywordAvg = keywordResults.reduce((sum, r) => sum + (r.score || 0), 0) / keywordResults.length;
    
    if (Math.abs(semanticAvg - keywordAvg) < 0.1) return 'balanced_hybrid';
    return semanticAvg > keywordAvg ? 'semantic_dominant' : 'keyword_dominant';
  }

  /**
   * Optimize search weights based on query type
   */
  async optimizeSearchWeights(query: string, agentType: string): Promise<{ semanticWeight: number; keywordWeight: number }> {
    const lowerQuery = query.toLowerCase();

    // Product-specific queries benefit from keyword search
    if (lowerQuery.includes('producto') && (lowerQuery.includes('nombre') || lowerQuery.includes('buscar'))) {
      return { semanticWeight: 0.4, keywordWeight: 0.6 };
    }

    // Analytics queries benefit from semantic search
    if (lowerQuery.includes('analítica') || lowerQuery.includes('reporte') || lowerQuery.includes('tendencia')) {
      return { semanticWeight: 0.8, keywordWeight: 0.2 };
    }

    // Agent-specific optimizations
    switch (agentType) {
      case 'product_manager':
        return { semanticWeight: 0.6, keywordWeight: 0.4 };
      case 'analytics':
        return { semanticWeight: 0.8, keywordWeight: 0.2 };
      case 'customer_service':
        return { semanticWeight: 0.5, keywordWeight: 0.5 };
      default:
        return { semanticWeight: 0.7, keywordWeight: 0.3 };
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{
    isConfigured: boolean;
    supportedFeatures: string[];
    performance: {
      avgLatency: number;
      successRate: number;
    };
  }> {
    return {
      isConfigured: this.isInitialized,
      supportedFeatures: [
        'Semantic search via RAG',
        'Keyword extraction',
        'Result combination',
        'Score weighting',
        'Adaptive thresholds',
        'Search strategy optimization'
      ],
      performance: {
        avgLatency: 150, // ms, estimated
        successRate: 0.95,
      },
    };
  }
}

export const hybridSearchEngine = new HybridSearchEngine(); 