/**
 * Multi-Agent System
 * Central system that coordinates all specialized agents
 */

import { createLogger, PerformanceTimer } from '@/lib/logger';
import { AnalyticsAgent } from './analytics-agent';
// import { AGENT_CONFIG } from './config';
import { CustomerServiceAgent } from './customer-service-agent';
import { MarketingAgent } from './marketing-agent';
import { StockManagerAgent } from './stock-manager-agent';
import { FinancialAdvisorAgent } from './financial-advisor-agent';
import { BusinessConsultantAgent } from './business-consultant-agent';
import { ProductManagerAgent } from './product-manager-agent';
import { OperationsManagerAgent } from './operations-manager-agent';
import { SalesCoachAgent } from './sales-coach-agent';
import { OrchestratorAgent } from './orchestrator-agent';
import type { 
  MultiAgentSystem as IMultiAgentSystem,
  AgentContext, 
  AgentResponse, 
  AgentType,
  Agent,
  OrchestratorDecision,
  AgentMetrics
} from './types';

export class FiniMultiAgentSystem implements IMultiAgentSystem {
  private agents: Map<AgentType, Agent>;
  private systemStartTime: number;
  private requestCount: number = 0;
  private logger = createLogger('MultiAgentSystem');

  constructor() {
    this.systemStartTime = Date.now();
    this.agents = new Map();
    
    // Initialize all agents
    this.initializeAgents();
    
    this.logger.info('System initialized', { agentCount: this.agents.size });
  }

  private initializeAgents(): void {
    try {
      // Create and register all specialized agents
      this.agents.set('orchestrator', new OrchestratorAgent());
      this.agents.set('analytics', new AnalyticsAgent());
      this.agents.set('customer_service', new CustomerServiceAgent());
      this.agents.set('marketing', new MarketingAgent());
      this.agents.set('stock_manager', new StockManagerAgent());
      this.agents.set('financial_advisor', new FinancialAdvisorAgent());
      this.agents.set('business_consultant', new BusinessConsultantAgent());
      this.agents.set('product_manager', new ProductManagerAgent());
      this.agents.set('operations_manager', new OperationsManagerAgent());
      this.agents.set('sales_coach', new SalesCoachAgent());

      this.logger.info('Agents registered', { agents: Array.from(this.agents.keys()) });
    } catch (error) {
      this.logger.critical('Failed to initialize agents', { error: error instanceof Error ? error.message : error });
      throw new Error('Multi-agent system initialization failed');
    }
  }

  /**
   * Main entry point for processing user messages
   */
  async processMessage(context: AgentContext): Promise<AgentResponse> {
    const timer = new PerformanceTimer(this.logger, 'processMessage');
    this.requestCount++;
    
    this.logger.info('Processing message', { 
      requestCount: this.requestCount, 
      message: context.userMessage,
      userId: context.userId,
      storeId: context.storeId 
    });

    try {
      // Use orchestrator to route the message
      const _orchestrator = this.getAgent('orchestrator') as OrchestratorAgent;
      const _decision = await _orchestrator.routeMessage(context);
      
      console.warn(`[MULTI-AGENT] Routing decision:`, _decision);

      let finalResponse: AgentResponse;

      if (_decision.selectedAgent && _decision.confidence >= 0.4) {
        // Route to specialized agent
        const _selectedAgent = this.getAgent(_decision.selectedAgent);
        
        if (_selectedAgent) {
          console.warn(`[MULTI-AGENT] Routing to ${_decision.selectedAgent} agent`);
          finalResponse = await _selectedAgent.process(context);
        } else {
          console.warn(`[MULTI-AGENT] Agent ${_decision.selectedAgent} not found, using orchestrator`);
          finalResponse = await _orchestrator.process(context);
        }
      } else {
        // Use orchestrator for low confidence or unclear queries
        console.warn(`[MULTI-AGENT] Using orchestrator for low confidence query`);
        finalResponse = await _orchestrator.process(context);
      }

      // Add system metadata
      const _executionTime = timer.end();
      finalResponse.metadata = {
        ...finalResponse.metadata,
        systemExecutionTime: _executionTime,
        requestId: `req_${this.requestCount}_${Date.now()}`,
        routingDecision: _decision
      };

      this.logger.info('Response generated', { executionTime: _executionTime });
      return finalResponse;

    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ERROR] Multi-agent processing failed:', error);
      
      return {
        success: false,
        agentType: 'orchestrator',
        response: 'Lo siento, experimenté un problema técnico. ¿Podrías intentar de nuevo?',
        confidence: 0,
        reasoning: `System error: ${_errorMessage}`,
        metadata: {
          systemError: true,
          executionTime: timer.end(),
          requestId: `req_${this.requestCount}_${Date.now()}`
        },
        error: _errorMessage
      };
    }
  }

  /**
   * Route message to appropriate agent (exposed for external use)
   */
  async routeMessage(context: AgentContext): Promise<OrchestratorDecision> {
    const _orchestrator = this.getAgent('orchestrator') as OrchestratorAgent;
    return await _orchestrator.routeMessage(context);
  }

  /**
   * Get agent by type
   */
  getAgent(type: AgentType): Agent {
    const _agent = this.agents.get(type);
    if (!_agent) {
      throw new Error(`Agent ${type} not found`);
    }
    return _agent;
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
    const _uptime = Date.now() - this.systemStartTime;
    
    // Mock metrics for now - in production this would come from a metrics store
    const agentMetrics: AgentMetrics[] = Array.from(this.agents.entries()).map((_entry) => {
      const [type, _agent] = _entry;
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
      systemUptime: _uptime,
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

    const _promises = Array.from(this.agents.entries()).map(async ([type, agent]) => {
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

    const _resolvedResults = await Promise.all(_promises);
    for (const { type, capability } of _resolvedResults) {
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
        const _isHealthy = !!(agent && 
          typeof agent.process === 'function' && 
          typeof agent.canHandle === 'function' &&
          typeof agent.getRelevantContext === 'function');
        
        details[type] = _isHealthy;
        if (!_isHealthy) allHealthy = false;
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
    console.warn('[MULTI-AGENT] Metrics reset');
  }
}

// Export singleton instance
export const _multiAgentSystem = new FiniMultiAgentSystem(); 