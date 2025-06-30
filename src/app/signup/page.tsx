"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Mail, Eye, EyeOff, CheckCircle, X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h1 className="ml-3 text-xl font-bold text-gray-900">Fini AI</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <a 
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Iniciar Sesión
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left side - Benefits (similar to Origin) */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-50 to-green-100 p-12 items-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Chatea, analiza y haz crecer tu negocio, todo en Fini AI.
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Conecta tu tienda en segundos</h3>
                  <p className="text-gray-600 text-sm">Integración automática con Tienda Nube sin configuración manual</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Analytics en tiempo real por WhatsApp</h3>
                  <p className="text-gray-600 text-sm">Pregunta sobre ventas, inventario y clientes desde WhatsApp</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">IA multi-agente especializada</h3>
                  <p className="text-gray-600 text-sm">Agentes especializados en ventas, marketing y atención al cliente</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Predicciones de ventas con IA</h3>
                  <p className="text-gray-600 text-sm">Forecasting inteligente y recomendaciones de productos</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Ideas de marketing personalizadas</h3>
                  <p className="text-gray-600 text-sm">Campañas y estrategias generadas automáticamente para tu tienda</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Reportes diarios automáticos</h3>
                  <p className="text-gray-600 text-sm">Resúmenes inteligentes de tu negocio todos los días</p>
                </div>
              </div>
            </div>

            {/* Mock phone preview */}
            <div className="mt-12 bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="text-4xl font-bold text-gray-900">$127,450</div>
                <div className="text-sm text-gray-600">Ventas totales</div>
                <div className="flex justify-center items-center mt-2">
                  <span className="text-green-600 text-sm font-medium">+15% vs ayer</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Signup form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Step 1: Get Started */}
            {currentStep === 1 && (
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Comenzar con Fini AI</CardTitle>
                  <CardDescription>
                    Prueba Fini AI gratis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Google signup */}
                  <Button 
                    onClick={handleGoogleSignUp}
                    variant="outline" 
                    className="w-full h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    CONTINUAR CON GOOGLE
                  </Button>

                  {/* Apple signup */}
                  <Button 
                    variant="outline" 
                    className="w-full h-12"
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    CONTINUAR CON APPLE ID
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        O
                      </span>
                    </div>
                  </div>

                  {/* Email input */}
                  <div>
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      E-mail
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="samlee.mobbin@gmail.com"
                      className="mt-1"
                    />
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Next button */}
                  <Button 
                    onClick={handleNextStep}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={isLoading}
                  >
                    SIGUIENTE
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    ¿Ya tienes una cuenta?{' '}
                    <a href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-medium">
                      Inicia sesión
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Create Account Details */}
            {currentStep === 2 && (
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Crear una cuenta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Email (read-only) */}
                  <div>
                    <label htmlFor="email-readonly" className="text-sm font-medium text-gray-700">
                      E-mail
                    </label>
                    <Input
                      id="email-readonly"
                      type="email"
                      value={email}
                      readOnly
                      className="mt-1 bg-gray-50"
                    />
                  </div>

                  {/* Full name */}
                  <div>
                    <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                      Tu nombre completo
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Sam Lee"
                      className="mt-1"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Crear una contraseña
                    </label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
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
                    <div className="space-y-2">
                      {/* Password strength indicator */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {passwordStrength === 0 && "Muy débil"}
                          {passwordStrength === 1 && "Débil"}
                          {passwordStrength === 2 && "Regular"}
                          {passwordStrength === 3 && "Buena"}
                          {passwordStrength === 4 && "Fuerte"}
                          {passwordStrength === 5 && "Muy fuerte"}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength <= 1 ? 'bg-red-500' :
                              passwordStrength <= 2 ? 'bg-yellow-500' :
                              passwordStrength <= 3 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Requirements list */}
                      <div className="space-y-1">
                        {passwordRequirements.map((requirement, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            {requirement.met ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-sm ${requirement.met ? 'text-green-700' : 'text-red-700'}`}>
                              {requirement.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline"
                      onClick={handlePreviousStep}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      ATRÁS
                    </Button>
                    <Button 
                      onClick={handleNextStep}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      disabled={isLoading || !isPasswordValid}
                    >
                      SIGUIENTE
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Plan Selection */}
            {currentStep === 3 && (
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Comienza con una semana gratis.</CardTitle>
                  <CardDescription>
                    Disfruta una semana gratis, luego $39/mes (facturado a $468/año)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Plan benefits */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Analytics en tiempo real</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>WhatsApp integrado</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>IA multi-agente</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Predicciones de ventas</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Ideas de marketing</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Reportes automáticos</span>
                    </div>
                  </div>

                  {/* Success Alert */}
                  {success && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Create account button */}
                  <Button 
                    onClick={handleCreateAccount}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    CREAR CUENTA
                  </Button>

                  {/* Navigation buttons */}
                  <div className="flex justify-center">
                    <Button 
                      variant="ghost"
                      onClick={handlePreviousStep}
                      disabled={isLoading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Atrás
                    </Button>
                  </div>

                  {/* Legal text */}
                  <div className="text-xs text-gray-500 text-center">
                    Al crear una cuenta, aceptas nuestros{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700">Términos de Servicio</a>
                    {' '}y{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700">Política de Privacidad</a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 