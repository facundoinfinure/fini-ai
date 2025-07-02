"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
// import { useAnalytics } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import StripePricingTable from "@/components/dashboard/stripe-pricing-table";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, User, Building, Target, X, Plus, Loader2, AlertCircle } from "lucide-react";

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
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">("basic");
  const [isAnnualBilling, setIsAnnualBilling] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  
  // 🔄 NEW: Progress tracking state
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // 🔄 Progress persistence functions
  const saveProgress = (step: number) => {
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(step);
    setCompletedSteps(newCompletedSteps);
    
    // Save to localStorage
    const progressKey = `onboarding_progress_${user?.id}`;
    localStorage.setItem(progressKey, JSON.stringify(Array.from(newCompletedSteps)));
    
    console.log('[INFO] Progress saved for step:', step, 'Completed steps:', Array.from(newCompletedSteps));
  };
  
  const loadProgress = (): Set<number> => {
    if (!user?.id) return new Set<number>();
    
    const progressKey = `onboarding_progress_${user?.id}`;
    const savedProgress = localStorage.getItem(progressKey);
    
    if (savedProgress) {
      try {
        const stepsArray: number[] = JSON.parse(savedProgress);
        const stepsSet = new Set<number>(stepsArray.filter(step => typeof step === 'number'));
        setCompletedSteps(stepsSet);
        console.log('[INFO] Progress loaded:', Array.from(stepsSet));
        return stepsSet;
      } catch (error) {
        console.error('[ERROR] Failed to parse saved progress:', error);
      }
    }
    return new Set<number>();
  };
  
  const getNextIncompleteStep = (currentCompletedSteps: Set<number>) => {
    // Step progression logic based on completed steps
    if (!currentCompletedSteps.has(1) && !hasStores) return 1; // Store connection
    if (!currentCompletedSteps.has(2) && hasStores) return 2;  // Analysis
    if (!currentCompletedSteps.has(3)) return 3;  // Profile
    if (!currentCompletedSteps.has(4)) return 4;  // WhatsApp
    return 5; // Plans (final step)
  };
  
  // 🤖 NEW: Store Analysis state
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  
  // 🏢 NEW: Competitors state
  const [competitors, setCompetitors] = useState<Array<{website?: string, instagram?: string, name?: string}>>([{}, {}, {}]);

  // 📱 NEW: OTP Verification state  
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [whatsappNumberId, setWhatsappNumberId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Add flag to prevent multiple checkExistingOnboarding calls
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // ✨ NEW: Add fullName state
  const [fullName, setFullName] = useState('');

  // Load progress when user is available
  useEffect(() => {
    if (user?.id) {
      loadProgress();
    }
  }, [user?.id]);

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
    
    // ✨ NEW: Initialize fullName from user auth data if available
    if (user && !fullName) {
      // Try to get name from different auth sources
      const authName = user.user_metadata?.name || 
                      user.user_metadata?.full_name || 
                      '';
      setFullName(authName);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router, hasCheckedOnboarding]);

  const checkExistingOnboarding = async (stepParam?: string | null) => {
    try {
      console.log('[INFO] Checking onboarding status for user:', user?.id, 'stepParam:', stepParam);
      
      // Load saved progress first
      const currentCompletedSteps = loadProgress();
      
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
      let currentHasStores = false;
      
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
          currentHasStores = true;
          // If user has stores, mark step 1 as completed
          if (!currentCompletedSteps.has(1)) {
            saveProgress(1);
          }
        }
      }
      
      // Set state variables
      setHasStores(currentHasStores);
      setOnboardingCompleted(hasCompletedOnboarding);

      // Determine appropriate step
      let targetStep = 0; // Default to welcome
      
      // If URL has specific step parameter, use it (from OAuth callback)
      if (stepParam && !isNaN(parseInt(stepParam))) {
        targetStep = parseInt(stepParam);
        console.log('[INFO] Using step from URL parameter:', targetStep);
      }
      // If onboarding is completely done, redirect to dashboard
      else if (hasCompletedOnboarding && currentHasStores) {
        console.log('[INFO] User has completed onboarding, redirecting to dashboard');
        router.push("/dashboard");
        return;
      }
      // Otherwise, determine step based on saved progress
      else {
        targetStep = getNextIncompleteStep(currentCompletedSteps);
        console.log('[INFO] Next incomplete step determined:', targetStep, 'Completed steps:', Array.from(currentCompletedSteps));
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
      
      // Save progress for analysis step
      saveProgress(2);
      
      // Let user manually advance to review step

    } catch (error) {
      console.error('[STORE-ANALYSIS] Error analyzing store:', error);
      setError(error instanceof Error ? error.message : "Error al analizar la tienda. Intenta nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Competitor handling functions
  const handleAddCompetitor = () => {
    if (competitors.length < 3) {
      setCompetitors([...competitors, {}]);
    }
  };

  const handleRemoveCompetitor = (index: number) => {
    if (competitors.length > 1) {
      const newCompetitors = competitors.filter((_, i) => i !== index);
      setCompetitors(newCompetitors);
    }
  };

  const handleCompetitorChange = (index: number, field: 'name' | 'website' | 'instagram', value: string) => {
    const newCompetitors = [...competitors];
    newCompetitors[index] = {
      ...newCompetitors[index],
      [field]: value
    };
    setCompetitors(newCompetitors);
  };

  // 🤖 NEW: Save edited business profile + full name
  const handleSaveProfile = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log('[PROFILE-SAVE] Saving business profile and user info:', { businessProfile, fullName });

      // ✨ Save both business profile and full name to database
      const profileResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          businessProfile: {
            businessName: businessProfile?.businessName || '',
            businessType: businessProfile?.category || '',
            description: businessProfile?.description || '',
            targetAudience: businessProfile?.targetAudience || '',
            competitors: competitors.filter(comp => 
              comp.name?.trim() || comp.website?.trim() || comp.instagram?.trim()
            )
          }
        })
      });

      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error(profileData.error || 'Error al guardar el perfil');
      }
      
      setSuccess('Perfil guardado correctamente');
      
      // Save progress for profile step
      saveProgress(3);
      
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

      // Show OTP verification step
      setWhatsappNumberId(data.data.whatsapp_number_id);
      setShowOTPVerification(true);
      setSuccess('Código de verificación enviado a tu WhatsApp');

    } catch (error) {
      console.error('[ERROR] Error setting up WhatsApp:', error);
      setError(error instanceof Error ? error.message : "Error al configurar WhatsApp. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!whatsappNumberId || !otpCode.trim()) {
      setOtpError("Por favor ingresa el código de verificación");
      return;
    }

    setIsVerifyingOTP(true);
    setOtpError("");

    try {
      const response = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whatsapp_number_id: whatsappNumberId,
          otp_code: otpCode.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Código de verificación incorrecto');
      }

      // OTP verified successfully
      setSuccess('WhatsApp verificado correctamente');
      setShowOTPVerification(false);
      setOtpCode("");
      setWhatsappNumberId(null);
      
      // Save progress for WhatsApp step
      saveProgress(4);
      
      // Continue to next step
      handleNextStep();

    } catch (error) {
      console.error('[ERROR] Error verifying OTP:', error);
      setOtpError(error instanceof Error ? error.message : "Error al verificar código. Intenta nuevamente.");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (!whatsappNumberId) return;

    setIsLoading(true);
    setOtpError("");

    try {
      const response = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whatsapp_number_id: whatsappNumberId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al reenviar código');
      }

      setSuccess('Código reenviado a tu WhatsApp');
      setOtpCode("");

    } catch (error) {
      console.error('[ERROR] Error resending OTP:', error);
      setOtpError(error instanceof Error ? error.message : "Error al reenviar código. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripePlanSelected = (plan: 'basic' | 'pro', billing: 'monthly' | 'annual') => {
    console.log('[INFO] Stripe plan selected:', { plan, billing });
    setSelectedPlan(plan);
    setIsAnnualBilling(billing === 'annual');
    // Note: Stripe will handle the actual payment and subscription creation
    // After successful payment, user will be redirected back with success parameter
  };

  const handleCompleteOnboarding = async () => {
    // With Stripe pricing table, user should select a plan directly through Stripe
    setError("Por favor selecciona un plan usando la tabla de precios de Stripe arriba.");
    return;
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
      id: "basic" as const,
      name: "Plan Basic",
          monthlyPrice: 29.99,
    annualPrice: 299.99, // ~17% discount
      description: "Ideal para emprendedores",
      trial: "7 días gratis",
      features: [
        "Chat básico por WhatsApp",
        "Analytics básicos",
        "1 tienda únicamente", 
        "Métricas en tiempo real",
        "Historial 7 días",
        "Soporte por email"
      ],
      highlighted: false
    },
    {
      id: "pro" as const,
      name: "Plan Pro",
          monthlyPrice: 49.99,
    annualPrice: 499.99, // ~17% discount
      description: "Para negocios en crecimiento",
      trial: "7 días gratis",
      features: [
        "Todo del Plan Basic",
        "Sistema multi-agente completo",
        "Forecasting con IA",
        "Análisis de competencia",
        "Ideas de marketing automatizadas",
        "Múltiples tiendas (hasta 5)",
        "Analytics avanzados",
        "Historial extendido (30 días)",
        "Soporte prioritario"
      ],
      highlighted: true
    }
  ];

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (isAnnualBilling) {
      const monthlyEquivalent = plan.annualPrice / 12;
      return {
        price: `$${monthlyEquivalent.toFixed(2)}/mes`,
        fullPrice: `$${plan.annualPrice}/año`,
        savings: `Ahorras $${((plan.monthlyPrice * 12) - plan.annualPrice).toFixed(2)}/año`
      };
    } else {
      return {
        price: `$${plan.monthlyPrice}/mes`,
        fullPrice: `$${plan.monthlyPrice}/mes`,
        savings: null
      };
    }
  };

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
            <div className="py-6">
              <div className="w-full max-w-3xl mx-auto">
                {/* Steps Grid */}
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { number: 1, label: "Tienda" },
                    { number: 2, label: "Análisis" },
                    { number: 3, label: "Perfil" },
                    { number: 4, label: "WhatsApp" },
                    { number: 5, label: "Plan" }
                  ].map((step, index) => (
                    <div key={step.number} className="flex flex-col items-center relative">
                      {/* Connecting Line */}
                      {index < 4 && (
                        <div className="absolute top-4 left-1/2 w-full h-0.5 z-0">
                          <div
                            className={`h-full ml-4 ${
                              currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          />
                        </div>
                      )}
                      
                      {/* Step Circle */}
                      <div
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                          currentStep >= step.number
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {step.number}
                      </div>
                      
                      {/* Step Label */}
                      <span className="text-xs text-gray-600 text-center leading-tight">
                        {step.label}
                      </span>
                    </div>
                  ))}
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
        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Perfil del Negocio
              </h2>
              <p className="text-gray-600">
                Cuéntanos sobre tu negocio para ofrecerte mejores insights
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Personal Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Información Personal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Nombre Completo *
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Business Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>Información del Negocio</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {businessProfile && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Nombre del Negocio
                        </label>
                        <Input
                          value={businessProfile.businessName}
                          onChange={(e) => setBusinessProfile({
                            ...businessProfile,
                            businessName: e.target.value
                          })}
                          placeholder="Nombre de tu empresa"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Tipo de Negocio
                        </label>
                        <Input
                          value={businessProfile.category}
                          onChange={(e) => setBusinessProfile({
                            ...businessProfile,
                            category: e.target.value
                          })}
                          placeholder="Ej: E-commerce, Servicios, etc."
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Descripción del Negocio
                        </label>
                        <textarea
                          value={businessProfile.description}
                          onChange={(e) => setBusinessProfile({
                            ...businessProfile,
                            description: e.target.value
                          })}
                          placeholder="Describe brevemente tu negocio, productos o servicios..."
                          className="w-full p-3 border border-gray-300 rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Audiencia Objetivo
                        </label>
                        <Input
                          value={businessProfile.targetAudience}
                          onChange={(e) => setBusinessProfile({
                            ...businessProfile,
                            targetAudience: e.target.value
                          })}
                          placeholder="Describe tu audiencia objetivo"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Competitors Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Competidores Principales</span>
                  </CardTitle>
                  <CardDescription>
                    Agrega hasta 3 competidores para mejorar tu análisis competitivo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {competitors.map((competitor, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          Competidor {index + 1}
                        </h4>
                        {competitors.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveCompetitor(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            Nombre
                          </label>
                          <Input
                            value={competitor.name}
                            onChange={(e) => handleCompetitorChange(index, 'name', e.target.value)}
                            placeholder="Nombre del competidor"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            Sitio Web
                          </label>
                          <Input
                            value={competitor.website}
                            onChange={(e) => handleCompetitorChange(index, 'website', e.target.value)}
                            placeholder="https://..."
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            Instagram
                          </label>
                          <Input
                            value={competitor.instagram}
                            onChange={(e) => handleCompetitorChange(index, 'instagram', e.target.value)}
                            placeholder="@usuario"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {competitors.length < 3 && (
                    <Button
                      onClick={handleAddCompetitor}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Competidor
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousStep}
                  disabled={isLoading}
                >
                  Anterior
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={isLoading || !fullName.trim()}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar y Continuar'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 4 && !showOTPVerification && (
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

        {currentStep === 4 && showOTPVerification && (
          <Card>
            <CardHeader>
              <CardTitle>Verifica tu WhatsApp</CardTitle>
              <CardDescription>
                Hemos enviado un código de 6 dígitos a {whatsappNumber}. Ingresa el código para completar la configuración.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Verificación
                </label>
                <Input
                  id="otpCode"
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(value);
                    setOtpError("");
                  }}
                  className="w-full text-center text-lg tracking-wider"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  El código expira en 10 minutos.
                </p>
                {otpError && (
                  <p className="text-xs text-red-600 mt-1">{otpError}</p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-green-400">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      Revisa tu WhatsApp Business en <strong>{whatsappNumber}</strong> para encontrar el código de 6 dígitos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="space-x-3">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowOTPVerification(false);
                      setOtpCode("");
                      setOtpError("");
                      setWhatsappNumberId(null);
                    }}
                  >
                    Cambiar Número
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Reenviando...' : 'Reenviar Código'}
                  </Button>
                </div>
                <Button 
                  onClick={handleVerifyOTP}
                  disabled={isVerifyingOTP || otpCode.length !== 6}
                  className="min-w-[120px]"
                >
                  {isVerifyingOTP ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verificando...
                    </>
                  ) : (
                    'Verificar Código'
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
                Selecciona el plan que mejor se adapte a las necesidades de tu negocio. Ambos planes incluyen 7 días de prueba gratuita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripePricingTable 
                onPlanSelected={handleStripePlanSelected}
                showCustomPricing={false}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 