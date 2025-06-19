/**
 * Agent Types
 * Defines interfaces and types for the multi-agent system
 */

import type { RAGQuery, RAGResult } from '@/lib/rag/types';

export type AgentType = 'orchestrator' | 'analytics' | 'customer_service' | 'marketing';

export interface AgentContext {
  storeId: string;
  userId: string;
  conversationId: string;
  userMessage: string;
  messageHistory?: ConversationMessage[];
  metadata?: {
    customerInfo?: unknown;
    storeData?: unknown;
    sessionData?: unknown;
    [key: string]: unknown;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: AgentType;
  timestamp: string;
  metadata?: {
    confidence?: number;
    ragUsed?: boolean;
    contextSources?: string[];
    [key: string]: unknown;
  };
}

export interface AgentResponse {
  success: boolean;
  agentType: AgentType;
  response?: string;
  confidence: number;
  reasoning?: string;
  actions?: AgentAction[];
  contextUsed?: RAGResult;
  metadata?: {
    executionTime?: number;
    ragUsed?: boolean;
    fallbackUsed?: boolean;
    [key: string]: unknown;
  };
  error?: string;
}

export interface AgentAction {
  type: 'api_call' | 'data_fetch' | 'calculation' | 'notification' | 'suggestion';
  description: string;
  payload?: unknown;
  status: 'pending' | 'completed' | 'failed';
  result?: unknown;
}

export interface AgentCapability {
  name: string;
  description: string;
  examples: string[];
  priority: number;
}

export interface Agent {
  type: AgentType;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  
  // Main processing method
  process(context: AgentContext): Promise<AgentResponse>;
  
  // Check if agent can handle the request
  canHandle(context: AgentContext): Promise<{ canHandle: boolean; confidence: number; reasoning: string }>;
  
  // Get relevant context using RAG
  getRelevantContext(query: string, context: AgentContext): Promise<string>;
}

export interface OrchestratorDecision {
  selectedAgent: AgentType | null;
  confidence: number;
  reasoning: string;
  fallbackMessage?: string;
  routingRules: {
    analyticsScore: number;
    customerServiceScore: number;
    marketingScore: number;
    generalScore: number;
  };
}

export interface AgentConfig {
  maxRetries: number;
  timeout: number;
  enableRAG: boolean;
  ragThreshold: number;
  fallbackEnabled: boolean;
  debugMode: boolean;
}

export interface ConversationSession {
  id: string;
  storeId: string;
  userId: string;
  phoneNumber: string;
  status: 'active' | 'paused' | 'ended';
  currentAgent?: AgentType;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    userPreferences?: unknown;
    sessionType?: 'support' | 'sales' | 'analytics' | 'general';
    priority?: 'low' | 'medium' | 'high';
    [key: string]: unknown;
  };
}

export interface AgentMetrics {
  agentType: AgentType;
  totalRequests: number;
  successfulRequests: number;
  averageConfidence: number;
  averageResponseTime: number;
  ragUsagePercentage: number;
  commonQueries: Array<{
    query: string;
    frequency: number;
    averageConfidence: number;
  }>;
  performanceScore: number;
}

export interface MultiAgentSystem {
  // Main entry point for processing user messages
  processMessage(context: AgentContext): Promise<AgentResponse>;
  
  // Route message to appropriate agent
  routeMessage(context: AgentContext): Promise<OrchestratorDecision>;
  
  // Get agent by type
  getAgent(type: AgentType): Agent;
  
  // Get system statistics
  getSystemStats(): Promise<{
    totalAgents: number;
    activeConversations: number;
    systemUptime: number;
    agentMetrics: AgentMetrics[];
  }>;
}

// Agent prompt templates
export interface AgentPrompts {
  systemPrompt: string;
  userPrompt: string;
  contextPrompt: string;
  fallbackPrompt: string;
  examples: Array<{
    userInput: string;
    expectedResponse: string;
    reasoning: string;
  }>;
}

// Configuration for each agent type
export interface AgentTypeConfig {
  enabled: boolean;
  priority: number;
  prompts: AgentPrompts;
  ragConfig: {
    enabled: boolean;
    threshold: number;
    maxResults: number;
  };
  responseConfig: {
    maxLength: number;
    tone: 'formal' | 'casual' | 'professional' | 'friendly';
    language: 'es' | 'en';
  };
}

export interface _RAGQuery {
  // Implementation of _RAGQuery interface
} 