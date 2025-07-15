import { Bot, ArrowRight, BarChart3, MessageSquare, TrendingUp, CheckCircle, Zap, Users, BookOpen } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container-responsive">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-primary-900 rounded-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">Fini AI</h1>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#product" className="text-gray-600 hover:text-gray-900 font-medium">
                Product
              </a>
              <a href="#resources" className="text-gray-600 hover:text-gray-900 font-medium">
                Resources
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">
                Pricing
              </a>
            </nav>
            
            <div className="flex items-center space-x-4">
              <a 
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Login
              </a>
              <a 
                href="/signup"
                className="btn-primary"
              >
                Get started for free
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="container-responsive">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              AI that works with your{" "}
              <span className="text-secondary-600">store data</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Connect your Tienda Nube store with WhatsApp and get instant insights, live connectors, and AI-powered analytics that help you grow your business.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a 
                href="/signup"
                className="btn-primary px-8 py-3"
              >
                Get started for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              
              <a 
                href="#demo"
                className="btn-outline px-8 py-3"
              >
                Book a demo
              </a>
            </div>
          </div>

          {/* Simple App Preview */}
          <div className="relative max-w-4xl mx-auto">
            <div className="card p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      Instant insights, guidance and assistance
                    </h3>
                    <p className="text-gray-600">
                      Enable your team to access critical information from your store instantly. No need to spend time combing through data or jumping into individual programs.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-success-500 rounded-md flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Live connectors</h4>
                        <p className="text-gray-600 text-sm">Connect your store in seconds, not hours</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-secondary-500 rounded-md flex items-center justify-center">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Real-time data</h4>
                        <p className="text-gray-600 text-sm">Get instant access to your store metrics</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-warning-500 rounded-md flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">AI-powered insights</h4>
                        <p className="text-gray-600 text-sm">Smart recommendations to grow your business</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="bg-gray-50 rounded-lg p-6">
                    {/* Simple chat mockup */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-primary-900 rounded-lg flex items-center justify-center mr-3">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Fini AI</div>
                          <div className="text-xs text-gray-500">Online</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                          <p className="text-sm text-gray-900">¿Cuántas ventas tuve hoy?</p>
                        </div>
                        
                        <div className="bg-secondary-500 text-white rounded-lg p-3 max-w-xs ml-auto">
                          <p className="text-sm">
                            📊 <strong>Today&apos;s sales:</strong><br/>
                            • Total: $127,450<br/>
                            • Orders: 23<br/>
                            • Top product: Nike Shoes<br/>
                            📈 +15% vs yesterday
                          </p>
                        </div>
                        
                        <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                          <p className="text-sm text-gray-900">What should I promote?</p>
                        </div>
                        
                        <div className="bg-secondary-500 text-white rounded-lg p-3 max-w-xs ml-auto">
                          <p className="text-sm">
                            🎯 <strong>AI Recommendations:</strong><br/>
                            • T-shirts: Low stock<br/>
                            • Jeans: High demand<br/>
                            💡 Promote jeans for +40% sales
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
      </section>

      {/* Information Section */}
      <section className="py-24 bg-gray-50">
        <div className="container-responsive">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Information across your business
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Unlike ChatGPT, you don&apos;t need to upload your data to power your answers. Connect directly to your store and get insights instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Insights */}
            <div className="card p-6">
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-secondary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Insights
              </h3>
              <p className="text-gray-600 mb-4">
                Get instant access to sales summaries and verified strategic insights without the guesswork.
              </p>
              <div className="text-sm text-gray-500">
                Data sources: Tienda Nube, Analytics
              </div>
            </div>

            {/* Operations */}
            <div className="card p-6">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-success-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Operations
              </h3>
              <p className="text-gray-600 mb-4">
                Get procedural updates and track goals with a clear and instant view of your business priorities.
              </p>
              <div className="text-sm text-gray-500">
                Data sources: Store operations, Inventory
              </div>
            </div>

            {/* Customer Service */}
            <div className="card p-6">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-warning-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Customer Service
              </h3>
              <p className="text-gray-600 mb-4">
                Get immediate, self-guided access to all customer information, orders and interaction history.
              </p>
              <div className="text-sm text-gray-500">
                Data sources: WhatsApp, Customer data
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-900">
        <div className="container-responsive text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">
            No technical expertise required
          </h2>
          <p className="text-primary-200 mb-8 max-w-xl mx-auto">
            Get started in minutes and see immediate results from your store data
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/signup"
              className="bg-white text-primary-900 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors duration-150"
            >
              Get started for free
            </a>
            <a 
              href="#demo"
              className="border border-primary-200 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-800 transition-colors duration-150"
            >
              Book a demo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="container-responsive">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary-900 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Fini AI</h3>
              </div>
              <p className="text-gray-600">
                AI-powered analytics for your Tienda Nube store
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Features</a></li>
                <li><a href="#" className="hover:text-gray-900">Pricing</a></li>
                <li><a href="#" className="hover:text-gray-900">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
                <li><a href="#" className="hover:text-gray-900">Help Center</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
                <li><a href="#" className="hover:text-gray-900">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-600">
              © 2024 Fini AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 