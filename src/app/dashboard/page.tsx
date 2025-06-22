"use client";

import { useAuth } from "@/hooks/useAuth";
import { Bot, LogOut, User, Settings, BarChart3, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StoreStatusCard } from "@/components/dashboard/store-status-card";
import { StoreManagement } from '@/components/dashboard/store-management';
import { WhatsAppManagement } from '@/components/dashboard/whatsapp-management';
import { SubscriptionManagement } from '@/components/dashboard/subscription-management';
import { AnalyticsOverview } from '@/components/dashboard/analytics-overview';
import { Store } from "@/types/db";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'analytics' | 'subscription'>('overview');
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    } else if (user) {
      fetchStores();
    }
  }, [user, loading, router]);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const data = await response.json();
      if (data.success) {
        setStores(data.stores || []);
      } else {
        setError(data.error || 'Failed to fetch stores');
      }
    } catch (err) {
      setError('An error occurred while fetching stores.');
    }
  };

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

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveSection('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveSection('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveSection('subscription')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'subscription'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Suscripción
            </button>
          </nav>
        </div>
      </div>

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

          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columna principal */}
              <div className="lg:col-span-2">
                <div className="space-y-8">
                  {/* Welcome Section */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      ¡Bienvenido a Fini AI!
                    </h2>
                    <p className="text-gray-600">
                      Tu dashboard de analytics inteligente para Tienda Nube
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setActiveSection('analytics')}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                          Analytics
                        </CardTitle>
                        <CardDescription>
                          Ver métricas y reportes de tu tienda
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                          Chat con IA
                        </CardTitle>
                        <CardDescription>
                          Pregunta sobre tu negocio por WhatsApp
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Store Management Section */}
                  <StoreManagement />
                  {/* WhatsApp Management Section */}
                  <WhatsAppManagement stores={stores} />
                </div>
              </div>

              {/* Columna lateral */}
              <div className="lg:col-span-1">
                <div className="space-y-8">
                  <StoreStatusCard />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-purple-600" />
                        Configuración
                      </CardTitle>
                      <CardDescription>
                        Gestiona tu cuenta y preferencias
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Analytics
                </h2>
                <p className="text-gray-600">
                  Métricas detalladas y reportes de tu tienda
                </p>
              </div>
              <AnalyticsOverview />
            </div>
          )}

          {activeSection === 'subscription' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Suscripción
                </h2>
                <p className="text-gray-600">
                  Gestiona tu plan y facturación
                </p>
              </div>
              <div className="max-w-2xl">
                <SubscriptionManagement />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 