"use client";

import { useAuth } from "@/hooks/useAuth";
import { Mail, Bot, CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const { user, loading } = useAuth();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Redirect if user is already signed in
  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleBackToSignIn = () => {
    router.push("/auth/signin");
  };

  const handleResendEmail = () => {
    if (email) {
      router.push(`/auth/signin?email=${email}`);
    } else {
      router.push("/auth/signin");
    }
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
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle>Revisa tu email</CardTitle>
            <CardDescription>
              Te hemos enviado un link de confirmación
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  Hemos enviado un link de confirmación a:
                </p>
                <p className="font-medium text-gray-900">{email}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium mb-1">¿No recibiste el email?</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Revisa tu carpeta de spam</li>
                      <li>• Verifica que el email esté correcto</li>
                      <li>• Espera unos minutos y revisa nuevamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleResendEmail} 
                  variant="outline" 
                  className="w-full"
                >
                  Reenviar email
                </Button>
                
                <Button 
                  onClick={handleBackToSignIn} 
                  variant="ghost" 
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            ¿Necesitas ayuda?{" "}
            <a href="/support" className="text-blue-600 hover:underline">
              Contacta soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyRequestContent />
    </Suspense>
  );
} 