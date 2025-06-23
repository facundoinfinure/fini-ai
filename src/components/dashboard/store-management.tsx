"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Store as StoreIcon, Plus, Edit, Trash2, ExternalLink, RefreshCw, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Store } from '@/types/db';

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
  
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();

  const handleAddStore = async () => {
    try {
      // Redirect to onboarding to collect store information first
      window.location.href = '/onboarding';
    } catch (err) {
      setError('Failed to redirect to onboarding');
    }
  };

  const handleEditStore = async () => {
    if (!editingStore) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/stores/${editingStore.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_name: formData.storeName,
          store_url: formData.storeUrl
        })
      });

      const data = await response.json();

      if (data.success) {
        await onStoreUpdate();
        setIsDialogOpen(false);
        setEditingStore(null);
        setFormData({ storeName: '', storeUrl: '' });
        setError(null);
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
      title: 'Eliminar Tienda',
      description: `¿Estás seguro de que quieres eliminar "${storeName}"? Esta acción no se puede deshacer y se eliminarán todos los datos asociados incluyendo configuraciones de WhatsApp.`,
      confirmText: 'Eliminar Tienda',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/stores/${storeId}`, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (data.success) {
            await onStoreUpdate();
            setError(null);
          } else {
            setError(data.error || 'Error al eliminar la tienda');
          }
        } catch (err) {
          setError('Error al eliminar la tienda');
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
      
      const response = await fetch(`/api/tiendanube/sync`, {
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
      storeName: store.store_name || '',
      storeUrl: store.store_url || ''
    });
    setIsDialogOpen(true);
  };

  const getStoreStatus = (store: Store) => {
    if (!store.store_id) {
      return { status: 'disconnected', label: 'No Conectada', color: 'secondary', icon: XCircle };
    }
    if (!store.is_active) {
      return { status: 'inactive', label: 'Inactiva', color: 'destructive', icon: XCircle };
    }
    if (store.updated_at) {
      const lastSync = new Date(store.updated_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return { status: 'active', label: 'Conectada', color: 'default', icon: CheckCircle };
      } else {
        return { status: 'needs_sync', label: 'Necesita Sync', color: 'secondary', icon: Clock };
      }
    }
    return { status: 'pending', label: 'Pendiente', color: 'secondary', icon: Clock };
  };

  if (loading && stores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Tiendas</CardTitle>
          <CardDescription>Administra tus tiendas conectadas de Tienda Nube</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center">
              <StoreIcon className="mr-2 h-5 w-5" />
              Gestión de Tiendas
            </CardTitle>
            <CardDescription>
              Administra tus tiendas conectadas de Tienda Nube
            </CardDescription>
          </div>
          <Button onClick={handleAddStore} className="ml-auto">
            <Plus className="mr-2 h-4 w-4" />
            Conectar Tienda
          </Button>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <span className="text-red-800 flex-1">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          )}

          {/* Store List */}
          {stores && stores.length > 0 ? (
            <div className="space-y-4">
              {stores.map((store) => {
                const storeStatus = getStoreStatus(store);
                const StatusIcon = storeStatus.icon;
                
                return (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${
                        storeStatus.status === 'active' ? 'bg-green-100' :
                        storeStatus.status === 'inactive' ? 'bg-red-100' :
                        storeStatus.status === 'needs_sync' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        <StatusIcon className={`h-6 w-6 ${
                          storeStatus.status === 'active' ? 'text-green-600' :
                          storeStatus.status === 'inactive' ? 'text-red-600' :
                          storeStatus.status === 'needs_sync' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {store.store_name || 'Tienda sin nombre'}
                          </h3>
                          <Badge 
                            variant={storeStatus.color as any}
                            className="text-xs"
                          >
                            {storeStatus.label}
                          </Badge>
                        </div>
                        
                        {store.store_url && (
                          <p className="text-sm text-gray-600 truncate mb-1">
                            {store.store_url}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            Conectada: {format(new Date(store.created_at), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          {store.updated_at && (
                            <span>
                              Último sync: {format(new Date(store.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {store.store_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncStore(store.id)}
                          disabled={loading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                      )}
                      
                      {store.store_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={store.store_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(store)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStore(store.id, store.store_name || 'Tienda sin nombre')}
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
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <StoreIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes tiendas conectadas
              </h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Conecta tu primera tienda de Tienda Nube para comenzar a usar Fini AI y obtener analytics en tiempo real.
              </p>
              <Button onClick={handleAddStore} className="mx-auto">
                <Plus className="mr-2 h-4 w-4" />
                Conectar Primera Tienda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Store Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tienda</DialogTitle>
            <DialogDescription>
              Actualiza la información de tu tienda
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la tienda
              </label>
              <Input
                id="storeName"
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="Mi Tienda"
              />
            </div>
            
            <div>
              <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-2">
                URL de la tienda
              </label>
              <Input
                id="storeUrl"
                type="url"
                value={formData.storeUrl}
                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                placeholder="https://mitienda.mitiendanube.com"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingStore(null);
                setFormData({ storeName: '', storeUrl: '' });
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditStore} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      {ConfirmationDialog}
    </div>
  );
} 