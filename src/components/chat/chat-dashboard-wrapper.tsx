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
  User
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
    <div className="space-y-4">
      {/* Simplified Status Header */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#1a1a1a]" />
              <span className="font-medium text-[#1a1a1a]">Chat Inteligente</span>
              <Badge variant="default" className="bg-[#1a1a1a] text-white">
                🚀 Multi-AI
              </Badge>
            </div>
            
            {/* Store Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6b7280]">Tienda:</span>
              <select
                value={selectedStore?.id || ''}
                onChange={(e) => {
                  const store = stores.find(s => s.id === e.target.value);
                  if (store) handleStoreSelect(store);
                }}
                className="text-sm border border-[#e5e7eb] rounded px-2 py-1 bg-white"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.status === 'connected' ? '✅' : '⚠️'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Simplified Status Indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-[#6b7280]" />
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-[#6b7280]">Sistema activo</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#6b7280]" />
              {whatsappStatus.verified ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-[#6b7280]">WhatsApp verificado</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-[#6b7280]">WhatsApp pendiente</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp Configuration Alert */}
        {!whatsappStatus.verified && (
          <Alert className="mt-4 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-orange-800">
              <strong>WhatsApp no configurado</strong> - El chat funciona solo en dashboard. 
              <Button 
                variant="link" 
                className="p-0 h-auto text-orange-800 underline ml-1"
                onClick={() => window.location.href = '/dashboard?tab=configuracion'}
              >
                Configurar WhatsApp
              </Button>
              {whatsappStatus.connected && !whatsappStatus.verified && (
                <span className="block mt-1 text-sm">
                  ⏳ WhatsApp conectado, pendiente de verificación
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Agent Overview */}
        <div className="mt-4 p-3 bg-[#f8f9fa] rounded-lg">
          <div className="text-sm text-[#6b7280] mb-2">
            <strong>🎯 Sistema Multi-Agente Disponible:</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>Analytics AI</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Marketing AI</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>Support AI</span>
            </Badge>
            <Badge variant="outline" className="text-xs text-[#6b7280]">
              +7 agentes más
            </Badge>
          </div>
        </div>
      </div>

      {/* Modern Chat Interface */}
      {selectedStore && (
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat Inteligente</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                ✨ Estilo ChatGPT
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Métricas</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-4">
            <ChatPreview selectedStore={selectedStore} />
          </TabsContent>
          
          <TabsContent value="metrics" className="mt-4">
            <ChatMetrics storeId={selectedStore.id} />
          </TabsContent>
        </Tabs>
      )}

      {/* Hidden technical elements for maintaining functionality */}
      <div className="technical-namespace" style={{ display: 'none' }}>
        <span>Namespace: store-{selectedStore?.id}</span>
      </div>
      <div className="technical-database-info" style={{ display: 'none' }}>
        <span>Database info preserved for backend</span>
      </div>
    </div>
  );
}
