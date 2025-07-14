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
  console.log('[DEBUG] 🎯 ConfigurationManagement component started');
  console.log('[DEBUG] 🎯 Stores received:', stores?.length || 0, 'stores');
  
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectStore = async () => {
    if (!storeUrl.trim()) {
      setError('Por favor ingresa la URL de tu tienda');
      return;
    }

    // Validar formato de URL de Tienda Nube
    if (!storeUrl.includes('tiendanube.com') && !storeUrl.includes('mitiendanube.com')) {
      setError('La URL debe ser de Tienda Nube (ej: mitienda.mitiendanube.com)');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Extraer nombre automáticamente si no se proporcionó
      let finalStoreName = storeName.trim();
      if (!finalStoreName) {
        try {
          const urlParts = storeUrl.replace(/^https?:\/\//, '').split('.');
          if (urlParts.length >= 2) {
            finalStoreName = urlParts[0].charAt(0).toUpperCase() + urlParts[0].slice(1);
          } else {
            finalStoreName = 'Mi Tienda';
          }
        } catch (e) {
          finalStoreName = 'Mi Tienda';
        }
      }

      console.log('[INFO] Connecting store from dashboard:', { storeUrl, storeName: finalStoreName });

      // Llamar al endpoint de OAuth con context 'configuration'
      const response = await fetchPostWithAuth('/api/tiendanube/oauth/connect', {
        storeUrl: storeUrl.trim(),
        storeName: finalStoreName,
        context: 'configuration' // Important: not 'onboarding'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al iniciar la conexión con Tienda Nube');
      }

      if (data.data?.authUrl) {
        console.log('[INFO] Redirecting to Tienda Nube OAuth from dashboard');
        // Store context for return
        sessionStorage.setItem('dashboard-store-connection', 'true');
        window.location.href = data.data.authUrl;
      } else {
        throw new Error('No se recibió la URL de autorización de Tienda Nube');
      }

    } catch (error) {
      console.error('[ERROR] Error connecting store from dashboard:', error);
      setError(error instanceof Error ? error.message : 'Error al conectar la tienda');
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
    // Open inline dialog instead of redirecting to onboarding
    setShowConnectDialog(true);
  };

  return (
    <>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-2">Gestiona tus tiendas y números de WhatsApp en un solo lugar</p>
        </div>

        {/* Gestión de Tiendas Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <StoreIcon className="h-5 w-5 text-green-600" />
                  Gestión de Tiendas
                </h2>
                <p className="text-gray-600 mt-1">Administra tus tiendas conectadas a Fini AI</p>
              </div>
              <Button 
                onClick={handleAddStore}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Conectar Tienda
              </Button>
            </div>
          </div>
          <div className="p-6">
            <StoreManagement stores={stores} onStoreUpdate={onStoreUpdate} />
          </div>
        </div>

        {/* Gestión de WhatsApp Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Gestión de WhatsApp
            </h2>
            <p className="text-gray-600 mt-1">Administra los números conectados a tus tiendas</p>
          </div>
          <div className="p-6">
            <WhatsAppManagement stores={stores} />
          </div>
        </div>
      </div>

      {/* Connect Store Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar Nueva Tienda</DialogTitle>
            <DialogDescription>
              Conecta tu tienda de Tienda Nube para comenzar a recibir analytics automáticos
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
              <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-2">
                URL de tu tienda *
              </label>
              <Input
                id="storeUrl"
                type="url"
                placeholder="https://tu-tienda.tiendanube.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingresa la URL completa de tu tienda de Tienda Nube
              </p>
            </div>

            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de tu tienda (opcional)
              </label>
              <Input
                id="storeName"
                type="text"
                placeholder="Mi Tienda (se extraerá automáticamente si no lo proporcionas)"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si no lo proporcionas, se extraerá automáticamente de la URL
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isConnecting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConnectStore}
                disabled={isConnecting}
              >
                {isConnecting ? 'Conectando...' : 'Conectar Tienda'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 