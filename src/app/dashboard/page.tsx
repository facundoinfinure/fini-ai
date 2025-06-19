"use client";

import { 
  MessageCircle, 
  CheckCircle, 
  AlertCircle, 
  Copy,
  BarChart3,
  Users,
  TrendingUp,
  Store,
  LogOut,
  User,
  QrCode,
  Smartphone,
  ArrowRight,
  Bot,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import React, { useState, useEffect } from 'react';

import { ChatPreview } from '@/components/dashboard/chat-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface WhatsAppConfig {
  phoneNumbers: string[];
  webhookUrl: string;
  active: boolean;
  configured: boolean;
  qrCode?: string;
  whatsappUrl?: string;
}

interface DashboardStats {
  totalMessages: number;
  activeUsers: number;
  storeConnected: boolean;
  storeName?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const _router = useRouter();
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      _router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      _loadDashboardData();
    }
  }, [status, _router]);

  const _loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load WhatsApp configuration
      const _whatsappResponse = await fetch('/api/whatsapp/configure');
      if (_whatsappResponse.ok) {
        const _whatsappData = await _whatsappResponse.json();
        setWhatsappConfig(_whatsappData.data);
      }

      // Load dashboard stats
      const _statsResponse = await fetch('/api/dashboard/stats');
      if (_statsResponse.ok) {
        const _statsData = await _statsResponse.json();
        setDashboardStats(_statsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const _copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const _openWhatsAppChat = () => {
    if (whatsappConfig?.whatsappUrl) {
      window.open(whatsappConfig.whatsappUrl, '_blank');
    } else {
      // Fallback to generic WhatsApp
      window.open('https://wa.me/', '_blank');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fini AI Dashboard</h1>
                <p className="text-gray-600">Gestiona tu asistente de IA por WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{session.user.email}</span>
              </div>
              <Button onClick={() => signOut()} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* WhatsApp Chat CTA - PROMINENTE */}
        {whatsappConfig?.configured && (
          <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <MessageCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      ¡Chatea con tu tienda por WhatsApp!
                    </h3>
                    <p className="text-gray-600">
                      Pregunta sobre ventas, productos, clientes y obtén insights en tiempo real
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button 
                    onClick={() => setShowQR(!showQR)} 
                    variant="outline" 
                    size="lg"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    Ver QR
                  </Button>
                  <Button 
                    onClick={_openWhatsAppChat} 
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    Abrir Chat
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              
              {/* QR Code Section */}
              {showQR && (
                <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
                  <div className="text-center">
                    <h4 className="font-medium text-gray-900 mb-3">Escanea el QR para chatear</h4>
                    <div className="bg-white p-4 rounded-lg inline-block border-2 border-gray-300">
                      {whatsappConfig.qrCode ? (
                        <img 
                          src={whatsappConfig.qrCode} 
                          alt="WhatsApp QR Code" 
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                          <QrCode className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Abre WhatsApp y escanea este código para iniciar la conversación
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Store className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tienda</p>
                  <div className="flex items-center mt-1">
                    {dashboardStats?.storeConnected ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">Conectada</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-600">Desconectada</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">WhatsApp</p>
                  <div className="flex items-center mt-1">
                    {whatsappConfig?.configured ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">Activo</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-600">Pendiente</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats?.activeUsers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mensajes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats?.totalMessages || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="setup">Configuración</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Estado del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tienda Nube:</span>
                      <Badge variant={dashboardStats?.storeConnected ? "default" : "secondary"}>
                        {dashboardStats?.storeConnected ? "Conectada" : "Desconectada"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">WhatsApp:</span>
                      <Badge variant={whatsappConfig?.configured ? "default" : "secondary"}>
                        {whatsappConfig?.configured ? "Configurado" : "Pendiente"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mensajes totales:</span>
                      <span className="font-bold">{dashboardStats?.totalMessages || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Usuarios activos:</span>
                      <span className="font-bold">{dashboardStats?.activeUsers || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-green-600" />
                    Acciones Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {!dashboardStats?.storeConnected && (
                      <Button onClick={() => _router.push('/onboarding')} className="w-full">
                        <Store className="w-4 h-4 mr-2" />
                        Conectar Tienda
                      </Button>
                    )}
                    {!whatsappConfig?.configured && (
                      <Button onClick={() => _router.push('/onboarding')} variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Configurar WhatsApp
                      </Button>
                    )}
                    {(dashboardStats?.storeConnected && whatsappConfig?.configured) && (
                      <div className="space-y-3">
                        <Button onClick={_openWhatsAppChat} className="w-full bg-green-600 hover:bg-green-700">
                          <Smartphone className="w-4 h-4 mr-2" />
                          Chatear con mi Tienda
                        </Button>
                        <Button onClick={() => setShowQR(!showQR)} variant="outline" className="w-full">
                          <QrCode className="w-4 h-4 mr-2" />
                          {showQR ? 'Ocultar QR' : 'Mostrar QR'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Preview Section */}
            {(dashboardStats?.storeConnected && whatsappConfig?.configured) && (
              <div className="mt-6">
                <ChatPreview onStartChat={_openWhatsAppChat} />
              </div>
            )}
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                  Configuración de WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                {whatsappConfig?.configured ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estado:</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activo
                      </Badge>
                    </div>
                    
                    {/* Chat CTA Section */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">¿Listo para chatear?</h4>
                          <p className="text-sm text-gray-600">Inicia una conversación con tu asistente de IA</p>
                        </div>
                        <Button onClick={_openWhatsAppChat} className="bg-green-600 hover:bg-green-700">
                          <Smartphone className="w-4 h-4 mr-2" />
                          Abrir Chat
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Números configurados:</label>
                      <div className="space-y-1">
                        {whatsappConfig.phoneNumbers.map((phone, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{phone}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => _copyToClipboard(phone)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Webhook URL:</label>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono truncate flex-1">
                          {whatsappConfig.webhookUrl}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => _copyToClipboard(whatsappConfig.webhookUrl)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      WhatsApp no configurado
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Configura WhatsApp para comenzar a recibir mensajes de tus clientes.
                    </p>
                    <Button onClick={() => _router.push('/onboarding')}>
                      Configurar WhatsApp
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>
                  Gestiona las conexiones de tu tienda y WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Tienda Nube Connection */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Tienda Nube</h3>
                        <p className="text-sm text-gray-600">
                          Conecta tu tienda para acceder a productos, pedidos y clientes
                        </p>
                      </div>
                      <Badge variant={dashboardStats?.storeConnected ? "default" : "secondary"}>
                        {dashboardStats?.storeConnected ? "Conectada" : "Desconectada"}
                      </Badge>
                    </div>
                    
                    {dashboardStats?.storeConnected ? (
                      <div className="text-sm text-gray-600">
                        Tienda: {dashboardStats.storeName || "Tienda conectada"}
                      </div>
                    ) : (
                      <Button onClick={() => _router.push('/onboarding')}>
                        Conectar Tienda
                      </Button>
                    )}
                  </div>

                  {/* WhatsApp Configuration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">WhatsApp</h3>
                        <p className="text-sm text-gray-600">
                          Configura tu número de WhatsApp para recibir mensajes
                        </p>
                      </div>
                      <Badge variant={whatsappConfig?.configured ? "default" : "secondary"}>
                        {whatsappConfig?.configured ? "Configurado" : "Pendiente"}
                      </Badge>
                    </div>
                    
                    {whatsappConfig?.configured ? (
                      <div className="text-sm text-gray-600">
                        Números configurados: {whatsappConfig.phoneNumbers.length}
                      </div>
                    ) : (
                      <Button onClick={() => _router.push('/onboarding')}>
                        Configurar WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 