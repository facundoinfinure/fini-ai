"use client";

import { Suspense } from "react";
import { signIn, getSession, getProviders } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Bot, Zap, TrendingUp, Store, CheckCircle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SignInContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<any>(null);
  const [showStoreUrlDialog, setShowStoreUrlDialog] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [storeUrlError, setStoreUrlError] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const callbackCode = searchParams.get("callbackCode");
  const fromTiendaNube = searchParams.get("from") === "tiendanube";

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session?.user) {
        // Si tenemos un código de callback de Tienda Nube, redirigir al callback
        if (callbackCode && fromTiendaNube) {
          const callbackUrl = new URL("/api/tiendanube/oauth/callback", window.location.origin);
          callbackUrl.searchParams.set("code", callbackCode);
          router.push(callbackUrl.toString());
        } else {
          router.push(callbackUrl);
        }
      }
    });

    // Get available providers
    getProviders().then(setProviders);
  }, [router, callbackUrl, callbackCode, fromTiendaNube]);

  useEffect(() => {
    // Handle auth errors with Spanish messages
    if (errorParam) {
      switch (errorParam) {
        case "CredentialsSignin":
          setError("Credenciales inválidas. Revisa tu email.");
          break;
        case "EmailCreateAccount":
          setError("No se pudo crear la cuenta. Intenta con otro email.");
          break;
        case "OAuthAccountNotLinked":
          setError("Ya existe una cuenta con este email. Usa el método original de inicio de sesión.");
          break;
        case "AccessDenied":
          setError("Acceso denegado. Verifica que tu tienda esté activa en Tienda Nube.");
          break;
        case "OAuthCallback":
          setError("Error conectando con Tienda Nube. Intenta nuevamente.");
          break;
        case "no_session":
          setError("Sesión expirada. Inicia sesión nuevamente.");
          break;
        case "missing_supabase_id":
          setError("Error interno: UUID de Supabase no encontrado. Intenta cerrar sesión y volver a ingresar.");
          break;
        default:
          setError("Error de autenticación. Intenta nuevamente.");
      }
    }
  }, [errorParam]);

  const handleTiendaNubeSignIn = async () => {
    setShowStoreUrlDialog(true);
  };

  const handleStoreUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreUrlError("");
    setIsLoading(true);

    try {
      // Validar y limpiar la URL
      let cleanUrl = storeUrl.trim().toLowerCase();
      
      // Remover protocolo y trailing slash
      cleanUrl = cleanUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
      
      // Agregar .mitiendanube.com si no tiene dominio
      if (!cleanUrl.includes(".")) {
        cleanUrl = `${cleanUrl}.mitiendanube.com`;
      }

      // Validar que la URL sea válida
      try {
        new URL(`https://${cleanUrl}`);
      } catch (e) {
        setStoreUrlError("URL inválida. Ingresa el dominio de tu tienda.");
        setIsLoading(false);
        return;
      }

      console.log("[UI] Iniciando login con Tienda Nube para:", cleanUrl);
      
      // Crear el estado con la URL de la tienda
      const stateData = {
        storeUrl: cleanUrl,
        ...(callbackCode ? { callbackCode } : {})
      };

      // Usar el parámetro state de NextAuth correctamente
      await signIn("tiendanube", { 
        callbackUrl: "/dashboard",
        redirect: true,
        state: JSON.stringify(stateData)
      });
    } catch (error) {
      console.error("[UI] Error con Tienda Nube:", error);
      setStoreUrlError("Error conectando con Tienda Nube. Intenta nuevamente.");
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("Error enviando el email. Intenta nuevamente.");
      } else {
        router.push("/auth/verify-request");
      }
    } catch (error) {
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (error) {
      setError("Error con Google. Intenta nuevamente.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={showStoreUrlDialog} onOpenChange={setShowStoreUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar tu Tienda Nube</DialogTitle>
            <DialogDescription>
              Ingresa la URL de tu tienda para continuar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStoreUrlSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="mitienda.mitiendanube.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                required
              />
              {storeUrlError && (
                <p className="text-sm text-red-500">{storeUrlError}</p>
              )}
              <p className="text-xs text-gray-500">
                Ejemplo: mitienda.mitiendanube.com
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowStoreUrlDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continuar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center font-semibold">
                {fromTiendaNube ? "Completa el registro" : "Iniciar Sesión"}
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                {fromTiendaNube 
                  ? "Inicia sesión para completar la conexión con tu tienda"
                  : "Conecta tu tienda y comienza a usar IA para analytics"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Tienda Nube Sign In - PROMINENTE */}
              <div className="space-y-3">
                <Button
                  onClick={handleTiendaNubeSignIn}
                  disabled={isLoading}
                  size="lg"
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transform transition-all hover:scale-105"
                >
                  {isLoading ? (
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  ) : (
                    <Store className="mr-3 h-5 w-5" />
                  )}
                  <div className="text-left">
                    <div className="font-semibold">
                      {fromTiendaNube ? "Completar conexión con Tienda Nube" : "Continuar con Tienda Nube"}
                    </div>
                    <div className="text-xs opacity-90">
                      {fromTiendaNube ? "Retomar donde lo dejaste" : "Recomendado - Configuración automática"}
                    </div>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
                
                <p className="text-xs text-center text-gray-600">
                  {fromTiendaNube 
                    ? "Completa el proceso de conexión con tu tienda"
                    : "Conecta directamente con tus credenciales de Tienda Nube"}
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">o usar otro método</span>
                </div>
              </div>

              {/* Google Sign In */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                className="w-full h-11"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                )}
                Continuar con Google
              </Button>

              {/* Email Sign In Form */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">o usar email</span>
                </div>
              </div>

              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Continuar con Email
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
} 