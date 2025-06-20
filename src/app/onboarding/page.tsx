"use client";

import { useState, useEffect } from "react";
// import { useSession } from 'next-auth/react';
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Textarea } from "@/components/ui/textarea";

export default function OnboardingPage() {
  const router = useRouter();
  // const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data
  const [storeUrl, setStoreUrl] = useState("");
  const [storeName, setStoreName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("basic");

  // Check if user is authenticated
  useEffect(() => {
    // if (status === "loading") return;
    
    // if (!session?.user) {
    //   router.push("/auth/signin");
    //   return;
    // }

    // Check if user has already completed onboarding
    // _checkExistingStore();
  }, [router]);

  // const _checkExistingStore = async () => {
  //   try {
  //     const response = await fetch("/api/user/complete-onboarding");
  //     if (response.ok) {
  //       const data = await response.json();
  //       if (data.completed) {
  //         router.push("/dashboard");
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error checking onboarding status:", error);
  //   }
  // };

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
      // Simulate store connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess("¡Tienda conectada exitosamente!");
      setCurrentStep(2);
    } catch (error) {
      console.error("Error connecting store:", error);
      setError("Error al conectar la tienda. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppSetup = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Simulate WhatsApp setup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess("¡WhatsApp configurado exitosamente!");
      setCurrentStep(3);
    } catch (error) {
      console.error("Error setting up WhatsApp:", error);
      setError("Error al configurar WhatsApp. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Simulate completing onboarding
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess("¡Onboarding completado! Redirigiendo al dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setError("Error al completar el onboarding. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      id: "basic",
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
      id: "pro",
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
      id: "enterprise",
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
                  {plans.map((plan, index) => (
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