/**
 * Design System Demo Page
 * Muestra todos los componentes con el nuevo estilo ultra premium
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign,
  Star,
  Heart,
  Zap,
  Shield,
  Sparkles,
  Rocket,
  Target,
  Award,
  Globe
} from 'lucide-react';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-900 to-gray-700 rounded-full text-white text-sm font-medium mb-6 shadow-lg">
              <Sparkles className="h-4 w-4 mr-2" />
              <span>Design System Ultra Premium</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Fini AI Design System
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Componentes diseñados para crear aplicaciones de nivel top tier
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Buttons Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Buttons</h3>
              <div className="space-y-3">
                <Button variant="default" className="w-full">
                  <Rocket className="h-4 w-4 mr-2" />
                  Default
                </Button>
                <Button variant="premium" className="w-full">
                  <Star className="h-4 w-4 mr-2" />
                  Premium
                </Button>
                <Button variant="success" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Success
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Secondary Buttons</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full">
                  <Target className="h-4 w-4 mr-2" />
                  Outline
                </Button>
                <Button variant="secondary" className="w-full">
                  <Globe className="h-4 w-4 mr-2" />
                  Secondary
                </Button>
                <Button variant="ghost" className="w-full">
                  <Heart className="h-4 w-4 mr-2" />
                  Ghost
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sizes</h3>
              <div className="space-y-3">
                <Button size="xs" className="w-full">Extra Small</Button>
                <Button size="sm" className="w-full">Small</Button>
                <Button size="default" className="w-full">Default</Button>
                <Button size="lg" className="w-full">Large</Button>
                <Button size="xl" className="w-full">Extra Large</Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">States</h3>
              <div className="space-y-3">
                <Button variant="warning" className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Warning
                </Button>
                <Button variant="destructive" className="w-full">
                  Error
                </Button>
                <Button disabled className="w-full">
                  Disabled
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* Metric Cards Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Metric Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value="$127,450"
              change={{ value: 15.2, label: "vs last month" }}
              trend="up"
              icon={<DollarSign className="h-5 w-5 text-green-600" />}
              variant="success"
            />
            
            <MetricCard
              title="Active Users"
              value={2847}
              change={{ value: -5.4, label: "vs last week" }}
              trend="down"
              icon={<Users className="h-5 w-5 text-blue-600" />}
              variant="primary"
            />
            
            <MetricCard
              title="Conversion Rate"
              value="3.2%"
              change={{ value: 0.8, label: "vs last month" }}
              trend="up"
              icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
              variant="default"
            />
            
            <MetricCard
              title="Orders"
              value={156}
              change={{ value: -12.3, label: "vs yesterday" }}
              trend="down"
              icon={<ShoppingCart className="h-5 w-5 text-orange-600" />}
              variant="warning"
            />
          </div>
        </section>

        {/* Cards Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-lift">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>
                      Métricas avanzadas en tiempo real
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Visualiza datos complejos con gráficos interactivos y métricas precisas que te ayudan a tomar decisiones informadas.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Predicciones IA</CardTitle>
                    <CardDescription>
                      Forecasting inteligente automático
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Algoritmos de machine learning predicen tendencias y optimizan tu estrategia de negocio automáticamente.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>
                      Control total de accesos y permisos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Sistema avanzado de roles y permisos con autenticación multifactor y auditoría completa.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badges Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Badges</h2>
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Badges</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="destructive">Error</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="premium">Premium</Badge>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sizes</h3>
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge size="sm" variant="outline">Small</Badge>
                  <Badge size="default" variant="outline">Default</Badge>
                  <Badge size="lg" variant="outline">Large</Badge>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Form Elements Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Form Elements</h2>
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Input Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input type="email" placeholder="Enter your email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <Input type="password" placeholder="Enter your password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search
                    </label>
                    <Input type="search" placeholder="Search..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number
                    </label>
                    <Input type="number" placeholder="Enter amount" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Animations Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Animations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hover Effects</h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-100 rounded-lg hover-lift cursor-pointer">
                  <p className="text-sm text-gray-600">Hover Lift Effect</p>
                </div>
                <div className="p-4 bg-blue-100 rounded-lg hover-glow cursor-pointer">
                  <p className="text-sm text-blue-600">Hover Glow Effect</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Loading States</h3>
              <div className="space-y-4">
                <div className="shimmer-bg rounded h-4 w-full"></div>
                <div className="shimmer-bg rounded h-4 w-3/4"></div>
                <div className="shimmer-bg rounded h-4 w-1/2"></div>
                <div className="flex space-x-1">
                  <div className="loading-dots"></div>
                  <div className="loading-dots"></div>
                  <div className="loading-dots"></div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Glass Effects</h3>
              <div className="space-y-3">
                <div className="glass p-4 rounded-lg">
                  <p className="text-sm text-gray-800">Glass Effect Light</p>
                </div>
                <div className="glass-dark p-4 rounded-lg">
                  <p className="text-sm text-white">Glass Effect Dark</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <section className="text-center py-12">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 rounded-full text-white font-medium shadow-lg">
            <Award className="h-5 w-5 mr-2" />
            <span>Ultra Premium Design System</span>
          </div>
          <p className="text-gray-600 mt-4">
            Todos los componentes están optimizados para performance y accesibilidad
          </p>
        </section>
      </div>
    </div>
  );
} 