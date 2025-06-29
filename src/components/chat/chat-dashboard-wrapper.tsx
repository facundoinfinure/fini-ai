"use client";

import { useEffect, useState } from 'react';
import { ChatPreview } from '@/components/dashboard/chat-preview';
import { ChatMetrics } from './chat-metrics';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  Smartphone,
  Monitor,
  Bot,
  Settings,
  Sparkles,
  User,
  Package,
  DollarSign,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Store } from '@/types/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ChatWrapper');

interface WhatsAppStatus {
  connected: boolean;
  number: string;
  verified: boolean;
}

export function ChatDashboardWrapper() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    number: '',
    verified: false
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncCheck, setLastSyncCheck] = useState<Date | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  // Auto-refresh stores data periodically to catch WhatsApp configuration changes
  useEffect(() => {
    const interval = setInterval(() => {
      loadStores();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedStore]);

  const loadStores = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stores');
      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        const storesArray = data.data;
        setStores(storesArray);
        
        if (storesArray.length > 0) {
          await syncStoresIntelligentlyForChat(storesArray);
        }

        if (!selectedStore && storesArray.length > 0) {
          const activeStore = storesArray.find((store: Store) => store.is_active && store.access_token) || storesArray[0];
          setSelectedStore(activeStore);
        }
      } else {
        setError('No se pudieron cargar las tiendas');
      }
    } catch (err) {
      setError('Error al cargar las tiendas');
      console.error('Error loading stores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncStoresIntelligentlyForChat = async (storesList: Store[]) => {
    try {
      const now = new Date();
      
      if (lastSyncCheck && (now.getTime() - lastSyncCheck.getTime()) < 2 * 60 * 1000) {
        logger.info('Skipping sync check - too recent', { 
          lastCheck: lastSyncCheck.toISOString() 
        });
        return;
      }
      
      setLastSyncCheck(now);
      logger.info('Starting intelligent chat sync check', { storeCount: storesList.length });
      
      let syncTriggered = false;
      const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000)); // 4 horas para chat
      
      for (const store of storesList) {
        if (!store.access_token) {
          logger.info('Skipping sync - no access token', { storeId: store.id });
          continue;
        }
        
        const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
        const needsSync = !lastSync || lastSync < fourHoursAgo;
        
        if (needsSync) {
          logger.info('Triggering chat RAG sync', { 
            storeId: store.id, 
            storeName: store.name,
            lastSync: lastSync?.toISOString() || 'never'
          });
          
          if (!syncTriggered) {
            setIsSyncing(true);
            syncTriggered = true;
          }
          
          fetch(`/api/stores/${store.id}/sync-rag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(error => {
            logger.error('Chat RAG sync failed', { storeId: store.id, error });
          });
        }
      }
      
      if (syncTriggered) {
        setTimeout(() => {
          setIsSyncing(false);
          logger.info('Chat sync process completed');
        }, 10000); // 10 segundos
      }
      
    } catch (error) {
      logger.error('Chat intelligent sync failed', { error });
      setIsSyncing(false);
    }
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    // WhatsApp status will be fetched from separate API endpoint
    setWhatsappStatus({
      connected: false,
      number: '',
      verified: false
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Cargando tiendas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadStores()} 
            className="ml-2"
          >
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (stores.length === 0) {
    return (
      <Alert className="m-4">
        <Bot className="h-4 w-4" />
        <AlertDescription>
                     No tienes tiendas conectadas. Ve a la pestaña &ldquo;Gestión de Tiendas&rdquo; para conectar tu primera tienda.
        </AlertDescription>
      </Alert>
    );
  }

  if (!whatsappStatus.verified) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium mb-1">WhatsApp no configurado</div>
              <div>Configura WhatsApp para comenzar a chatear con tu tienda.</div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadStores()}
              className="ml-4 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar Estado
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full">
      {isSyncing && (
        <Alert className="m-4 mb-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Sincronizando datos de productos...</div>
                <div className="text-sm text-muted-foreground">
                  Los agentes tendrán acceso completo a tu catálogo en unos momentos.
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {selectedStore && (
        <div className="h-[700px] bg-white rounded-xl border border-gray-200 shadow-sm flex">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Fini AI</h2>
                  <p className="text-sm text-gray-600">Sistema Multi-Agente • {selectedStore.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {whatsappStatus.verified ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    WhatsApp Activo
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Solo Dashboard
                  </div>
                )}
              </div>
            </div>

            {!whatsappStatus.verified && (
              <div className="mx-4 mt-4">
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>WhatsApp no configurado</strong> - Para recibir consultas por WhatsApp, 
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-orange-800 underline ml-1 font-medium"
                      onClick={() => window.location.href = '/dashboard?tab=configuracion'}
                    >
                      configúralo aquí
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

                         <div className="flex-1 flex flex-col">
               <ChatPreview 
                 selectedStore={selectedStore}
               />
             </div>
          </div>

          <div className="w-80 border-l border-gray-200 bg-gray-50/30">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Agentes Disponibles</h3>
              <div className="space-y-2">
                {[
                  { key: 'analytics', icon: BarChart3, label: 'Analytics AI', desc: 'Datos y métricas', color: 'bg-blue-500' },
                  { key: 'marketing', icon: Sparkles, label: 'Marketing AI', desc: 'Estrategias comerciales', color: 'bg-purple-500' },
                  { key: 'customer_service', icon: User, label: 'Support AI', desc: 'Atención al cliente', color: 'bg-green-500' },
                  { key: 'stock_manager', icon: Package, label: 'Inventario AI', desc: 'Gestión de stock', color: 'bg-orange-500' },
                  { key: 'financial_advisor', icon: DollarSign, label: 'Finanzas AI', desc: 'Análisis financiero', color: 'bg-emerald-500' }
                ].map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <div key={agent.key} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                      <div className={`w-8 h-8 ${agent.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{agent.label}</p>
                        <p className="text-xs text-gray-600 truncate">{agent.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4">
              <div className="bg-gradient-to-br from-black to-gray-800 text-white p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Sistema Multi-Agente</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Cada consulta es procesada por el agente especializado más adecuado para darte respuestas precisas y accionables.
                </p>
              </div>
            </div>

            <div className="px-4 pb-4">
              <ChatMetrics storeId={selectedStore.id} />
            </div>
          </div>
        </div>
      )}

      <div className="technical-namespace" style={{ display: 'none' }}>
        <span>Namespace: store-{selectedStore?.id}</span>
      </div>
    </div>
  );
}
