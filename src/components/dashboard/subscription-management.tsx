"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  Zap, 
  Star, 
  Check, 
  X, 
  CreditCard, 
  Calendar, 
  ArrowRight, 
  Gift,
  TrendingUp,
  BarChart3,
  Settings,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing: 'monthly' | 'yearly';
  features: string[];
  limitations: string[];
  recommended?: boolean;
  popular?: boolean;
  color: string;
  icon: React.ComponentType<any>;
}

interface UserSubscription {
  plan: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  nextBilling?: string;
  trialDaysLeft?: number;
  usage: {
    stores: number;
    maxStores: number;
    messages: number;
    maxMessages: number;
    analytics: number;
    maxAnalytics: number;
  };
}

const plans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Plan Básico',
    price: 0,
    billing: 'monthly',
    color: 'from-gray-400 to-gray-600',
    icon: BarChart3,
    features: [
      'Analytics básicos de tienda',
      'Resumen diario por WhatsApp',
      'RAG básico para consultas',
      'Hasta 1 tienda conectada',
      'Hasta 500 mensajes/mes',
      'Soporte por email'
    ],
    limitations: [
      'Sin forecasting con IA',
      'Sin análisis de competencia',
      'Sin ideas de marketing automáticas',
      'Memoria limitada del agente'
    ]
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    price: 39,
    billing: 'monthly',
    color: 'from-blue-500 to-purple-600',
    icon: Zap,
    popular: true,
    features: [
      'Todo del Plan Básico',
      'Sistema multi-agente completo',
      'Forecasting con IA avanzada',
      'Análisis de competencia',
      'Ideas de marketing personalizadas',
      'Memoria extendida del agente',
      'Hasta 5 tiendas conectadas',
      'Hasta 5,000 mensajes/mes',
      'Reportes automáticos',
      'Soporte prioritario'
    ],
    limitations: [
      'Sin agentes personalizados',
      'Sin integraciones avanzadas'
    ]
  },
  {
    id: 'enterprise',
    name: 'Plan Enterprise',
    price: 99,
    billing: 'monthly',
    color: 'from-purple-600 to-pink-600',
    icon: Crown,
    recommended: true,
    features: [
      'Todo del Plan Pro',
      'Agentes personalizados',
      'Integraciones avanzadas',
      'ML models custom',
      'Tiendas ilimitadas',
      'Mensajes ilimitados',
      'Dashboard analytics avanzado',
      'Webhooks personalizados',
      'Soporte 24/7 dedicado',
      'Onboarding personalizado'
    ],
    limitations: []
  }
];

export function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch subscription data from API
      const response = await fetch('/api/user/subscription');
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Debes iniciar sesión para ver la información de suscripción');
          return;
        }
        throw new Error('Failed to fetch subscription');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSubscription(data.data);
      } else {
        throw new Error(data.error || 'Failed to load subscription');
      }
      
    } catch (err) {
      // Set default subscription state for now
      setSubscription({
        plan: 'basic',
        status: 'active',
        usage: {
          stores: 0,
          maxStores: 1,
          messages: 0,
          maxMessages: 500,
          analytics: 0,
          maxAnalytics: 100
        }
      });
      setError(null); // Don't show error, just default state
      console.log('Subscription data not available yet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setIsUpgrading(true);
      setError(null);
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Error al crear la sesión de pago');
      }
    } catch (err) {
      setError('Error al procesar la actualización');
    } finally {
      setIsUpgrading(false);
    }
  };

  const getCurrentPlan = () => {
    return plans.find(plan => plan.id === subscription?.plan) || plans[0];
  };

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="subscription-container max-w-7xl mx-auto px-8 pb-8">
        <div className="subscription-header bg-white p-8 border-b border-gray-200 mb-8">
          <h1 className="subscription-title text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción Actual</h1>
          <p className="subscription-subtitle text-gray-600">Gestiona tu plan y facturación</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscription-container max-w-7xl mx-auto px-8 pb-8">
        <div className="subscription-header bg-white p-8 border-b border-gray-200 mb-8">
          <h1 className="subscription-title text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción Actual</h1>
          <p className="subscription-subtitle text-gray-600">Gestiona tu plan y facturación</p>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!subscription) return null;

  const currentPlan = getCurrentPlan();
  const isOnTrial = subscription.status === 'trial';

  return (
    <div className="subscription-container max-w-7xl mx-auto px-8 pb-8">
      {/* Header */}
      <div className="subscription-header bg-white p-8 border-b border-gray-200 mb-8">
        <h1 className="subscription-title text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción Actual</h1>
        <p className="subscription-subtitle text-gray-600">Gestiona tu plan y facturación</p>
      </div>

      {/* Plan Actual Prominente */}
      <div className="current-plan-section bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="current-plan-header flex justify-between items-center mb-5">
          <h2 className="current-plan-title text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tu Suscripción Actual
          </h2>
          <span className="plan-badge bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            {subscription.status === 'active' ? 'Activa' : 
             subscription.status === 'trial' ? 'Prueba Gratuita' : 
             subscription.status}
          </span>
        </div>
        
        <div className="current-plan-info flex items-center gap-4 mb-5">
          <div className="plan-icon w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
            <currentPlan.icon className="h-6 w-6 text-gray-600" />
          </div>
          <div className="plan-details">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{currentPlan.name}</h3>
            <p className="text-sm text-gray-600 m-0">
              {currentPlan.price === 0 ? 'Gratis' : `$${currentPlan.price}/mes`}
            </p>
          </div>
        </div>

        {isOnTrial && subscription.trialDaysLeft && (
          <Alert className="mb-5 border-blue-200 bg-blue-50">
            <Gift className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              <strong>Prueba gratuita:</strong> Te quedan {subscription.trialDaysLeft} días. 
              Actualiza para continuar usando todas las funcionalidades.
            </AlertDescription>
          </Alert>
        )}

        {subscription.nextBilling && (
          <p className="text-sm text-gray-600 mb-5">
            <Calendar className="inline h-4 w-4 mr-1" />
            Próxima facturación: {new Date(subscription.nextBilling).toLocaleDateString('es-AR')}
          </p>
        )}

        {/* Métricas de uso */}
        <div className="usage-metrics">
          <div className="usage-item flex justify-between items-center py-4 border-b border-gray-100">
            <span className="usage-label text-sm text-gray-600 font-medium">Tiendas Conectadas</span>
            <span className="usage-value text-base font-semibold text-gray-900">{subscription.usage.stores}/{subscription.usage.maxStores}</span>
          </div>
          <div className="usage-item flex justify-between items-center py-4 border-b border-gray-100">
            <span className="usage-label text-sm text-gray-600 font-medium">Mensajes de WhatsApp</span>
            <span className="usage-value text-base font-semibold text-gray-900">{subscription.usage.messages}/{subscription.usage.maxMessages}</span>
          </div>
          <div className="usage-item flex justify-between items-center py-4">
            <span className="usage-label text-sm text-gray-600 font-medium">Consultas de Analytics</span>
            <span className="usage-value text-base font-semibold text-gray-900">{subscription.usage.analytics}/{subscription.usage.maxAnalytics}</span>
          </div>
        </div>
      </div>

      {/* Planes Disponibles */}
      <div className="plans-section my-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Planes Disponibles</h2>
        
        <div className="plans-grid grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === subscription.plan;
            const isUpgradeOption = plans.findIndex(p => p.id === subscription.plan) < plans.findIndex(p => p.id === plan.id);
            
            return (
              <div 
                key={plan.id} 
                className={`plan-card bg-white border border-gray-200 rounded-xl p-6 relative transition-all duration-200 hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  isCurrent ? 'plan-card-current border-blue-500 bg-blue-50/30' : ''
                } ${
                  plan.popular ? 'plan-card-popular border-purple-500' : ''
                } ${
                  plan.recommended ? 'plan-card-recommended border-green-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="plan-badge-top popular absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                    Más Popular
                  </div>
                )}
                
                {plan.recommended && (
                  <div className="plan-badge-top recommended absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                    Recomendado
                  </div>
                )}

                <div className="plan-header text-center mb-6">
                  <div className="plan-icon-large w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">
                    <plan.icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <h3 className="plan-name text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="plan-price text-3xl font-bold text-gray-900 mb-1">
                    {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                  </div>
                  {plan.price > 0 && <p className="plan-price-period text-sm text-gray-600">/mes</p>}
                </div>

                <div className="plan-features mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Incluye:</h4>
                  <ul className="feature-list list-none p-0 m-0">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="feature-item included flex items-center gap-2 py-1.5 text-sm text-gray-700">
                        <div className="feature-icon check w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs flex-shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-sm text-gray-500 py-1.5">
                        +{plan.features.length - 4} funcionalidades más
                      </li>
                    )}
                  </ul>
                </div>

                {plan.limitations.length > 0 && (
                  <div className="plan-features mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">No incluye:</h4>
                    <ul className="feature-list list-none p-0 m-0">
                      {plan.limitations.slice(0, 2).map((limitation, index) => (
                        <li key={index} className="feature-item not-included flex items-center gap-2 py-1.5 text-sm text-gray-500">
                          <div className="feature-icon cross w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs flex-shrink-0">
                            <X className="h-3 w-3" />
                          </div>
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="plan-action mt-6">
                  {isCurrent ? (
                    <button className="plan-button current w-full py-3 px-6 rounded-lg font-medium text-sm cursor-default bg-gray-100 text-gray-600 flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" />
                      Plan Actual
                    </button>
                  ) : isUpgradeOption ? (
                    <button 
                      className="plan-button upgrade w-full py-3 px-6 rounded-lg font-medium text-sm cursor-pointer transition-all duration-200 bg-green-600 text-white hover:bg-green-700 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4" />
                      )}
                      Actualizar Plan
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button className="plan-button primary w-full py-3 px-6 rounded-lg font-medium text-sm cursor-pointer transition-all duration-200 bg-gray-900 text-white hover:bg-gray-700 hover:-translate-y-0.5 flex items-center justify-center gap-2" disabled>
                      Plan Anterior
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gestión de Facturación */}
      <div className="billing-section bg-white border border-gray-200 rounded-xl mt-8 overflow-hidden">
        <div className="billing-header p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="billing-title text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gestión de Facturación
          </h2>
          <p className="billing-description text-sm text-gray-600">Administra tus métodos de pago y facturación</p>
        </div>
        
        <div className="billing-content p-6">
          <div className="billing-grid grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="payment-methods">
              <h3 className="text-base font-medium text-gray-900 mb-4">Métodos de Pago</h3>
              <div className="payment-method-item flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3 bg-white">
                <div className="payment-info flex items-center gap-3">
                  <div className="payment-icon w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="payment-details">
                    <h4 className="text-sm font-medium text-gray-900 mb-0.5">•••• •••• •••• 4242</h4>
                    <p className="text-xs text-gray-600 m-0">Expira 12/25</p>
                  </div>
                </div>
                <div className="payment-actions flex gap-2">
                  <button className="change-plan-btn bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400">
                    Cambiar
                  </button>
                </div>
              </div>
            </div>
            
            <div className="payment-history">
              <h3 className="text-base font-medium text-gray-900 mb-4">Historial de Pagos</h3>
              <div className="space-y-0">
                <div className="payment-history-item flex justify-between items-center py-4 border-b border-gray-100">
                  <div>
                    <p className="payment-date text-sm text-gray-900 font-medium">Plan Pro - Diciembre 2024</p>
                    <p className="payment-plan text-xs text-gray-600 mt-0.5">Pagado el 1 de Dic</p>
                  </div>
                  <div className="text-right">
                    <p className="payment-amount text-base font-semibold text-gray-900">$39.00</p>
                    <p className="payment-status text-xs text-green-600 font-medium">Pagado</p>
                  </div>
                </div>
                
                <div className="payment-history-item flex justify-between items-center py-4">
                  <div>
                    <p className="payment-date text-sm text-gray-900 font-medium">Plan Pro - Noviembre 2024</p>
                    <p className="payment-plan text-xs text-gray-600 mt-0.5">Pagado el 1 de Nov</p>
                  </div>
                  <div className="text-right">
                    <p className="payment-amount text-base font-semibold text-gray-900">$39.00</p>
                    <p className="payment-status text-xs text-green-600 font-medium">Pagado</p>
                  </div>
                </div>
              </div>
              
              <button className="view-history-btn text-blue-600 bg-none border-none text-sm font-medium cursor-pointer py-2 transition-colors duration-200 hover:text-blue-800 hover:underline">
                Ver Historial Completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 