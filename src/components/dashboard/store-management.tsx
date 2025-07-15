"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Store as StoreIcon, Plus, Edit, Trash2, ExternalLink, RefreshCw, AlertCircle, Clock, CheckCircle, XCircle, Zap, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Store } from '@/types/db';
import { fetchPostWithAuth } from '@/lib/fetch-with-auth';

// Logo de Tienda Nube moderno
const TiendaNubeLogo = () => (
  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
    <svg 
      fill="white" 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 16 16"
    >
      <path d="M10.25 2.24a5.8 5.8 0 0 0-4 1.63 4.48 4.48 0 1 0 0 8.26 5.76 5.76 0 1 0 4-9.89m0 10.24A4.49 4.49 0 0 1 5.76 8H4.48a5.74 5.74 0 0 0 .89 3.07 3.3 3.3 0 0 1-.88.13 3.2 3.2 0 0 1 0-6.4A3.2 3.2 0 0 1 7.69 8H9a4.42 4.42 0 0 0-1.63-3.43 4.48 4.48 0 1 1 2.88 7.91"></path>
    </svg>
  </div>
);

interface StoreManagementProps {
  stores: Store[];
  onStoreUpdate: () => Promise<void>;
}

export function StoreManagement({ stores, onStoreUpdate }: StoreManagementProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    storeName: '',
    storeUrl: ''
  });
  const [storeUrl, setStoreUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();

  // Conectar tienda directamente desde configuración
  const handleConnectStore = async () => {
    if (!storeUrl.trim()) {
      setError('Por favor ingresa la URL de tu tienda');
      return;
    }

    if (!storeUrl.includes('tiendanube.com') && !storeUrl.includes('mitiendanube.com')) {
      setError('La URL debe ser de Tienda Nube (ej: mitienda.mitiendanube.com)');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      let storeName = 'Mi Tienda';
      try {
        const urlParts = storeUrl.replace(/^https?:\/\//, '').split('.');
        if (urlParts.length >= 2) {
          storeName = urlParts[0].charAt(0).toUpperCase() + urlParts[0].slice(1);
        }
      } catch (e) {
        console.log('[DEBUG] Could not extract store name from URL, using default');
      }

      const response = await fetchPostWithAuth('/api/tiendanube/oauth/connect', {
        storeUrl: storeUrl.trim(),
        storeName,
        context: 'configuration'
      });

      const data = await response.json();

      if (data.success && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setError(data.error || 'Error al conectar la tienda');
      }
    } catch (err) {
      setError('Error al conectar la tienda. Inténtalo de nuevo.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEditStore = async () => {
    if (!editingStore) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchPostWithAuth('/api/stores/manage', {
        action: 'update',
        storeId: editingStore.id,
        name: formData.storeName,
        domain: formData.storeUrl
      });

      const data = await response.json();

      if (data.success) {
        await onStoreUpdate();
        setIsDialogOpen(false);
        setEditingStore(null);
        setFormData({ storeName: '', storeUrl: '' });
      } else {
        setError(data.error || 'Failed to update store');
      }
    } catch (err) {
      setError('Failed to update store');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    showConfirmation({
      title: '¿Eliminar tienda?',
      description: `¿Estás seguro de que quieres eliminar "${storeName}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);

          const response = await fetchPostWithAuth('/api/stores/manage', {
            action: 'delete',
            storeId
          });

          const data = await response.json();

          if (data.success) {
            await onStoreUpdate();
          } else {
            setError(data.error || 'Failed to delete store');
          }
        } catch (err) {
          setError('Failed to delete store');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSyncStore = async (storeId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchPostWithAuth('/api/stores/simple-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      });

      const data = await response.json();

      if (data.success) {
        await onStoreUpdate();
      } else {
        setError(data.error || 'Failed to sync store');
      }
    } catch (err) {
      setError('Failed to sync store');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setFormData({
      storeName: store.name || '',
      storeUrl: store.domain || ''
    });
    setIsDialogOpen(true);
  };

  const getStoreStatus = (store: Store) => {
    if (!store.platform_store_id) {
      return { 
        status: 'disconnected', 
        label: 'No Conectada', 
        variant: 'secondary' as const,
        icon: XCircle,
        color: 'text-gray-500'
      };
    }
    if (!store.is_active) {
      return { 
        status: 'inactive', 
        label: 'Inactiva', 
        variant: 'destructive' as const,
        icon: XCircle,
        color: 'text-red-500'
      };
    }
    if (store.updated_at) {
      const lastSync = new Date(store.updated_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return { 
          status: 'active', 
          label: 'Conectada', 
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-green-500'
        };
      } else {
        return { 
          status: 'needs_sync', 
          label: 'Necesita Sync', 
          variant: 'secondary' as const,
          icon: Clock,
          color: 'text-amber-500'
        };
      }
    }
    return { 
      status: 'pending', 
      label: 'Pendiente', 
      variant: 'secondary' as const,
      icon: Clock,
      color: 'text-blue-500'
    };
  };

  if (loading && stores.length === 0) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-lg font-medium text-gray-700">Cargando tiendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert - Mejorado */}
      {error && (
        <div className="relative p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 hover:bg-red-200"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Store List - Diseño moderno */}
      {stores && stores.length > 0 ? (
        <div className="space-y-4">
          {stores.map((store) => {
            const storeStatus = getStoreStatus(store);
            const StatusIcon = storeStatus.icon;
            
            return (
              <Card key={store.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-r from-white to-gray-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <TiendaNubeLogo />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {store.name || 'Tienda sin nombre'}
                          </h3>
                          <Badge variant={storeStatus.variant} className="flex items-center space-x-1">
                            <StatusIcon className="h-3 w-3" />
                            <span>{storeStatus.label}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <Link2 className="h-4 w-4 text-gray-400" />
                          <p className="text-gray-600 font-medium">
                            {store.domain || 'No configurado'}
                          </p>
                        </div>
                        
                        {store.last_sync_at && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-500">
                              Última sincronización: {format(new Date(store.last_sync_at), 'PPp', { locale: es })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Mejorados */}
                    <div className="flex items-center space-x-2">
                      {store.platform_store_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncStore(store.id)}
                          disabled={loading}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                          Sincronizar
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(store)}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStore(store.id, store.name || 'Tienda sin nombre')}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {store.domain && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://${store.domain}`, '_blank')}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Empty State - Completamente rediseñado
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
              <StoreIcon className="h-12 w-12 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ¡Conecta tu primera tienda!
            </h3>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg leading-relaxed">
              Conecta tu tienda de Tienda Nube para comenzar a usar Fini AI y automatizar tus analytics por WhatsApp.
            </p>
            
            {/* Formulario moderno */}
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-left">
                <label htmlFor="storeUrl" className="block text-sm font-semibold text-gray-700 mb-3">
                  URL de tu tienda
                </label>
                <Input
                  id="storeUrl"
                  type="url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://mitienda.mitiendanube.com"
                  className="w-full h-12 text-lg border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  disabled={isConnecting}
                />
              </div>
              
              <Button 
                onClick={handleConnectStore}
                disabled={isConnecting || !storeUrl.trim()}
                size="lg"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
                    Conectando tienda...
                  </>
                ) : (
                  <>
                    <Zap className="mr-3 h-5 w-5" />
                    Conectar Tienda
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Store Dialog - Mejorado */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Tienda</DialogTitle>
            <DialogDescription className="text-gray-600">
              Actualiza la información de tu tienda
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <label htmlFor="storeName" className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de la tienda
              </label>
              <Input
                id="storeName"
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="Mi Tienda"
                className="h-11"
              />
            </div>
            
            <div>
              <label htmlFor="storeUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                URL de la tienda
              </label>
              <Input
                id="storeUrl"
                type="url"
                value={formData.storeUrl}
                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                placeholder="https://mitienda.mitiendanube.com"
                className="h-11"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingStore(null);
                setFormData({ storeName: '', storeUrl: '' });
              }}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditStore} 
              disabled={loading}
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {ConfirmationDialog}
    </div>
  );
} 