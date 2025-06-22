"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Textarea } from "@/components/ui/textarea";

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
  }, [user, loading, router]);

  const checkExistingOnboarding = async () => {
    try {
      // Check if user has already completed onboarding
      const onboardingResponse = await fetch("/api/user/complete-onboarding");
      if (onboardingResponse.ok) {
        const onboardingData = await onboardingResponse.json();
        if (onboardingData.success && onboardingData.data.completed) {
          console.log('[INFO] User has already completed onboarding, redirecting to dashboard');
          router.push("/dashboard");
          return;
        }
      }

      // Check if user already has stores connected
      const storesResponse = await fetch("/api/stores");
      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        if (storesData.success && storesData.stores && storesData.stores.length > 0) {
          console.log('[INFO] User already has stores connected, redirecting to dashboard');
          router.push("/dashboard");
          return;
        }
      }
    } catch (error) {
      console.error('[ERROR] Error checking onboarding status:', error);
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

  const handleStoreConnection = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate store URL format
      if (!storeUrl.includes('tiendanube.com')) {
        throw new Error('La URL debe ser de Tienda Nube');
      }

      // Validate store name
      if (!storeName.trim()) {
        throw new Error('El nombre de la tienda es requerido');
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
        throw new Error('Ingresa un número de WhatsApp válido (ej: +54 9 11 1234-5678)');
      }

      // For now, just simulate WhatsApp setup
      // In the future, this will integrate with Twilio
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess("¡WhatsApp configurado exitosamente!");
      setCurrentStep(3);
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
      console.log('[INFO] Completing onboarding with data:', {
        storeUrl,
        storeName,
        whatsappNumber,
        selectedPlan
      });

      const response = await fetch("/api/user/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeUrl,
          storeName,
          whatsappNumber,
          selectedPlan
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al completar el onboarding");
      }

      console.log('[INFO] Onboarding completed successfully:', data);
      
      setSuccess("¡Onboarding completado! Redirigiendo al dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error('[ERROR] Error completing onboarding:', error);
      setError(error instanceof Error ? error.message : "Error al completar el onboarding. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      id: "free" as const,
      name: "Plan Básico",
      price: "Gratis",
      features: [
        "Analytics básicos",
        "Resumen diario",
        "RAG básico",
        "Soporte por email"
      ]
    },
    {
      id: "pro" as const,
      name: "Plan Pro",
      price: "$39/mes",
      features: [
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
      features: [
        "Agentes personalizados",
        "Integraciones avanzadas",
        "ML models custom",
        "API dedicada",
        "Soporte 24/7",
        "Onboarding personalizado"
      ]
    }
  ];

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configura tu Tienda Nube
          </h1>
          <p className="text-gray-600">
            Conecta tu tienda y configura WhatsApp para comenzar
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step < currentStep ? "bg-blue-600" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Paso 1: Conecta tu Tienda Nube"}
              {currentStep === 2 && "Paso 2: Configura WhatsApp"}
              {currentStep === 3 && "Paso 3: Elige tu Plan"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Ingresa la URL de tu tienda para conectarla automáticamente"}
              {currentStep === 2 && "Configura tu número de WhatsApp para recibir analytics"}
              {currentStep === 3 && "Selecciona el plan que mejor se adapte a tus necesidades"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
                {success}
              </div>
            )}

            {/* Step 1: Store Connection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de tu Tienda Nube
                  </label>
                  <Input
                    type="url"
                    placeholder="https://mitienda.tiendanube.com"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Ejemplo: https://mitienda.tiendanube.com
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Tienda
                  </label>
                  <Input
                    type="text"
                    placeholder="Mi Tienda"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <Button 
                  onClick={handleStoreConnection}
                  disabled={isLoading || !storeUrl || !storeName}
                  className="w-full"
                >
                  {isLoading ? "Conectando..." : "Conectar Tienda"}
                </Button>
              </div>
            )}

            {/* Step 2: WhatsApp Setup */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de WhatsApp
                  </label>
                  <Input
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Incluye el código de país (+54 para Argentina)
                  </p>
                </div>

                <Button 
                  onClick={handleWhatsAppSetup}
                  disabled={isLoading || !whatsappNumber}
                  className="w-full"
                >
                  {isLoading ? "Configurando..." : "Configurar WhatsApp"}
                </Button>
              </div>
            )}

            {/* Step 3: Plan Selection */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPlan === plan.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                        <p className="text-2xl font-bold text-blue-600 mt-2">{plan.price}</p>
                        <ul className="mt-4 space-y-2 text-sm text-gray-600">
                          {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleCompleteOnboarding}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Completando..." : "Completar Onboarding"}
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
              >
                Anterior
              </Button>
              
              {currentStep < 3 && (
                <Button
                  onClick={handleNextStep}
                  disabled={currentStep === 3}
                >
                  Siguiente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 