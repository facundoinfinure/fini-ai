"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  BackgroundOperation, 
  OperationNotification, 
  OperationType, 
  SystemStatus,
  shouldBlockChatAccess,
  getOperationConfig
} from '@/types/operations';
import { operationManager } from '@/lib/operations/operation-manager';

export interface UseOperationsReturn {
  // State
  operations: BackgroundOperation[];
  notifications: OperationNotification[];
  systemStatus: SystemStatus;
  
  // Chat access control
  canAccessChat: boolean;
  chatBlockReason: string | null;
  
  // Actions
  createOperation: (
    type: OperationType,
    options?: {
      storeId?: string;
      storeName?: string;
      metadata?: Record<string, any>;
    }
  ) => BackgroundOperation;
  
  cancelOperation: (operationId: string) => void;
  retryOperation: (operationId: string) => void;
  pauseOperation: (operationId: string) => void;
  resumeOperation: (operationId: string) => void;
  dismissNotification: (notificationId: string) => void;
  
  // Specific operations
  createStoreConnection: (storeId: string, storeName: string) => BackgroundOperation;
  createDataUpdate: (storeId: string, storeName: string, dataType?: string) => BackgroundOperation;
  createRAGSync: (storeId: string, storeName: string, isInitial?: boolean) => BackgroundOperation;
  
  // Utilities
  getOperationsByStore: (storeId: string) => BackgroundOperation[];
  hasActiveOperations: boolean;
  hasCriticalOperations: boolean;
  estimatedWaitTime: number; // in seconds
}

export function useOperations(): UseOperationsReturn {
  const { user } = useAuth();
  const [operations, setOperations] = useState<BackgroundOperation[]>([]);
  const [notifications, setNotifications] = useState<OperationNotification[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overallStatus: 'operational',
    activeOperations: [],
    blockedFeatures: []
  });

  // Set user ID in operation manager
  useEffect(() => {
    if (user?.id) {
      operationManager.setUserId(user.id);
    }
  }, [user?.id]);

  // Setup event listeners
  useEffect(() => {
    const updateState = () => {
      if (!user?.id) return;
      
      const userOperations = operationManager.getOperationsByUser(user.id);
      const allNotifications = operationManager.getAllNotifications();
      const currentSystemStatus = operationManager.getSystemStatus();
      
      setOperations(userOperations);
      setNotifications(allNotifications);
      setSystemStatus(currentSystemStatus);
    };

    // Initial load
    updateState();

    // Event listeners
    const handleOperationUpdate = () => updateState();
    const handleNotificationUpdate = () => updateState();

    operationManager.on('operation:created', handleOperationUpdate);
    operationManager.on('operation:started', handleOperationUpdate);
    operationManager.on('operation:progress', handleOperationUpdate);
    operationManager.on('operation:completed', handleOperationUpdate);
    operationManager.on('operation:failed', handleOperationUpdate);
    operationManager.on('operation:cancelled', handleOperationUpdate);
    operationManager.on('operation:retrying', handleOperationUpdate);
    operationManager.on('operation:paused', handleOperationUpdate);
    operationManager.on('operation:resumed', handleOperationUpdate);
    operationManager.on('operation:removed', handleOperationUpdate);
    
    operationManager.on('notification:created', handleNotificationUpdate);
    operationManager.on('notification:dismissed', handleNotificationUpdate);

    // Cleanup old notifications periodically
    const cleanupInterval = setInterval(() => {
      operationManager.cleanupOldNotifications();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      operationManager.off('operation:created', handleOperationUpdate);
      operationManager.off('operation:started', handleOperationUpdate);
      operationManager.off('operation:progress', handleOperationUpdate);
      operationManager.off('operation:completed', handleOperationUpdate);
      operationManager.off('operation:failed', handleOperationUpdate);
      operationManager.off('operation:cancelled', handleOperationUpdate);
      operationManager.off('operation:retrying', handleOperationUpdate);
      operationManager.off('operation:paused', handleOperationUpdate);
      operationManager.off('operation:resumed', handleOperationUpdate);
      operationManager.off('operation:removed', handleOperationUpdate);
      
      operationManager.off('notification:created', handleNotificationUpdate);
      operationManager.off('notification:dismissed', handleNotificationUpdate);
      
      clearInterval(cleanupInterval);
    };
  }, [user?.id]);

  // Chat access control
  const canAccessChat = !shouldBlockChatAccess(operations);
  const chatBlockReason = (() => {
    if (!canAccessChat) {
      const blockingOps = operations.filter(op => {
        const config = getOperationConfig(op.type);
        return config?.blocksChatAccess && [
          'pending', 'starting', 'in_progress', 'completing'
        ].includes(op.status);
      });
      
      if (blockingOps.length > 0) {
        return `Chat bloqueado por: ${blockingOps.map(op => op.title).join(', ')}`;
      }
    }
    return null;
  })();

  // Actions
  const createOperation = useCallback((
    type: OperationType,
    options: {
      storeId?: string;
      storeName?: string;
      metadata?: Record<string, any>;
    } = {}
  ): BackgroundOperation => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    return operationManager.createOperation(type, user.id, options);
  }, [user?.id]);

  const cancelOperation = useCallback((operationId: string) => {
    operationManager.cancelOperation(operationId);
  }, []);

  const retryOperation = useCallback((operationId: string) => {
    operationManager.retryOperation(operationId);
  }, []);

  const pauseOperation = useCallback((operationId: string) => {
    operationManager.pauseOperation(operationId);
  }, []);

  const resumeOperation = useCallback((operationId: string) => {
    operationManager.resumeOperation(operationId);
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    operationManager.dismissNotification(notificationId);
  }, []);

  // Specific operations
  const createStoreConnection = useCallback((storeId: string, storeName: string): BackgroundOperation => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    return operationManager.createStoreInitialConnectionOperation(user.id, storeId, storeName);
  }, [user?.id]);

  const createDataUpdate = useCallback((storeId: string, storeName: string, dataType?: string): BackgroundOperation => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    return operationManager.createDataUpdateOperation(user.id, storeId, storeName, dataType);
  }, [user?.id]);

  const createRAGSync = useCallback((storeId: string, storeName: string, isInitial?: boolean): BackgroundOperation => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    return operationManager.createRAGSyncOperation(user.id, storeId, storeName, isInitial);
  }, [user?.id]);

  // Utilities
  const getOperationsByStore = useCallback((storeId: string): BackgroundOperation[] => {
    return operations.filter(op => op.storeId === storeId);
  }, [operations]);

  const hasActiveOperations = operations.some(op => 
    ['pending', 'starting', 'in_progress', 'completing'].includes(op.status)
  );

  const hasCriticalOperations = operations.some(op => {
    const config = getOperationConfig(op.type);
    return config?.priority === 'critical' && ['pending', 'starting', 'in_progress', 'completing'].includes(op.status);
  });

  const estimatedWaitTime = Math.max(
    0,
    ...operations
      .filter(op => ['pending', 'starting', 'in_progress', 'completing'].includes(op.status))
      .map(op => (op.estimatedCompletionAt.getTime() - Date.now()) / 1000)
  );

  return {
    // State
    operations,
    notifications,
    systemStatus,
    
    // Chat access control
    canAccessChat,
    chatBlockReason,
    
    // Actions
    createOperation,
    cancelOperation,
    retryOperation,
    pauseOperation,
    resumeOperation,
    dismissNotification,
    
    // Specific operations
    createStoreConnection,
    createDataUpdate,
    createRAGSync,
    
    // Utilities
    getOperationsByStore,
    hasActiveOperations,
    hasCriticalOperations,
    estimatedWaitTime
  };
}

// Hook específico para verificar acceso al chat
export function useChatAccess(): {
  canAccessChat: boolean;
  blockReason: string | null;
  estimatedWaitTime: number;
  blockingOperations: BackgroundOperation[];
} {
  const { operations, canAccessChat, chatBlockReason, estimatedWaitTime } = useOperations();
  
  const blockingOperations = operations.filter(op => {
    const config = getOperationConfig(op.type);
    return config?.blocksChatAccess && ['pending', 'starting', 'in_progress', 'completing'].includes(op.status);
  });

  return {
    canAccessChat,
    blockReason: chatBlockReason,
    estimatedWaitTime,
    blockingOperations
  };
}

// Hook específico para el estado del sistema
export function useSystemStatus(): SystemStatus & {
  isOperational: boolean;
  isDegraded: boolean;
  isInMaintenance: boolean;
  isCritical: boolean;
} {
  const { systemStatus } = useOperations();
  
  return {
    ...systemStatus,
    isOperational: systemStatus.overallStatus === 'operational',
    isDegraded: systemStatus.overallStatus === 'degraded',
    isInMaintenance: systemStatus.overallStatus === 'maintenance',
    isCritical: systemStatus.overallStatus === 'critical'
  };
} 