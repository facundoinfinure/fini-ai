"use client";

import { 
  Bot, 
  MessageSquare, 
  TrendingUp, 
  Zap, 
  Store, 
  Brain,
  CheckCircle,
  ArrowRight,
  Star,
  Users,
  BarChart3,
  Clock,
  Shield,
  Smartphone
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export default function HomePage() {
  const { data: session, status } = useSession();
  const _router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    // Timeout para evitar loading infinito
    const _timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000); // 5 segundos máximo de loading

    return () => clearTimeout(_timer);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    
    if (session?.user) {
      // Always redirect to dashboard - let dashboard handle onboarding status
      _router.push("/dashboard");
    }
  }, [session, status, _router]);

  // Si está loading por más de 5 segundos, mostrar la página normal
  if (status === "loading" && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando...</p>
          <p className="text-sm text-gray-400 mt-2">Si esto tarda mucho, revisa tu configuración</p>
        </div>
      </div>
    );
  }

  if (session?.user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Fini AI</span>
          </div>
          <Button asChild variant="outline">
            <Link href="/auth/signin">
              Iniciar Sesión
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2">
              🚀 Sistema Multi-Agente con IA + WhatsApp Business
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Conecta tu{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tienda Nube
              </span>{" "}
              con WhatsApp IA
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Registrate con tus credenciales de Tienda Nube y obtén analytics automáticos, 
              respuestas inteligentes y insights en tiempo real para tu negocio.
            </p>

            {/* Tienda Nube CTA Prominente */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
              <div className="flex items-center justify-center mb-4">
                <Store className="h-8 w-8 mr-3" />
                <h2 className="text-2xl font-bold">¿Tienes una Tienda Nube?</h2>
              </div>
              <p className="text-lg mb-6 text-blue-100">
                Regístrate en 30 segundos y conecta automáticamente tu tienda
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
                  <span>Conexión automática</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
                  <span>Sin configuración manual</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
                  <span>Analytics en segundos</span>
                </div>
              </div>
              <Button size="lg" variant="secondary" asChild className="shadow-lg">
                <Link href="/auth/signin">
                  <Store className="mr-2 h-5 w-5" />
                  Conectar mi Tienda Nube
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Alternative CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/signin">
                  Probar con otra cuenta
                </Link>
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              ✨ 14 días gratis • Sin tarjeta de crédito • Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir Fini AI para tu Tienda Nube?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              La integración más completa entre Tienda Nube y WhatsApp Business con IA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="p-3 bg-blue-50 rounded-full w-fit mx-auto mb-4">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Setup en 30 segundos</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Con tus credenciales de Tienda Nube, tu tienda se conecta automáticamente. 
                  Sin APIs, sin configuraciones complejas.
                </p>
              </CardContent>
            </Card>

            {/* Benefit 2 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="p-3 bg-purple-50 rounded-full w-fit mx-auto mb-4">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">IA Multi-Agente</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Sistema inteligente con agentes especializados en analytics, marketing, 
                  atención al cliente y ventas.
                </p>
              </CardContent>
            </Card>

            {/* Benefit 3 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="p-3 bg-green-50 rounded-full w-fit mx-auto mb-4">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">WhatsApp Nativo</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Recibe analytics y insights directamente en WhatsApp. 
                  Tus clientes también pueden chatear con IA sobre tus productos.
                </p>
              </CardContent>
            </Card>

            {/* Benefit 4 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="p-3 bg-orange-50 rounded-full w-fit mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Analytics Tiempo Real</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Ventas, productos top, análisis de clientes y forecasting con IA. 
                  Todo sincronizado con tu Tienda Nube.
                </p>
              </CardContent>
            </Card>

            {/* Benefit 5 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="p-3 bg-red-50 rounded-full w-fit mx-auto mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Seguro y Confiable</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Integración oficial OAuth con Tienda Nube. Tus datos están seguros 
                  y la conexión es estable.
                </p>
              </CardContent>
            </Card>

            {/* Benefit 6 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="p-3 bg-yellow-50 rounded-full w-fit mx-auto mb-4">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">Soporte Español</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Desarrollado específicamente para el mercado latinoamericano 
                  con soporte en español.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            ¿Listo para automatizar tu tienda con IA?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Únete a cientos de tiendas que ya están usando Fini AI para crecer más rápido.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="shadow-lg">
              <Link href="/auth/signin">
                <Store className="mr-2 h-5 w-5" />
                Empezar con Tienda Nube
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="text-sm text-blue-200 mt-4">
            Prueba gratuita de 14 días • Sin compromisos
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mr-3">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Fini AI</span>
          </div>
          <p className="text-sm">
            © 2024 Fini AI. Hecho con ❤️ para el ecosistema Tienda Nube.
          </p>
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Términos
            </Link>
            <Link href="mailto:soporte@fini-ai.com" className="hover:text-white transition-colors">
              Soporte
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
} 