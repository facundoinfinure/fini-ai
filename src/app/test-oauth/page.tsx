"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, ArrowRight, CheckCircle, XCircle } from "lucide-react";

export default function TestOAuthPage() {
  const [storeUrl, setStoreUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTestOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validar y limpiar la URL
      let cleanUrl = storeUrl.trim().toLowerCase();
      cleanUrl = cleanUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
      
      if (!cleanUrl.includes(".")) {
        cleanUrl = `${cleanUrl}.mitiendanube.com`;
      }

      console.log("[TEST] Iniciando OAuth para:", cleanUrl);

      // Crear el estado con la URL de la tienda
      const stateData = {
        storeUrl: cleanUrl,
        test: true
      };

      // Redirigir directamente a Tienda Nube
      const authUrl = new URL("https://www.tiendanube.com/apps/authorize");
      authUrl.searchParams.set("client_id", "18730");
      authUrl.searchParams.set("scope", "read_products read_orders read_customers read_store");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", "http://localhost:3000/api/auth/callback/tiendanube");
      authUrl.searchParams.set("state", JSON.stringify(stateData));

      console.log("[TEST] URL de autorización:", authUrl.toString());
      
      // Abrir en nueva ventana para mejor debugging
      window.open(authUrl.toString(), "_blank", "width=800,height=600");
      
      setSuccess("Ventana de autorización abierta. Completa el proceso en Tienda Nube.");
      
    } catch (error) {
      console.error("[TEST] Error:", error);
      setError("Error iniciando OAuth: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectTest = () => {
    const testUrl = "https://www.tiendanube.com/apps/authorize?client_id=18730&scope=read_products%20read_orders%20read_customers%20read_store&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Ftiendanube&state=test";
    window.open(testUrl, "_blank", "width=800,height=600");
    setSuccess("Test directo abierto. Verifica que puedas ver la página de autorización.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🧪 Test OAuth Tienda Nube</h1>
          <p className="mt-2 text-sm text-gray-600">
            Prueba el flujo de autenticación paso a paso
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>Test de OAuth</CardTitle>
            <CardDescription>
              Prueba la conexión con Tienda Nube
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleTestOAuth} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="mitienda.mitiendanube.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa la URL de tu tienda
                </p>
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Store className="mr-2 h-4 w-4" />
                )}
                Probar OAuth con Tienda
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">o</span>
              </div>
            </div>

            <Button
              onClick={handleDirectTest}
              variant="outline"
              className="w-full"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Test Directo (Sin URL)
            </Button>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">📋 Instrucciones:</h3>
              <ol className="text-xs text-gray-600 space-y-1">
                <li>1. Ingresa la URL de tu tienda</li>
                <li>2. Haz click en "Probar OAuth"</li>
                <li>3. Se abrirá una ventana de Tienda Nube</li>
                <li>4. Autoriza la aplicación</li>
                <li>5. Deberías ser redirigido de vuelta</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 