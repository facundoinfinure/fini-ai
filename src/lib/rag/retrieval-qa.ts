/**
 * LangChain Retrieval QA System
 * Advanced question-answering with retrieval augmentation
 */

import { Document } from '@langchain/core/documents';
import { BaseRetriever } from '@langchain/core/retrievers';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough } from '@langchain/core/runnables';

import { VectorStoreFactory, EnhancedPineconeStore } from './langchain-vectorstore';
import { LANGCHAIN_CONFIG, LangChainFactory, getAgentThreshold, type RAGAgentType } from './langchain-config';

export interface RAGContext {
  storeId: string;
  userId: string;
  conversationId?: string;
  agentType: RAGAgentType;
  language?: 'es' | 'en';
}

export class MultiNamespaceRetriever extends BaseRetriever {
  lc_namespace: string[] = ['fini', 'retrievers', 'multi_namespace'];
  
  private vectorStores: Map<string, EnhancedPineconeStore> = new Map();
  private storeId: string;
  private k: number;
  private scoreThreshold: number;

  constructor(
    storeId: string,
    options: {
      k?: number;
      scoreThreshold?: number;
    } = {}
  ) {
    super();
    this.storeId = storeId;
    this.k = options.k ?? LANGCHAIN_CONFIG.retrieval.topK;
    this.scoreThreshold = options.scoreThreshold ?? LANGCHAIN_CONFIG.retrieval.scoreThreshold;
  }

  async initialize(): Promise<void> {
    const dataTypes = ['store', 'products', 'orders', 'customers', 'analytics'] as const;
    
    for (const dataType of dataTypes) {
      try {
        const vectorStore = await VectorStoreFactory.createEnhancedStore(this.storeId, dataType);
        this.vectorStores.set(dataType, vectorStore);
      } catch (error) {
        console.warn(`[MULTI-RETRIEVER] Failed to initialize ${dataType} vector store:`, error);
      }
    }

    console.log(`[MULTI-RETRIEVER] Initialized ${this.vectorStores.size} vector stores for store: ${this.storeId}`);
  }

  async getRelevantDocuments(query: string): Promise<Document[]> {
    if (this.vectorStores.size === 0) {
      await this.initialize();
    }

    const allResults: Array<[Document, number]> = [];

    for (const [dataType, vectorStore] of this.vectorStores) {
      try {
        const results = await vectorStore.similaritySearchWithScore(
          query,
          this.k,
          {
            scoreThreshold: this.scoreThreshold,
          }
        );

        const enhancedResults = results.map(([doc, score]): [Document, number] => [
          new Document({
            pageContent: doc.pageContent,
            metadata: {
              ...doc.metadata,
              dataType,
              namespace: `store-${this.storeId}-${dataType}`,
            },
          }),
          score,
        ]);

        allResults.push(...enhancedResults);
      } catch (error) {
        console.warn(`[MULTI-RETRIEVER] Search failed in ${dataType} namespace:`, error);
      }
    }

    allResults.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
    return allResults.slice(0, this.k).map(([doc]) => doc);
  }
}

export class FiniRetrievalQA {
  public retriever: MultiNamespaceRetriever;
  private llm: ChatOpenAI;
  private qaChain: RunnableSequence<any, any>;
  private context: RAGContext;

  constructor(context: RAGContext) {
    this.context = context;
    this.retriever = new MultiNamespaceRetriever(context.storeId, {
      scoreThreshold: getAgentThreshold(context.agentType),
    });
    this.llm = LangChainFactory.createChatModel(true);
    this.qaChain = this.createQAChain();
  }

  private createQAChain() {
    const qaPrompt = PromptTemplate.fromTemplate(`
Eres un asistente especializado de ecommerce para Tienda Nube. Tu rol específico es: {agentType}.

Contexto de la tienda:
{context}

Instrucciones:
- Responde en español (Argentina) de manera profesional y amigable
- Usa el contexto proporcionado para dar respuestas precisas
- Si no tienes información suficiente, indícalo claramente
- Proporciona ejemplos concretos cuando sea posible

Pregunta del usuario: {question}

Respuesta detallada:`);

    const retrieverChain = RunnablePassthrough.assign({
      context: (input: { question: string }) => 
        this.retriever.getRelevantDocuments(input.question).then(docs => 
          docs.map(doc => `[${doc.metadata.dataType}] ${doc.pageContent}`).join('\n\n')
        ),
    });

    return RunnableSequence.from([
      retrieverChain,
      RunnablePassthrough.assign({
        agentType: () => this.context.agentType,
      }),
      qaPrompt,
      this.llm,
      new StringOutputParser(),
    ]);
  }

  async ask(question: string): Promise<{
    answer: string;
    sources: Document[];
    confidence: number;
  }> {
    try {
      const sources = await this.retriever.getRelevantDocuments(question);
      const answer = await this.qaChain.invoke({ question });
      const confidence = this.calculateConfidence(sources);

      return {
        answer: typeof answer === 'string' ? answer : String(answer),
        sources,
        confidence,
      };
    } catch (error) {
      console.error('[RETRIEVAL-QA] Question processing failed:', error);
      return {
        answer: 'Lo siento, hubo un error al procesar tu consulta.',
        sources: [],
        confidence: 0,
      };
    }
  }

  async *askStreaming(question: string): AsyncGenerator<string, string, unknown> {
    try {
      let fullResponse = '';
      const stream = await this.qaChain.stream({ question });

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          fullResponse += chunk;
          yield chunk;
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('[RETRIEVAL-QA] Streaming failed:', error);
      const errorMsg = 'Lo siento, hubo un error al procesar tu consulta.';
      yield errorMsg;
      return errorMsg;
    }
  }

  private calculateConfidence(sources: Document[]): number {
    if (sources.length === 0) return 0;

    const avgScore = sources.reduce((sum, doc) => {
      const score = doc.metadata.score || 0;
      return sum + score;
    }, 0) / sources.length;

    return Math.min(avgScore + (sources.length / 10), 1);
  }
}

export class RetrievalQAFactory {
  static async create(context: RAGContext): Promise<FiniRetrievalQA> {
    const qa = new FiniRetrievalQA(context);
    await qa.retriever.initialize();
    return qa;
  }
} 