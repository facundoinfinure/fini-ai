"use client";

import { useAuth } from "@/hooks/useAuth";
import { Bot, LogOut, User, Settings, BarChart3, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StoreStatusCard } from "@/components/dashboard/store-status-card";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

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
    <div className="min-h-screen bg-gray-50">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
        </div>
      </main>
    </div>
  );
} 