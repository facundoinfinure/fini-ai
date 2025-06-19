"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, ExternalLink, MessageCircle, Store, Settings, Phone, Copy, Send, Bot } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface StoreConnection {
  storeUrl: string;
  accessToken?: string;
  connected: boolean;
  storeInfo?: {
    name: string;
    id: string;
  };
}

interface WhatsAppSetup {
  phoneNumbers: string[];
  testNumber: string;
  configured: boolean;
  webhookUrl?: string;
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [storeConnection, setStoreConnection] = useState<StoreConnection>({
    storeUrl: '',
    connected: false
  });
  const [whatsappSetup, setWhatsappSetup] = useState<WhatsAppSetup>({
    phoneNumbers: [],
    testNumber: '',
    configured: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: 'store', title: 'Conectar Tienda', description: 'Conecta tu tienda de Tienda Nube', completed: false },
    { id: 'whatsapp', title: 'Configurar WhatsApp', description: 'Configura números de WhatsApp', completed: false },
    { id: 'activate', title: 'Activar Fini', description: 'Envía mensaje inicial por WhatsApp', completed: false }
  ]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session) {
    return null;
  }

  const updateStepCompletion = (stepId: string, completed: boolean) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed } : step
    ));
  };

  const connectTiendaNube = async () => {
    setIsLoading(true);
    try {
      // For OAuth flow - this would redirect to Tienda Nube
      const response = await fetch('/api/tiendanube/oauth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storeUrl: storeConnection.storeUrl,
          redirectUri: `${window.location.origin}/api/tiendanube/oauth/callback`
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ONBOARDING] OAuth response:', data);
        
        // Check both possible locations for authUrl
        const authUrl = data.authUrl || data.data?.authUrl;
        
        if (authUrl) {
          console.log('[ONBOARDING] Redirecting to OAuth URL:', authUrl);
          // Redirect to Tienda Nube OAuth
          window.location.href = authUrl;
        } else {
          console.error('[ONBOARDING] No authUrl found in response:', data);
          throw new Error('No auth URL received from server');
        }
      } else {
        console.error('[ONBOARDING] OAuth request failed:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('[ONBOARDING] Error details:', errorData);
        
        // If it's an auth error, redirect to login
        if (response.status === 401) {
          router.push('/auth/signin');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to connect to Tienda Nube');
      }
    } catch (error) {
      console.error('Error connecting to Tienda Nube:', error);
      alert('Error conectando con Tienda Nube. Verifica tu URL y intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const addPhoneNumber = () => {
    if (whatsappSetup.testNumber.trim()) {
      setWhatsappSetup(prev => ({
        ...prev,
        phoneNumbers: [...prev.phoneNumbers, prev.testNumber.trim()],
        testNumber: ''
      }));
    }
  };

  const removePhoneNumber = (index: number) => {
    setWhatsappSetup(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
    }));
  };

  const configureWhatsApp = async () => {
    if (whatsappSetup.phoneNumbers.length === 0) {
      alert('Agrega al menos un número de teléfono');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: whatsappSetup.phoneNumbers,
          webhookUrl: `${window.location.origin}/api/whatsapp/webhook`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setWhatsappSetup(prev => ({
          ...prev,
          configured: true,
          webhookUrl: data.data?.webhookUrl
        }));
        updateStepCompletion('whatsapp', true);
        setCurrentStep(2);
      } else {
        throw new Error('Failed to configure WhatsApp');
      }
    } catch (error) {
      console.error('Error configuring WhatsApp:', error);
      alert('Error configurando WhatsApp. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendInitialMessage = async (phoneNumber: string) => {
    try {
      const response = await fetch('/api/whatsapp/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      if (response.ok) {
        alert(`Mensaje enviado exitosamente a ${phoneNumber}`);
        updateStepCompletion('activate', true);
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error enviando mensaje. Intenta nuevamente.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configuración de Fini AI
          </h1>
          <p className="text-gray-600">
            Conecta tu tienda y configura WhatsApp en pocos pasos
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Conectar Tienda Nube
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Ingresa la URL de tu tienda de Tienda Nube para conectarla automáticamente.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de tu tienda
                    </label>
                    <Input
                      type="url"
                      placeholder="https://tu-tienda.mitiendanube.com"
                      value={storeConnection.storeUrl}
                      onChange={(e) => setStoreConnection(prev => ({ ...prev, storeUrl: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ejemplo: https://mi-tienda.mitiendanube.com
                    </p>
                  </div>

                  <Button 
                    onClick={connectTiendaNube}
                    disabled={isLoading || !storeConnection.storeUrl}
                    className="w-full"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <Store className="w-4 h-4 mr-2" />
                    )}
                    Conectar Tienda
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Configurar WhatsApp
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Agrega los números de teléfono que usarás para recibir mensajes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agregar número de teléfono
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="tel"
                        placeholder="+5491112345678"
                        value={whatsappSetup.testNumber}
                        onChange={(e) => setWhatsappSetup(prev => ({ ...prev, testNumber: e.target.value }))}
                      />
                      <Button onClick={addPhoneNumber} disabled={!whatsappSetup.testNumber}>
                        Agregar
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Incluye el código de país (+54 para Argentina)
                    </p>
                  </div>

                  {whatsappSetup.phoneNumbers.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Números configurados
                      </label>
                      <div className="space-y-2">
                        {whatsappSetup.phoneNumbers.map((phone, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{phone}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePhoneNumber(index)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={configureWhatsApp}
                    disabled={isLoading || whatsappSetup.phoneNumbers.length === 0}
                    className="w-full"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <MessageCircle className="w-4 h-4 mr-2" />
                    )}
                    Configurar WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Activar Fini AI
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Envía un mensaje inicial para activar tu asistente de IA.
                  </p>
                </div>

                <div className="space-y-4">
                  {whatsappSetup.phoneNumbers.map((phone, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{phone}</p>
                        <p className="text-sm text-gray-600">Número configurado</p>
                      </div>
                      <Button
                        onClick={() => sendInitialMessage(phone)}
                        variant="outline"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Enviar mensaje
                      </Button>
                    </div>
                  ))}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">¡Todo listo!</h4>
                    <p className="text-blue-700 text-sm">
                      Una vez que envíes el mensaje inicial, podrás comenzar a usar Fini AI 
                      para obtener analytics de tu tienda por WhatsApp.
                    </p>
                  </div>

                  <Button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full"
                  >
                    Ir al Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 