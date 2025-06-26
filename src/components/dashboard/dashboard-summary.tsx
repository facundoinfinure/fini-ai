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
      setSummary({
        stores: {
          total: stores.length,
          active: stores.filter(s => s.is_active).length,
          connected: stores.filter(s => s.platform_store_id).length
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
      });

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
          <CardDescription className="text-[#6b7280]">Vista consolidada de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-xl border border-[#e5e7eb]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f3f4f6] rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-6 bg-[#f3f4f6] rounded mb-2"></div>
                  <div className="h-4 bg-[#f3f4f6] rounded w-3/4"></div>
                </div>
              </div>
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
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f0f9ff] rounded-xl flex items-center justify-center">
                  <StoreIcon className="h-6 w-6 text-[#3b82f6]" />
                </div>
                <div className="flex-1">
                  <div className="display-number text-2xl">
                    {summary.stores.connected}
                  </div>
                  <div className="text-sm text-[#6b7280] font-medium">
                    Tiendas Conectadas
                  </div>
                  {summary.stores.total > summary.stores.connected && (
                    <div className="text-xs text-[#9ca3af] mt-1">
                      {summary.stores.total - summary.stores.connected} pendientes
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* WhatsApp Metric */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#d1fae5] rounded-xl flex items-center justify-center">
                  <Phone className="h-6 w-6 text-[#10b981]" />
                </div>
                <div className="flex-1">
                  <div className="display-number text-2xl">
                    {summary.whatsapp.configuredNumbers}
                  </div>
                  <div className="text-sm text-[#6b7280] font-medium">
                    Números WhatsApp
                  </div>
                  {summary.whatsapp.activeConfigs > 0 && (
                    <div className="text-xs text-[#9ca3af] mt-1">
                      {summary.whatsapp.activeConfigs} activos
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Conversations Metric */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#fef3c7] rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-[#f59e0b]" />
                </div>
                <div className="flex-1">
                  <div className="display-number text-2xl">
                    {summary.conversations.active}
                  </div>
                  <div className="text-sm text-[#6b7280] font-medium">
                    Chats Activos
                  </div>
                  {summary.conversations.today > 0 && (
                    <div className="text-xs text-[#9ca3af] mt-1">
                      {summary.conversations.today} hoy
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sync Status */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  summary.lastSync ? 'bg-[#d1fae5]' : 'bg-[#fef2f2]'
                }`}>
                  <Clock className={`h-6 w-6 ${
                    summary.lastSync ? 'text-[#10b981]' : 'text-[#ef4444]'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-[#1a1a1a]">
                    {summary.lastSync ? 'Sincronizado' : 'Pendiente'}
                  </div>
                  <div className="text-sm text-[#6b7280] font-medium">
                    Último Sync
                  </div>
                  {summary.lastSync && (
                    <div className="text-xs text-[#9ca3af] mt-1">
                      {new Date(summary.lastSync).toLocaleDateString('es-AR')}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription className="text-[#6b7280]">Tareas comunes para gestionar tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {summary.stores.total === 0 && (
              <div className="p-6 border-2 border-dashed border-[#d1d5db] rounded-xl text-center hover:border-[#3b82f6] hover:bg-[#f0f9ff] transition-all duration-200">
                <div className="w-12 h-12 bg-[#f0f9ff] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <StoreIcon className="h-6 w-6 text-[#3b82f6]" />
                </div>
                <h3 className="font-semibold text-[#1a1a1a] mb-2">Conectar Tienda</h3>
                <p className="text-sm text-[#6b7280] mb-4">
                  Conecta tu primera tienda de Tienda Nube
                </p>
                <a 
                  href="/onboarding" 
                  className="btn-primary inline-flex items-center text-sm"
                >
                  Comenzar
                </a>
              </div>
            )}

            {summary.whatsapp.totalNumbers === 0 && summary.stores.total > 0 && (
              <div className="p-6 border-2 border-dashed border-[#d1d5db] rounded-xl text-center hover:border-[#10b981] hover:bg-[#f0fdf4] transition-all duration-200">
                <div className="w-12 h-12 bg-[#d1fae5] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-[#10b981]" />
                </div>
                <h3 className="font-semibold text-[#1a1a1a] mb-2">Configurar WhatsApp</h3>
                <p className="text-sm text-[#6b7280] mb-4">
                  Agrega tu primer número de WhatsApp Business
                </p>
                <button className="btn-primary inline-flex items-center text-sm bg-[#10b981] hover:bg-[#059669]">
                  Configurar
                </button>
              </div>
            )}

            {summary.stores.total > 0 && (
              <div className="p-6 border-2 border-dashed border-[#d1d5db] rounded-xl text-center hover:border-[#f59e0b] hover:bg-[#fffbeb] transition-all duration-200">
                <div className="w-12 h-12 bg-[#fef3c7] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-[#f59e0b]" />
                </div>
                <h3 className="font-semibold text-[#1a1a1a] mb-2">Ver Analytics</h3>
                <p className="text-sm text-[#6b7280] mb-4">
                  Consulta las métricas de tus tiendas
                </p>
                <button className="btn-primary inline-flex items-center text-sm bg-[#f59e0b] hover:bg-[#d97706]">
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