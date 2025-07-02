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
  RefreshCw,
  Store,
  MessageSquare,
  Users,
  Brain,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PLAN_CONFIGS, PlanType, getPlanFeatures } from '@/lib/plan-restrictions';

interface UserSubscription {
  plan: PlanType;
  status: 'active' | 'cancelled' | 'expired' | 'trialing' | 'past_due';
  nextBilling?: string;
  trialDaysLeft?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage: {
    stores: number;
    maxStores: number;
    messages: number;
    maxMessages: number;
    analytics: number;
    maxAnalytics: number;
  };
  billing: 'monthly' | 'annual';
}

export function SubscriptionManagement() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billingToggle, setBillingToggle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
        setBillingToggle(data.data.billing || 'monthly');
      } else {
        // Fallback: Set basic plan as default
        setSubscription({
          plan: 'basic',
          status: 'active',
          billing: 'monthly',
          usage: {
            stores: 0,
            maxStores: 1,
            messages: 0,
            maxMessages: 1000,
            analytics: 0,
            maxAnalytics: 500
          }
        });
      }
      
    } catch (err) {
      // Set default subscription state for demo
      setSubscription({
        plan: 'basic',
        status: 'active',
        billing: 'monthly',
        usage: {
          stores: 0,
          maxStores: 1,
          messages: 0,
          maxMessages: 1000,
          analytics: 0,
          maxAnalytics: 500
        }
      });
      console.log('Subscription data not available, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: PlanType, billing: 'monthly' | 'annual') => {
    try {
      setIsUpgrading(true);
      setError(null);
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: planId,
          billing,
          successUrl: `${window.location.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/dashboard?canceled=true`
        })
      });

      const data = await response.json();
      
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error || 'Error al crear la sesión de pago');
      }
    } catch (err) {
      setError('Error al procesar la actualización');
    } finally {
      setIsUpgrading(false);
    }
  };

  const getDisplayPrice = (planConfig: typeof PLAN_CONFIGS[0], billing: 'monthly' | 'annual') => {
    if (billing === 'annual') {
      return {
        price: planConfig.annualPrice,
        period: '/año',
        savings: Math.round(((planConfig.monthlyPrice * 12) - planConfig.annualPrice) / (planConfig.monthlyPrice * 12) * 100)
      };
    }
    return {
      price: planConfig.monthlyPrice,
      period: '/mes',
      savings: 0
    };
  };

  const getCurrentPlanConfig = () => {
    return PLAN_CONFIGS.find(plan => plan.id === subscription?.plan) || PLAN_CONFIGS[0];
  };

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'trialing': return 'Periodo de Prueba';
      case 'past_due': return 'Pago Vencido';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 pb-8">
        <div className="bg-white px-8 pt-8 pb-6 border-b border-gray-200 mb-8 -mx-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción</h1>
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
        <div className="bg-white px-8 pt-8 pb-6 border-b border-gray-200 mb-8 -mx-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción</h1>
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

  const currentPlanConfig = getCurrentPlanConfig();
  const currentPlanFeatures = getPlanFeatures(subscription.plan);
  const isOnTrial = subscription.status === 'trialing';

  return (
    <div className="max-w-7xl mx-auto px-8 pb-8">
      {/* Header */}
      <div className="bg-white px-8 pt-8 pb-6 border-b border-gray-200 mb-8 -mx-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Tu Suscripción</h1>
        <p className="text-gray-600">Gestiona tu plan y facturación con Stripe</p>
      </div>

      <div className="space-y-8">
        {/* Current Subscription Status */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                <CreditCard className="mr-3 h-5 w-5 text-gray-600" />
                Suscripción Actual
              </CardTitle>
              <Badge className={getStatusColor(subscription.status)}>
                {getStatusText(subscription.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Plan Info */}
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    {subscription.plan === 'pro' ? (
                      <Crown className="h-6 w-6 text-white" />
                    ) : (
                      <BarChart3 className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{currentPlanConfig.name}</h3>
                    <p className="text-gray-600 text-sm">
                      ${subscription.billing === 'annual' ? currentPlanConfig.annualPrice : currentPlanConfig.monthlyPrice}
                      {subscription.billing === 'annual' ? '/año' : '/mes'}
                      {subscription.billing === 'annual' && (
                        <Badge variant="secondary" className="ml-2 text-green-600">17% descuento</Badge>
                      )}
                    </p>
                  </div>
                </div>
                
                {isOnTrial && subscription.trialDaysLeft && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50">
                    <Gift className="h-4 w-4" />
                    <AlertDescription className="text-blue-800">
                      <strong>7 días gratis:</strong> Te quedan {subscription.trialDaysLeft} días. 
                      ¡Tu suscripción se activará automáticamente!
                    </AlertDescription>
                  </Alert>
                )}

                {subscription.nextBilling && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Próxima facturación: {new Date(subscription.nextBilling).toLocaleDateString('es-AR')}
                  </p>
                )}

                {subscription.stripeCustomerId && (
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://billing.stripe.com/p/login/test_00000000000000000000000004', '_blank')}
                      className="flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Gestionar Facturación
                    </Button>
                  </div>
                )}
              </div>

              {/* Usage Metrics */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 mb-4">Uso del Plan</h4>
                
                {/* Stores Usage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <Store className="h-4 w-4 mr-2" />
                      Tiendas Conectadas
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {subscription.usage.stores}/{subscription.usage.maxStores}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(subscription.usage.stores, subscription.usage.maxStores)}%` }}
                    />
                  </div>
                </div>

                {/* Messages Usage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Mensajes WhatsApp
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {subscription.usage.messages.toLocaleString()}/{subscription.usage.maxMessages.toLocaleString()}
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
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Consultas Analytics
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {subscription.usage.analytics}/{subscription.usage.maxAnalytics}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(subscription.usage.analytics, subscription.usage.maxAnalytics)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingToggle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingToggle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingToggle('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingToggle === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Anual
              <Badge variant="secondary" className="ml-2 text-green-600 bg-green-100">
                17% OFF
              </Badge>
            </button>
          </div>
        </div>

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Planes Disponibles</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {PLAN_CONFIGS.map((planConfig) => {
              const isCurrent = planConfig.id === subscription.plan;
              const isUpgradeOption = planConfig.id === 'pro' && subscription.plan === 'basic';
              const displayPrice = getDisplayPrice(planConfig, billingToggle);
              
              return (
                <Card 
                  key={planConfig.id} 
                  className={`relative transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isCurrent ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'hover:border-gray-300'
                  } ${
                    planConfig.highlighted ? 'border-blue-500 shadow-md' : ''
                  }`}
                >
                  {planConfig.highlighted && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
                        🚀 Recomendado
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4 text-center">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      {planConfig.id === 'pro' ? (
                        <Crown className="h-6 w-6 text-white" />
                      ) : (
                        <BarChart3 className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">{planConfig.name}</CardTitle>
                    <CardDescription className="text-gray-600">{planConfig.description}</CardDescription>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      ${displayPrice.price}
                    </div>
                    <p className="text-sm text-gray-600">
                      {displayPrice.period}
                      {displayPrice.savings > 0 && (
                        <span className="text-green-600 font-medium ml-2">
                          ¡Ahorra {displayPrice.savings}%!
                        </span>
                      )}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Features */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">Incluye:</h4>
                      <ul className="space-y-2">
                        {planConfig.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-700">
                            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                              <Check className="h-3 w-3 text-green-700" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-4">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Plan Actual
                        </Button>
                      ) : isUpgradeOption ? (
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:-translate-y-0.5" 
                          onClick={() => handleUpgrade(planConfig.id, billingToggle)}
                          disabled={isUpgrading}
                        >
                          {isUpgrading ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <TrendingUp className="h-4 w-4 mr-2" />
                          )}
                          Actualizar a Pro
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => handleUpgrade(planConfig.id, billingToggle)}
                          disabled={isUpgrading}
                        >
                          {isUpgrading ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                          )}
                          Seleccionar Plan
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Stripe Integration Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Facturación Segura con Stripe</h4>
                <p className="text-sm text-blue-700">
                  Todos los pagos son procesados de forma segura por Stripe. 
                  Cancela en cualquier momento desde tu portal de facturación.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 