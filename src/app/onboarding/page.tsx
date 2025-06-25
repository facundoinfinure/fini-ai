"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data
  const [storeUrl, setStoreUrl] = useState("");
  const [storeName, setStoreName] = useState("");
  const [isStoreNameExtracted, setIsStoreNameExtracted] = useState(false);
  const [isExtractingInfo, setIsExtractingInfo] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "enterprise">("free");

  // Check if user is authenticated and has completed onboarding
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    // Check if user has already completed onboarding
    checkExistingOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router]);

  const checkExistingOnboarding = async () => {
    try {
      console.log('[INFO] Checking onboarding status for user:', user?.id);
      
      // Check user's onboarding status and stores in parallel
      const [onboardingResponse, storesResponse] = await Promise.all([
        fetch("/api/user/complete-onboarding", { method: 'GET' }),
        fetch("/api/stores")
      ]);
      
      console.log('[INFO] Onboarding response status:', onboardingResponse.status);
      console.log('[INFO] Stores response status:', storesResponse.status);
      
      let hasCompletedOnboarding = false;
      let hasStores = false;
      
      // Parse onboarding response
      if (onboardingResponse.ok) {
        const onboardingData = await onboardingResponse.json();
        console.log('[INFO] Onboarding data:', onboardingData);
        
        if (onboardingData.success) {
          hasCompletedOnboarding = onboardingData.data?.completed || false;
        }
      }

      // Parse stores response
      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        console.log('[INFO] Stores data:', storesData);
        
        if (storesData.success && storesData.stores && storesData.stores.length > 0) {
          hasStores = true;
        }
      }
      
      // Redirect logic:
      // - If user has completed onboarding AND has stores -> dashboard
      // - Otherwise -> stay on onboarding
      if (hasCompletedOnboarding && hasStores) {
        console.log('[INFO] User has completed onboarding and has stores, redirecting to dashboard');
        router.push("/dashboard");
        return;
      }
      
      console.log('[INFO] User needs to complete onboarding setup');
      
    } catch (error) {
      console.error('[ERROR] Error checking onboarding status:', error);
      // Don't redirect on error, let user stay on onboarding page
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const extractStoreInfo = async (url: string) => {
    setIsExtractingInfo(true);
    setError("");

    try {
      console.log('[INFO] Extracting store info from URL:', url);

      const response = await fetch('/api/tiendanube/extract-store-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeUrl: url })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener información de la tienda');
      }

      console.log('[INFO] Store info extracted:', data.data);
      
      setStoreName(data.data.storeName);
      setIsStoreNameExtracted(true);
      setSuccess(`Información de la tienda obtenida: "${data.data.storeName}"`);

    } catch (error) {
      console.error('[ERROR] Error extracting store info:', error);
      setError(error instanceof Error ? error.message : "Error al obtener información de la tienda. Intenta nuevamente.");
      // Reset extraction state so user can try again
      setIsStoreNameExtracted(false);
      setStoreName("");
    } finally {
      setIsExtractingInfo(false);
    }
  };

  const handleStoreUrlChange = (url: string) => {
    setStoreUrl(url);
    setIsStoreNameExtracted(false);
    setStoreName("");
    setError("");
    setSuccess("");

    // Auto-extract info when URL looks complete
    if (url.includes('tiendanube.com') || url.includes('mitiendanube.com')) {
      extractStoreInfo(url);
    }
  };

  const handleStoreConnection = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate store URL format
      if (!storeUrl.includes('tiendanube.com') && !storeUrl.includes('mitiendanube.com')) {
        throw new Error('La URL debe ser de Tienda Nube');
      }

      // If we don't have store name extracted yet, try to extract it first
      if (!isStoreNameExtracted || !storeName.trim()) {
        await extractStoreInfo(storeUrl);
        
        // Check again after extraction
        if (!storeName.trim()) {
          throw new Error('No se pudo obtener el nombre de la tienda. Por favor ingresa el nombre manualmente.');
        }
      }

      console.log('[INFO] Starting Tienda Nube OAuth flow for:', { storeUrl, storeName });

      // Store the URL and name in sessionStorage for the OAuth callback
      sessionStorage.setItem('pendingStoreUrl', storeUrl);
      sessionStorage.setItem('pendingStoreName', storeName);

      // Initiate Tienda Nube OAuth
      const response = await fetch('/api/tiendanube/oauth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeUrl,
          storeName
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al iniciar la conexión con Tienda Nube');
      }

      if (data.data?.authUrl) {
        console.log('[INFO] Redirecting to Tienda Nube OAuth:', data.data.authUrl);
        // Redirect to Tienda Nube OAuth
        window.location.href = data.data.authUrl;
      } else {
        throw new Error('No se recibió la URL de autorización de Tienda Nube');
      }

    } catch (error) {
      console.error('[ERROR] Error connecting store:', error);
      setError(error instanceof Error ? error.message : "Error al conectar la tienda. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppSetup = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanNumber = whatsappNumber.replace(/\s+/g, '').replace(/[()-]/g, '');
      
      if (!phoneRegex.test(cleanNumber)) {
        throw new Error('Por favor ingresa un número de WhatsApp válido');
      }

      console.log('[INFO] Setting up WhatsApp for number:', cleanNumber);

      const response = await fetch('/api/whatsapp/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: cleanNumber
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al configurar WhatsApp');
      }

      setSuccess('WhatsApp configurado correctamente');
      handleNextStep();

    } catch (error) {
      console.error('[ERROR] Error setting up WhatsApp:', error);
      setError(error instanceof Error ? error.message : "Error al configurar WhatsApp. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log('[INFO] Completing onboarding for user:', user?.id);

      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedPlan,
          completedAt: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al completar el onboarding');
      }

      setSuccess('¡Onboarding completado! Redirigiendo al dashboard...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('[ERROR] Error completing onboarding:', error);
      setError(error instanceof Error ? error.message : "Error al completar el setup. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Show loading if not authenticated
  if (!user) {
    return null;
  }

  const plans = [
    {
      id: "free" as const,
      name: "Plan Básico",
      price: "Gratis",
      description: "Perfecto para empezar",
      features: [
        "Analytics básicos",
        "Resumen diario por WhatsApp", 
        "RAG básico para consultas",
        "Soporte por email"
      ]
    },
    {
      id: "pro" as const,
      name: "Plan Pro",
      price: "$39/mes",
      description: "Para negocios en crecimiento",
      features: [
        "Todo del Plan Básico",
        "Sistema multi-agente completo",
        "Forecasting con IA",
        "Análisis de competencia",
        "Ideas de marketing",
        "Memoria extendida",
        "Soporte prioritario"
      ]
    },
    {
      id: "enterprise" as const,
      name: "Plan Enterprise", 
      price: "$99/mes",
      description: "Para empresas establecidas",
      features: [
        "Todo del Plan Pro",
        "Agentes personalizados",
        "Integraciones avanzadas", 
        "ML models custom",
        "API dedicada",
        "Soporte 24/7",
        "Onboarding personalizado"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Fini AI</h1>
                <p className="text-sm text-gray-500">Configuración inicial</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Paso {currentStep} de 3
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <div className="flex-1">
              <div className="flex items-center">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div
                        className={`flex-1 h-1 mx-4 rounded-full ${
                          currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">Conectar Tienda</span>
                <span className="text-sm text-gray-600">Configurar WhatsApp</span>
                <span className="text-sm text-gray-600">Elegir Plan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="text-red-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="text-green-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Conecta tu Tienda Nube</CardTitle>
              <CardDescription>
                Conecta tu tienda de Tienda Nube para comenzar a obtener analytics automáticos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  URL de tu tienda
                </label>
                <div className="relative">
                  <Input
                    id="storeUrl"
                    type="url"
                    placeholder="https://tu-tienda.tiendanube.com"
                    value={storeUrl}
                    onChange={(e) => handleStoreUrlChange(e.target.value)}
                    className="w-full"
                  />
                  {isExtractingInfo && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa la URL completa de tu tienda de Tienda Nube. El nombre se obtendrá automáticamente.
                </p>
              </div>

              {isStoreNameExtracted && storeName && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center">
                    <div className="text-green-400 mr-3">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">
                        Tienda detectada: <span className="font-semibold">{storeName}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {storeUrl && !isStoreNameExtracted && !isExtractingInfo && (
                <div>
                  <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de tu tienda (opcional)
                  </label>
                  <Input
                    id="storeName"
                    type="text"
                    placeholder="Mi Tienda Increíble"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si no se detectó automáticamente, puedes ingresar el nombre manualmente
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button 
                  onClick={handleStoreConnection}
                  disabled={isLoading || !storeUrl || isExtractingInfo}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Conectando...
                    </>
                  ) : (
                    'Conectar Tienda'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Configura WhatsApp</CardTitle>
              <CardDescription>
                Conecta tu número de WhatsApp Business para recibir analytics automáticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Número de WhatsApp Business
                </label>
                <Input
                  id="whatsappNumber"
                  type="tel"
                  placeholder="+54 9 11 1234-5678"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Incluye el código de país. Este será tu número para recibir analytics por WhatsApp.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-blue-400">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Importante:</strong> Necesitas tener WhatsApp Business configurado en este número.
                      Fini AI se conectará para enviarte reportes automáticos y responder consultas sobre tu tienda.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  Anterior
                </Button>
                <Button 
                  onClick={handleWhatsAppSetup}
                  disabled={isLoading || !whatsappNumber}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Configurando...
                    </>
                  ) : (
                    'Configurar WhatsApp'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Elige tu Plan</CardTitle>
              <CardDescription>
                Selecciona el plan que mejor se adapte a las necesidades de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                    tabIndex={0}
                    role="button"
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedPlan(plan.id);
                      }
                    }}
                  >
                    {selectedPlan === plan.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{plan.price}</div>
                        <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      </div>
                      
                      <ul className="space-y-2">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={`${plan.id}-feature-${featureIndex}`} className="flex items-start text-sm">
                            <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  Anterior
                </Button>
                <Button 
                  onClick={handleCompleteOnboarding}
                  disabled={isLoading}
                  className="min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completando...
                    </>
                  ) : (
                    'Completar Setup'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 