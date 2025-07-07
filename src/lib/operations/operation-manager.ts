/**
 * 🎯 BACKGROUND OPERATION MANAGER
 * ===============================
 * 
 * Sistema central para gestionar operaciones en background
 * con seguimiento en tiempo real y notificaciones
 */

import { EventEmitter } from 'events';
import { 
  BackgroundOperation, 
  OperationNotification, 
  OperationType, 
  OperationStatus, 
  SystemStatus,
  getOperationConfig,
  getSystemStatus,
  formatTimeRemaining
} from '@/types/operations';

export class OperationManager extends EventEmitter {
  private static instance: OperationManager;
  private operations: Map<string, BackgroundOperation> = new Map();
  private notifications: Map<string, OperationNotification> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private userId: string | null = null;

  private constructor() {
    super();
    this.setupEventHandlers();
  }

  public static getInstance(): OperationManager {
    if (!OperationManager.instance) {
      OperationManager.instance = new OperationManager();
    }
    return OperationManager.instance;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  private setupEventHandlers(): void {
    // Cleanup completed operations after 5 minutes
    this.on('operation:completed', (operation: BackgroundOperation) => {
      setTimeout(() => {
        this.removeOperation(operation.id);
      }, 5 * 60 * 1000);
    });

    // Auto-retry failed operations with retries remaining
    this.on('operation:failed', (operation: BackgroundOperation) => {
      if (operation.retryCount < operation.maxRetries) {
        setTimeout(() => {
          this.retryOperation(operation.id);
        }, 5000 * (operation.retryCount + 1)); // Exponential backoff
      }
    });
  }

  /**
   * 🚀 CREAR NUEVA OPERACIÓN
   */
  public createOperation(
    type: OperationType,
    userId: string,
    options: {
      storeId?: string;
      storeName?: string;
      metadata?: Record<string, any>;
      maxRetries?: number;
      onProgress?: (operation: BackgroundOperation) => void;
      onComplete?: (operation: BackgroundOperation) => void;
      onError?: (operation: BackgroundOperation) => void;
    } = {}
  ): BackgroundOperation {
    const config = getOperationConfig(type);
    const operationId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: BackgroundOperation = {
      id: operationId,
      type,
      status: OperationStatus.PENDING,
      storeId: options.storeId,
      storeName: options.storeName,
      userId,
      
      startedAt: new Date(),
      estimatedCompletionAt: new Date(Date.now() + config.estimatedDuration * 1000),
      
      currentStep: 0,
      totalSteps: config.progressSteps.length,
      progress: 0,
      
      title: config.title,
      description: config.description,
      currentStepDescription: config.progressSteps[0] || 'Iniciando...',
      
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      
      metadata: options.metadata || {},
      
      onProgress: options.onProgress,
      onComplete: options.onComplete,
      onError: options.onError
    };

    this.operations.set(operationId, operation);
    this.emit('operation:created', operation);
    
    // Auto-start operation
    this.startOperation(operationId);
    
    return operation;
  }

  /**
   * 🎬 INICIAR OPERACIÓN
   */
  public startOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.error(`[OPERATION-MANAGER] Operation not found: ${operationId}`);
      return;
    }

    if (operation.status !== OperationStatus.PENDING) {
      console.warn(`[OPERATION-MANAGER] Operation ${operationId} is not in pending state`);
      return;
    }

    operation.status = OperationStatus.STARTING;
    operation.startedAt = new Date();
    
    const config = getOperationConfig(operation.type);
    operation.estimatedCompletionAt = new Date(Date.now() + config.estimatedDuration * 1000);
    
    this.operations.set(operationId, operation);
    this.emit('operation:started', operation);
    
    // Create notification
    this.createNotification({
      operationId,
      type: 'info',
      title: config.title,
      message: config.warningMessage || `Operación iniciada: ${config.description}`,
      autoHide: false
    });

    // Simulate operation progress
    this.simulateOperation(operationId);
  }

  /**
   * 🔄 ACTUALIZAR PROGRESO
   */
  public updateProgress(
    operationId: string,
    progress: number,
    currentStep?: number,
    currentStepDescription?: string
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.progress = Math.min(100, Math.max(0, progress));
    
    if (currentStep !== undefined) {
      operation.currentStep = currentStep;
      
      const config = getOperationConfig(operation.type);
      if (currentStep < config.progressSteps.length) {
        operation.currentStepDescription = config.progressSteps[currentStep];
      }
    }
    
    if (currentStepDescription) {
      operation.currentStepDescription = currentStepDescription;
    }

    // Update status based on progress
    if (operation.progress >= 100) {
      operation.status = OperationStatus.COMPLETING;
    } else if (operation.progress > 0) {
      operation.status = OperationStatus.IN_PROGRESS;
    }

    this.operations.set(operationId, operation);
    this.emit('operation:progress', operation);
    
    // Call progress callback if provided
    if (operation.onProgress) {
      operation.onProgress(operation);
    }
  }

  /**
   * ✅ COMPLETAR OPERACIÓN
   */
  public completeOperation(operationId: string, result?: any): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = OperationStatus.COMPLETED;
    operation.completedAt = new Date();
    operation.progress = 100;
    operation.currentStep = operation.totalSteps;
    operation.currentStepDescription = 'Completado exitosamente';

    this.operations.set(operationId, operation);
    
    // Clear any timers
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
    }

    this.emit('operation:completed', operation);
    
    // Create success notification
    const config = getOperationConfig(operation.type);
    this.createNotification({
      operationId,
      type: 'success',
      title: '✅ Operación completada',
      message: config.successMessage || `${config.title} completado exitosamente`,
      autoHide: true,
      duration: 5
    });

    // Call completion callback if provided
    if (operation.onComplete) {
      operation.onComplete(operation);
    }
  }

  /**
   * ❌ FALLAR OPERACIÓN
   */
  public failOperation(operationId: string, error: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = OperationStatus.FAILED;
    operation.error = error;
    operation.completedAt = new Date();

    this.operations.set(operationId, operation);
    
    // Clear any timers
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
    }

    this.emit('operation:failed', operation);
    
    // Create error notification
    const config = getOperationConfig(operation.type);
    this.createNotification({
      operationId,
      type: 'error',
      title: '❌ Error en operación',
      message: config.errorMessage || `Error en ${config.title}: ${error}`,
      autoHide: false,
      action: operation.retryCount < operation.maxRetries ? {
        label: 'Reintentar',
        onClick: () => this.retryOperation(operationId)
      } : undefined
    });

    // Call error callback if provided
    if (operation.onError) {
      operation.onError(operation);
    }
  }

  /**
   * 🔄 REINTENTAR OPERACIÓN
   */
  public retryOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    if (operation.retryCount >= operation.maxRetries) {
      console.warn(`[OPERATION-MANAGER] Max retries exceeded for operation ${operationId}`);
      return;
    }

    operation.retryCount++;
    operation.status = OperationStatus.PENDING;
    operation.progress = 0;
    operation.currentStep = 0;
    operation.error = undefined;
    operation.startedAt = new Date();
    
    const config = getOperationConfig(operation.type);
    operation.estimatedCompletionAt = new Date(Date.now() + config.estimatedDuration * 1000);
    operation.currentStepDescription = config.progressSteps[0] || 'Iniciando...';

    this.operations.set(operationId, operation);
    this.emit('operation:retrying', operation);
    
    // Create retry notification
    this.createNotification({
      operationId,
      type: 'info',
      title: '🔄 Reintentando operación',
      message: `Reintentando ${config.title} (intento ${operation.retryCount}/${operation.maxRetries})`,
      autoHide: true,
      duration: 3
    });

    // Start operation again
    this.startOperation(operationId);
  }

  /**
   * ⏸️ PAUSAR OPERACIÓN
   */
  public pauseOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    // Clear timer
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
    }

    // Note: Real pause implementation would depend on the specific operation
    this.emit('operation:paused', operation);
    
    this.createNotification({
      operationId,
      type: 'info',
      title: '⏸️ Operación pausada',
      message: `${operation.title} ha sido pausada`,
      autoHide: true,
      duration: 3
    });
  }

  /**
   * ▶️ REANUDAR OPERACIÓN
   */
  public resumeOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    // Resume simulation
    this.simulateOperation(operationId);
    
    this.emit('operation:resumed', operation);
    
    this.createNotification({
      operationId,
      type: 'info',
      title: '▶️ Operación reanudada',
      message: `${operation.title} ha sido reanudada`,
      autoHide: true,
      duration: 3
    });
  }

  /**
   * ❌ CANCELAR OPERACIÓN
   */
  public cancelOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = OperationStatus.CANCELLED;
    operation.completedAt = new Date();

    // Clear timer
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
    }

    this.operations.set(operationId, operation);
    this.emit('operation:cancelled', operation);
    
    this.createNotification({
      operationId,
      type: 'info',
      title: '❌ Operación cancelada',
      message: `${operation.title} ha sido cancelada`,
      autoHide: true,
      duration: 3
    });
  }

  /**
   * 🔔 CREAR NOTIFICACIÓN
   */
  private createNotification(options: {
    operationId: string;
    type: OperationNotification['type'];
    title: string;
    message: string;
    autoHide?: boolean;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }): void {
    const notificationId = `${options.operationId}-${Date.now()}`;
    
    const notification: OperationNotification = {
      id: notificationId,
      operationId: options.operationId,
      type: options.type,
      title: options.title,
      message: options.message,
      timestamp: new Date(),
      dismissed: false,
      autoHide: options.autoHide || false,
      duration: options.duration,
      action: options.action
    };

    this.notifications.set(notificationId, notification);
    this.emit('notification:created', notification);
  }

  /**
   * 🗑️ ELIMINAR OPERACIÓN
   */
  private removeOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    // Clear timer
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
    }

    this.operations.delete(operationId);
    this.emit('operation:removed', operation);
  }

  /**
   * 🎭 SIMULAR OPERACIÓN (para demo y testing)
   */
  private simulateOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    const config = getOperationConfig(operation.type);
    const totalDuration = config.estimatedDuration * 1000; // Convert to milliseconds
    const updateInterval = totalDuration / 20; // 20 updates throughout operation
    
    let currentProgress = operation.progress;
    
    const progressTimer = setInterval(() => {
      if (!this.operations.has(operationId)) {
        clearInterval(progressTimer);
        return;
      }

      const currentOp = this.operations.get(operationId);
      if (!currentOp || currentOp.status === OperationStatus.CANCELLED) {
        clearInterval(progressTimer);
        return;
      }

      currentProgress += (100 / 20); // Increment by 5% each update
      
      if (currentProgress >= 100) {
        clearInterval(progressTimer);
        this.completeOperation(operationId);
        return;
      }

      // Update step based on progress
      const stepProgress = Math.floor((currentProgress / 100) * operation.totalSteps);
      
      this.updateProgress(operationId, currentProgress, stepProgress);
    }, updateInterval);
    
    this.timers.set(operationId, progressTimer);
  }

  /**
   * 📊 OBTENER ESTADO DEL SISTEMA
   */
  public getSystemStatus(): SystemStatus {
    const operations = Array.from(this.operations.values());
    return getSystemStatus(operations);
  }

  /**
   * 📋 OBTENER TODAS LAS OPERACIONES
   */
  public getAllOperations(): BackgroundOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * 📋 OBTENER OPERACIONES POR USUARIO
   */
  public getOperationsByUser(userId: string): BackgroundOperation[] {
    return Array.from(this.operations.values()).filter(op => op.userId === userId);
  }

  /**
   * 📋 OBTENER OPERACIONES POR TIENDA
   */
  public getOperationsByStore(storeId: string): BackgroundOperation[] {
    return Array.from(this.operations.values()).filter(op => op.storeId === storeId);
  }

  /**
   * 🔔 OBTENER TODAS LAS NOTIFICACIONES
   */
  public getAllNotifications(): OperationNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * 🗑️ DESCARTAR NOTIFICACIÓN
   */
  public dismissNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    notification.dismissed = true;
    this.notifications.set(notificationId, notification);
    this.emit('notification:dismissed', notification);
  }

  /**
   * 🧹 LIMPIAR NOTIFICACIONES ANTIGUAS
   */
  public cleanupOldNotifications(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.dismissed || (now - notification.timestamp.getTime()) > maxAge) {
        this.notifications.delete(id);
        this.emit('notification:cleanup', notification);
      }
    }
  }

  /**
   * 🎯 CREAR OPERACIÓN ESPECÍFICA PARA CONEXIÓN INICIAL
   */
  public createStoreInitialConnectionOperation(
    userId: string,
    storeId: string,
    storeName: string,
    metadata?: Record<string, any>
  ): BackgroundOperation {
    return this.createOperation(
      OperationType.STORE_INITIAL_CONNECTION,
      userId,
      {
        storeId,
        storeName,
        metadata,
        maxRetries: 2,
        onComplete: (operation) => {
          console.log(`[OPERATION-MANAGER] Store ${storeName} initial connection completed`);
          // Trigger any post-connection operations
          this.emit('store:connection:completed', { storeId, storeName });
        },
        onError: (operation) => {
          console.error(`[OPERATION-MANAGER] Store ${storeName} initial connection failed:`, operation.error);
          this.emit('store:connection:failed', { storeId, storeName, error: operation.error });
        }
      }
    );
  }

  /**
   * 🎯 CREAR OPERACIÓN ESPECÍFICA PARA ACTUALIZACIÓN DE DATOS
   */
  public createDataUpdateOperation(
    userId: string,
    storeId: string,
    storeName: string,
    dataType: string = 'general'
  ): BackgroundOperation {
    return this.createOperation(
      OperationType.DATA_UPDATE,
      userId,
      {
        storeId,
        storeName,
        metadata: { dataType },
        maxRetries: 3,
        onComplete: (operation) => {
          console.log(`[OPERATION-MANAGER] Data update completed for store ${storeName}`);
          this.emit('data:update:completed', { storeId, storeName, dataType });
        }
      }
    );
  }

  /**
   * 🎯 CREAR OPERACIÓN ESPECÍFICA PARA SYNC RAG
   */
  public createRAGSyncOperation(
    userId: string,
    storeId: string,
    storeName: string,
    isInitial: boolean = false
  ): BackgroundOperation {
    return this.createOperation(
      OperationType.RAG_SYNC,
      userId,
      {
        storeId,
        storeName,
        metadata: { isInitial },
        maxRetries: 2,
        onComplete: (operation) => {
          console.log(`[OPERATION-MANAGER] RAG sync completed for store ${storeName}`);
          this.emit('rag:sync:completed', { storeId, storeName, isInitial });
        }
      }
    );
  }
}

// Export singleton instance
export const operationManager = OperationManager.getInstance(); 