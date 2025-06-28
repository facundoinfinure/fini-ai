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
  DollarSign
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  domain?: string;
  whatsapp_number?: string;
  whatsapp_display_name?: string;
  whatsapp_verified?: boolean;
  status: 'connected' | 'disconnected' | 'pending';
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

      if (data.success && Array.isArray(data.data)) {
        const storesArray = data.data.map((store: any) => ({
          id: store.id,
          name: store.name || store.domain || 'Sin nombre',
          domain: store.domain,
          whatsapp_number: store.whatsapp_number,
          whatsapp_display_name: store.whatsapp_display_name,
          whatsapp_verified: store.whatsapp_verified,
          status: store.status || 'disconnected'
        }));

        setStores(storesArray);
        
        console.log('[CHAT-WRAPPER] Stores loaded with WhatsApp info:', storesArray.map(s => ({
          id: s.id,
          name: s.name,
          whatsapp_number: s.whatsapp_number,
          whatsapp_verified: s.whatsapp_verified,
          status: s.status
        })));
        
        // Update selected store if it exists in new data
        if (selectedStore) {
          const updatedSelectedStore = storesArray.find(s => s.id === selectedStore.id);
          if (updatedSelectedStore) {
            setSelectedStore(updatedSelectedStore);
            setWhatsappStatus({
              connected: !!updatedSelectedStore.whatsapp_number,
              number: updatedSelectedStore.whatsapp_number || '',
              verified: updatedSelectedStore.whatsapp_verified || false
            });
          }
        } else {
          // Auto-select first connected store
          const firstConnected = storesArray.find(s => s.status === 'connected');
          if (firstConnected) {
            setSelectedStore(firstConnected);
            setWhatsappStatus({
              connected: !!firstConnected.whatsapp_number,
              number: firstConnected.whatsapp_number || '',
              verified: firstConnected.whatsapp_verified || false
            });
          } else if (storesArray.length > 0) {
            setSelectedStore(storesArray[0]);
            setWhatsappStatus({
              connected: !!storesArray[0].whatsapp_number,
              number: storesArray[0].whatsapp_number || '',
              verified: storesArray[0].whatsapp_verified || false
            });
          }
        }
      } else {
        setError('Error cargando tiendas: ' + (data.error || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error loading stores:', err);
      setError('Error conectando con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    setWhatsappStatus({
      connected: !!store.whatsapp_number,
      number: store.whatsapp_number || '',
      verified: store.whatsapp_verified || false
    });
  };

  if (isLoading) {
    return (
      <div className="modern-chat-container">
        <div className="modern-chat-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Chat con Fini AI</span>
            </div>
          </div>
        </div>
        <div className="modern-chat-empty">
          <Bot className="modern-chat-empty-icon animate-pulse" />
          <h3 className="modern-chat-empty-title">Inicializando chat...</h3>
          <p className="modern-chat-empty-description">
            Cargando tu sistema de chat inteligente
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-chat-container">
        <div className="modern-chat-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Chat con Fini AI</span>
            </div>
          </div>
        </div>
        <div className="modern-chat-empty">
          <AlertCircle className="modern-chat-empty-icon text-red-500" />
          <h3 className="modern-chat-empty-title">Error de conexión</h3>
          <p className="modern-chat-empty-description">
            {error}
          </p>
          <Button onClick={loadStores} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="modern-chat-container">
        <div className="modern-chat-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Chat con Fini AI</span>
            </div>
          </div>
        </div>
        <div className="modern-chat-empty">
          <Bot className="modern-chat-empty-icon" />
          <h3 className="modern-chat-empty-title">¡Conecta tu primera tienda!</h3>
          <p className="modern-chat-empty-description">
            Para usar el chat con IA necesitas conectar una tienda de Tienda Nube
          </p>
          <Button onClick={() => window.location.href = '/dashboard?tab=configuracion'}>
            <Settings className="mr-2 h-4 w-4" />
            Conectar Tienda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Modern OpenAI-style Chat Interface */}
      {selectedStore && (
        <div className="h-[700px] bg-white rounded-xl border border-gray-200 shadow-sm flex">
          {/* Main Chat Area - Full Width */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
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

            {/* WhatsApp Alert */}
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

                         {/* Enhanced Chat Preview with Modern UI */}
             <div className="flex-1 flex flex-col">
               <ChatPreview 
                 selectedStore={selectedStore}
               />
             </div>
          </div>

          {/* Agent Panel - Right Sidebar */}
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

      {/* Hidden technical elements for maintaining functionality */}
      <div className="technical-namespace" style={{ display: 'none' }}>
        <span>Namespace: store-{selectedStore?.id}</span>
      </div>
    </div>
  );
}
