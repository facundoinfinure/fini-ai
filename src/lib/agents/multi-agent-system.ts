/**
 * Multi-Agent System
 * Central system that coordinates all specialized agents
 */

import type { 
  MultiAgentSystem as IMultiAgentSystem,
  AgentContext, 
  AgentResponse, 
  AgentType,
  Agent,
  OrchestratorDecision,
  AgentMetrics
} from './types';
import { OrchestratorAgent } from './orchestrator-agent';
import { AnalyticsAgent } from './analytics-agent';
import { CustomerServiceAgent } from './customer-service-agent';
import { MarketingAgent } from './marketing-agent';
import { AGENT_CONFIG } from './config';

export class FiniMultiAgentSystem implements IMultiAgentSystem {
  private agents: Map<AgentType, Agent>;
  private systemStartTime: number;
  private requestCount: number = 0;

  constructor() {
    this.systemStartTime = Date.now();
    this.agents = new Map();
    
    // Initialize all agents
    this.initializeAgents();
    
    console.log('[MULTI-AGENT] System initialized with', this.agents.size, 'agents');
  }

  private initializeAgents(): void {
    try {
      // Create and register all specialized agents
      this.agents.set('orchestrator', new OrchestratorAgent());
      this.agents.set('analytics', new AnalyticsAgent());
      this.agents.set('customer_service', new CustomerServiceAgent());
      this.agents.set('marketing', new MarketingAgent());

      console.log('[MULTI-AGENT] Registered agents:', Array.from(this.agents.keys()));
    } catch (error) {
      console.error('[ERROR] Failed to initialize agents:', error);
      throw new Error('Multi-agent system initialization failed');
    }
  }

  /**
   * Main entry point for processing user messages
   */
  async processMessage(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.requestCount++;
    
    console.log(`[MULTI-AGENT] Processing message ${this.requestCount}: "${context.userMessage}"`);

    try {
      // Use orchestrator to route the message
      const orchestrator = this.getAgent('orchestrator') as OrchestratorAgent;
      const decision = await orchestrator.routeMessage(context);
      
      console.log(`[MULTI-AGENT] Routing decision:`, decision);

      let finalResponse: AgentResponse;

      if (decision.selectedAgent && decision.confidence >= 0.4) {
        // Route to specialized agent
        const selectedAgent = this.getAgent(decision.selectedAgent);
        
        if (selectedAgent) {
          console.log(`[MULTI-AGENT] Routing to ${decision.selectedAgent} agent`);
          finalResponse = await selectedAgent.process(context);
        } else {
          console.warn(`[MULTI-AGENT] Agent ${decision.selectedAgent} not found, using orchestrator`);
          finalResponse = await orchestrator.process(context);
        }
      } else {
        // Use orchestrator for low confidence or unclear queries
        console.log(`[MULTI-AGENT] Using orchestrator for low confidence query`);
        finalResponse = await orchestrator.process(context);
      }

      // Add system metadata
      const executionTime = Date.now() - startTime;
      finalResponse.metadata = {
        ...finalResponse.metadata,
        systemExecutionTime: executionTime,
        requestId: `req_${this.requestCount}_${Date.now()}`,
        routingDecision: decision
      };

      console.log(`[MULTI-AGENT] Response generated in ${executionTime}ms`);
      return finalResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ERROR] Multi-agent processing failed:', error);
      
      return {
        success: false,
        agentType: 'orchestrator',
        response: 'Lo siento, experimenté un problema técnico. ¿Podrías intentar de nuevo?',
        confidence: 0,
        reasoning: `System error: ${errorMessage}`,
        metadata: {
          systemError: true,
          executionTime: Date.now() - startTime,
          requestId: `req_${this.requestCount}_${Date.now()}`
        },
        error: errorMessage
      };
    }
  }

  /**
   * Route message to appropriate agent (exposed for external use)
   */
  async routeMessage(context: AgentContext): Promise<OrchestratorDecision> {
    const orchestrator = this.getAgent('orchestrator') as OrchestratorAgent;
    return await orchestrator.routeMessage(context);
  }

  /**
   * Get agent by type
   */
  getAgent(type: AgentType): Agent {
    const agent = this.agents.get(type);
    if (!agent) {
      throw new Error(`Agent ${type} not found`);
    }
    return agent;
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    totalAgents: number;
    activeConversations: number;
    systemUptime: number;
    agentMetrics: AgentMetrics[];
  }> {
    const uptime = Date.now() - this.systemStartTime;
    
    // Mock metrics for now - in production this would come from a metrics store
    const agentMetrics: AgentMetrics[] = Array.from(this.agents.entries()).map((entry) => {
      const [type, agent] = entry;
      return {
        agentType: type,
        totalRequests: Math.floor(Math.random() * 100),
        successfulRequests: Math.floor(Math.random() * 90),
        averageConfidence: 0.7 + Math.random() * 0.3,
        averageResponseTime: 1000 + Math.random() * 2000,
        ragUsagePercentage: 0.6 + Math.random() * 0.4,
        commonQueries: [
          {
            query: 'sample query',
            frequency: Math.floor(Math.random() * 50),
            averageConfidence: 0.8
          }
        ],
        performanceScore: 0.7 + Math.random() * 0.3
      };
    });

    return {
      totalAgents: this.agents.size,
      activeConversations: this.requestCount, // Simplified
      systemUptime: uptime,
      agentMetrics
    };
  }

  /**
   * Test all agents capabilities
   */
  async testAgentCapabilities(testMessage: string): Promise<Record<AgentType, { canHandle: boolean; confidence: number; reasoning: string }>> {
    const testContext: AgentContext = {
      storeId: 'test-store',
      userId: 'test-user', 
      conversationId: 'test-conversation',
      userMessage: testMessage
    };

    const results: Record<string, any> = {};

    const promises = Array.from(this.agents.entries()).map(async ([type, agent]) => {
      try {
        const capability = await agent.canHandle(testContext);
        return { type, capability };
      } catch (error) {
        return {
          type,
          capability: {
            canHandle: false,
            confidence: 0,
            reasoning: `Error testing agent: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        };
      }
    });

    const resolvedResults = await Promise.all(promises);
    for (const { type, capability } of resolvedResults) {
      results[type] = capability;
    }

    return results as Record<AgentType, { canHandle: boolean; confidence: number; reasoning: string }>;
  }

  /**
   * Health check for all agents
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<AgentType, boolean> }> {
    const details: Record<string, boolean> = {};
    let allHealthy = true;

    this.agents.forEach((agent, type) => {
      try {
        // Simple health check - just verify agent can be instantiated and has required methods
        const isHealthy = !!(agent && 
          typeof agent.process === 'function' && 
          typeof agent.canHandle === 'function' &&
          typeof agent.getRelevantContext === 'function');
        
        details[type] = isHealthy;
        if (!isHealthy) allHealthy = false;
      } catch (error) {
        details[type] = false;
        allHealthy = false;
      }
    });

    return {
      healthy: allHealthy,
      details: details as Record<AgentType, boolean>
    };
  }

  /**
   * Get available agent types
   */
  getAvailableAgents(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Reset system metrics (for testing)
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.systemStartTime = Date.now();
    console.log('[MULTI-AGENT] Metrics reset');
  }
}

// Export singleton instance
export const multiAgentSystem = new FiniMultiAgentSystem(); 