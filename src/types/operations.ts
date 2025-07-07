/**
 * 🔄 BACKGROUND OPERATIONS TYPES
 * =============================
 * 
 * Sistema completo de tipos para operaciones en background
 * y notificaciones en tiempo real
 */

export enum OperationType {
  // Operaciones críticas (bloquean chat)
  STORE_INITIAL_CONNECTION = 'store_initial_connection',
  STORE_MIGRATION = 'store_migration',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  
  // Operaciones no críticas (permiten chat con advertencia)
  DATA_UPDATE = 'data_update',
  RAG_SYNC = 'rag_sync',
  INVENTORY_SYNC = 'inventory_sync',
  ANALYTICS_REFRESH = 'analytics_refresh',
  
  // Operaciones de limpieza
  STORE_CLEANUP = 'store_cleanup',
  VECTOR_CLEANUP = 'vector_cleanup',
  
  // Operaciones de reconexión
  STORE_RECONNECTION = 'store_reconnection',
  TOKEN_REFRESH = 'token_refresh',
  
  // Operaciones de configuración
  WHATSAPP_SETUP = 'whatsapp_setup',
  NAMESPACE_INITIALIZATION = 'namespace_initialization'
}

export enum OperationStatus {
  PENDING = 'pending',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  COMPLETING = 'completing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum OperationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface OperationConfig {
  type: OperationType;
  title: string;
  description: string;
  estimatedDuration: number; // in seconds
  blocksChatAccess: boolean;
  priority: OperationPriority;
  icon: string;
  progressSteps: string[];
  warningMessage?: string;
  successMessage?: string;
  errorMessage?: string;
}

export interface BackgroundOperation {
  id: string;
  type: OperationType;
  status: OperationStatus;
  storeId?: string;
  storeName?: string;
  userId: string;
  
  // Timing
  startedAt: Date;
  estimatedCompletionAt: Date;
  completedAt?: Date;
  
  // Progress
  currentStep: number;
  totalSteps: number;
  progress: number; // 0-100
  
  // Details
  title: string;
  description: string;
  currentStepDescription: string;
  
  // Error handling
  error?: string;
  retryCount: number;
  maxRetries: number;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Callbacks
  onProgress?: (operation: BackgroundOperation) => void;
  onComplete?: (operation: BackgroundOperation) => void;
  onError?: (operation: BackgroundOperation) => void;
}

export interface OperationNotification {
  id: string;
  operationId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  autoHide?: boolean;
  duration?: number; // in seconds
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface SystemStatus {
  overallStatus: 'operational' | 'degraded' | 'maintenance' | 'critical';
  activeOperations: BackgroundOperation[];
  blockedFeatures: string[];
  estimatedRestoreTime?: Date;
  message?: string;
}

// Configuraciones por tipo de operación
export const OPERATION_CONFIGS: Record<OperationType, OperationConfig> = {
  [OperationType.STORE_INITIAL_CONNECTION]: {
    type: OperationType.STORE_INITIAL_CONNECTION,
    title: 'Conexión inicial de tienda',
    description: 'Configurando tu tienda por primera vez',
    estimatedDuration: 90, // 1m30s
    blocksChatAccess: true,
    priority: OperationPriority.CRITICAL,
    icon: '🏪',
    progressSteps: [
      'Validando conexión',
      'Sincronizando catálogo',
      'Creando índices RAG',
      'Configurando agentes',
      'Finalizando configuración'
    ],
    warningMessage: 'No podrás usar el chat hasta completar esta configuración',
    successMessage: '¡Tienda configurada exitosamente! Ya puedes usar el chat.',
    errorMessage: 'Error al configurar la tienda. Puedes reintentar la conexión.'
  },
  
  [OperationType.DATA_UPDATE]: {
    type: OperationType.DATA_UPDATE,
    title: 'Actualizando datos',
    description: 'Sincronizando información actualizada',
    estimatedDuration: 45, // 45s
    blocksChatAccess: false,
    priority: OperationPriority.MEDIUM,
    icon: '🔄',
    progressSteps: [
      'Obteniendo datos actualizados',
      'Procesando cambios',
      'Actualizando base de datos',
      'Sincronizando con agentes'
    ],
    warningMessage: 'El chat está disponible, pero puede mostrar información no actualizada',
    successMessage: 'Datos actualizados correctamente',
    errorMessage: 'Error al actualizar datos. Los datos anteriores siguen disponibles.'
  },
  
  [OperationType.RAG_SYNC]: {
    type: OperationType.RAG_SYNC,
    title: 'Sincronizando base de conocimiento',
    description: 'Actualizando sistema inteligente de respuestas',
    estimatedDuration: 120, // 2m
    blocksChatAccess: false,
    priority: OperationPriority.HIGH,
    icon: '🧠',
    progressSteps: [
      'Procesando productos',
      'Indexando órdenes',
      'Actualizando clientes',
      'Optimizando búsquedas'
    ],
    warningMessage: 'Los agentes pueden dar respuestas menos precisas hasta completar la sincronización',
    successMessage: 'Base de conocimiento actualizada. Los agentes ahora tienen acceso a la información más reciente.',
    errorMessage: 'Error en sincronización. Los agentes usarán la información disponible.'
  },
  
  [OperationType.STORE_RECONNECTION]: {
    type: OperationType.STORE_RECONNECTION,
    title: 'Reconectando tienda',
    description: 'Restableciendo conexión con tu tienda',
    estimatedDuration: 60, // 1m
    blocksChatAccess: true,
    priority: OperationPriority.HIGH,
    icon: '🔗',
    progressSteps: [
      'Validando credenciales',
      'Limpiando datos antiguos',
      'Restableciendo conexión',
      'Sincronizando datos'
    ],
    warningMessage: 'El chat no estará disponible durante la reconexión',
    successMessage: 'Tienda reconectada exitosamente',
    errorMessage: 'Error al reconectar. Verifica las credenciales de tu tienda.'
  },
  
  [OperationType.WHATSAPP_SETUP]: {
    type: OperationType.WHATSAPP_SETUP,
    title: 'Configurando WhatsApp',
    description: 'Estableciendo conexión con WhatsApp Business',
    estimatedDuration: 30, // 30s
    blocksChatAccess: false,
    priority: OperationPriority.MEDIUM,
    icon: '📱',
    progressSteps: [
      'Validando número',
      'Configurando webhooks',
      'Probando conexión'
    ],
    warningMessage: 'Las notificaciones por WhatsApp no estarán disponibles hasta completar la configuración',
    successMessage: 'WhatsApp configurado correctamente',
    errorMessage: 'Error al configurar WhatsApp. Verifica el número proporcionado.'
  },
  
  [OperationType.SYSTEM_MAINTENANCE]: {
    type: OperationType.SYSTEM_MAINTENANCE,
    title: 'Mantenimiento del sistema',
    description: 'Aplicando actualizaciones importantes',
    estimatedDuration: 300, // 5m
    blocksChatAccess: true,
    priority: OperationPriority.CRITICAL,
    icon: '⚙️',
    progressSteps: [
      'Preparando actualizaciones',
      'Aplicando cambios',
      'Reiniciando servicios',
      'Verificando funcionalidad'
    ],
    warningMessage: 'El sistema no estará disponible durante el mantenimiento',
    successMessage: 'Mantenimiento completado. Todas las funciones están disponibles.',
    errorMessage: 'Error durante el mantenimiento. Contacta al soporte si persisten los problemas.'
  },
  
  [OperationType.STORE_CLEANUP]: {
    type: OperationType.STORE_CLEANUP,
    title: 'Limpieza de datos',
    description: 'Optimizando almacenamiento de datos',
    estimatedDuration: 45,
    blocksChatAccess: false,
    priority: OperationPriority.LOW,
    icon: '🧹',
    progressSteps: [
      'Analizando datos',
      'Eliminando duplicados',
      'Optimizando índices'
    ],
    warningMessage: 'El rendimiento puede verse afectado temporalmente',
    successMessage: 'Limpieza completada. El sistema funcionará más eficientemente.',
    errorMessage: 'Error durante la limpieza. Los datos existentes no se vieron afectados.'
  },
  
  [OperationType.VECTOR_CLEANUP]: {
    type: OperationType.VECTOR_CLEANUP,
    title: 'Optimizando búsquedas',
    description: 'Reorganizando base de vectores',
    estimatedDuration: 90,
    blocksChatAccess: false,
    priority: OperationPriority.MEDIUM,
    icon: '🔍',
    progressSteps: [
      'Analizando vectores',
      'Reorganizando índices',
      'Optimizando búsquedas'
    ],
    warningMessage: 'Las búsquedas pueden ser más lentas temporalmente',
    successMessage: 'Optimización completada. Las búsquedas ahora serán más rápidas.',
    errorMessage: 'Error en optimización. Las búsquedas seguirán funcionando normalmente.'
  },
  
  [OperationType.INVENTORY_SYNC]: {
    type: OperationType.INVENTORY_SYNC,
    title: 'Sincronizando inventario',
    description: 'Actualizando stock y disponibilidad',
    estimatedDuration: 30,
    blocksChatAccess: false,
    priority: OperationPriority.HIGH,
    icon: '📦',
    progressSteps: [
      'Obteniendo inventario',
      'Calculando disponibilidad',
      'Actualizando stock'
    ],
    warningMessage: 'La información de stock puede no estar actualizada',
    successMessage: 'Inventario sincronizado correctamente',
    errorMessage: 'Error al sincronizar inventario. Se mostrará la última información disponible.'
  },
  
  [OperationType.ANALYTICS_REFRESH]: {
    type: OperationType.ANALYTICS_REFRESH,
    title: 'Actualizando analytics',
    description: 'Procesando métricas y reportes',
    estimatedDuration: 60,
    blocksChatAccess: false,
    priority: OperationPriority.MEDIUM,
    icon: '📊',
    progressSteps: [
      'Calculando métricas',
      'Generando reportes',
      'Actualizando dashboards'
    ],
    warningMessage: 'Los reportes pueden mostrar información desactualizada',
    successMessage: 'Analytics actualizados correctamente',
    errorMessage: 'Error al actualizar analytics. Se mostrarán los datos anteriores.'
  },
  
  [OperationType.TOKEN_REFRESH]: {
    type: OperationType.TOKEN_REFRESH,
    title: 'Renovando credenciales',
    description: 'Actualizando tokens de acceso',
    estimatedDuration: 15,
    blocksChatAccess: false,
    priority: OperationPriority.HIGH,
    icon: '🔑',
    progressSteps: [
      'Validando credenciales',
      'Renovando tokens',
      'Verificando acceso'
    ],
    warningMessage: 'Puede haber interrupciones temporales en la conectividad',
    successMessage: 'Credenciales renovadas exitosamente',
    errorMessage: 'Error al renovar credenciales. Puede ser necesario reconectar la tienda.'
  },
  
  [OperationType.NAMESPACE_INITIALIZATION]: {
    type: OperationType.NAMESPACE_INITIALIZATION,
    title: 'Inicializando espacios de datos',
    description: 'Preparando estructuras de almacenamiento',
    estimatedDuration: 45,
    blocksChatAccess: false,
    priority: OperationPriority.MEDIUM,
    icon: '🏗️',
    progressSteps: [
      'Creando espacios',
      'Configurando índices',
      'Validando estructura'
    ],
    warningMessage: 'Los agentes pueden tardar en responder hasta completar la inicialización',
    successMessage: 'Espacios de datos listos para usar',
    errorMessage: 'Error al inicializar espacios. Reintentando automáticamente.'
  },
  
  [OperationType.STORE_MIGRATION]: {
    type: OperationType.STORE_MIGRATION,
    title: 'Migrando datos de tienda',
    description: 'Actualizando estructura de datos',
    estimatedDuration: 180, // 3m
    blocksChatAccess: true,
    priority: OperationPriority.CRITICAL,
    icon: '🚚',
    progressSteps: [
      'Preparando migración',
      'Respaldando datos',
      'Aplicando cambios',
      'Verificando integridad',
      'Finalizando migración'
    ],
    warningMessage: 'El sistema no estará disponible durante la migración',
    successMessage: 'Migración completada. Todas las funciones están disponibles con las mejoras aplicadas.',
    errorMessage: 'Error en migración. Se restaurarán los datos anteriores automáticamente.'
  }
};

// Utility functions
export const getOperationConfig = (type: OperationType): OperationConfig => {
  return OPERATION_CONFIGS[type];
};

export const getEstimatedCompletionTime = (
  operation: BackgroundOperation
): Date => {
  const config = getOperationConfig(operation.type);
  const remainingTime = config.estimatedDuration * (1 - operation.progress / 100);
  return new Date(Date.now() + remainingTime * 1000);
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
};

export const shouldBlockChatAccess = (operations: BackgroundOperation[]): boolean => {
  return operations.some(op => {
    const config = getOperationConfig(op.type);
    return config.blocksChatAccess && [
      OperationStatus.PENDING,
      OperationStatus.STARTING,
      OperationStatus.IN_PROGRESS,
      OperationStatus.COMPLETING
    ].includes(op.status);
  });
};

export const getSystemStatus = (operations: BackgroundOperation[]): SystemStatus => {
  const activeOps = operations.filter(op => 
    [OperationStatus.PENDING, OperationStatus.STARTING, OperationStatus.IN_PROGRESS, OperationStatus.COMPLETING].includes(op.status)
  );
  
  const criticalOps = activeOps.filter(op => 
    getOperationConfig(op.type).priority === OperationPriority.CRITICAL
  );
  
  const blockingOps = activeOps.filter(op => 
    getOperationConfig(op.type).blocksChatAccess
  );
  
  let overallStatus: SystemStatus['overallStatus'] = 'operational';
  let blockedFeatures: string[] = [];
  
  if (criticalOps.length > 0) {
    overallStatus = 'critical';
    blockedFeatures = ['chat', 'analytics', 'configurations'];
  } else if (blockingOps.length > 0) {
    overallStatus = 'maintenance';
    blockedFeatures = ['chat'];
  } else if (activeOps.length > 0) {
    overallStatus = 'degraded';
  }
  
  return {
    overallStatus,
    activeOperations: activeOps,
    blockedFeatures,
    estimatedRestoreTime: activeOps.length > 0 ? 
      new Date(Math.max(...activeOps.map(op => op.estimatedCompletionAt.getTime()))) : 
      undefined
  };
}; 