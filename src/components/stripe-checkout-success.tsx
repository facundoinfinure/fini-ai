'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface StripeCheckoutSuccessProps {
  sessionId: string;
  onComplete?: () => void;
}

/**
 * Component to show after successful Stripe checkout
 * Provides fallback in case automatic redirect doesn't work
 */
export function StripeCheckoutSuccess({ sessionId, onComplete }: StripeCheckoutSuccessProps) {
  const [countdown, setCountdown] = useState(5);
  const [shouldRedirect, setShouldRedirect] = useState(true);

  useEffect(() => {
    // Countdown timer for manual redirect option
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShouldRedirect(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleManualRedirect = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard?success=true&session_id=' + sessionId;
    }
  };

  const handleExternalLink = () => {
    if (typeof window !== 'undefined') {
      window.open('/dashboard?success=true&session_id=' + sessionId, '_blank');
    }
  };

  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              ¡Pago Exitoso!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Tu suscripción ha sido procesada correctamente.
            </p>
            
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-blue-600 font-medium">
                Redirigiendo al dashboard en {countdown}s...
              </span>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-3">
                ¿No se redirigió automáticamente?
              </p>
              <Button 
                onClick={handleManualRedirect}
                className="w-full mb-2"
              >
                Ir al Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={handleExternalLink}
                className="w-full"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en nueva pestaña
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // After countdown, show permanent success state with action buttons
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">
            ¡Bienvenido a Fini AI!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Tu suscripción está activa. Comienza a usar tu asistente IA para WhatsApp.
          </p>
          
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleManualRedirect}
              className="w-full"
              size="lg"
            >
              Acceder al Dashboard
            </Button>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>✅ Suscripción activa</p>
              <p>📱 Mensaje de WhatsApp en camino</p>
              <p>🎯 Session ID: <code className="text-xs">{sessionId}</code></p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-400">
              ¿Problemas? Guarda el Session ID de arriba y contacta soporte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StripeCheckoutSuccess; 