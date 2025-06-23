"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Phone,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Store as StoreIcon,
  CheckCircle,
  XCircle,
  Settings,
  MessageSquare,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Store } from '@/types/db';

interface WhatsAppConfig {
  id: string;
  phone_numbers: string[];
  is_active: boolean;
  is_configured: boolean;
  store_name?: string;
  store_id?: string;
  last_activity?: string;
  message_count?: number;
}

interface WhatsAppStats {
  totalNumbers: number;
  activeNumbers: number;
  totalMessages: number;
  avgResponseTime: number;
}

interface WhatsAppManagementProps {
  stores: Store[];
}

export function WhatsAppManagement({ stores }: WhatsAppManagementProps) {
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | null>(null);
  const [formNumber, setFormNumber] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (stores && stores.length > 0) {
      const storeIds = stores.map(s => s.id);
      if (!selectedStoreId || !storeIds.includes(selectedStoreId)) {
        setSelectedStoreId(stores[0].id);
      }
    } else {
      setSelectedStoreId(null);
    }
  }, [stores, selectedStoreId]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data - in production, this would call your WhatsApp API
      const mockConfigs: WhatsAppConfig[] = [
        {
          id: '1',
          phone_numbers: ['+5491123456789'],
          is_active: true,
          is_configured: true,
          store_name: 'Tienda Demo Fini',
          store_id: 'store-1',
          last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          message_count: 156
        },
        {
          id: '2',
          phone_numbers: ['+5491987654321'],
          is_active: false,
          is_configured: false,
          store_name: 'Tienda Secundaria',
          store_id: 'store-2',
          last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          message_count: 23
        }
      ];

      const mockStats: WhatsAppStats = {
        totalNumbers: 2,
        activeNumbers: 1,
        totalMessages: 179,
        avgResponseTime: 45
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setConfigs(mockConfigs);
      setStats(mockStats);
    } catch (err) {
      setError('Error al cargar las configuraciones de WhatsApp');
      console.error('WhatsApp config fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    if (!formNumber || !selectedStoreId) return;
    setIsAdding(true);
    setError(null);
    try {
      const response = await fetch('/api/whatsapp/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: formNumber,
          storeId: selectedStoreId
        })
      });
      const data = await response.json();
      if (data.success) {
        setFormNumber('');
        setIsDialogOpen(false);
        await fetchConfigs();
      } else {
        setError(data.error || 'Failed to add number');
      }
    } catch (err) {
      setError('Failed to add number');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStatus = async (configId: string) => {
    try {
      setLoading(true);
      const config = configs.find(c => c.id === configId);
      if (!config) return;

      const response = await fetch(`/api/whatsapp/numbers/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !config.is_active })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchConfigs();
      } else {
        setError(data.error || 'Failed to toggle status');
      }
    } catch (err) {
      setError('Failed to toggle status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta configuración de WhatsApp?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/whatsapp/numbers/${configId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchConfigs();
      } else {
        setError(data.error || 'Failed to delete configuration');
      }
    } catch (err) {
      setError('Failed to delete configuration');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isActive: boolean, isConfigured: boolean) => {
    if (!isConfigured) return 'bg-gray-100 text-gray-800';
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusText = (isActive: boolean, isConfigured: boolean) => {
    if (!isConfigured) return 'No Configurado';
    return isActive ? 'Activo' : 'Inactivo';
  };

  const getStatusIcon = (isActive: boolean, isConfigured: boolean) => {
    if (!isConfigured) return XCircle;
    return isActive ? CheckCircle : XCircle;
  };

  if (loading && configs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="mr-2 h-5 w-5" />
            Gestión de WhatsApp
          </CardTitle>
          <CardDescription>Configura y administra tus números de WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (stores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="mr-2 h-5 w-5" />
            Gestión de WhatsApp
          </CardTitle>
          <CardDescription>Configura y administra tus números de WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Necesitas conectar al menos una tienda antes de configurar WhatsApp.
              Ve a la pestaña "Tiendas" para conectar tu primera tienda.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              WhatsApp Analytics
            </CardTitle>
            <CardDescription>
              Métricas de tus números de WhatsApp Business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalNumbers}
                </div>
                <div className="text-sm text-green-700">Números Registrados</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.activeNumbers}
                </div>
                <div className="text-sm text-blue-700">Números Activos</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalMessages}
                </div>
                <div className="text-sm text-purple-700">Mensajes Enviados</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.avgResponseTime}s
                </div>
                <div className="text-sm text-orange-700">Tiempo Respuesta</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Configuración de WhatsApp
            </CardTitle>
            <CardDescription>
              Administra tus números de WhatsApp Business
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="ml-auto">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Número
          </Button>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration List */}
          {configs && configs.length > 0 ? (
            <div className="space-y-4">
              {configs.map((config) => {
                const StatusIcon = getStatusIcon(config.is_active, config.is_configured);
                
                return (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${
                        config.is_active && config.is_configured ? 'bg-green-100' :
                        !config.is_configured ? 'bg-gray-100' :
                        'bg-red-100'
                      }`}>
                        <StatusIcon className={`h-6 w-6 ${
                          config.is_active && config.is_configured ? 'text-green-600' :
                          !config.is_configured ? 'text-gray-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {config.phone_numbers[0]}
                          </h3>
                          <Badge 
                            className={`text-xs ${getStatusColor(config.is_active, config.is_configured)}`}
                          >
                            {getStatusText(config.is_active, config.is_configured)}
                          </Badge>
                        </div>
                        
                        {config.store_name && (
                          <p className="text-sm text-gray-600 mb-1">
                            Tienda: {config.store_name}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {config.message_count && (
                            <span>
                              {config.message_count} mensajes enviados
                            </span>
                          )}
                          {config.last_activity && (
                            <span>
                              Última actividad: {new Date(config.last_activity).toLocaleString('es-AR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {config.is_configured && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(config.id)}
                          disabled={loading}
                        >
                          {config.is_active ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Activar
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingConfig(config);
                          setFormNumber(config.phone_numbers[0]);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Phone className="h-12 w-12 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes números de WhatsApp configurados
              </h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Configura tu primer número de WhatsApp Business para comenzar a recibir consultas de analytics automáticamente.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="mx-auto">
                <Plus className="mr-2 h-4 w-4" />
                Configurar WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-600" />
            Configuración Rápida
          </CardTitle>
          <CardDescription>
            Pasos para configurar WhatsApp Business con Fini AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Conecta tu tienda</h4>
                <p className="text-sm text-blue-700">
                  Asegúrate de tener al menos una tienda de Tienda Nube conectada
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <h4 className="font-medium text-green-900">Registra tu número</h4>
                <p className="text-sm text-green-700">
                  Agrega tu número de WhatsApp Business usando el botón "Agregar Número"
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <h4 className="font-medium text-purple-900">¡Listo para chatear!</h4>
                <p className="text-sm text-purple-700">
                  Tus clientes ya pueden chatear contigo y obtener analytics en tiempo real
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Number Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuración' : 'Agregar Número de WhatsApp'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig 
                ? 'Actualiza la configuración de tu número de WhatsApp' 
                : 'Configura un nuevo número de WhatsApp Business'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Número de WhatsApp
              </label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                placeholder="+54911234567890"
              />
              <p className="text-xs text-gray-500 mt-1">
                Incluye el código de país (ej: +54 para Argentina)
              </p>
            </div>
            
            {!editingConfig && (
              <div>
                <label htmlFor="storeSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Tienda asociada
                </label>
                <select
                  id="storeSelect"
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.store_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingConfig(null);
                setFormNumber('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddNumber} disabled={isAdding || !formNumber}>
              {isAdding ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingConfig ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 