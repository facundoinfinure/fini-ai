// Tipos para el sistema de agentes multi-agente con RAG
export type AgentType = 'orchestrator' | 'analytics' | 'customer_service' | 'marketing';

export interface ConversationContext {
  conversationId: string;
  customerId: string;
  storeId: string;
  currentIntent?: string;
  previousQueries: string[];
  sessionData: Record<string, unknown>;
  timestamp: string;
}

export interface AgentResponse {
  agentType: AgentType;
  content: string;
  confidence: number;
  reasoning?: string;
  data?: unknown;
  nextAction?: string;
  shouldEscalate?: boolean;
}

export interface Intent {
  type: string;
  confidence: number;
  entities: Entity[];
  parameters?: Record<string, unknown>;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  start: number;
  end: number;
}

// Orchestrator Agent
export interface OrchestratorAgent {
  classifyIntent(message: string, context: ConversationContext): Promise<Intent>;
  routeToAgent(intent: Intent, context: ConversationContext): Promise<AgentType>;
  synthesizeResponse(agentResponses: AgentResponse[]): Promise<string>;
  updateContext(context: ConversationContext, newInfo: ContextUpdate): Promise<ConversationContext>;
}

export interface ContextUpdate {
  intent?: string;
  entities?: Entity[];
  data?: Record<string, unknown>;
  timestamp: string;
}

// Analytics Agent
export interface AnalyticsAgent {
  executeComplexQuery(query: AnalyticsQuery): Promise<AnalyticsResult>;
  identifyTrends(timeRange: TimeRange, metrics: string[]): Promise<TrendAnalysis>;
  generateForecast(historicalData: TimeSeriesData): Promise<ForecastResult>;
  createCustomReport(template: ReportTemplate): Promise<Report>;
}

export interface AnalyticsQuery {
  type: 'revenue' | 'products' | 'customers' | 'orders' | 'conversion' | 'custom';
  timeRange: TimeRange;
  filters?: QueryFilter[];
  groupBy?: string[];
  metrics?: string[];
  customQuery?: string;
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  data: unknown;
  summary: string;
  insights: string[];
  executionTime: number;
  timestamp: string;
}

export interface TimeRange {
  start: string;
  end: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface QueryFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: unknown;
}

export interface TrendAnalysis {
  trends: Trend[];
  patterns: Pattern[];
  anomalies: Anomaly[];
  recommendations: string[];
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  confidence: number;
  timeframe: string;
}

export interface Pattern {
  type: 'seasonal' | 'cyclical' | 'trending' | 'irregular';
  description: string;
  frequency?: string;
  strength: number;
}

export interface Anomaly {
  type: 'spike' | 'drop' | 'outlier';
  metric: string;
  value: number;
  expectedValue: number;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ForecastResult {
  predictions: Prediction[];
  confidence: number;
  methodology: string;
  assumptions: string[];
  recommendations: string[];
}

export interface Prediction {
  date: string;
  value: number;
  upperBound: number;
  lowerBound: number;
  confidence: number;
}

export interface TimeSeriesData {
  data: DataPoint[];
  metric: string;
  unit: string;
  frequency: string;
}

export interface DataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ReportTemplate {
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  sections: ReportSection[];
  filters?: QueryFilter[];
  recipients?: string[];
}

export interface ReportSection {
  title: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  query: AnalyticsQuery;
  visualization?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
}

export interface Report {
  id: string;
  template: ReportTemplate;
  data: unknown;
  generatedAt: string;
  format: 'json' | 'html' | 'pdf';
  summary: string;
}

// Customer Service Agent
export interface CustomerServiceAgent {
  resolveCustomerIssue(issue: CustomerIssue): Promise<Resolution>;
  shouldEscalateToHuman(context: ConversationContext): Promise<boolean>;
  executeCustomerAction(action: CustomerAction): Promise<ActionResult>;
  retrieveCustomerHistory(customerId: string): Promise<CustomerHistory>;
}

export interface CustomerIssue {
  type: 'order_status' | 'product_inquiry' | 'refund' | 'shipping' | 'technical' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId: string;
  orderId?: string;
  productId?: string;
  context: ConversationContext;
}

export interface Resolution {
  status: 'resolved' | 'escalated' | 'pending' | 'requires_action';
  response: string;
  actions?: CustomerAction[];
  escalationReason?: string;
  confidence: number;
}

export interface CustomerAction {
  type: 'refund' | 'replacement' | 'discount' | 'update_order' | 'send_email' | 'create_ticket';
  parameters: Record<string, unknown>;
  requiresApproval: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export interface CustomerHistory {
  customerId: string;
  orders: unknown[];
  conversations: unknown[];
  issues: CustomerIssue[];
  preferences: Record<string, unknown>;
  totalSpent: number;
  loyaltyLevel: 'new' | 'regular' | 'vip' | 'champion';
}

// Marketing Agent
export interface MarketingAgent {
  suggestCampaigns(storeData: StoreAnalytics): Promise<CampaignSuggestion[]>;
  optimizePricing(productData: ProductMetrics): Promise<PricingRecommendation>;
  segmentAudience(customerData: CustomerData[]): Promise<Segment[]>;
  generateContent(campaign: Campaign): Promise<ContentSuggestion[]>;
}

export interface StoreAnalytics {
  revenue: number;
  orders: number;
  customers: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: unknown[];
  seasonalTrends: unknown[];
  competitorData?: unknown;
}

export interface CampaignSuggestion {
  type: 'email' | 'social' | 'whatsapp' | 'sms' | 'discount' | 'content';
  title: string;
  description: string;
  targetAudience: string;
  expectedROI: number;
  budget: number;
  timeline: string;
  metrics: string[];
  reasoning: string;
}

export interface ProductMetrics {
  productId: string;
  currentPrice: number;
  salesVolume: number;
  profit: number;
  competitorPrices?: number[];
  demandElasticity?: number;
  seasonality?: unknown;
}

export interface PricingRecommendation {
  recommendedPrice: number;
  priceRange: { min: number; max: number };
  expectedImpact: {
    salesChange: number;
    revenueChange: number;
    profitChange: number;
  };
  reasoning: string;
  testingStrategy?: string;
}

export interface CustomerData {
  id: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
  averageOrderValue: number;
  categories: string[];
  geography: string;
  demographics?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
}

export interface Segment {
  name: string;
  description: string;
  criteria: SegmentCriteria;
  size: number;
  characteristics: string[];
  recommendedActions: string[];
  value: number;
}

export interface SegmentCriteria {
  rules: SegmentRule[];
  operator: 'AND' | 'OR';
}

export interface SegmentRule {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: unknown;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  objectives: string[];
  targetAudience: Segment;
  budget: number;
  duration: string;
  channels: string[];
}

export interface ContentSuggestion {
  type: 'post' | 'story' | 'ad' | 'email' | 'message';
  platform: string;
  content: string;
  media?: string[];
  hashtags?: string[];
  bestTime?: string;
  expectedEngagement?: number;
}

// RAG Engine Types
export interface RAGEngine {
  ingestStoreData(storeId: string): Promise<void>;
  ingestConversationHistory(conversations: unknown[]): Promise<void>;
  ingestProductCatalog(products: unknown[]): Promise<void>;
  semanticSearch(query: string, filters?: SearchFilters): Promise<Document[]>;
  findSimilarCustomers(customerId: string): Promise<unknown[]>;
  findRelatedProducts(productId: string): Promise<unknown[]>;
  getRelevantContext(query: string, limit?: number): Promise<ContextDocument[]>;
  getConversationContext(conversationId: string): Promise<ConversationContext>;
}

export interface SearchFilters {
  storeId?: string;
  documentType?: string;
  dateRange?: TimeRange;
  categories?: string[];
  minSimilarity?: number;
}

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
  similarity?: number;
}

export interface DocumentMetadata {
  type: string;
  storeId: string;
  title?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  relevance?: number;
}

export interface ContextDocument extends Document {
  contextType: 'product' | 'order' | 'customer' | 'conversation' | 'analytics';
  relevanceScore: number;
  reasoning: string;
}

// Memory Management
export interface ConversationMemory {
  saveContext(conversationId: string, context: ConversationContext): Promise<void>;
  retrieveContext(conversationId: string): Promise<ConversationContext>;
  updateEntityMemory(entity: EntityMemory, update: EntityUpdate): Promise<void>;
  getEntityHistory(entityId: string): Promise<EntityHistory>;
}

export interface EntityMemory {
  entityId: string;
  entityType: 'customer' | 'product' | 'order' | 'store';
  data: Record<string, unknown>;
  relationships: EntityRelationship[];
  lastUpdated: string;
}

export interface EntityUpdate {
  data?: Record<string, unknown>;
  relationships?: EntityRelationship[];
  timestamp: string;
}

export interface EntityRelationship {
  relatedEntityId: string;
  relatedEntityType: string;
  relationshipType: string;
  strength: number;
  metadata?: Record<string, unknown>;
}

export interface EntityHistory {
  entityId: string;
  timeline: EntityEvent[];
  patterns: Pattern[];
  insights: string[];
}

export interface EntityEvent {
  timestamp: string;
  eventType: string;
  description: string;
  data: Record<string, unknown>;
  source: string;
} 