/**
 * Plan Restrictions System
 * Defines functionality available for each plan
 */

export type PlanType = 'basic' | 'pro';

export interface PlanFeatures {
  // Core Features
  whatsappChat: boolean;
  basicAnalytics: boolean;
  
  // Store Limitations
  maxStores: number;
  
  // Agent Features
  multiAgentSystem: boolean;
  advancedAgents: boolean;
  forecastingAI: boolean;
  competitorAnalysis: boolean;
  
  // Analytics & Reporting
  advancedAnalytics: boolean;
  customReports: boolean;
  realTimeMetrics: boolean;
  
  // Automation
  marketingIdeas: boolean;
  automatedReports: boolean;
  ragAdvanced: boolean;
  
  // Support
  supportLevel: 'email' | 'priority' | '24/7';
  
  // Conversation Features
  conversationMemory: 'basic' | 'extended';
  conversationHistory: number; // days
  
  // AI Features
  aiInsights: boolean;
  customPrompts: boolean;
  smartRouting: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  basic: {
    // Core Features
    whatsappChat: true,
    basicAnalytics: true,
    
    // Store Limitations
    maxStores: 1,
    
    // Agent Features
    multiAgentSystem: false,
    advancedAgents: false,
    forecastingAI: false,
    competitorAnalysis: false,
    
    // Analytics & Reporting
    advancedAnalytics: false,
    customReports: false,
    realTimeMetrics: true,
    
    // Automation
    marketingIdeas: false,
    automatedReports: false,
    ragAdvanced: false,
    
    // Support
    supportLevel: 'email',
    
    // Conversation Features
    conversationMemory: 'basic',
    conversationHistory: 7, // 7 days
    
    // AI Features
    aiInsights: false,
    customPrompts: false,
    smartRouting: false,
  },
  
  pro: {
    // Core Features
    whatsappChat: true,
    basicAnalytics: true,
    
    // Store Limitations
    maxStores: 5, // Multiple stores
    
    // Agent Features
    multiAgentSystem: true,
    advancedAgents: true,
    forecastingAI: true,
    competitorAnalysis: true,
    
    // Analytics & Reporting
    advancedAnalytics: true,
    customReports: true,
    realTimeMetrics: true,
    
    // Automation
    marketingIdeas: true,
    automatedReports: true,
    ragAdvanced: true,
    
    // Support
    supportLevel: 'priority',
    
    // Conversation Features
    conversationMemory: 'extended',
    conversationHistory: 30, // 30 days
    
    // AI Features
    aiInsights: true,
    customPrompts: true,
    smartRouting: true,
  }
};

/**
 * Get plan features for a specific plan
 */
export function getPlanFeatures(plan: PlanType): PlanFeatures {
  return PLAN_FEATURES[plan];
}

/**
 * Check if a feature is available for a specific plan
 */
export function hasFeature(plan: PlanType, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  return Boolean(features[feature]);
}

/**
 * Check if user can add more stores
 */
export function canAddStore(plan: PlanType, currentStoreCount: number): boolean {
  const features = getPlanFeatures(plan);
  return currentStoreCount < features.maxStores;
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(feature: string): string {
  const messages: Record<string, string> = {
    multiAgentSystem: "Actualiza al Plan Pro para acceder al sistema multi-agente completo",
    forecastingAI: "Actualiza al Plan Pro para obtener predicciones con IA",
    advancedAnalytics: "Actualiza al Plan Pro para analytics avanzados",
    competitorAnalysis: "Actualiza al Plan Pro para análisis de competencia",
    marketingIdeas: "Actualiza al Plan Pro para ideas de marketing automatizadas",
    maxStores: "Actualiza al Plan Pro para conectar múltiples tiendas",
    customReports: "Actualiza al Plan Pro para reportes personalizados",
    ragAdvanced: "Actualiza al Plan Pro para búsquedas avanzadas con IA",
  };
  
  return messages[feature] || "Actualiza al Plan Pro para acceder a esta funcionalidad";
}

/**
 * Plan configuration for billing
 */
export interface PlanConfig {
  id: PlanType;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: 'basic',
    name: 'Plan Basic',
    monthlyPrice: 19.99,
    annualPrice: 199.99, // ~17% discount
    description: 'Ideal para emprendedores',
    features: [
      'Chat básico por WhatsApp',
      'Analytics básicos',
      '1 tienda únicamente', 
      'Métricas en tiempo real',
      'Historial 7 días',
      'Soporte por email'
    ]
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    monthlyPrice: 39.99,
    annualPrice: 399.99, // ~17% discount
    description: 'Para negocios en crecimiento',
    features: [
      'Todo del Plan Basic',
      'Sistema multi-agente completo',
      'Forecasting con IA',
      'Análisis de competencia',
      'Ideas de marketing automatizadas',
      'Múltiples tiendas (hasta 5)',
      'Analytics avanzados',
      'Historial extendido (30 días)',
      'Soporte prioritario'
    ],
    highlighted: true
  }
];

/**
 * Feature restrictions middleware
 * Use this in API routes to check if user has access to features
 */
export class PlanRestrictions {
  private plan: PlanType;
  
  constructor(plan: PlanType) {
    this.plan = plan;
  }
  
  /**
   * Check if feature is allowed
   */
  allowFeature(feature: keyof PlanFeatures): boolean {
    return hasFeature(this.plan, feature);
  }
  
  /**
   * Throw error if feature not allowed
   */
  requireFeature(feature: keyof PlanFeatures, customMessage?: string): void {
    if (!this.allowFeature(feature)) {
      throw new Error(customMessage || getUpgradeMessage(feature as string));
    }
  }
  
  /**
   * Check store limit
   */
  checkStoreLimit(currentCount: number): void {
    if (!canAddStore(this.plan, currentCount)) {
      throw new Error(getUpgradeMessage('maxStores'));
    }
  }
  
  /**
   * Get allowed features
   */
  getFeatures(): PlanFeatures {
    return getPlanFeatures(this.plan);
  }
} 