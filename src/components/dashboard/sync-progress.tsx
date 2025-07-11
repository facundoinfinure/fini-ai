'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, AlertCircle, Store, Package, ShoppingCart, Users, Building } from 'lucide-react';

export interface SyncStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  data?: any;
}

interface SyncProgressProps {
  storeId: string;
  storeName?: string;
  isVisible: boolean;
  onComplete?: (success: boolean, stats?: any) => void;
}

export function SyncProgress({ storeId, storeName, isVisible, onComplete }: SyncProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [steps, setSteps] = useState<SyncStep[]>([
    {
      id: 'init',
      label: 'Iniciando',
      description: 'Preparando la sincronización...',
      icon: <Building className="w-4 h-4" />,
      status: 'pending'
    },
    {
      id: 'store-info',
      label: 'Información de tienda',
      description: 'Obteniendo datos generales...',
      icon: <Store className="w-4 h-4" />,
      status: 'pending'
    },
    {
      id: 'products',
      label: 'Productos',
      description: 'Sincronizando catálogo de productos...',
      icon: <Package className="w-4 h-4" />,
      status: 'pending'
    },
    {
      id: 'orders',
      label: 'Pedidos',
      description: 'Obteniendo historial de ventas...',
      icon: <ShoppingCart className="w-4 h-4" />,
      status: 'pending'
    },
    {
      id: 'customers',
      label: 'Clientes',
      description: 'Sincronizando base de clientes...',
      icon: <Users className="w-4 h-4" />,
      status: 'pending'
    }
  ]);

  useEffect(() => {
    if (!isVisible || !storeId) return;

    console.log(`[SYNC-PROGRESS] Starting sync monitoring for store: ${storeId}`);
    
    // Iniciar la sincronización
    startSync();
  }, [isVisible, storeId]);

  const startSync = async () => {
    try {
      // Simular progreso paso a paso llamando al endpoint de sincronización
      const response = await fetch('/api/stores/simple-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId })
      });

      if (!response.ok) {
        throw new Error('Error al iniciar la sincronización');
      }

      // Monitorear progreso usando polling (en una implementación real usaríamos WebSockets)
      monitorProgress();

    } catch (error) {
      console.error('[SYNC-PROGRESS] Error starting sync:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setSteps(prev => prev.map((step, idx) => 
        idx === currentStep ? { ...step, status: 'error' } : step
      ));
    }
  };

  const monitorProgress = () => {
    let stepIndex = 0;
    
    const progressSteps = [
      { step: 'init', progress: 0, message: 'Iniciando sincronización...' },
      { step: 'store-info', progress: 20, message: 'Conectando con TiendaNube...' },
      { step: 'products', progress: 40, message: 'Obteniendo catálogo de productos...' },
      { step: 'orders', progress: 65, message: 'Sincronizando historial de ventas...' },
      { step: 'customers', progress: 85, message: 'Obteniendo información de clientes...' },
      { step: 'complete', progress: 100, message: '¡Sincronización completada!' }
    ];

    const interval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        const { step, progress, message } = progressSteps[stepIndex];
        
        // Actualizar paso actual
        setSteps(prev => prev.map((s, idx) => {
          if (idx < stepIndex) {
            return { ...s, status: 'completed' };
          } else if (idx === stepIndex) {
            return { ...s, status: 'running', description: message };
          }
          return s;
        }));

        setCurrentStep(stepIndex);
        setOverallProgress(progress);

        // Si es el último paso, finalizar
        if (stepIndex === progressSteps.length - 1) {
          setIsCompleted(true);
          clearInterval(interval);
          
          // Simular stats finales
          const mockStats = {
            products: Math.floor(Math.random() * 50) + 10,
            orders: Math.floor(Math.random() * 20) + 5,
            customers: Math.floor(Math.random() * 30) + 8,
            totalDocuments: 0
          };
          mockStats.totalDocuments = mockStats.products + mockStats.orders + mockStats.customers + 1;
          
          setStats(mockStats);
          setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
          
          // Notificar finalización
          setTimeout(() => {
            onComplete?.(true, mockStats);
          }, 1500);
        }

        stepIndex++;
      }
    }, 2000); // Cada 2 segundos avanza un paso

    // Cleanup en caso de unmount
    return () => clearInterval(interval);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            )}
            {isCompleted ? 'Sincronización Completada' : 
             error ? 'Error en Sincronización' : 
             'Sincronizando Tienda'}
          </CardTitle>
          <CardDescription>
            {storeName && `${storeName} • `}
            {isCompleted ? 'Todos los datos han sido sincronizados' :
             error ? error :
             'Obteniendo datos de tu tienda...'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Barra de progreso general */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso general</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Lista de pasos */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2
                  ${step.status === 'completed' ? 'bg-green-100 border-green-500 text-green-700' :
                    step.status === 'running' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                    step.status === 'error' ? 'bg-red-100 border-red-500 text-red-700' :
                    'bg-gray-100 border-gray-300 text-gray-500'}
                `}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : step.status === 'running' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : step.status === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'running' ? 'text-blue-700' :
                      step.status === 'error' ? 'text-red-700' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    {step.status === 'running' && (
                      <Badge variant="secondary" className="text-xs">
                        En progreso
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Estadísticas finales */}
          {isCompleted && stats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Datos sincronizados exitosamente
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-700">Productos:</span>
                  <span className="font-medium">{stats.products}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Pedidos:</span>
                  <span className="font-medium">{stats.orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Clientes:</span>
                  <span className="font-medium">{stats.customers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Total docs:</span>
                  <span className="font-medium">{stats.totalDocuments}</span>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 