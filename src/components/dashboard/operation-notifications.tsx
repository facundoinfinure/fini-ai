"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Bell, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Pause,
  Play,
  Info,
  AlertTriangle,
  Settings,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BackgroundOperation, 
  OperationNotification, 
  OperationStatus, 
  OperationPriority,
  SystemStatus,
  getOperationConfig,
  formatTimeRemaining,
  shouldBlockChatAccess,
  getSystemStatus
} from '@/types/operations';

interface OperationNotificationsProps {
  operations: BackgroundOperation[];
  notifications: OperationNotification[];
  systemStatus: SystemStatus;
  onDismissNotification: (id: string) => void;
  onCancelOperation: (id: string) => void;
  onRetryOperation: (id: string) => void;
  onPauseOperation: (id: string) => void;
  onResumeOperation: (id: string) => void;
  className?: string;
}

export function OperationNotifications({
  operations,
  notifications,
  systemStatus,
  onDismissNotification,
  onCancelOperation,
  onRetryOperation,
  onPauseOperation,
  onResumeOperation,
  className
}: OperationNotificationsProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Auto-hide notifications after delay
  useEffect(() => {
    const successNotifications = notifications.filter(n => 
      n.type === 'success' && n.autoHide && !n.dismissed
    );
    
    if (successNotifications.length > 0 && !autoHideTimer) {
      const timer = setTimeout(() => {
        successNotifications.forEach(n => onDismissNotification(n.id));
      }, 5000);
      setAutoHideTimer(timer);
    }
    
    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        setAutoHideTimer(null);
      }
    };
  }, [notifications, autoHideTimer, onDismissNotification]);

  const activeOperations = operations.filter(op => 
    [OperationStatus.PENDING, OperationStatus.STARTING, OperationStatus.IN_PROGRESS, OperationStatus.COMPLETING].includes(op.status)
  );

  const criticalOperations = activeOperations.filter(op => 
    getOperationConfig(op.type).priority === OperationPriority.CRITICAL
  );

  const blockingOperations = activeOperations.filter(op => 
    getOperationConfig(op.type).blocksChatAccess
  );

  const recentNotifications = notifications.filter(n => !n.dismissed);

  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case OperationStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case OperationStatus.STARTING:
        return <Play className="h-4 w-4 text-blue-500" />;
      case OperationStatus.IN_PROGRESS:
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case OperationStatus.COMPLETING:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case OperationStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case OperationStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case OperationStatus.CANCELLED:
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: OperationStatus) => {
    switch (status) {
      case OperationStatus.PENDING:
        return 'bg-yellow-50 border-yellow-200';
      case OperationStatus.STARTING:
        return 'bg-blue-50 border-blue-200';
      case OperationStatus.IN_PROGRESS:
        return 'bg-blue-50 border-blue-200';
      case OperationStatus.COMPLETING:
        return 'bg-green-50 border-green-200';
      case OperationStatus.COMPLETED:
        return 'bg-green-50 border-green-200';
      case OperationStatus.FAILED:
        return 'bg-red-50 border-red-200';
      case OperationStatus.CANCELLED:
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getNotificationIcon = (type: OperationNotification['type']) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: OperationNotification['type']) => {
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSystemStatusColor = (status: SystemStatus['overallStatus']) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSystemStatusText = (status: SystemStatus['overallStatus']) => {
    switch (status) {
      case 'operational':
        return 'Operativo';
      case 'degraded':
        return 'Funcionamiento limitado';
      case 'maintenance':
        return 'Mantenimiento';
      case 'critical':
        return 'Servicio interrumpido';
      default:
        return 'Estado desconocido';
    }
  };

  const calculateTimeRemaining = (operation: BackgroundOperation): number => {
    const config = getOperationConfig(operation.type);
    const elapsed = (Date.now() - operation.startedAt.getTime()) / 1000;
    const estimated = config.estimatedDuration;
    const remaining = estimated - elapsed;
    return Math.max(0, remaining);
  };

  // Si no hay operaciones activas ni notificaciones, no mostrar nada
  if (activeOperations.length === 0 && recentNotifications.length === 0) {
    return null;
  }

  return (
    <div className={cn("fixed top-4 right-4 z-50 w-96 space-y-2", className)} ref={notificationRef}>
      {/* System Status Banner */}
      {systemStatus.overallStatus !== 'operational' && (
        <Alert className={cn("border-2", getSystemStatusColor(systemStatus.overallStatus))}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {getSystemStatusText(systemStatus.overallStatus)}
                </div>
                {systemStatus.message && (
                  <div className="text-sm mt-1">{systemStatus.message}</div>
                )}
                {systemStatus.estimatedRestoreTime && (
                  <div className="text-xs mt-1">
                    Tiempo estimado: {formatTimeRemaining(
                      (systemStatus.estimatedRestoreTime.getTime() - Date.now()) / 1000
                    )}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {activeOperations.length} operaciones
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Operations */}
      {activeOperations.length > 0 && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <span>Operaciones en curso</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {activeOperations.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 p-0"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <CardContent className="pt-0 space-y-3">
              {activeOperations.map((operation) => {
                const config = getOperationConfig(operation.type);
                const timeRemaining = calculateTimeRemaining(operation);
                
                return (
                  <div
                    key={operation.id}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all duration-200",
                      getStatusColor(operation.status),
                      config.blocksChatAccess && "ring-2 ring-orange-200"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(operation.status)}
                        <div>
                          <div className="font-semibold text-sm">
                            {config.icon} {operation.title}
                          </div>
                          {operation.storeName && (
                            <div className="text-xs text-gray-600">
                              {operation.storeName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600">
                          {formatTimeRemaining(timeRemaining)}
                        </div>
                        {config.blocksChatAccess && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Bloquea chat
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-gray-700">
                        {operation.currentStepDescription}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Progress value={operation.progress} className="flex-1" />
                        <span className="text-xs text-gray-600 w-12">
                          {Math.round(operation.progress)}%
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Paso {operation.currentStep} de {operation.totalSteps}
                      </div>
                    </div>

                    {/* Warning Message */}
                    {config.warningMessage && (
                      <Alert className="mt-3 border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {config.warningMessage}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Operation Controls */}
                    <div className="flex justify-end space-x-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOperation(
                          selectedOperation === operation.id ? null : operation.id
                        )}
                        className="text-xs"
                      >
                        {selectedOperation === operation.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        Detalles
                      </Button>
                      
                      {operation.status === OperationStatus.IN_PROGRESS && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPauseOperation(operation.id)}
                          className="text-xs"
                        >
                          <Pause className="h-3 w-3" />
                          Pausar
                        </Button>
                      )}
                      
                      {operation.status === OperationStatus.FAILED && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetryOperation(operation.id)}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Reintentar
                        </Button>
                      )}
                      
                      {[OperationStatus.PENDING, OperationStatus.STARTING].includes(operation.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancelOperation(operation.id)}
                          className="text-xs text-red-600"
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </Button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {selectedOperation === operation.id && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <div className="text-sm space-y-2">
                          <div><strong>Descripción:</strong> {operation.description}</div>
                          <div><strong>Iniciado:</strong> {operation.startedAt.toLocaleTimeString()}</div>
                          <div><strong>Reintentos:</strong> {operation.retryCount}/{operation.maxRetries}</div>
                          {operation.error && (
                            <div className="text-red-600">
                              <strong>Error:</strong> {operation.error}
                            </div>
                          )}
                          
                          {/* Progress Steps */}
                          <div>
                            <strong>Progreso:</strong>
                            <div className="mt-1 space-y-1">
                              {config.progressSteps.map((step, index) => (
                                <div key={index} className="flex items-center space-x-2 text-xs">
                                  {index < operation.currentStep ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : index === operation.currentStep ? (
                                    <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-gray-400" />
                                  )}
                                  <span className={index <= operation.currentStep ? "text-gray-900" : "text-gray-500"}>
                                    {step}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* Recent Notifications */}
      {recentNotifications.length > 0 && (
        <div className="space-y-2">
          {recentNotifications.map((notification) => (
            <Alert
              key={notification.id}
              className={cn(
                "border-2 shadow-lg",
                getNotificationColor(notification.type)
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  {getNotificationIcon(notification.type)}
                  <div>
                    <div className="font-semibold text-sm">
                      {notification.title}
                    </div>
                    <div className="text-sm mt-1">
                      {notification.message}
                    </div>
                    {notification.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={notification.action.onClick}
                        className="mt-2 text-xs"
                      >
                        {notification.action.label}
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismissNotification(notification.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
} 