import { Bot, ArrowRight, BarChart3, MessageSquare, Zap, Store, TrendingUp, Users, CheckCircle } from "lucide-react";

export default function HomePage() {
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
              <a 
                href="/signup"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Comenzar Gratis
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Similar to Origin's main section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Analiza, chatea y haz crecer tu{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                tienda, todo en Fini AI.
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Conecta tu Tienda Nube con WhatsApp y obtén analytics inteligentes al instante.
            </p>
            <a 
              href="/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-medium text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg inline-block"
            >
              COMENZAR GRATIS
            </a>
          </div>

          {/* App Preview - Similar to Origin's device mockup */}
          <div className="relative max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Chatea, analiza y haz crecer tu negocio, todo en Fini AI.
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-gray-700">Conecta tu tienda en segundos</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-gray-700">Analytics en tiempo real por WhatsApp</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-gray-700">IA multi-agente especializada</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-gray-700">Insights automáticos sin configuración</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-gray-700">Reportes diarios inteligentes</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-gray-700">Predicciones de ventas con IA</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-gray-700">Ideas de marketing personalizadas</span>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  {/* Mock phone with WhatsApp chat */}
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-3 shadow-2xl">
                    <div className="bg-white rounded-2xl overflow-hidden">
                      {/* Phone header */}
                      <div className="bg-green-600 text-white p-4 flex items-center">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
                          <Bot className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold">Fini AI</div>
                          <div className="text-xs text-green-100">en línea</div>
                        </div>
                      </div>
                      
                      {/* Chat messages */}
                      <div className="p-4 space-y-4 h-80 overflow-hidden">
                        <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                          <p className="text-sm">¿Cuántas ventas tuve hoy?</p>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3 max-w-xs ml-auto">
                          <p className="text-sm">📊 <strong>Ventas de hoy:</strong><br/>
                          • Total: $127,450<br/>
                          • Órdenes: 23<br/>
                          • Producto top: Zapatillas Nike<br/>
                          📈 +15% vs ayer</p>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                          <p className="text-sm">¿Qué productos debo promocionar?</p>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3 max-w-xs ml-auto">
                          <p className="text-sm">🎯 <strong>Recomendaciones:</strong><br/>
                          • Camisetas: stock bajo<br/>
                          • Jeans: alta demanda<br/>
                          💡 Crea una promo de jeans!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Similar to Origin's signup page benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para hacer crecer tu tienda
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Conecta tu Tienda Nube y obtén el poder de la IA para analytics, predicciones y marketing automatizado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-600 rounded-full">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Analytics en tiempo real
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Pregunta sobre ventas, productos, clientes y obtén respuestas inmediatas con gráficos y datos precisos
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-green-600 rounded-full">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Predicciones con IA
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Forecasting inteligente, análisis de tendencias y recomendaciones personalizadas para tu negocio
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-purple-600 rounded-full">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                WhatsApp nativo
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Sin apps adicionales. Chatea directamente desde WhatsApp y recibe reportes automáticos diarios
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            ¿Listo para transformar tu tienda?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Únete a cientos de comerciantes que ya están usando Fini AI para hacer crecer sus negocios
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="/signup"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all shadow-lg inline-block"
            >
              Comenzar Gratis
              <ArrowRight className="ml-2 h-5 w-5 inline" />
            </a>
            <a 
              href="/signup"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all inline-block"
            >
              Ver Planes
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h3 className="ml-3 text-xl font-bold">Fini AI</h3>
              </div>
              <p className="text-gray-400">
                Analytics inteligente para tu Tienda Nube
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Características</a></li>
                <li><a href="#" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">Integraciones</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentación</a></li>
                <li><a href="#" className="hover:text-white">Ayuda</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Términos</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Fini AI. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 