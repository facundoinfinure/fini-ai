"use client";

import { useAuth } from "@/hooks/useAuth";
import { Bot, LogOut, User, Settings, BarChart3, MessageSquare, CheckCircle, AlertCircle, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreStatusCard } from "@/components/dashboard/store-status-card";
import { StoreManagement } from '@/components/dashboard/store-management';
import { WhatsAppManagement } from '@/components/dashboard/whatsapp-management';
import { SubscriptionManagement } from '@/components/dashboard/subscription-management';
import { AnalyticsOverview } from '@/components/dashboard/analytics-overview';
import { ChatPreview } from '@/components/dashboard/chat-preview';
import { Store } from "@/types/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  oauth_failed: 'Hubo un problema durante la autorización. Intenta conectar la tienda nuevamente.',
  token_exchange_failed: 'No se pudo completar la conexión con Tienda Nube. Esto puede deberse a:\n• Credenciales de aplicación incorrectas\n• URL de redirección mal configurada\n• Problemas de red temporales',
  missing_parameters: 'Faltan parámetros necesarios en la respuesta de Tienda Nube. Intenta el proceso nuevamente.',
  invalid_state: 'El estado de seguridad no es válido. Por favor, intenta conectar la tienda nuevamente.',
  session_mismatch: 'Tu sesión no coincide con la solicitud. Cierra sesión y vuelve a intentar.',
  internal_error: 'Error interno. Si el problema persiste, contacta soporte.'
};

// Componente separado para manejar los parámetros de búsqueda
function DashboardContent() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'analytics' | 'subscription'>('overview');
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showIncompleteSetupBanner, setShowIncompleteSetupBanner] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    solution?: string;
  } | null>(null);

  // Handle OAuth callback results
  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    const storeNameParam = searchParams.get('store_name');

    if (successParam === 'store_connected' && storeNameParam) {
      setSuccess(`¡Tienda "${decodeURIComponent(storeNameParam)}" conectada exitosamente!`);
      // Clear URL parameters
      router.replace('/dashboard');
    } else if (errorParam === 'oauth_failed') {
      setError(`Error al conectar la tienda: ${messageParam ? decodeURIComponent(messageParam) : 'Error desconocido'}`);
      // Clear URL parameters
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  const checkIncompleteSetup = useCallback(() => {
    // Show banner if user has no stores connected
    if (stores.length === 0) {
      setShowIncompleteSetupBanner(true);
    } else {
      setShowIncompleteSetupBanner(false);
    }
  }, [stores]);

  const fetchUserData = useCallback(async () => {
    try {
      // Fetch user profile and stores in parallel
      const [, storesResponse] = await Promise.all([
        fetch('/api/user/complete-onboarding', { method: 'GET' }),
        fetch('/api/stores')
      ]);

      // Handle stores
      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        if (storesData.success) {
          setStores(storesData.stores || []);
        } else {
          setError(storesData.error || 'Failed to fetch stores');
        }
      }

      // Check if setup is incomplete
      checkIncompleteSetup();
    } catch (err) {
      setError('An error occurred while fetching user data.');
    }
  }, [checkIncompleteSetup]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    } else if (user) {
      fetchUserData();
    }
  }, [user, loading, router, fetchUserData]);

  // Re-check incomplete setup when stores change
  useEffect(() => {
    checkIncompleteSetup();
  }, [checkIncompleteSetup]);

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
    }
  }, [searchParams]);

  const dismissNotification = () => {
    setNotification(null);
    // Clear URL parameters
    window.history.replaceState({}, '', '/dashboard');
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h1 className="ml-3 text-xl font-bold text-gray-900">Fini AI</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Bot className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <Alert className={`${notification.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
          <div className="flex items-start gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {notification.type === 'error' ? 'Error al conectar la tienda' : 'Conexión exitosa'}
              </div>
              <AlertDescription className="mt-1">
                {notification.message}
                {notification.solution && (
                  <div className="mt-2 text-sm bg-muted p-3 rounded whitespace-pre-line">
                    <strong>Solución:</strong> {notification.solution}
                  </div>
                )}
              </AlertDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={dismissNotification}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Configuration reminder */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5 text-blue-600" />
            ¡Completa tu configuración!
          </CardTitle>
          <CardDescription>
            Para aprovechar al máximo Fini AI, conecta tu tienda y configura WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button>Completar configuración</Button>
          <Button variant="outline">Recordar más tarde</Button>
        </CardContent>
      </Card>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <span className="text-green-800">{success}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                ×
              </Button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <span className="text-red-800">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          )}

          {/* Incomplete Setup Banner */}
          {showIncompleteSetupBanner && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    ¡Completa tu configuración!
                  </h3>
                  <p className="text-blue-800 mb-4">
                    Para aprovechar al máximo Fini AI, conecta tu tienda y configura WhatsApp.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => router.push('/onboarding')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Completar configuración
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowIncompleteSetupBanner(false)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      Recordar más tarde
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="resumen" className="space-y-4">
            <TabsList>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="suscripcion">Suscripción</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="space-y-6">
              {/* Store Management */}
              <StoreManagement stores={stores} onStoreUpdate={fetchUserData} />

              {/* WhatsApp Management */}
              <WhatsAppManagement stores={stores} />
            </TabsContent>

            <TabsContent value="chat" className="space-y-6">
              {/* Chat Preview and Management */}
              <ChatPreview />
              
              {/* Additional chat components can go here */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversaciones Recientes</CardTitle>
                  <CardDescription>
                    Aquí aparecerán las conversaciones de WhatsApp más recientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">No hay conversaciones recientes</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Store Status Overview */}
              <StoreStatusCard />
              
              {/* Full Analytics Overview */}
              <AnalyticsOverview />
            </TabsContent>

            <TabsContent value="suscripcion">
              <SubscriptionManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
} 