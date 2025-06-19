/**
 * Embeddings Service
 * Handles text embeddings generation using OpenAI
 */

import OpenAI from 'openai';
import type { EmbeddingResult } from './types';
import { RAG_CONFIG } from './config';

export class EmbeddingsService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: RAG_CONFIG.openai.apiKey,
    });
    this.model = RAG_CONFIG.openai.model;
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      console.log(`[RAG:embeddings] Generating embedding for text: ${text.substring(0, 100)}...`);
      
      if (!text.trim()) {
        throw new Error('Text cannot be empty');
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      const result = response.data[0];
      if (!result) {
        throw new Error('No embedding returned from OpenAI');
      }

      console.log(`[RAG:embeddings] Generated embedding with ${result.embedding.length} dimensions`);

      return {
        embedding: result.embedding,
        tokens: response.usage?.total_tokens || 0,
        model: this.model,
      };
    } catch (error) {
      console.error('[ERROR] Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      console.log(`[RAG:embeddings] Generating ${texts.length} embeddings in batch`);
      
      if (texts.length === 0) {
        return [];
      }

      // Filter out empty texts
      const validTexts = texts.filter(text => text.trim().length > 0);
      if (validTexts.length === 0) {
        throw new Error('No valid texts provided');
      }

      // OpenAI API can handle up to 2048 inputs per request for embeddings
      const batchSize = 100; // Conservative batch size
      const results: EmbeddingResult[] = [];

      for (let i = 0; i < validTexts.length; i += batchSize) {
        const batch = validTexts.slice(i, i + batchSize);
        
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
          encoding_format: 'float',
        });

        const batchResults = response.data.map((item, index) => ({
          embedding: item.embedding,
          tokens: Math.floor((response.usage?.total_tokens || 0) / batch.length),
          model: this.model,
        }));

        results.push(...batchResults);
        
        console.log(`[RAG:embeddings] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validTexts.length / batchSize)}`);
        
        // Rate limiting: small delay between batches
        if (i + batchSize < validTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`[RAG:embeddings] Generated ${results.length} embeddings successfully`);
      return results;
    } catch (error) {
      console.error('[ERROR] Failed to generate batch embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Validate embedding configuration
   */
  validateConfig(): { isValid: boolean; error?: string } {
    if (!RAG_CONFIG.openai.apiKey) {
      return { isValid: false, error: 'OPENAI_API_KEY is required' };
    }

    if (!this.model) {
      return { isValid: false, error: 'OpenAI model is required' };
    }

    return { isValid: true };
  }

  /**
   * Get embedding model info
   */
  getModelInfo(): { model: string; dimension: number; maxTokens: number } {
    return {
      model: this.model,
      dimension: 1536, // text-embedding-3-small dimension
      maxTokens: RAG_CONFIG.openai.maxTokens,
    };
  }
} 