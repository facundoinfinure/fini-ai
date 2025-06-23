"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Store as StoreIcon, 
  Phone, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Store } from '@/types/db';

interface DashboardSummaryProps {
  stores: Store[];
}

interface DashboardSummaryData {
  stores: {
    total: number;
    active: number;
    connected: number;
  };
  whatsapp: {
    totalNumbers: number;
    activeConfigs: number;
    configuredNumbers: number;
  };
  conversations: {
    total: number;
    active: number;
    today: number;
  };
  lastSync: string | null;
  systemStatus: 'operational' | 'degraded' | 'down';
}

export function DashboardSummary({ stores }: DashboardSummaryProps) {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [stores]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API first, fallback to local calculation
      try {
        const response = await fetch('/api/dashboard/summary');
        const data = await response.json();
        
        if (data.success) {
          setSummary(data.data);
          return;
        }
      } catch (apiError) {
        console.warn('[WARN] Dashboard API failed, using local calculation');
      }

      // Fallback: Calculate locally from stores data
      const localSummary: DashboardSummaryData = {
        stores: {
          total: stores.length,
          active: stores.filter(s => s.is_active).length,
          connected: stores.filter(s => s.tiendanube_store_id).length
        },
        whatsapp: {
          totalNumbers: 0, // Would need WhatsApp API
          activeConfigs: 0,
          configuredNumbers: 0
        },
        conversations: {
          total: 0, // Would need conversations API
          active: 0,
          today: 0
        },
        lastSync: stores[0]?.last_sync_at || null,
        systemStatus: 'operational'
      };

      setSummary(localSummary);

    } catch (err) {
      setError('Error al cargar el resumen del dashboard');
      console.error('Dashboard summary error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen General</CardTitle>
          <CardDescription>Vista consolidada de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Estado del Sistema</CardTitle>
            <Badge className={getStatusColor(summary.systemStatus)}>
              {summary.systemStatus === 'operational' && 'Operativo'}
              {summary.systemStatus === 'degraded' && 'Degradado'}
              {summary.systemStatus === 'down' && 'Fuera de línea'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen General</CardTitle>
          <CardDescription>Vista consolidada de tu cuenta Fini AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Stores Metric */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-blue-100 rounded-full">
                  <StoreIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {summary.stores.connected}
              </div>
              <div className="text-sm text-blue-700">
                Tiendas Conectadas
              </div>
              {summary.stores.total > summary.stores.connected && (
                <div className="text-xs text-blue-600 mt-1">
                  {summary.stores.total - summary.stores.connected} pendientes
                </div>
              )}
            </div>

            {/* WhatsApp Metric */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-green-100 rounded-full">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {summary.whatsapp.configuredNumbers}
              </div>
              <div className="text-sm text-green-700">
                Números WhatsApp
              </div>
              {summary.whatsapp.activeConfigs > 0 && (
                <div className="text-xs text-green-600 mt-1">
                  {summary.whatsapp.activeConfigs} activos
                </div>
              )}
            </div>

            {/* Conversations Metric */}
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-purple-100 rounded-full">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {summary.conversations.active}
              </div>
              <div className="text-sm text-purple-700">
                Chats Activos
              </div>
              {summary.conversations.today > 0 && (
                <div className="text-xs text-purple-600 mt-1">
                  {summary.conversations.today} hoy
                </div>
              )}
            </div>

            {/* Sync Status */}
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="text-sm font-semibold text-orange-900">
                {summary.lastSync ? 'Sincronizado' : 'Pendiente'}
              </div>
              <div className="text-sm text-orange-700">
                Último Sync
              </div>
              {summary.lastSync && (
                <div className="text-xs text-orange-600 mt-1">
                  {new Date(summary.lastSync).toLocaleDateString('es-AR')}
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          <CardDescription>Tareas comunes para gestionar tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {summary.stores.total === 0 && (
              <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg text-center">
                <StoreIcon className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 mb-1">Conectar Tienda</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Conecta tu primera tienda de Tienda Nube
                </p>
                <a 
                  href="/onboarding" 
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Comenzar
                </a>
              </div>
            )}

            {summary.whatsapp.totalNumbers === 0 && summary.stores.total > 0 && (
              <div className="p-4 border-2 border-dashed border-green-300 rounded-lg text-center">
                <Phone className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 mb-1">Configurar WhatsApp</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Agrega tu primer número de WhatsApp Business
                </p>
                <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                  Configurar
                </button>
              </div>
            )}

            {summary.stores.total > 0 && (
              <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg text-center">
                <TrendingUp className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 mb-1">Ver Analytics</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Consulta las métricas de tus tiendas
                </p>
                <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                  Ver Reportes
                </button>
              </div>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  );
} 