"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Mail, Eye, EyeOff, CheckCircle, X, ArrowLeft, ArrowRight, Loader2, Store, ShoppingBag, BarChart3, MessageSquare, Users, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordRequirement {
  text: string;
  met: boolean;
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Password validation
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([
    { text: "Entre 8 y 64 caracteres", met: false },
    { text: "Al menos una letra mayúscula", met: false },
    { text: "Al menos una letra minúscula", met: false },
    { text: "Al menos un número", met: false },
    { text: "Al menos un carácter especial", met: false },
  ]);

  // Redirect if user is already signed in
  useEffect(() => {
    if (user && !loading) {
      router.push("/onboarding");
    }
  }, [user, loading, router]);

  // Password validation
  useEffect(() => {
    const requirements = [
      { text: "Entre 8 y 64 caracteres", met: password.length >= 8 && password.length <= 64 },
      { text: "Al menos una letra mayúscula", met: /[A-Z]/.test(password) },
      { text: "Al menos una letra minúscula", met: /[a-z]/.test(password) },
      { text: "Al menos un número", met: /\d/.test(password) },
      { text: "Al menos un carácter especial", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    setPasswordRequirements(requirements);
  }, [password]);

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const passwordStrength = passwordRequirements.filter(req => req.met).length;

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");
    
    const result = await signInWithGoogle();
    
    if (!result.success) {
      setError(result.error || "Error al registrarse con Google");
      setIsLoading(false);
    }
    // If successful, the auth hook will handle the redirect
  };

  const handleTiendaNubeSignUp = () => {
    // TODO: Implementar la lógica de conexión de Tienda Nube
    console.log('[INFO] Tienda Nube connection will be implemented soon');
    setError("Función próximamente disponible");
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate email
      if (!email || !email.includes('@')) {
        setError("Por favor ingresa un email válido");
        return;
      }
      setError("");
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate all fields
      if (!fullName.trim()) {
        setError("Por favor ingresa tu nombre completo");
        return;
      }
      if (!isPasswordValid) {
        setError("La contraseña no cumple con todos los requisitos");
        return;
      }
      setError("");
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const handleCreateAccount = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // For now, we'll use the email signin flow
      // In a real implementation, you'd create the account with email/password
      const result = await signInWithEmail(email);

      if (result.success) {
        setSuccess("¡Cuenta creada! Revisa tu email para verificar tu cuenta.");
        // Store user data for later use
        sessionStorage.setItem('pendingUserName', fullName);
      } else {
        setError(result.error || "Error al crear la cuenta");
      }
    } catch (error) {
      setError("Error al crear la cuenta. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Sign up form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-12 xl:px-16">
        {/* Header */}
        <div className="flex items-center mb-8">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <h1 className="ml-3 text-xl font-bold text-gray-900">Fini AI</h1>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">
          {/* Main title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Comenzar con Fini AI
            </h2>
            <p className="text-gray-600">
              Prueba Fini AI gratis
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Social Sign Up Options */}
          <div className="space-y-3 mb-6">
            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 text-left justify-start font-medium border-gray-300 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              CONTINUAR CON GOOGLE
            </Button>

            {/* Tienda Nube Sign Up */}
            <Button
              onClick={handleTiendaNubeSignUp}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 text-left justify-start font-medium border-gray-300 hover:bg-gray-50"
            >
              <Store className="w-5 h-5 mr-3" />
              CONTINUAR CON TIENDA NUBE
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">O</span>
            </div>
          </div>

          {/* Step-based form */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="samlee.mobbin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
                />
              </div>
              <Button
                onClick={handleNextStep}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={!email}
              >
                SIGUIENTE
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <Button
                onClick={handlePreviousStep}
                variant="ghost"
                className="p-0 h-auto text-blue-600 hover:text-blue-700 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Tu nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Crea una contraseña segura"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password requirements */}
              {password && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm text-gray-600">Requisitos de contraseña:</div>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center text-sm">
                      {req.met ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span className={req.met ? "text-green-700" : "text-red-600"}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleNextStep}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={!fullName || !isPasswordValid}
              >
                CREAR CUENTA
              </Button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¡Cuenta creada exitosamente!
                </h3>
                <p className="text-gray-600 text-sm">
                  Te hemos enviado un email de verificación. Revisa tu bandeja de entrada.
                </p>
              </div>
              
              <Button
                onClick={() => router.push('/auth/signin')}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                IR AL INICIO DE SESIÓN
              </Button>
            </div>
          )}

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">¿Ya tienes una cuenta? </span>
            <a href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-medium">
              Inicia sesión
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Benefits illustration (similar to Origin) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        <div className="flex flex-col justify-center px-12 py-16 relative z-10">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 leading-tight">
              Chatea, analiza y haz crecer tu negocio, todo con Fini AI.
            </h2>
            
            {/* Feature highlights */}
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="p-2 bg-green-500 rounded-lg mr-4 mt-1">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Conecta tu tienda automáticamente</h3>
                  <p className="text-gray-600 text-sm">Integración directa con Tienda Nube sin configuración manual</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-blue-500 rounded-lg mr-4 mt-1">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Analytics en tiempo real por WhatsApp</h3>
                  <p className="text-gray-600 text-sm">Pregunta sobre ventas, inventario y clientes desde tu móvil</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-purple-500 rounded-lg mr-4 mt-1">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">IA especializada en e-commerce</h3>
                  <p className="text-gray-600 text-sm">Agentes inteligentes para ventas, marketing y atención al cliente</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-orange-500 rounded-lg mr-4 mt-1">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Forecasting con IA</h3>
                  <p className="text-gray-600 text-sm">Predicciones de ventas y recomendaciones personalizadas</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-green-600 rounded-lg mr-4 mt-1">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Entiende a tus clientes</h3>
                  <p className="text-gray-600 text-sm">Análisis de comportamiento y segmentación inteligente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-10 right-10 w-20 h-20 bg-blue-200 rounded-full opacity-50"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-purple-200 rounded-full opacity-30"></div>
        <div className="absolute top-1/2 right-5 w-16 h-16 bg-green-200 rounded-full opacity-40"></div>
      </div>
    </div>
  );
} 