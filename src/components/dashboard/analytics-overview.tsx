"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  revenue: {
    total: number;
    change: number;
    period: string;
  };
  orders: {
    total: number;
    change: number;
    period: string;
  };
  customers: {
    total: number;
    change: number;
    period: string;
  };
  topProducts: Array<{
    name: string;
    sales: number;
    quantity: number;
  }>;
  salesByDay: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function AnalyticsOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // For now, we'll use mock data since we don't have real analytics yet
      // In production, this would call your analytics API
      const mockData: AnalyticsData = {
        revenue: {
          total: 15420,
          change: 12.5,
          period: 'este mes'
        },
        orders: {
          total: 89,
          change: 8.2,
          period: 'este mes'
        },
        customers: {
          total: 156,
          change: 15.3,
          period: 'este mes'
        },
        topProducts: [
          { name: 'Camiseta Premium', sales: 3200, quantity: 45 },
          { name: 'Jeans Clásicos', sales: 2800, quantity: 32 },
          { name: 'Zapatillas Sport', sales: 2400, quantity: 28 },
          { name: 'Bolso Elegante', sales: 1800, quantity: 22 },
          { name: 'Reloj Vintage', sales: 1200, quantity: 15 }
        ],
        salesByDay: [
          { date: 'Lun', sales: 1200, orders: 8 },
          { date: 'Mar', sales: 1800, orders: 12 },
          { date: 'Mié', sales: 1400, orders: 9 },
          { date: 'Jue', sales: 2200, orders: 15 },
          { date: 'Vie', sales: 2800, orders: 18 },
          { date: 'Sáb', sales: 3200, orders: 22 },
          { date: 'Dom', sales: 1800, orders: 11 }
        ]
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAnalytics(mockData);
    } catch (err) {
      setError('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <TrendingUp className={`h-3 w-3 mr-1 ${isPositive ? '' : 'rotate-180'}`} />
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Métricas y reportes de tu tienda</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Métricas y reportes de tu tienda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">{error || 'No se pudieron cargar los analytics'}</p>
            <button 
              onClick={fetchAnalytics}
              className="mt-4 text-blue-600 hover:underline"
            >
              Intentar nuevamente
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.revenue.total)}</div>
            <p className="text-xs text-muted-foreground">
              {formatChange(analytics.revenue.change)} vs {analytics.revenue.period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.orders.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatChange(analytics.orders.change)} vs {analytics.orders.period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatChange(analytics.customers.change)} vs {analytics.customers.period}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Día</CardTitle>
            <CardDescription>Evolución de ventas en la última semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                />
                <Bar dataKey="sales" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 5 productos por ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.topProducts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sales"
                >
                  {analytics.topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Productos Top</CardTitle>
          <CardDescription>Productos con mayor rendimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.quantity} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(product.sales)}</p>
                  <p className="text-sm text-gray-600">en ventas</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 