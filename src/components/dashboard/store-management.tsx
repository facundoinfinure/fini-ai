"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Store as StoreIcon, Plus, Edit, Trash2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tienda?')) {
      return;
    }

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
        setError(data.error || 'Failed to delete store');
      }
    } catch (err) {
      setError('Failed to delete store');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setFormData({
      storeName: store.store_name,
      storeUrl: store.store_url
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Tiendas</CardTitle>
          <CardDescription>Administra tus tiendas conectadas</CardDescription>
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <StoreIcon className="mr-2 h-5 w-5" />
                Gestión de Tiendas
              </CardTitle>
              <CardDescription>
                Administra tus tiendas conectadas de Tienda Nube
              </CardDescription>
            </div>
            <Button onClick={handleAddStore} className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Conectar Tienda
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              {error}
            </div>
          )}

          {stores.length === 0 ? (
            <div className="text-center py-8">
              <StoreIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes tiendas conectadas
              </h3>
              <p className="text-gray-600 mb-4">
                Conecta tu primera tienda de Tienda Nube para comenzar a usar Fini AI
              </p>
              <Button onClick={handleAddStore}>
                <Plus className="mr-2 h-4 w-4" />
                Conectar Primera Tienda
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <StoreIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{store.store_name}</h3>
                      <p className="text-sm text-gray-600">{store.store_url}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={store.is_active ? "default" : "secondary"}>
                          {store.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Conectada el {format(new Date(store.created_at), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(store)}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(store.store_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Visitar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStore(store.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
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
              Modifica la información de tu tienda conectada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Tienda
              </label>
              <Input
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="Mi Tienda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de la Tienda
              </label>
              <Input
                value={formData.storeUrl}
                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                placeholder="https://mitienda.mitiendanube.com"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditStore} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 