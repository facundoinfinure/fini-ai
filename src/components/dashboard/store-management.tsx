"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Store, Plus, Edit, Trash2, ExternalLink, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StoreData {
  id: string;
  tiendanube_store_id: string;
  store_name: string;
  store_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
}

export function StoreManagement() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [formData, setFormData] = useState({
    storeName: '',
    storeUrl: ''
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stores');
      const data = await response.json();

      if (data.success) {
        setStores(data.data.stores || []);
      } else {
        setError(data.error || 'Failed to fetch stores');
      }
    } catch (err) {
      setError('Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async () => {
    try {
      // For now, this will redirect to Tienda Nube OAuth
      // In a real implementation, you'd handle the OAuth flow here
      const response = await fetch('/api/tiendanube/oauth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success && data.data.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        setError('Failed to initiate store connection');
      }
    } catch (err) {
      setError('Failed to add store');
    }
  };

  const handleEditStore = async () => {
    if (!editingStore) return;

    try {
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
        await fetchStores();
        setIsDialogOpen(false);
        setEditingStore(null);
        setFormData({ storeName: '', storeUrl: '' });
      } else {
        setError(data.error || 'Failed to update store');
      }
    } catch (err) {
      setError('Failed to update store');
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tienda?')) {
      return;
    }

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await fetchStores();
      } else {
        setError(data.error || 'Failed to delete store');
      }
    } catch (err) {
      setError('Failed to delete store');
    }
  };

  const openEditDialog = (store: StoreData) => {
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
                <Store className="mr-2 h-5 w-5" />
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
              <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
                      <Store className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{store.store_name}</h3>
                      <p className="text-sm text-gray-600">{store.store_url}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={store.is_active ? "default" : "secondary"}>
                          {store.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                        {store.last_sync_at && (
                          <span className="text-xs text-gray-500">
                            Última sincronización: {format(new Date(store.last_sync_at), "d MMM yyyy, HH:mm", { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={store.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => openEditDialog(store)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStore(store.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
              Modifica la información de tu tienda
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
                placeholder="Nombre de la tienda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de la Tienda
              </label>
              <Input
                value={formData.storeUrl}
                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                placeholder="https://mitienda.tiendanube.com"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditStore}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 