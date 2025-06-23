"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


const errorMessages: Record<string, { title: string; description: string; solution: string }> = {
  Configuration: {
    title: "Error de Configuración",
    description: "Hay un problema con la configuración de la aplicación.",
    solution: "Contacta al administrador del sitio."
  },
  AccessDenied: {
    title: "Acceso Denegado",
    description: "No tienes permisos para acceder a esta aplicación.",
    solution: "Verifica que tu cuenta de Tienda Nube tenga los permisos necesarios."
  },
  Verification: {
    title: "Error de Verificación",
    description: "No se pudo verificar tu email.",
    solution: "Revisa tu bandeja de entrada y spam, o solicita un nuevo enlace."
  },
  OAuthSignin: {
    title: "Error de OAuth",
    description: "Hubo un problema conectando con Tienda Nube.",
    solution: "Intenta nuevamente o usa otro método de inicio de sesión."
  },
  OAuthCallback: {
    title: "Error en Callback",
    description: "Error al procesar la respuesta de Tienda Nube.",
    solution: "La autorización falló. Intenta iniciar sesión nuevamente."
  },
  OAuthCreateAccount: {
    title: "Error Creando Cuenta",
    description: "No se pudo crear tu cuenta automáticamente.",
    solution: "Intenta con otro método de registro o contacta soporte."
  },
  EmailCreateAccount: {
    title: "Error de Email",
    description: "No se pudo crear una cuenta con este email.",
    solution: "El email podría estar ya en uso o ser inválido."
  },
  Callback: {
    title: "Error de Autenticación",
    description: "Hubo un error en el proceso de autenticación.",
    solution: "Intenta iniciar sesión nuevamente."
  },
  OAuthAccountNotLinked: {
    title: "Cuenta No Vinculada",
    description: "Ya existe una cuenta con este email usando otro método.",
    solution: "Usa el método de inicio de sesión original o contacta soporte."
  },
  EmailSignin: {
    title: "Error de Email",
    description: "No se pudo enviar el email de inicio de sesión.",
    solution: "Verifica tu email e intenta nuevamente."
  },
  CredentialsSignin: {
    title: "Credenciales Inválidas",
    description: "Los datos de inicio de sesión son incorrectos.",
    solution: "Verifica tu email y contraseña."
  },
  AccountCancelled: {
    title: "Cuenta Cancelada",
    description: "Tu cuenta ha sido cancelada.",
    solution: "Contacta soporte para reactivar tu cuenta."
  },
  SessionRequired: {
    title: "Sesión Requerida",
    description: "Necesitas iniciar sesión para acceder a esta página.",
    solution: "Inicia sesión para continuar."
  },
  Default: {
    title: "Error de Autenticación",
    description: "Ocurrió un error inesperado durante el inicio de sesión.",
    solution: "Intenta nuevamente o contacta soporte si el problema persiste."
  }
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  
  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fini AI</h1>
          <p className="text-gray-600">WhatsApp Analytics para Tienda Nube</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-red-900">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Solución:</strong> {errorInfo.solution}
              </AlertDescription>
            </Alert>

            {error === "OAuthCallback" || error === "OAuthSignin" ? (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-800">
                  <strong>Tip:</strong> Asegúrate de autorizar completamente la aplicación en Tienda Nube y que tu tienda esté activa.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 pt-4">
              <Link 
                href="/auth/signin"
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white shadow hover:bg-blue-700 h-9 px-4 py-2"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar Nuevamente
              </Link>
              
              <Link 
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                <Home className="mr-2 h-4 w-4" />
                Volver al Inicio
              </Link>
            </div>

            <div className="text-center pt-4 text-sm text-gray-500">
              <p>¿Necesitas ayuda?</p>
              <a 
                href="mailto:soporte@fini-ai.com" 
                className="text-blue-600 hover:underline"
              >
                soporte@fini-ai.com
              </a>
            </div>

            {/* Debug info for development */}
            {process.env.NODE_ENV === "development" && (
              <Alert className="bg-gray-50 border-gray-200 mt-4">
                <AlertDescription className="text-xs text-gray-600">
                  <strong>Debug:</strong> Error = {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
} 