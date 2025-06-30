"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
// import { useAnalytics } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  // const { trackOnboardingStep, trackButtonClick, trackError, trackFeature } = useAnalytics();
  const trackOnboardingStep = (...args: any[]) => {};
  const trackButtonClick = (...args: any[]) => {};
  const trackError = (...args: any[]) => {};
  const trackFeature = (...args: any[]) => {};
  const [currentStep, setCurrentStep] = useState(0); // Start with welcome step
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasStores, setHasStores] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Form data
  const [storeUrl, setStoreUrl] = useState("");
  const [storeName, setStoreName] = useState("");
  const [isStoreNameExtracted, setIsStoreNameExtracted] = useState(false);
  const [isExtractingInfo, setIsExtractingInfo] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "enterprise">("free");
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  
  // 🤖 NEW: Store Analysis state
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  
  // 🏢 NEW: Competitors state
  const [competitors, setCompetitors] = useState<Array<{website?: string, instagram?: string, name?: string}>>([{}, {}, {}]);

  // Add flag to prevent multiple checkExistingOnboarding calls
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Check if user is authenticated and handle onboarding state
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    // Prevent multiple executions
    if (hasCheckedOnboarding) return;

    // Handle URL parameters first
    const searchParams = new URLSearchParams(window.location.search);
    const stepParam = searchParams.get('step');
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');

    console.log('[INFO] Onboarding page loaded with params:', { stepParam, successParam, errorParam });

    // Set success/error messages from URL
    if (successParam === 'store_connected') {
      const storeName = searchParams.get('store_name');
      setSuccess(`¡Tienda "${storeName}" conectada exitosamente!`);
    }
    if (errorParam) {
      setError(messageParam || 'Error en el proceso de configuración');
    }

    // Check existing onboarding status and set appropriate step
    checkExistingOnboarding(stepParam);
    
    // Clean URL parameters after processing them
    if (stepParam || successParam || errorParam) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Mark as checked to prevent re-execution
    setHasCheckedOnboarding(true);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router, hasCheckedOnboarding]);

  const checkExistingOnboarding = async (stepParam?: string | null) => {
    try {
      console.log('[INFO] Checking onboarding status for user:', user?.id, 'stepParam:', stepParam);
      
      // Check user's onboarding status and stores in parallel
      const [onboardingResponse, storesResponse] = await Promise.all([
        fetch("/api/user/complete-onboarding", { method: 'GET' }),
        fetch("/api/stores")
      ]);
      
      console.log('[INFO] API responses:', {
        onboarding: onboardingResponse.status,
        stores: storesResponse.status
      });
      
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
        
        if (storesData.success && storesData.data && storesData.data.length > 0) {
          hasStores = true;
        }
      }
      
      // Set state variables
      setHasStores(hasStores);
      setOnboardingCompleted(hasCompletedOnboarding);

      // Determine appropriate step
      let targetStep = 0; // Default to welcome
      
      // If URL has specific step parameter, use it (from OAuth callback)
      if (stepParam && !isNaN(parseInt(stepParam))) {
        targetStep = parseInt(stepParam);
        console.log('[INFO] Using step from URL parameter:', targetStep);
      }
      // Otherwise, determine step based on user's progress
      else if (hasStores && !hasCompletedOnboarding) {
        // User has connected store but hasn't completed onboarding
        targetStep = 2; // Go to analysis step
        console.log('[INFO] User has stores but onboarding not completed, going to step 2');
      }
      else if (hasCompletedOnboarding && hasStores) {
        // User has completed everything -> redirect to dashboard
        console.log('[INFO] User has completed onboarding and has stores, redirecting to dashboard');
        router.push("/dashboard");
        return;
      }
      else {
        console.log('[INFO] Using default welcome step');
      }
      
      console.log('[INFO] Setting onboarding step to:', targetStep);
      setCurrentStep(targetStep);
      
    } catch (error) {
      console.error('[ERROR] Error checking onboarding status:', error);
      // Don't redirect on error, let user stay on onboarding page
      setCurrentStep(0); // Default to welcome step on error
    }
  };

  const handleNextStep = () => {
    if (currentStep < 5) { // Updated for 6 total steps (0-5)
      // Track step completion
      const stepNames = ['welcome', 'store-connection', 'store-analysis', 'profile', 'whatsapp', 'plan-selection'];
      trackOnboardingStep(currentStep, stepNames[currentStep] || 'unknown', true, {
        nextStep: currentStep + 1,
        hasStores,
        onboardingCompleted
      });
      
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) { // Updated to go back to welcome step
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
      // Track store connection attempt
      trackFeature('store-connection', true, {
        method: 'oauth',
        storeUrl,
        storeName,
        step: currentStep
      });

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
        // 🤖 NEW: Store the store ID for later analysis
        if (data.data?.storeId) {
          setStoreId(data.data.storeId);
        }
        // Redirect to Tienda Nube OAuth
        window.location.href = data.data.authUrl;
      } else {
        throw new Error('No se recibió la URL de autorización de Tienda Nube');
      }

    } catch (error) {
      console.error('[ERROR] Error connecting store:', error);
      const errorMessage = error instanceof Error ? error.message : "Error al conectar la tienda. Intenta nuevamente.";
      
      // Track store connection error
      trackError(error instanceof Error ? error : new Error(errorMessage), {
        feature: 'store-connection',
        step: currentStep,
        storeUrl,
        storeName
      });
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 🤖 NEW: Analyze store automatically with AI
  const handleStoreAnalysis = async () => {
    setIsAnalyzing(true);
    setError("");
    setSuccess("");

    try {
      console.log('[STORE-ANALYSIS] Starting automatic analysis for store:', storeId);

      // Get the first store (latest connected)
      const storesResponse = await fetch('/api/stores');
      const storesData = await storesResponse.json();

      if (!storesData.success || !storesData.data || storesData.data.length === 0) {
        throw new Error('No se encontró ninguna tienda conectada');
      }

      const latestStore = storesData.data[0]; // Use the first store
      setStoreId(latestStore.id);

      // Analyze the store with AI
      const analysisResponse = await fetch(`/api/stores/${latestStore.id}/analyze`, {
        method: 'POST',
      });

      const analysisData = await analysisResponse.json();

      if (!analysisResponse.ok || !analysisData.success) {
        throw new Error(analysisData.error || 'Error al analizar la tienda');
      }

      console.log('[STORE-ANALYSIS] Analysis completed:', analysisData.data);

      // Store the business profile
      setBusinessProfile(analysisData.data.profile);
      setAnalysisComplete(true);
      setSuccess('¡Análisis completado! Revisa el perfil de tu negocio.');
      
      // Let user manually advance to review step

    } catch (error) {
      console.error('[STORE-ANALYSIS] Error analyzing store:', error);
      setError(error instanceof Error ? error.message : "Error al analizar la tienda. Intenta nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 🤖 NEW: Save edited business profile
  const handleSaveProfile = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log('[PROFILE-SAVE] Saving business profile:', businessProfile);

      // For now, just store in state and continue
      // In the future, this could save to database
      setSuccess('Perfil guardado correctamente');
      
      // Auto-advance to next step after short delay
      setTimeout(() => {
        handleNextStep();
      }, 1000);

    } catch (error) {
      console.error('[PROFILE-SAVE] Error saving profile:', error);
      setError(error instanceof Error ? error.message : "Error al guardar el perfil. Intenta nuevamente.");
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
              {currentStep === 0 ? "Bienvenida" : `Paso ${currentStep} de 5`}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar - Only show after welcome step */}
      {currentStep > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <div className="w-full max-w-2xl mx-auto">
                <div className="flex items-center justify-center">
                  {[1, 2, 3, 4, 5].map((step) => (
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
                      {step < 5 && (
                        <div
                          className={`w-16 h-1 mx-2 rounded-full ${
                            currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-5 mt-2 text-center">
                  <span className="text-xs text-gray-600">Tienda</span>
                  <span className="text-xs text-gray-600">Análisis</span>
                  <span className="text-xs text-gray-600">Perfil</span>
                  <span className="text-xs text-gray-600">WhatsApp</span>
                  <span className="text-xs text-gray-600">Plan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        
        {/* Show store connected message if user is on step 1 but already has stores */}
        {currentStep === 1 && hasStores && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="text-green-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  <strong>¡Tu tienda ya está conectada!</strong> Puedes continuar al siguiente paso para completar la configuración.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentStep(2)}
                  className="mt-2"
                >
                  Ir al Análisis →
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 0: Welcome (similar to Origin) */}
        {currentStep === 0 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex justify-end mb-8">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentStep(hasStores ? 2 : 1)}
                className="text-gray-600 hover:text-gray-900"
              >
                SALTAR
              </Button>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {hasStores ? "¡Bienvenido de vuelta!" : "¡Bienvenido a Fini AI!"} ¿Por dónde te gustaría empezar?
            </h1>
            <p className="text-lg text-gray-600 mb-12">
              {hasStores 
                ? "Tu tienda ya está conectada. Terminemos de configurar tu perfil."
                : "Selecciona lo que más te interesa en este momento"
              }
            </p>

            <div className="space-y-4 mb-12">
              {[
                {
                  id: "analytics",
                  icon: "📊",
                  title: "Gestionar mis analytics",
                  description: "Ver métricas de ventas, productos y clientes"
                },
                {
                  id: "sales",
                  icon: "💰", 
                  title: "Mejorar mis ventas",
                  description: "Obtener insights para aumentar conversiones"
                },
                {
                  id: "whatsapp",
                  icon: "📱",
                  title: "Obtener respuestas por WhatsApp",
                  description: "Preguntar sobre mi negocio desde WhatsApp"
                },
                {
                  id: "automation",
                  icon: "🤖",
                  title: "Automatizar tareas",
                  description: "Reportes automáticos y análisis con IA"
                },
                {
                  id: "marketing",
                  icon: "🎯",
                  title: "Mejorar mi marketing",
                  description: "Ideas y estrategias personalizadas"
                },
                {
                  id: "forecast",
                  icon: "📈",
                  title: "Predecir tendencias",
                  description: "Forecasting y análisis predictivo"
                },
                {
                  id: "unsure",
                  icon: "🤔",
                  title: "No estoy seguro",
                  description: "Explorar todas las opciones disponibles"
                }
              ].map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-blue-300 hover:bg-blue-50 ${
                    selectedGoal === goal.id 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-4">{goal.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{goal.title}</h3>
                      <p className="text-gray-600 text-sm">{goal.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button 
              onClick={handleNextStep}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-lg font-semibold"
              disabled={!selectedGoal}
            >
              SIGUIENTE →
            </Button>

            <div className="mt-8">
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Conoce más sobre el compromiso de seguridad de Fini AI
              </a>
            </div>
          </div>
        )}

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

        {/* 🤖 NEW Step 2: Automatic Store Analysis */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>🤖 Análisis Automático de tu Tienda</CardTitle>
              <CardDescription>
                Nuestra IA está analizando tu tienda para crear un perfil de negocio personalizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAnalyzing && !analysisComplete && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ¡Perfecto! Tu tienda está conectada
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Ahora vamos a analizar tu catálogo, productos y datos para crear un perfil inteligente
                  </p>
                  <Button 
                    onClick={handleStoreAnalysis}
                    className="w-full max-w-sm"
                  >
                    🚀 Comenzar Análisis con IA
                  </Button>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Analizando tu tienda...
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Esto puede tomar unos momentos. Estamos procesando:
                  </p>
                  <div className="text-left max-w-sm mx-auto space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      📦 Catálogo de productos
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      🏷️ Categorías y precios
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      🎯 Audiencia objetivo
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      💡 Oportunidades de crecimiento
                    </div>
                  </div>
                </div>
              )}

              {analysisComplete && businessProfile && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✅</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ¡Análisis Completado!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Hemos generado un perfil inteligente de tu negocio. En el siguiente paso podrás revisarlo y editarlo.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
                    <h4 className="font-medium text-blue-900 mb-2">Vista previa del análisis:</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <div>🏪 <strong>Categoría:</strong> {businessProfile.category}</div>
                      <div>👥 <strong>Audiencia:</strong> {businessProfile.targetAudience}</div>
                      <div>📊 <strong>Productos:</strong> {businessProfile.productAnalysis.totalProducts}</div>
                      <div>💡 <strong>Generado por:</strong> {businessProfile.generatedBy === 'ai' ? 'IA' : 'Análisis básico'}</div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleNextStep}
                    className="mt-4"
                  >
                    Continuar al Siguiente Paso →
                  </Button>
                </div>
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isAnalyzing}
                >
                  Anterior
                </Button>
                {analysisComplete && (
                  <Button 
                    onClick={handleNextStep}
                  >
                    Revisar Perfil →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 🤖 NEW Step 3: Review and Edit Business Profile */}
        {currentStep === 3 && businessProfile && (
          <Card>
            <CardHeader>
              <CardTitle>📝 Revisa tu Perfil de Negocio</CardTitle>
              <CardDescription>
                Revisa y edita el perfil que generamos automáticamente. Puedes modificar cualquier campo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría del Negocio
                  </label>
                  <Input
                    value={businessProfile.category}
                    onChange={(e) => setBusinessProfile({
                      ...businessProfile,
                      category: e.target.value
                    })}
                    placeholder="ej: Moda y Vestimenta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audiencia Objetivo
                  </label>
                  <Input
                    value={businessProfile.targetAudience}
                    onChange={(e) => setBusinessProfile({
                      ...businessProfile,
                      targetAudience: e.target.value
                    })}
                    placeholder="ej: Jóvenes interesados en moda"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del Negocio
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={businessProfile.description}
                  onChange={(e) => setBusinessProfile({
                    ...businessProfile,
                    description: e.target.value
                  })}
                  placeholder="Describe tu negocio en 1-2 oraciones"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Propuesta de Valor
                </label>
                <Input
                  value={businessProfile.valueProposition}
                  onChange={(e) => setBusinessProfile({
                    ...businessProfile,
                    valueProposition: e.target.value
                  })}
                  placeholder="¿Qué hace único a tu negocio?"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📊 Análisis Automático</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Total productos:</span>
                    <span className="ml-2 text-gray-600">{businessProfile.productAnalysis.totalProducts}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Precio promedio:</span>
                    <span className="ml-2 text-gray-600">
                      ${businessProfile.productAnalysis.averagePrice?.toFixed(2)} {businessProfile.priceRange.currency}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Marcas:</span>
                    <span className="ml-2 text-gray-600">{businessProfile.productAnalysis.brandCount}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Con variantes:</span>
                    <span className="ml-2 text-gray-600">{businessProfile.productAnalysis.hasVariants ? 'Sí' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-3">🏢 Competidores Principales</h4>
                <p className="text-sm text-orange-700 mb-4">
                  Agrega hasta 3 competidores para obtener mejores insights y estrategias de marketing.
                </p>
                
                <div className="space-y-4">
                  {competitors.map((competitor, index) => (
                    <div key={index} className="grid md:grid-cols-3 gap-3 items-center p-3 bg-white rounded border">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nombre (opcional)
                        </label>
                        <Input
                          placeholder="Ej: MercadoLibre"
                          value={competitor.name || ''}
                          onChange={(e) => {
                            const newCompetitors = [...competitors];
                            newCompetitors[index] = { ...newCompetitors[index], name: e.target.value };
                            setCompetitors(newCompetitors);
                          }}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sitio Web
                        </label>
                        <Input
                          placeholder="https://competidor.com"
                          value={competitor.website || ''}
                          onChange={(e) => {
                            const newCompetitors = [...competitors];
                            newCompetitors[index] = { ...newCompetitors[index], website: e.target.value };
                            setCompetitors(newCompetitors);
                          }}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Instagram
                        </label>
                        <Input
                          placeholder="@competidor"
                          value={competitor.instagram || ''}
                          onChange={(e) => {
                            const newCompetitors = [...competitors];
                            newCompetitors[index] = { ...newCompetitors[index], instagram: e.target.value };
                            setCompetitors(newCompetitors);
                          }}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-orange-600 mt-2">
                  💡 Esta información nos ayudará a generar estrategias más específicas para tu mercado.
                </p>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  Anterior
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar y Continuar'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
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

        {currentStep === 5 && (
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