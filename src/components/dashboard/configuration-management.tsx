"use client";

import { Store } from '@/types/db';
import { StoreManagement } from './store-management';
import { WhatsAppManagement } from './whatsapp-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Store as StoreIcon, MessageSquare, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchPostWithAuth } from '@/lib/fetch-with-auth';

interface ConfigurationManagementProps {
  stores: Store[];
  onStoreUpdate: () => Promise<void>;
}

export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {
  // Simplified debugging - only essential logs
  console.log('[CONFIG] Component rendering with', stores?.length || 0, 'stores');
  
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified handlers
  const handleConnectStore = async () => {
    if (!storeUrl.trim()) {
      setError('Por favor ingresa la URL de tu tienda');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetchPostWithAuth('/api/tiendanube/oauth/initiate', {
        storeUrl: storeUrl.trim(),
        storeName: storeName.trim() || undefined,
        context: 'configuration'
      });

      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Error al iniciar conexión con Tienda Nube');
      }
    } catch (error) {
      console.error('[ERROR] Connect store failed:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCloseDialog = () => {
    setShowConnectDialog(false);
    setStoreUrl('');
    setStoreName('');
    setError(null);
  };

  const handleAddStore = () => {
    setShowConnectDialog(true);
  };

  // Minimal UI that should always render
  return (
    <div className="space-y-8 p-6">
      {/* CRITICAL: Always visible test element */}
      <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded">
        ✅ ConfigurationManagement está funcionando - Tiendas: {stores?.length || 0}
      </div>

      {/* Gestión de Tiendas - Simplified */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <StoreIcon className="h-5 w-5 text-blue-600" />
            <CardTitle>Gestión de Tiendas</CardTitle>
          </div>
          <CardDescription>
            Conecta y administra tus tiendas de Tienda Nube
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stores && stores.length > 0 ? (
              <StoreManagement stores={stores} onStoreUpdate={onStoreUpdate} />
            ) : (
              <div className="text-center py-8">
                <StoreIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay tiendas conectadas
                </h3>
                <p className="text-gray-600 mb-4">
                  Conecta tu primera tienda para comenzar a usar Fini AI
                </p>
                <Button onClick={handleAddStore}>
                  <Plus className="w-4 h-4 mr-2" />
                  Conectar Tienda
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gestión de WhatsApp - Simplified */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <CardTitle>Gestión de WhatsApp</CardTitle>
          </div>
          <CardDescription>
            Configura tu número de WhatsApp para recibir analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppManagement stores={stores} />
        </CardContent>
      </Card>

      {/* Dialog for connecting new store */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar Tienda</DialogTitle>
            <DialogDescription>
              Conecta tu tienda de Tienda Nube para comenzar a usar Fini AI
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <label className="text-sm font-medium">URL de tu tienda *</label>
              <Input
                type="url"
                placeholder="https://tutienda.mitiendanube.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Nombre de la tienda (opcional)</label>
              <Input
                type="text"
                placeholder="Mi tienda"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleConnectStore} 
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? 'Conectando...' : 'Conectar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 