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

export default function AnalyticsOverview() {
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
          setError('You must be logged in to view analytics');
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
          period: timeRange === '7d' ? 'last week' : timeRange === '30d' ? 'last month' : 'last 3 months'
        },
        orders: {
          current: 0,
          previous: 0,
          change: 0,
          period: timeRange === '7d' ? 'last week' : timeRange === '30d' ? 'last month' : 'last 3 months'
        },
        customers: {
          current: 0,
          previous: 0,
          change: 0,
          period: timeRange === '7d' ? 'last week' : timeRange === '30d' ? 'last month' : 'last 3 months'
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Analytics Error</h2>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchAnalytics} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8">
      {/* Header with Period Selector - Clean Qatalog Style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
          <p className="text-gray-600 mt-1">Store performance summary</p>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              timeRange === '7d' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              timeRange === '30d' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            30 days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              timeRange === '90d' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            90 days
          </button>
        </div>
      </div>

      {/* Key Metrics Grid - Clean Qatalog Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(analytics.revenue.change)}`}>
                {getChangeIcon(analytics.revenue.change)}
                {formatPercentage(analytics.revenue.change)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Revenue ({analytics.revenue.period})</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.revenue.current)}
              </p>
              <p className="text-xs text-gray-500">
                vs previous period
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(analytics.orders.change)}`}>
                {getChangeIcon(analytics.orders.change)}
                {formatPercentage(analytics.orders.change)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Orders ({analytics.orders.period})</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.orders.current}
              </p>
              <p className="text-xs text-gray-500">
                vs previous period
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(analytics.customers.change)}`}>
                {getChangeIcon(analytics.customers.change)}
                {formatPercentage(analytics.customers.change)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Customers ({analytics.customers.period})</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.customers.current}
              </p>
              <p className="text-xs text-gray-500">
                vs previous period
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value Card */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(analytics.avgOrderValue.change)}`}>
                {getChangeIcon(analytics.avgOrderValue.change)}
                {formatPercentage(analytics.avgOrderValue.change)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.avgOrderValue.current)}
              </p>
              <p className="text-xs text-gray-500">
                vs previous period
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Clean Qatalog Style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">Daily Sales</CardTitle>
            <CardDescription className="text-gray-600">Daily sales performance</CardDescription>
          </CardHeader>
          <CardContent>
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
                    name === 'sales' ? 'Sales' : 'Orders'
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
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">Top Products</CardTitle>
            <CardDescription className="text-gray-600">Best selling products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topProducts.length > 0 ? (
                analytics.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          {product.quantity} sold
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(product.sales)}
                      </div>
                      <div className={`text-xs ${getChangeColor(product.change)}`}>
                        {formatPercentage(product.change)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No product data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics - Clean Qatalog Style */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Key Performance Indicators</CardTitle>
          <CardDescription className="text-gray-600">Important metrics for your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics.conversionMetrics.conversionRate}%
              </div>
              <div className="text-sm font-medium text-gray-700">Conversion Rate</div>
            </div>
            
            <div className="text-center p-6 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {analytics.conversionMetrics.abandonedCarts}
              </div>
              <div className="text-sm font-medium text-gray-700">Abandoned Carts</div>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.conversionMetrics.returnCustomers}%
              </div>
              <div className="text-sm font-medium text-gray-700">Returning Customers</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 