"use client";

import { Mail, ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Fini AI</h1>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Revisa tu email</CardTitle>
            <CardDescription>
              Te enviamos un enlace mágico para iniciar sesión sin contraseña
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">¿Qué hacer ahora?</h3>
                <ol className="text-sm text-blue-700 space-y-1 text-left">
                  <li>1. Revisa tu bandeja de entrada</li>
                  <li>2. Busca el email de Fini AI</li>
                  <li>3. Haz clic en el enlace para iniciar sesión</li>
                  <li>4. ¡Listo! Serás redirigido automáticamente</li>
                </ol>
              </div>

              <div className="text-sm text-gray-600">
                <p>El enlace expirará en 1 hora por seguridad.</p>
                <p className="mt-2">
                  ¿No ves el email? Revisa tu carpeta de spam o{" "}
                  <Link href="/auth/signin" className="text-blue-600 hover:underline">
                    intenta nuevamente
                  </Link>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" asChild className="w-full">
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help section */}
        <div className="mt-6 text-center">
          <div className="bg-gray-50 rounded-lg p-4 border">
            <p className="text-sm font-medium text-gray-800 mb-1">
              ¿Problemas para acceder?
            </p>
            <p className="text-xs text-gray-600">
              Contacta nuestro soporte en{" "}
              <a href="mailto:soporte@fini-ai.com" className="text-blue-600 hover:underline">
                soporte@fini-ai.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 