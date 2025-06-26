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
      <div className="max-w-7xl mx-auto px-8 pb-8">
        {/* Header Premium Style */}
        <div className="bg-white px-8 pt-8 pb-6 border-b border-gray-200 mb-8 -mx-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción Actual</h1>
          <p className="text-gray-600">Gestiona tu plan y facturación</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-8 pb-8">
        {/* Header Premium Style */}
        <div className="bg-white px-8 pt-8 pb-6 border-b border-gray-200 mb-8 -mx-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción Actual</h1>
          <p className="text-gray-600">Gestiona tu plan y facturación</p>
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
    <div className="max-w-7xl mx-auto px-8 pb-8">
      {/* Header Premium Style */}
      <div className="bg-white px-8 pt-8 pb-6 border-b border-gray-200 mb-8 -mx-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción Actual</h1>
        <p className="text-gray-600">Gestiona tu plan y facturación</p>
      </div>

      <div className="space-y-8">
        {/* Current Subscription Status - Prominente */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                <BarChart3 className="mr-3 h-5 w-5 text-gray-600" />
                Tu Suscripción Actual
              </CardTitle>
              <Badge 
                variant={subscription.status === 'active' ? 'default' : 'secondary'}
                className={`${
                  subscription.status === 'active' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-100 text-gray-600'
                } px-3 py-1`}
              >
                {subscription.status === 'active' ? 'Activa' : 
                 subscription.status === 'trial' ? 'Prueba Gratuita' : 
                 subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Plan Info - Mejorado */}
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <currentPlan.icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{currentPlan.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {currentPlan.price === 0 ? 'Gratis' : `$${currentPlan.price}/mes`}
                    </p>
                  </div>
                </div>
                
                {isOnTrial && subscription.trialDaysLeft && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50">
                    <Gift className="h-4 w-4" />
                    <AlertDescription className="text-blue-800">
                      <strong>Prueba gratuita:</strong> Te quedan {subscription.trialDaysLeft} días. 
                      Actualiza para continuar usando todas las funcionalidades.
                    </AlertDescription>
                  </Alert>
                )}

                {subscription.nextBilling && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Próxima facturación: {new Date(subscription.nextBilling).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>

              {/* Usage Metrics - Estilo Origin */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 mb-4">Uso del Plan</h4>
                
                {/* Stores Usage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Tiendas Conectadas</span>
                    <span className="text-base font-semibold text-gray-900">
                      {subscription.usage.stores}/{subscription.usage.maxStores}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(subscription.usage.stores, subscription.usage.maxStores)}%` }}
                    />
                  </div>
                </div>

                {/* Messages Usage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Mensajes de WhatsApp</span>
                    <span className="text-base font-semibold text-gray-900">
                      {subscription.usage.messages}/{subscription.usage.maxMessages}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(subscription.usage.messages, subscription.usage.maxMessages)}%` }}
                    />
                  </div>
                </div>

                {/* Analytics Usage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Consultas de Analytics</span>
                    <span className="text-base font-semibold text-gray-900">
                      {subscription.usage.analytics}/{subscription.usage.maxAnalytics}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(subscription.usage.analytics, subscription.usage.maxAnalytics)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans - Estilo Origin */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Planes Disponibles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === subscription.plan;
              const isUpgradeOption = plans.findIndex(p => p.id === subscription.plan) < plans.findIndex(p => p.id === plan.id);
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isCurrent ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'hover:border-gray-300'
                  } ${
                    plan.popular ? 'border-purple-500' : ''
                  } ${
                    plan.recommended ? 'border-green-500' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
                        Más Popular
                      </Badge>
                    </div>
                  )}
                  
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
                        Recomendado
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <plan.icon className="h-6 w-6 text-gray-600" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                    </div>
                    {plan.price > 0 && <p className="text-sm text-gray-600">/mes</p>}
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Features */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">Incluye:</h4>
                      <ul className="space-y-2">
                        {plan.features.slice(0, 4).map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-700">
                            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                              <Check className="h-3 w-3 text-green-700" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-sm text-gray-500 ml-7">
                            +{plan.features.length - 4} funcionalidades más
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Limitations */}
                    {plan.limitations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-3">No incluye:</h4>
                        <ul className="space-y-2">
                          {plan.limitations.slice(0, 2).map((limitation, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-500">
                              <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                                <X className="h-3 w-3 text-red-700" />
                              </div>
                              <span>{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CTA Button */}
                    <div className="pt-4">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Plan Actual
                        </Button>
                      ) : isUpgradeOption ? (
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:-translate-y-0.5" 
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={isUpgrading}
                        >
                          {isUpgrading ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <TrendingUp className="h-4 w-4 mr-2" />
                          )}
                          Actualizar Plan
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          Plan Anterior
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Billing Management - Estilo Origin */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
              <CreditCard className="mr-3 h-5 w-5" />
              Gestión de Facturación
            </CardTitle>
            <CardDescription className="text-gray-600">
              Administra tus métodos de pago y facturación
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Métodos de Pago</h3>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">•••• •••• •••• 4242</p>
                      <p className="text-xs text-gray-600">Expira 12/25</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    Cambiar
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Historial de Pagos</h3>
                <div className="space-y-0">
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-sm text-gray-900">Plan Pro - Diciembre 2024</p>
                      <p className="text-xs text-gray-600">Pagado el 1 de Dic</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">$39.00</p>
                      <p className="text-xs text-green-600 font-medium">Pagado</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-4">
                    <div>
                      <p className="font-medium text-sm text-gray-900">Plan Pro - Noviembre 2024</p>
                      <p className="text-xs text-gray-600">Pagado el 1 de Nov</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">$39.00</p>
                      <p className="text-xs text-green-600 font-medium">Pagado</p>
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="w-full text-sm">
                  Ver Historial Completo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 