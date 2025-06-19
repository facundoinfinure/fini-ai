"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, ArrowRight, CheckCircle, XCircle, Settings, TestTube, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DevTestPage() {
  const [storeUrl, setStoreUrl] = useState("");
  const [storeId, setStoreId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [environment, setEnvironment] = useState<"development" | "staging" | "production">("development");
  const [endpoint, setEndpoint] = useState("store");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [response, setResponse] = useState<any>(null);

  const handleDevConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setResponse(null);

    try {
      console.log("[DEV-TEST] Iniciando conexión de desarrollo:", {
        storeUrl,
        storeId,
        environment,
        hasAccessToken: !!accessToken
      });

      const response = await fetch("/api/tiendanube/dev-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeUrl,
          storeId: storeId || undefined,
          accessToken: accessToken || undefined,
          environment
        }),
      });

      const data = await response.json();
      setResponse(data);

      if (data.success) {
        setSuccess(data.message || "Conexión exitosa");
        
        // Si tenemos una URL de autorización, abrirla
        if (data.data?.authUrl) {
          console.log("[DEV-TEST] Abriendo URL de autorización:", data.data.authUrl);
          window.open(data.data.authUrl, "_blank", "width=800,height=600");
        }
      } else {
        setError(data.error || "Error en la conexión");
      }
    } catch (error) {
      console.error("[DEV-TEST] Error:", error);
      setError("Error de conexión: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAPI = async () => {
    if (!storeId || !accessToken) {
      setError("Se requiere Store ID y Access Token para probar la API");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("[DEV-TEST] Probando API directamente");
      
      const apiBase = environment === 'staging' 
        ? 'https://api-staging.tiendanube.com/v1'
        : 'https://api.tiendanube.com/v1';

      const testResponse = await fetch(`${apiBase}/${storeId}/${endpoint}`, {
        headers: {
          'Authentication': `bearer ${accessToken}`,
          'User-Agent': 'FiniAI/1.0 (Development Testing)',
          'Content-Type': 'application/json',
        },
      });

      if (testResponse.ok) {
        const storeData = await testResponse.json();
        setResponse({
          success: true,
          data: storeData,
          message: "API test successful"
        });
        setSuccess("Conexión directa a la API exitosa");
      } else {
        const errorText = await testResponse.text();
        setError(`API test failed: ${testResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("[DEV-TEST] API test error:", error);
      setError("Error probando API: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!storeId || !accessToken) {
      setError("Se requiere Store ID y Access Token para probar la conexión");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("[DEV-TEST] Probando conexión con endpoint especializado");
      
      const response = await fetch("/api/tiendanube/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          accessToken,
          environment,
          endpoint
        }),
      });

      const data = await response.json();
      setResponse(data);

      if (data.success) {
        setSuccess(data.message || "Test de conexión exitoso");
      } else {
        setError(data.error || "Error en el test de conexión");
      }
    } catch (error) {
      console.error("[DEV-TEST] Connection test error:", error);
      setError("Error en test de conexión: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTest = () => {
    setStoreUrl("mitienda.mitiendanube.com");
    setEnvironment("development");
    setSuccess("Valores de prueba cargados. Haz click en 'Probar Conexión'");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🧪 Dev Test - Tienda Nube</h1>
          <p className="mt-2 text-sm text-gray-600">
            Herramienta de desarrollo para probar conexiones con Tienda Nube
          </p>
        </div>

        <div className="grid gap-6">
          {/* Formulario Principal */}
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Conexión de Desarrollo
              </CardTitle>
              <CardDescription>
                Prueba la conexión con tu tienda de desarrollo
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

              <form onSubmit={handleDevConnect} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">URL de la Tienda</label>
                    <Input
                      type="text"
                      placeholder="mitienda.mitiendanube.com"
                      value={storeUrl}
                      onChange={(e) => setStoreUrl(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL de tu tienda de desarrollo
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Entorno</label>
                    <Select value={environment} onValueChange={(value: any) => setEnvironment(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Store ID (Opcional)</label>
                    <Input
                      type="text"
                      placeholder="12345"
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Para conexión directa
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Access Token (Opcional)</label>
                    <Input
                      type="password"
                      placeholder="tn_..."
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Para conexión directa
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Endpoint</label>
                    <Select value={endpoint} onValueChange={(value: any) => setEndpoint(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store">Store Info</SelectItem>
                        <SelectItem value="products">Products</SelectItem>
                        <SelectItem value="orders">Orders</SelectItem>
                        <SelectItem value="customers">Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 min-w-[200px]"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Store className="mr-2 h-4 w-4" />
                    )}
                    Probar Conexión
                  </Button>

                  <Button
                    type="button"
                    onClick={handleTestAPI}
                    disabled={isLoading || !storeId || !accessToken}
                    variant="outline"
                    className="min-w-[150px]"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Test API
                  </Button>

                  <Button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isLoading || !storeId || !accessToken}
                    variant="outline"
                    className="min-w-[150px]"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>
                </div>
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
                onClick={handleQuickTest}
                variant="outline"
                className="w-full"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Cargar Valores de Prueba
              </Button>
            </CardContent>
          </Card>

          {/* Respuesta de la API */}
          {response && (
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle>Respuesta de la API</CardTitle>
                <CardDescription>
                  Resultado de la última operación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Instrucciones */}
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle>📋 Instrucciones de Desarrollo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">🔗 Conexión OAuth:</h4>
                  <ol className="text-xs text-gray-600 space-y-1 ml-4">
                    <li>1. Ingresa solo la URL de tu tienda</li>
                    <li>2. Selecciona el entorno (development/staging/production)</li>
                    <li>3. Haz click en "Probar Conexión"</li>
                    <li>4. Se abrirá la ventana de autorización de Tienda Nube</li>
                    <li>5. Autoriza la aplicación</li>
                    <li>6. Verifica la respuesta en la consola</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">⚡ Conexión Directa:</h4>
                  <ol className="text-xs text-gray-600 space-y-1 ml-4">
                    <li>1. Ingresa URL, Store ID y Access Token</li>
                    <li>2. Selecciona el endpoint a probar</li>
                    <li>3. Haz click en "Test API" o "Test Connection"</li>
                    <li>4. Se probará la conexión directamente</li>
                    <li>5. Útil para debugging con credenciales existentes</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">🌐 URLs Válidas:</h4>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4">
                    <li>• mitienda.mitiendanube.com</li>
                    <li>• mitienda.tiendanube.com</li>
                    <li>• localhost:3000</li>
                    <li>• tu-tunnel.ngrok.io</li>
                    <li>• tu-preview.vercel.app</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">🔧 Endpoints Disponibles:</h4>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4">
                    <li>• <strong>store</strong> - Información de la tienda</li>
                    <li>• <strong>products</strong> - Lista de productos</li>
                    <li>• <strong>orders</strong> - Lista de órdenes</li>
                    <li>• <strong>customers</strong> - Lista de clientes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 