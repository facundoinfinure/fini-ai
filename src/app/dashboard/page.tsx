"use client";

import { useAuth } from "@/hooks/useAuth";
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
  ConfigurationManagement,
  SubscriptionManagement
} from '@/lib/lazy-imports';
import { ChatPreview } from '@/components/dashboard/chat-preview';
import { DashboardSummary } from '@/components/dashboard/dashboard-summary';
import { Store as StoreType } from "@/types/db";
import { SidebarLayout } from '@/components/ui/sidebar-layout';

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

interface DashboardStats {
  totalStores: number;
  activeStores: number;
  connectedStores: number;
  totalRevenue: number;
  totalOrders: number;
}

function DashboardContent() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [stores, setStores] = useState<StoreType[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
      // Auto refresh data after successful connection
      setTimeout(() => {
        fetchDashboardData();
      }, 1000);
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
      
      // Fetch stores and stats in parallel
      const [storesResponse, statsResponse] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/dashboard/stats')
      ]);

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
          setError('Error al cargar las tiendas: ' + storesData.error);
        }
      } else {
        logger.error('Stores API call failed', { status: storesResponse.status });
        setError('Error al conectar con el servidor');
      }

      // Handle stats
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats({
            totalStores: statsData.data.totalStores || 0,
            activeStores: statsData.data.activeStores || 0,
            connectedStores: statsData.data.activeStores || 0,
            totalRevenue: statsData.data.totalRevenue || 0,
            totalOrders: statsData.data.totalOrders || 0,
          });
        }
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
        // 1. La tienda tiene access token (está conectada)
        // 2. No se ha sincronizado nunca O han pasado más de 6 horas
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
    window.history.replaceState({}, '', '/dashboard');
  };

  const handleRefresh = () => {
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
      const response = await fetch('/api/conversations');
      const data = await response.json();
      
      if (data.success && data.data) {
        setConversations(data.data);
        
        // Auto-seleccionar primera conversación si no hay una seleccionada
        if (!selectedConversationId && data.data.length > 0) {
          setSelectedConversationId(data.data[0].id);
        }
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
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        // Remover de la lista local
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // Si era la conversación seleccionada, limpiar selección
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null);
        }
        
        console.log('Conversación eliminada:', conversationId);
      } else {
        console.error('Error eliminando conversación:', data.error);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Load conversations when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat' && user) {
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
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "chat" && (
          <DashboardErrorBoundary>
            <Suspense fallback={<ChatSkeleton />}>
              <ChatPreview 
                selectedStore={stores.length > 0 ? stores[0] : undefined}
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onConversationUpdate={handleConversationUpdate}
              />
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
            <Suspense fallback={<StoreManagementSkeleton />}>
              <ConfigurationManagement 
                stores={stores} 
                onStoreUpdate={fetchDashboardData}
              />
            </Suspense>
          </DashboardErrorBoundary>
        )}
      </div>
    </SidebarLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
} 