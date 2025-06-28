/**
 * Agents Index
 * Exports all agents and the multi-agent system
 */

// Import for re-exports
import { _multiAgentSystem as mas } from './multi-agent-system';

// Types
export type * from './types';

// Configuration
export { 
  AGENT_CONFIG,
  ORCHESTRATOR_CONFIG,
  ANALYTICS_CONFIG,
  CUSTOMER_SERVICE_CONFIG,
  MARKETING_CONFIG,
  STOCK_MANAGER_CONFIG,
  FINANCIAL_ADVISOR_CONFIG,
  BUSINESS_CONSULTANT_CONFIG,
  ROUTING_KEYWORDS,
  ROUTING_THRESHOLDS,
  AGENT_PRIORITIES
} from './config';

// Base Agent
export { BaseAgent } from './base-agent';

// Specialized Agents
export { OrchestratorAgent } from './orchestrator-agent';
export { AnalyticsAgent } from './analytics-agent';
export { CustomerServiceAgent } from './customer-service-agent';
export { MarketingAgent } from './marketing-agent';
export { StockManagerAgent } from './stock-manager-agent';
export { FinancialAdvisorAgent } from './financial-advisor-agent';
export { BusinessConsultantAgent } from './business-consultant-agent';

// Multi-Agent System
export { 
  FiniMultiAgentSystem,
  _multiAgentSystem 
} from './multi-agent-system';

// Re-export for convenience - import _multiAgentSystem if you need the methods
export const processMessage = mas.processMessage.bind(mas);
export const routeMessage = mas.routeMessage.bind(mas);
export const getAgent = mas.getAgent.bind(mas);
export const getSystemStats = mas.getSystemStats.bind(mas);
export const testAgentCapabilities = mas.testAgentCapabilities.bind(mas);
export const healthCheck = mas.healthCheck.bind(mas);
export const getAvailableAgents = mas.getAvailableAgents.bind(mas); 