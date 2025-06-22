"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Crown, Zap, Building, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface UserSubscription {
  subscription_plan: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'cancelled';
}

const PLANS = {
  free: {
    name: 'Plan Básico',
    price: 'Gratis',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    features: ['Analytics básicos', 'Resumen diario', 'RAG básico', 'Soporte por email']
  },
  pro: {
    name: 'Plan Pro',
    price: '$39/mes',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    features: ['Sistema multi-agente completo', 'Forecasting con IA', 'Análisis de competencia', 'Ideas de marketing', 'Memoria extendida', 'Soporte prioritario']
  },
  enterprise: {
    name: 'Plan Enterprise',
    price: '$99/mes',
    icon: Building,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    features: ['Agentes personalizados', 'Integraciones avanzadas', 'ML models custom', 'API dedicada', 'Soporte 24/7', 'Onboarding personalizado']
  }
};

export function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      
      if (data.success) {
        setSubscription({
          subscription_plan: data.data.user.subscriptionPlan,
          subscription_status: data.data.user.subscriptionStatus
        });
      } else {
        setError(data.error || 'Failed to fetch subscription');
      }
    } catch (err) {
      setError('Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          successUrl: `${window.location.origin}/dashboard?success=subscription_updated`,
          cancelUrl: `${window.location.origin}/dashboard?canceled=subscription`
        })
      });

      const data = await response.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setError('Failed to process upgrade');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que quieres cancelar tu suscripción? Perderás acceso a las funciones premium.')) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      // For now, we'll just show a message
      // In a real implementation, you'd call a cancel subscription endpoint
      alert('Para cancelar tu suscripción, contacta a soporte@fini-ai.com');
    } catch (err) {
      setError('Failed to cancel subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suscripción</CardTitle>
          <CardDescription>Gestiona tu plan de suscripción</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suscripción</CardTitle>
          <CardDescription>Gestiona tu plan de suscripción</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No se pudo cargar la información de suscripción</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPlan = PLANS[subscription.subscription_plan];
  const PlanIcon = currentPlan.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Suscripción
        </CardTitle>
        <CardDescription>
          Gestiona tu plan de suscripción y facturación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            {error}
          </div>
        )}

        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <div className={`p-2 ${currentPlan.bgColor} rounded-lg`}>
              <PlanIcon className={`h-5 w-5 ${currentPlan.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{currentPlan.name}</h3>
              <p className="text-sm text-gray-600">{currentPlan.price}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={subscription.subscription_status === 'active' ? "default" : "secondary"}>
              {subscription.subscription_status === 'active' ? 'Activo' : 'Inactivo'}
            </Badge>
            {subscription.subscription_status === 'active' && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>

        {/* Plan Features */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Características incluidas:</h4>
          <ul className="space-y-1">
            {currentPlan.features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {subscription.subscription_plan === 'free' && (
            <div className="space-y-2">
              <Button 
                onClick={() => handleUpgrade('pro')} 
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {isProcessing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="mr-2 h-4 w-4" />
                )}
                Actualizar a Pro - $39/mes
              </Button>
              <Button 
                onClick={() => handleUpgrade('enterprise')} 
                disabled={isProcessing}
                variant="outline"
                className="w-full"
              >
                {isProcessing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Building className="mr-2 h-4 w-4" />
                )}
                Actualizar a Enterprise - $99/mes
              </Button>
            </div>
          )}

          {subscription.subscription_plan === 'pro' && (
            <div className="space-y-2">
              <Button 
                onClick={() => handleUpgrade('enterprise')} 
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {isProcessing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Building className="mr-2 h-4 w-4" />
                )}
                Actualizar a Enterprise - $99/mes
              </Button>
              <Button 
                onClick={handleCancel} 
                disabled={isProcessing}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancelar Suscripción
              </Button>
            </div>
          )}

          {subscription.subscription_plan === 'enterprise' && (
            <Button 
              onClick={handleCancel} 
              disabled={isProcessing}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancelar Suscripción
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center">
          ¿Necesitas ayuda? Contacta a{' '}
          <a href="mailto:soporte@fini-ai.com" className="text-blue-600 hover:underline">
            soporte@fini-ai.com
          </a>
        </div>
      </CardContent>
    </Card>
  );
} 