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
      
      // Fetch analytics from API
      const response = await fetch(`/api/dashboard/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Debes iniciar sesión para ver los analytics');
          return;
        }
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      } else {
        throw new Error(data.error || 'Failed to load analytics');
      }
      
    } catch (err) {
      // Show empty state for now since full analytics integration is pending
      setAnalytics({
        revenue: {
          current: 0,
          previous: 0,
          change: 0,
          period: timeRange === '7d' ? 'última semana' : timeRange === '30d' ? 'último mes' : 'últimos 3 meses'
        },
        orders: {
          current: 0,
          previous: 0,
          change: 0,
          period: timeRange === '7d' ? 'última semana' : timeRange === '30d' ? 'último mes' : 'últimos 3 meses'
        },
        customers: {
          current: 0,
          previous: 0,
          change: 0,
          period: timeRange === '7d' ? 'última semana' : timeRange === '30d' ? 'último mes' : 'últimos 3 meses'
        },
        avgOrderValue: {
          current: 0,
          previous: 0,
          change: 0
        },
        topProducts: [],
        salesByDay: [],
        conversionMetrics: {
          conversionRate: 0,
          abandonedCarts: 0,
          returnCustomers: 0
        }
      });
      setError(null); // Don't show error, just empty state
      console.log('Analytics data not available yet:', err);
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
        <div className="flex items-center justify-between">
          <h1 className="page-title">Analytics Overview</h1>
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metric-card">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h2 className="section-title">Error en Analytics</h2>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchAnalytics} className="refresh-button">
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8">
      {/* Header with Period Selector - Origin Style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics Overview</h1>
          <p className="supporting-text mt-1">Resumen de rendimiento de tu tienda</p>
        </div>
        
        <div className="period-selector">
          <button
            onClick={() => setTimeRange('7d')}
            className={`period-button ${timeRange === '7d' ? 'active' : ''}`}
          >
            7d
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`period-button ${timeRange === '30d' ? 'active' : ''}`}
          >
            30d
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`period-button ${timeRange === '90d' ? 'active' : ''}`}
          >
            90d
          </button>
        </div>
      </div>

      {/* Key Metrics Grid - Origin Style */}
      <div className="metrics-grid">
        {/* Revenue Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Ingresos ({analytics.revenue.period})</span>
            <span className={`metric-change ${analytics.revenue.change >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(analytics.revenue.change)}
            </span>
          </div>
          <div className="metric-value">
            {formatCurrency(analytics.revenue.current)}
          </div>
          <div className="metric-subtitle">
            {formatPercentage(analytics.revenue.change)} vs período anterior
          </div>
        </div>

        {/* Orders Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Órdenes ({analytics.orders.period})</span>
            <span className={`metric-change ${analytics.orders.change >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(analytics.orders.change)}
            </span>
          </div>
          <div className="metric-value">
            {analytics.orders.current}
          </div>
          <div className="metric-subtitle">
            {formatPercentage(analytics.orders.change)} vs período anterior
          </div>
        </div>

        {/* Customers Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Clientes ({analytics.customers.period})</span>
            <span className={`metric-change ${analytics.customers.change >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(analytics.customers.change)}
            </span>
          </div>
          <div className="metric-value">
            {analytics.customers.current}
          </div>
          <div className="metric-subtitle">
            {formatPercentage(analytics.customers.change)} vs período anterior
          </div>
        </div>

        {/* Average Order Value Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Ticket Promedio</span>
            <span className={`metric-change ${analytics.avgOrderValue.change >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(analytics.avgOrderValue.change)}
            </span>
          </div>
          <div className="metric-value">
            {formatCurrency(analytics.avgOrderValue.current)}
          </div>
          <div className="metric-subtitle">
            {formatPercentage(analytics.avgOrderValue.change)} vs período anterior
          </div>
        </div>
      </div>

      {/* Charts Grid - Origin Style */}
      <div className="charts-grid">
        {/* Sales Chart */}
        <div className="chart-section">
          <h3 className="chart-title">Ventas por Día</h3>
          <p className="chart-subtitle">Rendimiento diario de ventas</p>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.salesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'sales' ? formatCurrency(value as number) : value,
                  name === 'sales' ? 'Ventas' : 'Órdenes'
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="chart-section">
          <h3 className="chart-title">Productos Top</h3>
          <p className="chart-subtitle">Productos más vendidos</p>
          
          <div className="space-y-3">
            {analytics.topProducts.length > 0 ? (
              analytics.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-lg border border-[#e5e7eb]">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-[#3b82f6] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[#1a1a1a]">{product.name}</div>
                      <div className="text-sm text-[#6b7280]">
                        {product.quantity} vendidos
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#1a1a1a]">
                      {formatCurrency(product.sales)}
                    </div>
                    <div className={`text-xs ${getChangeColor(product.change)}`}>
                      {formatPercentage(product.change)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[#6b7280]">
                <p>No hay datos de productos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion Metrics - Origin Style */}
      <div className="conversion-metrics">
        <div className="conversion-item">
          <div className="conversion-value percentage">
            {analytics.conversionMetrics.conversionRate}%
          </div>
          <div className="conversion-label">Tasa de Conversión</div>
        </div>
        
        <div className="conversion-item">
          <div className="conversion-value number">
            {analytics.conversionMetrics.abandonedCarts}
          </div>
          <div className="conversion-label">Carritos Abandonados</div>
        </div>
        
        <div className="conversion-item">
          <div className="conversion-value success">
            {analytics.conversionMetrics.returnCustomers}%
          </div>
          <div className="conversion-label">Clientes Recurrentes</div>
        </div>
      </div>
    </div>
  );
} 