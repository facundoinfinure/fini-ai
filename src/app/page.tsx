import { Bot, ArrowRight, BarChart3, MessageSquare, TrendingUp, CheckCircle, Sparkles, Zap, Shield, Rocket } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Premium */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Fini AI</h1>
                <p className="text-xs text-gray-500">Analytics Premium</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <a 
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
              >
                Iniciar Sesión
              </a>
              <a 
                href="/signup"
                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 shadow-button hover:shadow-button-hover active:scale-95"
              >
                Comenzar Gratis
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section Ultra Premium */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/5 via-transparent to-blue-600/5 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            {/* Premium Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-900 to-gray-700 rounded-full text-white text-sm font-medium mb-8 shadow-lg">
              <Sparkles className="h-4 w-4 mr-2" />
              <span>Plataforma Premium de Analytics</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
              Analytics que{" "}
              <span className="bg-gradient-to-r from-gray-900 via-blue-600 to-gray-900 bg-clip-text text-transparent">
                transforman
              </span>
              <br />
              tu negocio
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              Conecta tu Tienda Nube con WhatsApp y obtén insights que impulsen tu crecimiento.
              <br />
              <strong className="text-gray-900 font-medium">IA multi-agente. Datos en tiempo real. Decisiones inteligentes.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a 
                href="/signup"
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all duration-300 shadow-button hover:shadow-button-hover active:scale-95 flex items-center group"
              >
                <span>Comenzar Gratis</span>
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </a>
              
              <a 
                href="#demo"
                className="border-2 border-gray-200 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-button hover:shadow-button-hover active:scale-95"
              >
                Ver Demo
              </a>
            </div>
          </div>

          {/* App Preview Ultra Premium */}
          <div className="relative max-w-6xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-gray-200/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-6">
                      El futuro del e-commerce analytics
                    </h3>
                    <p className="text-lg text-gray-600 leading-relaxed">
                      Sistema de IA multi-agente que analiza tu tienda, predice tendencias y optimiza tus ventas automáticamente.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Conexión Instantánea</h4>
                        <p className="text-gray-600">Conecta tu tienda en 30 segundos sin configuración técnica</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Analytics en Tiempo Real</h4>
                        <p className="text-gray-600">Datos actualizados cada minuto, directamente en WhatsApp</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">IA Multi-Agente</h4>
                        <p className="text-gray-600">Sistema inteligente que aprende de tu negocio y optimiza automáticamente</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Rocket className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Predicciones Precisas</h4>
                        <p className="text-gray-600">Forecasting avanzado para planificar tu crecimiento con confianza</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  {/* Premium Phone Mockup */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 to-blue-600/20 rounded-3xl blur-2xl transform rotate-1 scale-105" />
                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-4 shadow-2xl">
                      <div className="bg-white rounded-2xl overflow-hidden">
                        {/* Phone Header Premium */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 flex items-center">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 shadow-lg">
                            <Bot className="h-6 w-6 text-gray-900" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">Fini AI</div>
                            <div className="text-xs text-gray-300 flex items-center">
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
                              Analytics en vivo
                            </div>
                          </div>
                        </div>
                        
                        {/* Chat Messages Premium */}
                        <div className="p-6 space-y-6 h-96 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
                          <div className="bg-white rounded-2xl p-4 max-w-xs shadow-card border border-gray-100">
                            <p className="text-sm font-medium text-gray-900">¿Cuántas ventas tuve hoy?</p>
                          </div>
                          
                          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-4 max-w-xs ml-auto shadow-lg">
                            <p className="text-sm leading-relaxed">
                              <span className="text-2xl">📊</span> <strong>Ventas de hoy:</strong><br/>
                              <span className="text-green-400">• Total: $127,450</span><br/>
                              <span className="text-blue-400">• Órdenes: 23</span><br/>
                              <span className="text-purple-400">• Producto top: Zapatillas Nike</span><br/>
                              <span className="text-yellow-400">📈 +15% vs ayer</span>
                            </p>
                          </div>
                          
                          <div className="bg-white rounded-2xl p-4 max-w-xs shadow-card border border-gray-100">
                            <p className="text-sm font-medium text-gray-900">¿Qué debo promocionar?</p>
                          </div>
                          
                          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-4 max-w-xs ml-auto shadow-lg">
                            <p className="text-sm leading-relaxed">
                              <span className="text-2xl">🎯</span> <strong>Recomendaciones IA:</strong><br/>
                              <span className="text-red-400">• Camisetas: stock crítico</span><br/>
                              <span className="text-green-400">• Jeans: alta demanda</span><br/>
                              <span className="text-yellow-400">💡 Promo jeans: +40% ventas</span>
                            </p>
                          </div>
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

      {/* Features Section Ultra Premium */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full text-gray-700 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4 mr-2" />
              <span>Tecnología de Vanguardia</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Todo lo que necesitas para
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                dominar tu mercado
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Plataforma integral que combina IA avanzada, analytics en tiempo real y automatización inteligente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="group bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Analytics Inteligentes
              </h3>
              <p className="text-gray-600 leading-relaxed text-center">
                Métricas avanzadas, visualizaciones dinámicas y insights accionables que revelan oportunidades ocultas en tu negocio.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Predicciones con IA
              </h3>
              <p className="text-gray-600 leading-relaxed text-center">
                Algoritmos de machine learning que predicen tendencias, optimizan inventario y maximizan tu rentabilidad.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                WhatsApp Nativo
              </h3>
              <p className="text-gray-600 leading-relaxed text-center">
                Interfaz conversacional natural. Sin apps adicionales. Reportes automáticos y consultas instantáneas.
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