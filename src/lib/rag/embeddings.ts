/**
 * Embeddings Service
 * Handles text embeddings generation using OpenAI
 */

import OpenAI from 'openai';

import { RAG_CONFIG } from './config';
import type { EmbeddingResult } from './types';

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
      console.warn(`[RAG:embeddings] Generating embedding for text: ${text.substring(0, 100)}...`);
      
      if (!text.trim()) {
        throw new Error('Text cannot be empty');
      }

      const _response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      const _result = _response.data[0];
      if (!_result) {
        throw new Error('No embedding returned from OpenAI');
      }

      console.warn(`[RAG:embeddings] Generated embedding with ${_result.embedding.length} dimensions`);

      return {
        embedding: _result.embedding,
        tokens: _response.usage?.total_tokens || 0,
        model: this.model,
      };
    } catch (error) {
      console.warn('[ERROR] Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      console.warn(`[RAG:embeddings] Generating ${texts.length} embeddings in batch`);
      
      if (texts.length === 0) {
        return [];
      }

      // Filter out empty texts
      const _validTexts = texts.filter(text => text.trim().length > 0);
      if (_validTexts.length === 0) {
        throw new Error('No valid texts provided');
      }

      // OpenAI API can handle up to 2048 inputs per request for embeddings
      const _batchSize = 100; // Conservative batch size
      const results: EmbeddingResult[] = [];

      for (let i = 0; i < _validTexts.length; i += _batchSize) {
        const _batch = _validTexts.slice(i, i + _batchSize);
        
        const _response = await this.openai.embeddings.create({
          model: this.model,
          input: _batch,
          encoding_format: 'float',
        });

        const _batchResults = _response.data.map((item, _index) => ({
          embedding: item.embedding,
          tokens: Math.floor((_response.usage?.total_tokens || 0) / _batch.length),
          model: this.model,
        }));

        results.push(..._batchResults);
        
        console.warn(`[RAG:embeddings] Processed batch ${Math.floor(i / _batchSize) + 1}/${Math.ceil(_validTexts.length / _batchSize)}`);
        
        // Rate limiting: small delay between batches
        if (i + _batchSize < _validTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.warn(`[RAG:embeddings] Generated ${results.length} embeddings successfully`);
      return results;
    } catch (error) {
      console.warn('[ERROR] Failed to generate batch embeddings:', error);
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