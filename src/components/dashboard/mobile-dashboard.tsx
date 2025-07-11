/**
 * Mobile Dashboard Premium
 * Dashboard optimizado para móviles con componentes premium y micro-interactions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  ButtonPremium, 
  PrimaryButton, 
  SecondaryButton, 
  FloatingActionButton 
} from '@/components/ui/button-premium';
import { 
  CardPremium, 
  MetricCard, 
  FeatureCard,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription 
} from '@/components/ui/card-premium';
import { 
  Store, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign,
  MessageSquare,
  Zap,
  Settings,
  Bell,
  Plus,
  BarChart3,
  Eye,
  Heart,
  Star,
  ArrowRight,
  Sparkles
} from 'lucide-react';
// Import made conditional to avoid build issues
let segment: any = null;
let SegmentEvents: any = null;

try {
  const segmentModule = require('@/lib/analytics/segment-integration');
  segment = segmentModule.segment;
  SegmentEvents = segmentModule.SegmentEvents;
} catch (error) {
  console.warn('[MOBILE-DASHBOARD] Segment integration not available:', error);
}

interface MobileDashboardProps {
  className?: string;
}

export function MobileDashboard({ className }: MobileDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    conversionRate: 0,
    salesChange: 0,
    ordersChange: 0,
    customersChange: 0,
    conversionChange: 0
  });

  // Simular carga de datos
  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics({
        totalSales: 45230,
        totalOrders: 156,
        totalCustomers: 1234,
        conversionRate: 3.2,
        salesChange: 12.5,
        ordersChange: 8.3,
        customersChange: 15.7,
        conversionChange: -2.1
      });
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Trackear vista del dashboard
  useEffect(() => {
    segment.track({
      event: SegmentEvents.ANALYTICS_VIEWED,
      properties: {
        page: 'mobile-dashboard',
        device: 'mobile',
        timestamp: new Date().toISOString()
      }
    });
  }, []);

  const handleMetricClick = (metric: string) => {
    segment.track({
      event: 'Metric Card Clicked',
      properties: {
        metric,
        device: 'mobile'
      }
    });
  };

  const handleQuickAction = (action: string) => {
    segment.track({
      event: 'Quick Action Clicked',
      properties: {
        action,
        device: 'mobile'
      }
    });
  };

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-gray-50 to-gray-100',
      'mobile-padding pb-20', // Espacio para FAB
      className
    )}>
      {/* Header Premium */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fini AI</h1>
              <p className="text-sm text-gray-600">Dashboard Premium</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ButtonPremium
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full animate-pulse" />
            </ButtonPremium>
            
            <ButtonPremium
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0"
              onClick={() => handleQuickAction('settings')}
            >
              <Settings className="w-5 h-5" />
            </ButtonPremium>
          </div>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Métricas Principales
          </h2>
          <ButtonPremium
            variant="ghost"
            size="sm"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => handleQuickAction('view-all-metrics')}
          >
            Ver todo
          </ButtonPremium>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Ventas Totales"
            value={isLoading ? '---' : `$${metrics.totalSales.toLocaleString()}`}
            change={metrics.salesChange}
            changeType="positive"
            icon={<DollarSign className="w-5 h-5 text-primary-600" />}
            loading={isLoading}
            onClick={() => handleMetricClick('total-sales')}
          />
          
          <MetricCard
            title="Pedidos"
            value={isLoading ? '---' : metrics.totalOrders.toLocaleString()}
            change={metrics.ordersChange}
            changeType="positive"
            icon={<ShoppingCart className="w-5 h-5 text-secondary-600" />}
            loading={isLoading}
            onClick={() => handleMetricClick('total-orders')}
          />
          
          <MetricCard
            title="Clientes"
            value={isLoading ? '---' : metrics.totalCustomers.toLocaleString()}
            change={metrics.customersChange}
            changeType="positive"
            icon={<Users className="w-5 h-5 text-accent-600" />}
            loading={isLoading}
            onClick={() => handleMetricClick('total-customers')}
          />
          
          <MetricCard
            title="Conversión"
            value={isLoading ? '---' : `${metrics.conversionRate}%`}
            change={metrics.conversionChange}
            changeType="negative"
            icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
            loading={isLoading}
            onClick={() => handleMetricClick('conversion-rate')}
          />
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Acciones Rápidas
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <CardPremium
            variant="elevated"
            size="md"
            interactive
            hover
            glow
            onCardClick={() => handleQuickAction('start-chat')}
            className="group"
          >
            <CardContent className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  Iniciar Chat
                </h3>
                <p className="text-sm text-gray-600">
                  Conversa con tu tienda
                </p>
              </div>
            </CardContent>
          </CardPremium>
          
          <CardPremium
            variant="elevated"
            size="md"
            interactive
            hover
            onCardClick={() => handleQuickAction('view-analytics')}
            className="group"
          >
            <CardContent className="text-center space-y-3">
              <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-secondary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-secondary-600 transition-colors">
                  Analytics
                </h3>
                <p className="text-sm text-gray-600">
                  Reportes detallados
                </p>
              </div>
            </CardContent>
          </CardPremium>
          
          <CardPremium
            variant="elevated"
            size="md"
            interactive
            hover
            onCardClick={() => handleQuickAction('manage-store')}
            className="group"
          >
            <CardContent className="text-center space-y-3">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Store className="w-6 h-6 text-accent-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-accent-600 transition-colors">
                  Mi Tienda
                </h3>
                <p className="text-sm text-gray-600">
                  Gestionar productos
                </p>
              </div>
            </CardContent>
          </CardPremium>
          
          <CardPremium
            variant="elevated"
            size="md"
            interactive
            hover
            onCardClick={() => handleQuickAction('ai-insights')}
            className="group"
          >
            <CardContent className="text-center space-y-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  IA Insights
                </h3>
                <p className="text-sm text-gray-600">
                  Recomendaciones
                </p>
              </div>
            </CardContent>
          </CardPremium>
        </div>
      </div>

      {/* Funcionalidades Premium */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Funcionalidades Premium
          </h2>
          <div className="px-2 py-1 bg-gradient-primary rounded-full">
            <span className="text-xs font-medium text-white">PRO</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <FeatureCard
            title="Sistema Multi-Agente"
            description="Agentes especializados para diferentes aspectos de tu negocio"
            icon={<Users className="w-6 h-6 text-primary-600" />}
            badge="Nuevo"
          />
          
          <FeatureCard
            title="Forecasting con IA"
            description="Predicciones precisas de ventas y tendencias"
            icon={<TrendingUp className="w-6 h-6 text-secondary-600" />}
            badge="Popular"
          />
          
          <FeatureCard
            title="Análisis de Competencia"
            description="Mantente al día con tu competencia"
            icon={<Eye className="w-6 h-6 text-accent-600" />}
          />
        </div>
      </div>

      {/* Testimonios/Reviews */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Lo que dicen nuestros usuarios
        </h2>
        
        <CardPremium variant="glass" size="md">
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
            </div>
            <blockquote className="text-gray-700 italic">
              "Fini AI transformó completamente cómo gestiono mi tienda. 
              Las insights de IA son increíblemente precisas."
            </blockquote>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">MR</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">María Rodriguez</p>
                <p className="text-sm text-gray-600">Tienda de Moda</p>
              </div>
            </div>
          </CardContent>
        </CardPremium>
      </div>

      {/* Call to Action */}
      <div className="mb-8">
        <CardPremium 
          variant="gradient" 
          size="lg"
          className="text-center space-y-4"
        >
          <CardContent>
            <h3 className="text-xl font-bold text-white mb-2">
              ¿Listo para el siguiente nivel?
            </h3>
            <p className="text-white/90 mb-4">
              Desbloquea todas las funcionalidades premium y lleva tu negocio al siguiente nivel
            </p>
            <ButtonPremium
              variant="secondary"
              size="lg"
              fullWidth
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
              onClick={() => handleQuickAction('upgrade-to-pro')}
            >
              Actualizar a Pro
            </ButtonPremium>
          </CardContent>
        </CardPremium>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => handleQuickAction('quick-chat')}
        className="animate-pulse-glow"
      >
        <Plus className="w-6 h-6" />
      </FloatingActionButton>
    </div>
  );
}

export default MobileDashboard; 