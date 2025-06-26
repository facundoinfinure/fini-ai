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
  SubscriptionManagement,
  ChatPreview 
} from '@/lib/lazy-imports';
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
  const [activeTab, setActiveTab] = useState("resumen");

  // Handle OAuth callback results
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const success = searchParams.get('success');
    const storeName = searchParams.get('store_name');

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
        {activeTab === "resumen" && (
          <DashboardErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <DashboardSummary stores={stores} />
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

        {activeTab === "chat" && (
          <DashboardErrorBoundary>
            <Suspense fallback={<ChatSkeleton />}>
              <ChatPreview />
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