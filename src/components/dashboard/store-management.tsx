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

// Logo de Tienda Nube como SVG oficial
const TiendaNubeLogo = () => (
  <svg 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 16 16"
    className="text-blue-600"
  >
    <path d="M10.25 2.24a5.8 5.8 0 0 0-4 1.63 4.48 4.48 0 1 0 0 8.26 5.76 5.76 0 1 0 4-9.89m0 10.24A4.49 4.49 0 0 1 5.76 8H4.48a5.74 5.74 0 0 0 .89 3.07 3.3 3.3 0 0 1-.88.13 3.2 3.2 0 0 1 0-6.4A3.2 3.2 0 0 1 7.69 8H9a4.42 4.42 0 0 0-1.63-3.43 4.48 4.48 0 1 1 2.88 7.91"></path>
  </svg>
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
          name: formData.storeName,
          domain: formData.storeUrl
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
      storeName: store.name || '',
      storeUrl: store.domain || ''
    });
    setIsDialogOpen(true);
  };

  const getStoreStatus = (store: Store) => {
    if (!store.platform_store_id) {
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
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
          <p className="text-sm text-gray-500">Cargando tiendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
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
        <div className="space-y-3">
          {stores.map((store) => {
            const storeStatus = getStoreStatus(store);
            const StatusIcon = storeStatus.icon;
            
            return (
              <div key={store.id} className="store-item">
                <div className="store-info">
                  <div className="store-icon">
                    <TiendaNubeLogo />
                  </div>
                  
                  <div className="store-details">
                    <h4>{store.name || 'Tienda sin nombre'}</h4>
                    <p>{store.domain || 'No configurado'}</p>
                    {store.last_sync_at && (
                      <p className="text-xs text-gray-500">
                        Última sync: {format(new Date(store.last_sync_at), 'PPp', { locale: es })}
                      </p>
                    )}
                  </div>

                  <div className={`status-badge ${storeStatus.status}`}>
                    <StatusIcon className="h-3 w-3" />
                    {storeStatus.label}
                  </div>
                </div>

                <div className="store-actions">
                  {store.platform_store_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncStore(store.id)}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      Sync
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(store)}
                    className="btn-icon"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteStore(store.id, store.name || 'Tienda sin nombre')}
                    className="btn-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  {store.domain && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${store.domain}`, '_blank')}
                      className="btn-icon"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <StoreIcon className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            ¡Conecta tu primera tienda!
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Conecta tu tienda de Tienda Nube para comenzar a usar Fini AI y automatizar tus analytics por WhatsApp.
          </p>
          <Button 
            onClick={handleAddStore}
            className="btn-primary"
          >
            <Plus className="mr-2 h-5 w-5" />
            Conectar Tienda
          </Button>
        </div>
      )}

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