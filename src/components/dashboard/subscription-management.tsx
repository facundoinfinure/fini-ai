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
      
      // Mock data - in production, this would call your subscription API
      const mockSubscription: UserSubscription = {
        plan: 'basic',
        status: 'active',
        trialDaysLeft: 14,
        usage: {
          stores: 1,
          maxStores: 1,
          messages: 156,
          maxMessages: 500,
          analytics: 23,
          maxAnalytics: 100
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSubscription(mockSubscription);
    } catch (err) {
      setError('Error al cargar la información de suscripción');
      console.error('Subscription fetch error:', err);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Gestión de Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Gestión de Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const currentPlan = getCurrentPlan();
  const isOnTrial = subscription.status === 'trial';

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Tu Suscripción Actual
            </span>
            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
              {subscription.status === 'active' ? 'Activa' : 
               subscription.status === 'trial' ? 'Prueba Gratuita' : 
               subscription.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Info */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${currentPlan.color}`}>
                  <currentPlan.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{currentPlan.name}</h3>
                  <p className="text-gray-600">
                    {currentPlan.price === 0 ? 'Gratis' : `$${currentPlan.price}/mes`}
                  </p>
                </div>
              </div>
              
              {isOnTrial && subscription.trialDaysLeft && (
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <Gift className="h-4 w-4" />
                  <AlertDescription className="text-blue-800">
                    <strong>Prueba gratuita:</strong> Te quedan {subscription.trialDaysLeft} días. 
                    Actualiza para continuar usando todas las funcionalidades.
                  </AlertDescription>
                </Alert>
              )}

              {subscription.nextBilling && (
                <p className="text-sm text-gray-600">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Próxima facturación: {new Date(subscription.nextBilling).toLocaleDateString('es-AR')}
                </p>
              )}
            </div>

            {/* Usage Metrics */}
            <div className="space-y-4">
              <h4 className="font-medium">Uso del Plan</h4>
              
              {/* Stores Usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tiendas Conectadas</span>
                  <span>{subscription.usage.stores}/{subscription.usage.maxStores}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(subscription.usage.stores, subscription.usage.maxStores))}`}
                    style={{ width: `${getUsagePercentage(subscription.usage.stores, subscription.usage.maxStores)}%` }}
                  ></div>
                </div>
              </div>

              {/* Messages Usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Mensajes de WhatsApp</span>
                  <span>{subscription.usage.messages}/{subscription.usage.maxMessages}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(subscription.usage.messages, subscription.usage.maxMessages))}`}
                    style={{ width: `${getUsagePercentage(subscription.usage.messages, subscription.usage.maxMessages)}%` }}
                  ></div>
                </div>
              </div>

              {/* Analytics Usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Consultas de Analytics</span>
                  <span>{subscription.usage.analytics}/{subscription.usage.maxAnalytics}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(subscription.usage.analytics, subscription.usage.maxAnalytics))}`}
                    style={{ width: `${getUsagePercentage(subscription.usage.analytics, subscription.usage.maxAnalytics)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === subscription.plan;
          const isUpgradeOption = plans.findIndex(p => p.id === subscription.plan) < plans.findIndex(p => p.id === plan.id);
          
          return (
            <Card key={plan.id} className={`relative ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Más Popular
                  </Badge>
                </div>
              )}
              
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Recomendado
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${plan.color}`}>
                    <plan.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-2xl font-bold">
                      {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                      {plan.price > 0 && <span className="text-sm font-normal text-gray-600">/mes</span>}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features */}
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-2">Incluye:</h4>
                  <ul className="space-y-1">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-sm text-gray-500">
                        +{plan.features.length - 4} funcionalidades más
                      </li>
                    )}
                  </ul>
                </div>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-2">No incluye:</h4>
                    <ul className="space-y-1">
                      {plan.limitations.slice(0, 2).map((limitation, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-500">
                          <X className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
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
                      className="w-full" 
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

      {/* Billing Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Gestión de Facturación
          </CardTitle>
          <CardDescription>
            Administra tus métodos de pago y facturación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Métodos de Pago</h4>
              <div className="p-4 border rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-gray-600">Expira 12/25</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Cambiar
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Historial de Pagos</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Plan Pro - Diciembre 2024</p>
                    <p className="text-sm text-gray-600">Pagado el 1 de Dic</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$39.00</p>
                    <Badge variant="secondary" className="text-xs">Pagado</Badge>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Plan Pro - Noviembre 2024</p>
                    <p className="text-sm text-gray-600">Pagado el 1 de Nov</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$39.00</p>
                    <Badge variant="secondary" className="text-xs">Pagado</Badge>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="w-full">
                Ver Historial Completo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 