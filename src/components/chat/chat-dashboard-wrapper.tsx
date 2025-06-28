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
  Database,
  Sparkles,
  User,
  Bot,
  Settings,
  RefreshCw
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Chat con Fini AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bot className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Cargando sistema de chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Chat con Fini AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={loadStores} className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Chat con Fini AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">¡Conecta tu primera tienda!</p>
            <p className="text-gray-600 mb-4">
              Para usar el chat con IA necesitas conectar una tienda de Tienda Nube
            </p>
            <Button onClick={() => window.location.href = '/dashboard?tab=configuracion'}>
              <Settings className="mr-2 h-4 w-4" />
              Conectar Tienda
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Selection & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Chat Inteligente - Fini AI
              <Badge variant="default" className="ml-2">
                🚀 Agentes Multi-AI
              </Badge>
            </div>
            
            {/* Store Selector & Refresh */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Tienda:</span>
              <select
                value={selectedStore?.id || ''}
                onChange={(e) => {
                  const store = stores.find(s => s.id === e.target.value);
                  if (store) handleStoreSelect(store);
                }}
                className="text-sm border rounded px-2 py-1"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.status === 'connected' ? '✅' : '⚠️'}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={loadStores}
                disabled={isLoading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-xs">Actualizar</span>
              </Button>
            </div>
          </CardTitle>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <Monitor className="h-4 w-4" />
              <span>Dashboard</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4" />
              <span>WhatsApp</span>
              {whatsappStatus.connected ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
              {whatsappStatus.number && (
                <Badge variant="outline" className="text-xs">
                  {whatsappStatus.number}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Namespace: store-{selectedStore?.id}</span>
              <Badge variant="secondary" className="text-xs">
                Datos específicos
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {!whatsappStatus.verified && (
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-orange-800">
                <strong>WhatsApp no configurado</strong> - Solo funciona en dashboard. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-orange-800 underline"
                  onClick={() => window.location.href = '/dashboard?tab=configuracion'}
                >
                  Configurar WhatsApp
                </Button>
                {whatsappStatus.connected && !whatsappStatus.verified && (
                  <span className="block mt-1 text-sm">
                    ⏳ WhatsApp conectado pero pendiente de verificación
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-sm text-gray-600 mb-4">
            💡 <strong>Chat Unificado:</strong> Habla con tus agentes de IA especializados:
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <BarChart3 className="h-3 w-3" />
                <span>Analytics AI</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>Marketing AI</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>Support AI</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface with Full Conversation Management */}
      {selectedStore && (
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat + Conversaciones</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                ✨ GPT Style
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Métricas</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-6">
            <ChatPreview />
          </TabsContent>
          
          <TabsContent value="metrics" className="mt-6">
            <ChatMetrics storeId={selectedStore.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
