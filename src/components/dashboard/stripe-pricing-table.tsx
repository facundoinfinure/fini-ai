'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface StripePricingTableProps {
  className?: string;
  onPlanSelected?: (plan: 'basic' | 'pro', billing: 'monthly' | 'annual') => void;
  showCustomPricing?: boolean;
}

// Define our plans with prices
const PLANS = {
  basic: {
    name: 'Plan Basic',
    monthlyPrice: 29.99,
    annualPrice: 299.99,
    description: 'Perfecto para emprendedores',
    features: [
      'Chat básico por WhatsApp',
      'Analytics básicos',
      '1 tienda únicamente',
      'Métricas en tiempo real',
      'Historial 7 días',
      'Soporte por email'
    ],
    highlighted: false
  },
  pro: {
    name: 'Plan Pro',
    monthlyPrice: 49.99,
    annualPrice: 499.99,
    description: 'Para negocios en crecimiento',
    features: [
      'Todo del Plan Basic',
      'Hasta 5 tiendas',
      'Sistema multi-agente completo',
      'Forecasting con IA',
      'Análisis de competencia',
      'Ideas de marketing automatizadas',
      'Analytics avanzados',
      'Historial extendido (30 días)',
      'Soporte prioritario'
    ],
    highlighted: true
  }
} as const;

/**
 * Stripe Pricing Table Component
 * Can display either the native Stripe pricing table or a custom React implementation
 */
export function StripePricingTable({ 
  className = '', 
  onPlanSelected,
  showCustomPricing = false 
}: StripePricingTableProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (!showCustomPricing) {
      // Load Stripe pricing table script
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [showCustomPricing]);

  const handlePlanSelection = async (plan: 'basic' | 'pro', billing: 'monthly' | 'annual') => {
    if (onPlanSelected) {
      onPlanSelected(plan, billing);
      return;
    }

    // Default behavior: redirect to checkout
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          billing,
          successUrl: `${window.location.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/dashboard?canceled=true`,
        }),
      });

      const data = await response.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        console.error('Failed to create checkout session:', data.error);
        alert('Error al crear sesión de pago. Por favor intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Error al crear sesión de pago. Por favor intenta de nuevo.');
    }
  };

  if (!showCustomPricing) {
    // Use Stripe's native pricing table
    return (
      <div className={`w-full ${className}`}>
        <div 
          dangerouslySetInnerHTML={{
            __html: `
              <stripe-pricing-table 
                pricing-table-id="${process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID}"
                publishable-key="${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}"
                ${user?.email ? `customer-email="${user.email}"` : ''}
              ></stripe-pricing-table>
            `
          }}
        />
      </div>
    );
  }

  // Custom React pricing table implementation
  return (
    <div className={`w-full ${className}`}>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {Object.entries(PLANS).map(([planKey, plan]) => (
          <Card 
            key={planKey} 
            className={`relative ${plan.highlighted ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200'}`}
          >
            {plan.highlighted && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                Recomendado
              </Badge>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="text-gray-600">
                {plan.description}
              </CardDescription>
              
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  ${plan.monthlyPrice}
                  <span className="text-lg font-normal text-gray-500">/mes</span>
                </div>
                <div className="text-sm text-gray-500">
                  o ${plan.annualPrice}/año{' '}
                  <Badge variant="secondary" className="text-green-600">
                    17% descuento
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4">
                <Button 
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handlePlanSelection(planKey as 'basic' | 'pro', 'monthly')}
                >
                  Empezar Plan Mensual
                </Button>
                
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={() => handlePlanSelection(planKey as 'basic' | 'pro', 'annual')}
                >
                  Empezar Plan Anual (17% OFF)
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500 pt-2">
                Cancela en cualquier momento
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StripePricingTable; 