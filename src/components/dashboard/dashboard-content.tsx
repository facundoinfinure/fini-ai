"use client";

import { useAuth } from "@/hooks/useAuth";
import { useOperations } from "@/hooks/useOperations";
import { Bot, LogOut, User, BarChart3, MessageSquare, CheckCircle, AlertCircle, X, RefreshCw, Store as StoreIcon, Phone, CreditCard, BarChart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardSkeleton, AnalyticsSkeleton, StoreManagementSkeleton, WhatsAppConfigSkeleton, ChatSkeleton } from '@/components/ui/skeleton';
import { createLogger, PerformanceTimer } from '@/lib/logger';
import { 
  AnalyticsOverview,
  SubscriptionManagement
} from '@/lib/lazy-imports';
import { ConfigurationManagement } from '@/components/dashboard/configuration-management';
import { PremiumChatInterface } from '@/components/chat/premium-chat-interface';
import { DashboardSummary } from '@/components/dashboard/dashboard-summary';
import { ProfileManagement } from '@/components/dashboard/profile-management';
import { OperationNotifications } from '@/components/dashboard/operation-notifications';
import { Store as StoreType } from "@/types/db";
import { SidebarLayout } from '@/components/ui/sidebar-layout';
import { StoreConnectionHandler } from '@/components/dashboard/store-connection-handler';

const logger = createLogger('Dashboard');

// Error message mappings for better UX
const ERROR_MESSAGES = {
  oauth_failed: 'Error en la autenticación OAuth',
  token_exchange_failed: 'Error al intercambiar el código de autorización',
  missing_parameters: 'Faltan parámetros requeridos',
  invalid_state: 'Estado de seguridad inválido',
  session_mismatch: 'La sesión no coincide',
  internal_error: 'Error interno del servidor'
};

const ERROR_SOLUTIONS = {
  oauth_failed: 'Intenta conectar tu tienda nuevamente desde la pestaña "Gestión de Tiendas"',
  token_exchange_failed: 'Verifica que hayas autorizado correctamente el acceso a tu tienda',
  missing_parameters: 'Asegúrate de completar todos los campos requeridos',
  invalid_state: 'Por seguridad, intenta el proceso de conexión nuevamente',
  session_mismatch: 'Inicia sesión nuevamente y reintenta la conexión',
  internal_error: 'Por favor contacta soporte técnico si el error persiste'
};

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  type: NotificationType;
  message: string;
  solution?: string;
}

export function DashboardContent() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Operations and notifications management
  const {
    operations,
    notifications,
    systemStatus,
    canAccessChat,
    chatBlockReason,
    dismissNotification: dismissOperationNotification,
    cancelOperation,
    retryOperation,
    pauseOperation,
    resumeOperation,
    createStoreConnection,
    createDataUpdate,
    createRAGSync,
    hasActiveOperations,
    estimatedWaitTime
  } = useOperations();
  
  // State management
  const [stores, setStores] = useState<StoreType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  
  // Conversations state for coordinating between sidebar and chat
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Handle OAuth callback results and Stripe checkout success
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const success = searchParams.get('success');
    const storeName = searchParams.get('store_name');
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('canceled');
    const tab = searchParams.get('tab'); // Detectar parámetro tab

    // Activar pestaña específica si se especifica en URL
    if (tab) {
      if (tab === 'configuration') {
        setActiveTab('configuracion');
      } else if (['chat', 'analytics', 'suscripcion', 'perfil'].includes(tab)) {
        setActiveTab(tab);
      }
    }

    if (error) {
      const errorType = message || error;
      const errorMessage = ERROR_MESSAGES[errorType as keyof typeof ERROR_MESSAGES] || `Error: ${errorType}`;
      const solution = ERROR_SOLUTIONS[errorType as keyof typeof ERROR_SOLUTIONS];
      
      console.error('[DASHBOARD] Error received:', { error, message, errorType });
      
      setNotification({
        type: 'error',
        message: errorMessage,
        solution
      });
    } else if (success === 'store_connected' && storeName) {
      setNotification({
        type: 'success',
        message: `¡Tienda "${decodeURIComponent(storeName)}" conectada exitosamente!`
      });
      
      // 🎯 Create initial connection operation for the new store
      try {
        // Get the store ID from stores array after fetching
        setTimeout(async () => {
          await fetchDashboardData();
          // Find the newly connected store
          const newStore = stores.find(s => s.name === decodeURIComponent(storeName));
          if (newStore && user?.id) {
            createStoreConnection(newStore.id, newStore.name || 'Tienda');
          }
        }, 1000);
      } catch (error) {
        console.warn('[DASHBOARD] Could not create store connection operation:', error);
      }
    } else if (success === 'true' && sessionId) {
      // Handle successful Stripe checkout
      handleStripeCheckoutSuccess(sessionId);
    } else if (canceled === 'true') {
      setNotification({
        type: 'warning',
        message: 'Pago cancelado. Puedes intentar nuevamente cuando quieras.'
      });
    }
  }, [searchParams]);

  const fetchDashboardData = useCallback(async () => {
    const timer = new PerformanceTimer(logger, 'fetchDashboardData');
    setIsRefreshing(true);
    setError(null);
    
    try {
      logger.info('Fetching dashboard data', { userId: user?.id });
      
      // Fetch stores
      const storesResponse = await fetch('/api/stores');

      // Handle stores
      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        if (storesData.success) {
          const storesArray = Array.isArray(storesData.data) ? storesData.data : [];
          setStores(storesArray);
          logger.info('Stores loaded', { count: storesArray.length });
          
          // 🚀 SYNC INTELIGENTE: Sincronizar datos RAG automáticamente
          if (storesArray.length > 0) {
            syncStoreDataIntelligently(storesArray);
          }
        } else {
          logger.error('Failed to fetch stores', { error: storesData.error });
          setError(`Error al cargar las tiendas: ${  storesData.error}`);
        }
      } else {
        logger.error('Stores API call failed', { status: storesResponse.status });
        setError('Error al conectar con el servidor');
      }

    } catch (err) {
      logger.error('Failed to fetch dashboard data', { error: err instanceof Error ? err.message : err });
      setError('Error al cargar los datos del dashboard');
    } finally {
      const executionTime = timer.end();
      setIsRefreshing(false);
      logger.info('Dashboard data fetch completed', { executionTime });
    }
  }, []);

  // 🎯 SYNC INTELIGENTE: Solo sincroniza cuando es necesario
  const syncStoreDataIntelligently = async (storesList: StoreType[]) => {
    try {
      logger.info('Starting intelligent RAG sync', { storeCount: storesList.length });
      
      for (const store of storesList) {
        // Solo sincronizar si:
        // 1. La tienda está activa
        // 2. La tienda tiene access token (está conectada)
        // 3. No se ha sincronizado nunca O han pasado más de 6 horas
        if (!store.is_active) {
          logger.info('Skipping sync - store inactive', { storeId: store.id, storeName: store.name });
          continue;
        }
        
        if (!store.access_token) {
          logger.info('Skipping sync - no access token', { storeId: store.id, storeName: store.name });
          continue;
        }
        
        const now = new Date();
        const sixHoursAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000));
        const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
        
        const needsSync = !lastSync || lastSync < sixHoursAgo;
        
        if (needsSync) {
          logger.info('Triggering RAG sync for store', { 
            storeId: store.id, 
            storeName: store.name,
            lastSync: lastSync?.toISOString() || 'never'
          });
          
          // Trigger async sync (fire-and-forget)
          fetch(`/api/stores/${store.id}/sync-rag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(error => {
            logger.error('RAG sync request failed', { storeId: store.id, error });
          });
        } else {
          logger.info('Skipping sync - recently synced', { 
            storeId: store.id, 
            storeName: store.name,
            lastSync: lastSync.toISOString()
          });
        }
      }
    } catch (error) {
      logger.error('Intelligent sync failed', { error });
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, loading, router, fetchDashboardData]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const result = await signOut();
    if (result.success) {
      router.push("/auth/signin");
    } else {
      console.error("Error signing out:", result.error);
      setIsSigningOut(false);
    }
  };

  const dismissNotification = () => {
    setNotification(null);
    // Clear URL parameters
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('error');
    currentUrl.searchParams.delete('message');
    currentUrl.searchParams.delete('success');
    currentUrl.searchParams.delete('store_name');
    currentUrl.searchParams.delete('store_id');
    currentUrl.searchParams.delete('tab');
    currentUrl.searchParams.delete('debug');
    window.history.replaceState({}, '', currentUrl.toString());
  };

  const handleRefresh = () => {
    // 🎯 Create data update operations for active stores
    if (stores.length > 0 && user?.id) {
      stores.forEach(store => {
        if (store.access_token && store.is_active) {
          createDataUpdate(store.id, store.name || 'Tienda', 'manual_refresh');
        }
      });
    }
    
    fetchDashboardData();
  };

  // Handle successful Stripe checkout completion
  const handleStripeCheckoutSuccess = async (sessionId: string) => {
    try {
      logger.info('Processing Stripe checkout success', { sessionId });
      
      setNotification({
        type: 'success',
        message: '¡Suscripción activada exitosamente! 🎉 Configurando tu cuenta...'
      });

      // Wait a moment for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh dashboard data to get updated subscription status
      await fetchDashboardData();

      // Get user's WhatsApp number and first store for welcome message
      const storesResponse = await fetch('/api/stores');
      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        if (storesData.success && storesData.data.length > 0) {
          const firstStore = storesData.data[0];
          const whatsappNumbers = await fetch('/api/whatsapp/numbers');
          
          if (whatsappNumbers.ok) {
            const numbersData = await whatsappNumbers.json();
            if (numbersData.success && numbersData.data.length > 0) {
              const verifiedNumber = numbersData.data.find((num: any) => num.verified);
              
              if (verifiedNumber) {
                // Send welcome message
                const welcomeResponse = await fetch('/api/whatsapp/send-welcome', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: verifiedNumber.phone_number,
                    storeId: firstStore.id,
                    userId: user?.id
                  })
                });

                if (welcomeResponse.ok) {
                  logger.info('Welcome message sent successfully');
                  setNotification({
                    type: 'success',
                    message: '¡Bienvenido a Fini AI! 🚀 Te hemos enviado un mensaje de bienvenida por WhatsApp. Tu asistente IA está listo para ayudarte.'
                  });
                } else {
                  logger.warn('Failed to send welcome message, but subscription is active');
                }
              }
            }
          }
        }
      }

      // Mark onboarding as completed
      try {
        await fetch('/api/user/complete-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completedAt: new Date().toISOString(),
            source: 'stripe_checkout'
          })
        });
      } catch (error) {
        logger.warn('Failed to mark onboarding as completed', { error });
      }

      // Clean URL parameters
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('success');
      currentUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', currentUrl.toString());

    } catch (error) {
      logger.error('Error processing Stripe checkout success', { error });
      setNotification({
        type: 'error',
        message: 'Suscripción activada, pero hubo un problema configurando tu cuenta. Por favor contacta soporte.'
      });
    }
  };

  // Conversations management
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setConversations(data.data);
        
        // 🚫 REMOVIDO: Auto-selección automática de primera conversación
        // El chat debe empezar limpio, sin auto-seleccionar conversaciones
        // if (!selectedConversationId && data.data.length > 0) {
        //   setSelectedConversationId(data.data[0].id);
        // }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  };

  const handleNewConversation = async () => {
    try {
      logger.info('Creating new conversation');
      
      // 🚀 SYNC ANTES DE CONVERSACIÓN: Asegurar datos frescos antes de chat
      if (stores.length > 0) {
        logger.info('Pre-conversation sync check');
        await ensureFreshDataForConversation();
      }
      
      const response = await fetch('/api/conversations/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.conversation) {
          // Reload conversations to include the new one
          await loadConversations();
          // Select the new conversation
          setSelectedConversationId(data.conversation.id);
          logger.info('New conversation created and selected', { id: data.conversation.id });
        }
      } else {
        logger.error('Failed to create conversation', { status: response.status });
      }
    } catch (error) {
      logger.error('Error creating new conversation:', error);
    }
  };

  // 🎯 ENSURE FRESH DATA: Verificar y sincronizar si es necesario antes de conversar
  const ensureFreshDataForConversation = async () => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000)); // 1 hora
      
      for (const store of stores) {
        if (!store.access_token) continue;
        
        const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
        const needsSync = !lastSync || lastSync < oneHourAgo;
        
        if (needsSync) {
          logger.info('Pre-conversation sync needed', { 
            storeId: store.id, 
            storeName: store.name,
            lastSync: lastSync?.toISOString() || 'never'
          });
          
          // Quick sync (don't wait for response)
          fetch(`/api/stores/${store.id}/sync-rag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(error => {
            logger.error('Pre-conversation sync failed', { storeId: store.id, error });
          });
        }
      }
    } catch (error) {
      logger.error('Pre-conversation data check failed', { error });
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleConversationUpdate = () => {
    loadConversations();
  };

  const handleConversationDelete = async (conversationId: string) => {
    // 💾 BACKUP: Guardar estado original para rollback
    const originalConversations = [...conversations];
    
    try {
      console.log('[INFO] Eliminando conversación:', conversationId);
      
      // 🔥 OPTIMISTIC UPDATE: Remover inmediatamente de la UI
      const filteredConversations = conversations.filter(conv => conv.id !== conversationId);
      setConversations(filteredConversations);
      
      // Limpiar selección si era la conversación seleccionada
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('[INFO] ✅ Conversación eliminada exitosamente del backend:', conversationId);
        
        // 🔄 FORCE REFRESH: Asegurar que los datos estén sincronizados
        setTimeout(async () => {
          try {
            console.log('[INFO] Verificando eliminación con recarga forzada');
            
            // Recarga forzada sin cache
            const verifyResponse = await fetch('/api/conversations', {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              if (verifyData.success) {
                setConversations(verifyData.data || []);
                console.log('[INFO] ✅ Lista de conversaciones actualizada desde servidor');
              }
            }
          } catch (error) {
            console.error('[ERROR] Error verificando eliminación:', error);
            // Mantener optimistic update en caso de error de red
          }
        }, 1000); // Mayor delay para asegurar propagación
        
      } else {
        console.error('[ERROR] Backend failed to delete conversation:', data.error);
        
        // 🔄 ROLLBACK: Restaurar estado original si falla el backend
        setConversations(originalConversations);
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(conversationId);
        }
        
        setNotification({
          type: 'error',
          message: `Error eliminando conversación: ${data.error}`
        });
      }
    } catch (error) {
      console.error('[ERROR] Network error deleting conversation:', error);
      
      // 🔄 ROLLBACK: Restaurar estado original en caso de error de red
      setConversations(originalConversations);
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(conversationId);
      }
      
      setNotification({
        type: 'error',
        message: 'Error de conexión eliminando conversación'
      });
    }
  };

  // 🔄 LOAD CONVERSATIONS: Solo cargar una vez al inicio, no en cada navegación al chat
  useEffect(() => {
    if (activeTab === 'chat' && user && conversations.length === 0) {
      // Solo cargar si no hay conversaciones cargadas aún
      loadConversations();
    }
  }, [activeTab, user]);

  // Show loading while checking auth
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Show loading if not authenticated
  if (!user) {
    return null;
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info': return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <StoreConnectionHandler onStoreConnected={(storeId, storeName) => {
      console.log(`[DASHBOARD] Store connected via new system: ${storeName} (${storeId})`);
      // Refresh data after successful connection
      window.location.reload();
    }}>
      <SidebarLayout
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
        onRefresh={handleRefresh}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
        onConversationUpdate={handleConversationUpdate}
        onConversationDelete={handleConversationDelete}
      >
        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Notification */}
        {notification && (
          <div className="mb-6">
            <Alert className={`${getNotificationStyle(notification.type)} relative`}>
              <div className="flex items-start">
                {getNotificationIcon(notification.type)}
                <div className="ml-3 flex-1">
                  <AlertDescription className="text-sm">
                    <strong>{notification.message}</strong>
                    {notification.solution && (
                      <div className="mt-1 text-xs opacity-90">
                        {notification.solution}
                      </div>
                    )}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissNotification}
                  className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-transparent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {/* This state was removed, so this block will not render */}
        {/* {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )} */}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "chat" && (
            <DashboardErrorBoundary>
              <Suspense fallback={<ChatSkeleton />}>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
                      🚀 Chat Premium con RAG Avanzado
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Sistema de conversación de última generación con memoria contextual y análisis específico de tu tienda.
                    </p>
                  </div>
                  
                  {/* Chat Access Control */}
                  {!canAccessChat && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-orange-800">
                        <div className="font-semibold mb-1">Chat temporalmente no disponible</div>
                        <div className="text-sm">{chatBlockReason}</div>
                        {estimatedWaitTime > 0 && (
                          <div className="text-xs mt-1">
                            Tiempo estimado de espera: {Math.ceil(estimatedWaitTime / 60)} minutos
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* System Status Warning */}
                  {hasActiveOperations && canAccessChat && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-yellow-800">
                        <div className="font-semibold mb-1">Operaciones en curso</div>
                        <div className="text-sm">
                          El chat está disponible, pero puede mostrar información no actualizada mientras se completan las operaciones en curso.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <PremiumChatInterface 
                    selectedStore={stores.length > 0 ? {
                      id: stores[0].id,
                      name: stores[0].name || 'Mi Tienda',
                      status: stores[0].access_token ? 'connected' : 'disconnected'
                    } : undefined}
                    className="shadow-xl"
                  />
                </div>
              </Suspense>
            </DashboardErrorBoundary>
          )}

          {activeTab === "analytics" && (
            <DashboardErrorBoundary>
              <Suspense fallback={<AnalyticsSkeleton />}>
                <AnalyticsOverview />
              </Suspense>
            </DashboardErrorBoundary>
          )}

          {activeTab === "suscripcion" && (
            <DashboardErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <SubscriptionManagement />
              </Suspense>
            </DashboardErrorBoundary>
          )}

          {activeTab === "configuracion" && (
            <DashboardErrorBoundary>
              {(() => {
                console.log('[DEBUG] Rendering ConfigurationManagement with stores:', { 
                  activeTab,
                  storesCount: stores?.length || 0, 
                  stores,
                  timestamp: new Date().toISOString()
                });
                return (
                  <ConfigurationManagement 
                    stores={stores} 
                    onStoreUpdate={fetchDashboardData}
                  />
                );
              })()}
            </DashboardErrorBoundary>
          )}

          {activeTab === "perfil" && (
            <DashboardErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">👤 Editar Perfil</h3>
                    <p className="text-blue-700 text-sm">
                      Actualiza tu información personal y de negocio desde aquí.
                    </p>
                  </div>
                  <ProfileManagement />
                </div>
              </Suspense>
            </DashboardErrorBoundary>
          )}
        </div>
        
        {/* Operation Notifications - Global overlay */}
        <OperationNotifications
          operations={operations}
          notifications={notifications}
          systemStatus={systemStatus}
          onDismissNotification={dismissOperationNotification}
          onCancelOperation={cancelOperation}
          onRetryOperation={retryOperation}
          onPauseOperation={pauseOperation}
          onResumeOperation={resumeOperation}
        />
      </SidebarLayout>
    </StoreConnectionHandler>
  );
} 