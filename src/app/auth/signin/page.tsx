"use client";

import { useAuth } from "@/hooks/useAuth";
import { Loader2, Mail, Bot, Store, CheckCircle, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function SignInContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const redirectedFrom = searchParams.get("redirectedFrom");
  
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth();

  // Redirect if user is already signed in
  useEffect(() => {
    if (user && !loading) {
      router.push(redirectedFrom || "/dashboard");
    }
  }, [user, loading, router, redirectedFrom]);

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

  const handleSignInWithGoogle = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    const result = await signInWithGoogle();
    
    if (!result.success) {
      setError(result.error || "Error al iniciar sesión con Google");
      setIsLoading(false);
    }
    // If successful, the auth hook will handle the redirect
  };

  const handleSignInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError("Por favor ingresa tu email");
      setIsLoading(false);
      return;
    }

    const result = await signInWithEmail(email);

    if (result.success) {
      setSuccess("¡Email enviado! Revisa tu bandeja de entrada para continuar.");
      setEmail("");
    } else {
      setError(result.error || "Error al enviar el email");
    }
    
    setIsLoading(false);
  };

  const handleTiendaNubeSignIn = () => {
    // TODO: Implementar la lógica de conexión de Tienda Nube
    alert("La conexión con Tienda Nube se implementará próximamente.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Fini AI</h1>
          <p className="mt-2 text-sm text-gray-600">
            Analytics inteligente para tu Tienda Nube
          </p>
        </div>

        {/* Benefits for Tienda Nube users */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6 border border-blue-200">
          <div className="text-center mb-3">
            <h3 className="font-semibold text-blue-900 text-sm">
              🏪 ¿Tienes una Tienda Nube?
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-blue-800">
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
              <span>Conexión automática de tu tienda</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
              <span>Analytics listos en segundos</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
              <span>Sin configuración manual</span>
            </div>
          </div>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Conecta tu tienda y comienza a usar IA para analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Error Alert */}
            {(error || message) && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error || message}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              {/* Tienda Nube Button */}
              <Button 
                onClick={handleTiendaNubeSignIn} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Store className="mr-2 h-4 w-4" />
                )}
                Continuar con Tienda Nube
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    O usar otro método
                  </span>
                </div>
              </div>

              {/* Google Button */}
              <Button 
                variant="outline" 
                onClick={handleSignInWithGoogle} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 60.3L337.9 162.3C309.4 139.2 279.9 128 248 128c-73.2 0-132.3 59.8-132.3 133.2s59.1 133.2 132.3 133.2c76.3 0 119.3-51.8 123.2-77.4H248V261.8h239.2z"></path>
                  </svg>
                )}
                <span className="ml-2">Continuar con Google</span>
              </Button>

              {/* Email Form */}
              <form onSubmit={handleSignInWithEmail} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">
                      O usar email
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Continuar con Email
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Al continuar, aceptas nuestros{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              Términos de Servicio
            </a>{" "}
            y{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
} 