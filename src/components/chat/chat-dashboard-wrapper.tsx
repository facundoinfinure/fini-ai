"use client";

import { useEffect, useState } from 'react';
import { UnifiedChat } from './unified-chat';
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
  Settings
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  domain?: string;
  whatsapp_number?: string;
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
        
        // Auto-select first connected store
        const firstConnected = storesArray.find(s => s.status === 'connected');
        if (firstConnected) {
          setSelectedStore(firstConnected);
          setWhatsappStatus({
            connected: !!firstConnected.whatsapp_number,
            number: firstConnected.whatsapp_number || '',
            verified: true
          });
        } else if (storesArray.length > 0) {
          setSelectedStore(storesArray[0]);
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
      verified: store.status === 'connected'
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
            
            {/* Store Selector */}
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
          {!whatsappStatus.connected && (
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

      {/* Chat Interface */}
      {selectedStore && (
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat Unificado</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Métricas</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-6">
            <UnifiedChat
              storeId={selectedStore.id}
              whatsappNumber={whatsappStatus.number}
              onMessageSent={(message) => {
                console.log('[CHAT-WRAPPER] Message sent:', message);
              }}
              onResponseReceived={(response) => {
                console.log('[CHAT-WRAPPER] Response received:', response);
              }}
              onSyncStatusChange={(status) => {
                console.log('[CHAT-WRAPPER] Sync status changed:', status);
              }}
            />
          </TabsContent>
          
          <TabsContent value="metrics" className="mt-6">
            <ChatMetrics storeId={selectedStore.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
