/**
 * 🏗️🔍 NAMESPACE STRATEGY
 * =======================
 * 
 * Estrategia unificada y consistente para namespaces de Pinecone vector store.
 * Implementa la arquitectura definida en docs/TIENDANUBE_RAG_ARCHITECTURE.md
 * 
 * ESTRATEGIA DE NAMESPACES:
 * - store-{storeId}              → Información general de la tienda
 * - store-{storeId}-products     → Productos y catálogo
 * - store-{storeId}-orders       → Pedidos y transacciones
 * - store-{storeId}-customers    → Clientes y datos de usuarios
 * - store-{storeId}-analytics    → Métricas y análisis
 * - store-{storeId}-conversations → Historial de conversaciones
 * 
 * BENEFICIOS:
 * - Isolation completa por tienda
 * - Búsquedas optimizadas por tipo de datos
 * - Eliminación segura y selectiva
 * - Escalabilidad y performance
 */

// ===== NAMESPACE TYPES =====

export type NamespaceType = 
  | 'store'           // Información general de la tienda
  | 'products'        // Productos y catálogo
  | 'orders'          // Pedidos y transacciones  
  | 'customers'       // Clientes y datos de usuarios
  | 'analytics'       // Métricas y análisis
  | 'conversations';  // Historial de conversaciones

export type DocumentType = 
  | 'store_info'
  | 'product'
  | 'category'
  | 'order'
  | 'customer'
  | 'analytics_report'
  | 'conversation_summary'
  | 'marketing_insight';

// ===== NAMESPACE CONFIGURATION =====

export interface NamespaceConfig {
  type: NamespaceType;
  priority: 'high' | 'medium' | 'low';
  description: string;
  supportedDocuments: DocumentType[];
  agentAccess: string[];
  retentionDays?: number;
  maxVectors?: number;
}

export const NAMESPACE_CONFIGS: Record<NamespaceType, NamespaceConfig> = {
  store: {
    type: 'store',
    priority: 'high',
    description: 'Información general de la tienda (perfil, configuración, metadatos)',
    supportedDocuments: ['store_info'],
    agentAccess: ['orchestrator', 'analytics', 'customer_service', 'marketing', 'product_manager'],
    maxVectors: 100
  },
  
  products: {
    type: 'products',
    priority: 'high',
    description: 'Productos, catálogo, categorías, inventario',
    supportedDocuments: ['product', 'category'],
    agentAccess: ['product_manager', 'customer_service', 'analytics', 'orchestrator'],
    maxVectors: 10000
  },
  
  orders: {
    type: 'orders',
    priority: 'high',
    description: 'Pedidos, transacciones, historial de compras',
    supportedDocuments: ['order'],
    agentAccess: ['analytics', 'customer_service', 'orchestrator'],
    retentionDays: 365,
    maxVectors: 5000
  },
  
  customers: {
    type: 'customers',
    priority: 'medium',
    description: 'Información de clientes y comportamiento de usuarios',
    supportedDocuments: ['customer'],
    agentAccess: ['customer_service', 'marketing', 'analytics'],
    retentionDays: 730,
    maxVectors: 2000
  },
  
  analytics: {
    type: 'analytics',
    priority: 'medium',
    description: 'Métricas, reportes, análisis de performance',
    supportedDocuments: ['analytics_report'],
    agentAccess: ['analytics', 'orchestrator'],
    retentionDays: 90,
    maxVectors: 500
  },
  
  conversations: {
    type: 'conversations',
    priority: 'low',
    description: 'Historial de conversaciones y contexto de chat',
    supportedDocuments: ['conversation_summary'],
    agentAccess: ['orchestrator', 'customer_service'],
    retentionDays: 30,
    maxVectors: 1000
  }
};

// ===== NAMESPACE UTILITY CLASS =====

export class NamespaceStrategy {
  /**
   * 🏗️ Generate namespace name following the strategy
   */
  static generateNamespace(storeId: string, type?: NamespaceType): string {
    if (!type) {
      return `store-${storeId}`;
    }
    
    return type === 'store' 
      ? `store-${storeId}`
      : `store-${storeId}-${type}`;
  }

  /**
   * 📝 Parse namespace to extract store ID and type
   */
  static parseNamespace(namespace: string): { storeId: string; type: NamespaceType | null } {
    const parts = namespace.split('-');
    
    if (parts.length < 2 || parts[0] !== 'store') {
      throw new Error(`Invalid namespace format: ${namespace}`);
    }
    
    const storeId = parts[1];
    const type = parts.length > 2 ? parts[2] as NamespaceType : 'store';
    
    return { storeId, type };
  }

  /**
   * 🎯 Get all namespaces for a store
   */
  static getAllNamespacesForStore(storeId: string): string[] {
    return Object.keys(NAMESPACE_CONFIGS).map(type => 
      this.generateNamespace(storeId, type as NamespaceType)
    );
  }

  /**
   * 🔍 Get namespaces accessible by an agent type
   */
  static getNamespacesForAgent(storeId: string, agentType: string): string[] {
    const accessibleTypes = Object.entries(NAMESPACE_CONFIGS)
      .filter(([_, config]) => config.agentAccess.includes(agentType))
      .map(([type, _]) => type as NamespaceType);
    
    return accessibleTypes.map(type => this.generateNamespace(storeId, type));
  }

  /**
   * 📊 Get optimal namespaces for a query (based on content analysis)
   */
  static getOptimalNamespacesForQuery(storeId: string, query: string, agentType?: string): string[] {
    const queryLower = query.toLowerCase();
    const relevantTypes: NamespaceType[] = [];
    
    // Content-based namespace selection
    if (queryLower.includes('producto') || queryLower.includes('catálogo') || queryLower.includes('inventario')) {
      relevantTypes.push('products');
    }
    
    if (queryLower.includes('pedido') || queryLower.includes('orden') || queryLower.includes('venta') || queryLower.includes('compra')) {
      relevantTypes.push('orders');
    }
    
    if (queryLower.includes('cliente') || queryLower.includes('usuario') || queryLower.includes('comprador')) {
      relevantTypes.push('customers');
    }
    
    if (queryLower.includes('métrica') || queryLower.includes('analytics') || queryLower.includes('reporte') || queryLower.includes('estadística')) {
      relevantTypes.push('analytics');
    }
    
    if (queryLower.includes('tienda') || queryLower.includes('información') || queryLower.includes('configuración')) {
      relevantTypes.push('store');
    }
    
    // If no specific content detected, use agent-based defaults
    if (relevantTypes.length === 0) {
      if (agentType) {
        return this.getNamespacesForAgent(storeId, agentType);
      }
      
      // Default fallback
      relevantTypes.push('products', 'store', 'orders');
    }
    
    return relevantTypes.map(type => this.generateNamespace(storeId, type));
  }

  /**
   * 🛡️ Validate namespace name
   */
  static validateNamespace(namespace: string): { valid: boolean; error?: string } {
    try {
      const { storeId, type } = this.parseNamespace(namespace);
      
      if (!storeId || storeId.length === 0) {
        return { valid: false, error: 'Missing or invalid store ID' };
      }
      
      if (type && !NAMESPACE_CONFIGS[type]) {
        return { valid: false, error: `Unknown namespace type: ${type}` };
      }
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * 🔧 Get configuration for namespace type
   */
  static getNamespaceConfig(type: NamespaceType): NamespaceConfig {
    return NAMESPACE_CONFIGS[type];
  }

  /**
   * 🗂️ Get namespace type for document type
   */
  static getNamespaceForDocumentType(documentType: DocumentType): NamespaceType {
    for (const [namespaceType, config] of Object.entries(NAMESPACE_CONFIGS)) {
      if (config.supportedDocuments.includes(documentType)) {
        return namespaceType as NamespaceType;
      }
    }
    
    // Default fallback
    return 'store';
  }

  /**
   * 📋 Get summary of namespace usage
   */
  static getNamespaceSummary(): {
    totalTypes: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    agentAccess: Record<string, number>;
  } {
    const configs = Object.values(NAMESPACE_CONFIGS);
    const agentAccess: Record<string, number> = {};
    
    // Count agent access
    configs.forEach(config => {
      config.agentAccess.forEach(agent => {
        agentAccess[agent] = (agentAccess[agent] || 0) + 1;
      });
    });
    
    return {
      totalTypes: configs.length,
      highPriority: configs.filter(c => c.priority === 'high').length,
      mediumPriority: configs.filter(c => c.priority === 'medium').length,
      lowPriority: configs.filter(c => c.priority === 'low').length,
      agentAccess
    };
  }

  /**
   * 🧹 Get cleanup strategy for namespace
   */
  static getCleanupStrategy(type: NamespaceType): {
    retentionDays: number;
    maxVectors: number;
    cleanupPriority: 'immediate' | 'scheduled' | 'optional';
  } {
    const config = NAMESPACE_CONFIGS[type];
    
    return {
      retentionDays: config.retentionDays || 365,
      maxVectors: config.maxVectors || 1000,
      cleanupPriority: config.priority === 'high' ? 'optional' : 
                      config.priority === 'medium' ? 'scheduled' : 'immediate'
    };
  }

  /**
   * 🔄 Get migration strategy for changing namespace structure
   */
  static getMigrationPlan(oldNamespace: string, newStrategy?: boolean): {
    required: boolean;
    steps: string[];
    newNamespace?: string;
  } {
    try {
      // Check if namespace follows current strategy
      const validation = this.validateNamespace(oldNamespace);
      
      if (validation.valid) {
        return {
          required: false,
          steps: ['No migration required - namespace follows current strategy']
        };
      }
      
      // Generate migration plan
      const steps = [
        'Backup existing vectors',
        'Create new namespace with correct naming',
        'Migrate vectors to new namespace',
        'Update all references',
        'Verify data integrity',
        'Remove old namespace'
      ];
      
      return {
        required: true,
        steps,
        newNamespace: `Migration required - invalid format: ${oldNamespace}`
      };
      
    } catch (error) {
      return {
        required: true,
        steps: ['Manual review required - unable to parse namespace'],
        newNamespace: 'Unknown'
      };
    }
  }
}

// ===== AGENT NAMESPACE ACCESS MATRIX =====

export const AGENT_NAMESPACE_MATRIX = {
  orchestrator: {
    primary: ['store', 'products', 'orders'],
    secondary: ['analytics', 'customers'],
    description: 'Acceso completo para coordinar otros agentes'
  },
  
  product_manager: {
    primary: ['products', 'store'],
    secondary: ['analytics'],
    description: 'Especializado en gestión de productos y catálogo'
  },
  
  analytics: {
    primary: ['orders', 'analytics', 'customers'],
    secondary: ['products', 'store'],
    description: 'Especializado en análisis de datos y métricas'
  },
  
  customer_service: {
    primary: ['customers', 'orders', 'conversations'],
    secondary: ['products'],
    description: 'Especializado en atención al cliente'
  },
  
  marketing: {
    primary: ['customers', 'analytics'],
    secondary: ['products', 'store'],
    description: 'Especializado en marketing y análisis de audiencia'
  }
} as const;

// ===== EXPORTS =====

export default NamespaceStrategy;

/**
 * Utility function to generate namespace quickly
 */
export function generateNamespace(storeId: string, type?: NamespaceType): string {
  return NamespaceStrategy.generateNamespace(storeId, type);
}

/**
 * Utility function to validate namespace quickly
 */
export function validateNamespace(namespace: string): boolean {
  return NamespaceStrategy.validateNamespace(namespace).valid;
} 