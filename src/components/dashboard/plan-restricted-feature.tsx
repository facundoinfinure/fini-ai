import React from 'react';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { FeatureGate, InlineUpgradePrompt } from '@/components/ui/upgrade-prompt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Example component showing how to restrict features based on plan
 */
export function MultiAgentSystemCard() {
  const { hasFeature, plan, loading } = usePlanRestrictions();
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAccess = hasFeature('multiAgentSystem');

  return (
    <FeatureGate
      hasAccess={hasAccess}
      feature="Sistema Multi-Agente"
      message="Accede a nuestro sistema de agentes especializados que pueden analizar tu negocio desde múltiples perspectivas: analytics, marketing, atención al cliente y más."
      planRequired="pro"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sistema Multi-Agente</CardTitle>
            <Badge variant="secondary">Pro</Badge>
          </div>
          <CardDescription>
            Agentes especializados para análisis completo de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold">📊 Analytics Agent</h4>
                <p className="text-sm text-gray-600">Especialista en métricas y datos</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold">🎯 Marketing Agent</h4>
                <p className="text-sm text-gray-600">Ideas y estrategias de marketing</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold">👥 Customer Service Agent</h4>
                <p className="text-sm text-gray-600">Atención al cliente inteligente</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold">📈 Forecasting Agent</h4>
                <p className="text-sm text-gray-600">Predicciones con IA</p>
              </div>
            </div>
            <Button className="w-full">
              Activar Sistema Multi-Agente
            </Button>
          </div>
        </CardContent>
      </Card>
    </FeatureGate>
  );
}

/**
 * Example of store management with plan restrictions
 */
export function StoreManagementCard() {
  const { canAddStore, plan, features, loading } = usePlanRestrictions();
  
  // Mock current store count - in real app, get from API/context
  const currentStoreCount = 1;
  const canAddMoreStores = canAddStore(currentStoreCount);
  const maxStores = features?.maxStores || 1;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestión de Tiendas</CardTitle>
          <Badge variant={plan === 'pro' ? 'default' : 'secondary'}>
            {plan === 'pro' ? 'Pro' : 'Basic'}
          </Badge>
        </div>
        <CardDescription>
          Tiendas conectadas: {currentStoreCount} de {maxStores}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h4 className="font-semibold">Mi Tienda Principal</h4>
              <p className="text-sm text-gray-600">tienda-ejemplo.mitiendanube.com</p>
            </div>
            <Badge variant="outline">Activa</Badge>
          </div>
          
          {!canAddMoreStores && plan === 'basic' && (
            <InlineUpgradePrompt 
              message={`Con el Plan Basic puedes conectar solo ${maxStores} tienda. Actualiza para conectar hasta 5 tiendas.`}
              planRequired="pro"
            />
          )}
          
          <Button 
            disabled={!canAddMoreStores}
            className="w-full"
          >
            {canAddMoreStores ? 'Conectar Nueva Tienda' : 'Límite Alcanzado'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example of advanced analytics with feature gate
 */
export function AdvancedAnalyticsCard() {
  const { hasFeature, plan } = usePlanRestrictions();
  
  const hasAdvancedAnalytics = hasFeature('advancedAnalytics');
  const hasCustomReports = hasFeature('customReports');
  const hasForecastingAI = hasFeature('forecastingAI');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Avanzados</CardTitle>
        <CardDescription>
          Análisis profundo de tu negocio con IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Basic analytics - available to all plans */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">📊 Analytics Básicos</h4>
              <Badge variant="outline">Incluido</Badge>
            </div>
            <p className="text-sm text-gray-600">Métricas esenciales de ventas y productos</p>
          </div>

          {/* Advanced features with feature gates */}
          <FeatureGate
            hasAccess={hasAdvancedAnalytics}
            feature="Analytics Avanzados"
            message="Accede a métricas detalladas, segmentación de clientes y análisis de comportamiento."
            planRequired="pro"
            fallback={
              <div className="p-3 border border-dashed rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-400">📈 Analytics Avanzados</h4>
                  <Badge variant="secondary">Pro</Badge>
                </div>
                <p className="text-sm text-gray-500">Disponible con Plan Pro</p>
              </div>
            }
          >
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">📈 Analytics Avanzados</h4>
                <Badge variant="default">Activo</Badge>
              </div>
              <p className="text-sm text-gray-600">Métricas detalladas y segmentación avanzada</p>
            </div>
          </FeatureGate>

          <FeatureGate
            hasAccess={hasCustomReports}
            feature="Reportes Personalizados"
            message="Crea reportes personalizados con las métricas que más te interesan."
            planRequired="pro"
            fallback={
              <div className="p-3 border border-dashed rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-400">📋 Reportes Personalizados</h4>
                  <Badge variant="secondary">Pro</Badge>
                </div>
                <p className="text-sm text-gray-500">Disponible con Plan Pro</p>
              </div>
            }
          >
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">📋 Reportes Personalizados</h4>
                <Badge variant="default">Activo</Badge>
              </div>
              <p className="text-sm text-gray-600">Reportes a medida con tus métricas favoritas</p>
            </div>
          </FeatureGate>

          <FeatureGate
            hasAccess={hasForecastingAI}
            feature="Forecasting con IA"
            message="Predicciones inteligentes de ventas y tendencias usando machine learning."
            planRequired="pro"
            fallback={
              <div className="p-3 border border-dashed rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-400">🔮 Forecasting IA</h4>
                  <Badge variant="secondary">Pro</Badge>
                </div>
                <p className="text-sm text-gray-500">Disponible con Plan Pro</p>
              </div>
            }
          >
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">🔮 Forecasting IA</h4>
                <Badge variant="default">Activo</Badge>
              </div>
              <p className="text-sm text-gray-600">Predicciones inteligentes con machine learning</p>
            </div>
          </FeatureGate>
        </div>
      </CardContent>
    </Card>
  );
} 