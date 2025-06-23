"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    change: number;
    period: string;
  };
  orders: {
    current: number;
    previous: number;
    change: number;
    period: string;
  };
  customers: {
    current: number;
    previous: number;
    change: number;
    period: string;
  };
  avgOrderValue: {
    current: number;
    previous: number;
    change: number;
  };
  topProducts: Array<{
    name: string;
    sales: number;
    quantity: number;
    change: number;
  }>;
  salesByDay: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  conversionMetrics: {
    conversionRate: number;
    abandonedCarts: number;
    returnCustomers: number;
  };
}

// const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function AnalyticsOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call - in production, this would call your analytics API
      const mockData: AnalyticsData = {
        revenue: {
          current: 15420,
          previous: 12300,
          change: 25.4,
          period: timeRange === '7d' ? 'última semana' : timeRange === '30d' ? 'último mes' : 'últimos 3 meses'
        },
        orders: {
          current: 89,
          previous: 67,
          change: 32.8,
          period: timeRange === '7d' ? 'última semana' : timeRange === '30d' ? 'último mes' : 'últimos 3 meses'
        },
        customers: {
          current: 156,
          previous: 142,
          change: 9.9,
          period: timeRange === '7d' ? 'última semana' : timeRange === '30d' ? 'último mes' : 'últimos 3 meses'
        },
        avgOrderValue: {
          current: 173.26,
          previous: 183.58,
          change: -5.6
        },
        topProducts: [
          { name: 'Camiseta Premium', sales: 3200, quantity: 45, change: 15.2 },
          { name: 'Jeans Clásicos', sales: 2800, quantity: 32, change: 8.7 },
          { name: 'Zapatillas Sport', sales: 2400, quantity: 28, change: -2.1 },
          { name: 'Bolso Elegante', sales: 1800, quantity: 22, change: 22.4 },
          { name: 'Reloj Vintage', sales: 1200, quantity: 15, change: -8.3 }
        ],
        salesByDay: [
          { date: 'Lun', sales: 1200, orders: 8 },
          { date: 'Mar', sales: 1800, orders: 12 },
          { date: 'Mié', sales: 1400, orders: 9 },
          { date: 'Jue', sales: 2200, orders: 15 },
          { date: 'Vie', sales: 2800, orders: 18 },
          { date: 'Sáb', sales: 3200, orders: 22 },
          { date: 'Dom', sales: 1800, orders: 11 }
        ],
        conversionMetrics: {
          conversionRate: 3.2,
          abandonedCarts: 24,
          returnCustomers: 68
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAnalytics(mockData);
    } catch (err) {
      setError('Error al cargar los analytics');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? 
      <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
      <ArrowDownRight className="h-4 w-4 text-red-600" />;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Analytics Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-10">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
            Error en Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Analytics Overview
            </CardTitle>
            <CardDescription>
              Resumen de rendimiento de tu tienda
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7d
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30d
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90d
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Key Metrics */}
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Revenue */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                {getChangeIcon(analytics.revenue.change)}
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(analytics.revenue.current)}
              </div>
              <div className="text-sm text-blue-700">
                Ingresos ({analytics.revenue.period})
              </div>
              <div className={`text-xs mt-1 ${getChangeColor(analytics.revenue.change)}`}>
                {formatPercentage(analytics.revenue.change)} vs período anterior
              </div>
            </div>

            {/* Orders */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                {getChangeIcon(analytics.orders.change)}
              </div>
              <div className="text-2xl font-bold text-green-900">
                {analytics.orders.current}
              </div>
              <div className="text-sm text-green-700">
                Órdenes ({analytics.orders.period})
              </div>
              <div className={`text-xs mt-1 ${getChangeColor(analytics.orders.change)}`}>
                {formatPercentage(analytics.orders.change)} vs período anterior
              </div>
            </div>

            {/* Customers */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-purple-100">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-purple-600" />
                {getChangeIcon(analytics.customers.change)}
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {analytics.customers.current}
              </div>
              <div className="text-sm text-purple-700">
                Clientes ({analytics.customers.period})
              </div>
              <div className={`text-xs mt-1 ${getChangeColor(analytics.customers.change)}`}>
                {formatPercentage(analytics.customers.change)} vs período anterior
              </div>
            </div>

            {/* Average Order Value */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-orange-100">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                {getChangeIcon(analytics.avgOrderValue.change)}
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(analytics.avgOrderValue.current)}
              </div>
              <div className="text-sm text-orange-700">
                Ticket Promedio
              </div>
              <div className={`text-xs mt-1 ${getChangeColor(analytics.avgOrderValue.change)}`}>
                {formatPercentage(analytics.avgOrderValue.change)} vs período anterior
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por Día</CardTitle>
            <CardDescription>Rendimiento diario de ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'sales' ? formatCurrency(value as number) : value,
                    name === 'sales' ? 'Ventas' : 'Órdenes'
                  ]}
                />
                <Bar dataKey="sales" fill="#3B82F6" name="sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos Top</CardTitle>
            <CardDescription>Productos más vendidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {product.quantity} vendidos
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(product.sales)}
                    </div>
                    <div className={`text-xs ${getChangeColor(product.change)}`}>
                      {formatPercentage(product.change)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas de Conversión</CardTitle>
          <CardDescription>Indicadores clave de rendimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics.conversionMetrics.conversionRate}%
              </div>
              <div className="text-sm text-blue-700">Tasa de Conversión</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {analytics.conversionMetrics.abandonedCarts}
              </div>
              <div className="text-sm text-yellow-700">Carritos Abandonados</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.conversionMetrics.returnCustomers}%
              </div>
              <div className="text-sm text-green-700">Clientes Recurrentes</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 