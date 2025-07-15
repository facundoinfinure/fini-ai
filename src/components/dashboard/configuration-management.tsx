"use client";

import { Store } from '@/types/db';
import { StoreManagement } from './store-management';
import { WhatsAppManagement } from './whatsapp-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Store as StoreIcon, MessageSquare, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchPostWithAuth } from '@/lib/fetch-with-auth';
import { DebugConfigTab } from '@/components/debug-config-tab';

interface ConfigurationManagementProps {
  stores: Store[];
  onStoreUpdate: () => Promise<void>;
}

export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingStoreName, setIsFetchingStoreName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Función para obtener automáticamente el nombre de la tienda
  const fetchStoreName = async (url: string) => {
    if (!url.trim() || (!url.includes('tiendanube.com') && !url.includes('mitiendanube.com'))) {
      return;
    }

    setIsFetchingStoreName(true);
    setError(null);

    try {
      // Primero intentar con el endpoint de la API
      const response = await fetch('/api/tiendanube/store-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeUrl: url.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.name) {
          setStoreName(data.data.name);
          console.log(`[INFO] Auto-detected store name: "${data.data.name}" from ${data.data.source}`);
          return;
        }
      }
    } catch (error) {
      console.log('[DEBUG] API endpoint not available, using fallback');
    }

    // Fallback: extraer nombre de la URL
    try {
      const urlParts = url.replace(/^https?:\/\//, '').split('.');
      if (urlParts.length >= 2) {
        const extractedName = urlParts[0]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        setStoreName(extractedName);
        console.log(`[INFO] Extracted store name from URL: "${extractedName}"`);
      }
    } catch (error) {
      console.log('[DEBUG] Could not extract store name from URL');
    } finally {
      setIsFetchingStoreName(false);
    }
  };

  // Handler para cambios en URL con debounce
  const handleUrlChange = useCallback((url: string) => {
    setStoreUrl(url);
    
    // Limpiar timeout anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Solo auto-obtener nombre si es una URL de Tienda Nube
    if (url.trim() && (url.includes('tiendanube.com') || url.includes('mitiendanube.com'))) {
      // Limpiar nombre anterior si el usuario cambió la URL
      setStoreName('');
      
      // Debounce de 1 segundo después de que el usuario pare de escribir
      debounceTimeoutRef.current = setTimeout(() => {
        fetchStoreName(url);
      }, 1000);
    } else {
      // Limpiar nombre si la URL no es válida
      setStoreName('');
    }
  }, []);

  // Simplified handlers
  const handleConnectStore = async () => {
    if (!storeUrl.trim()) {
      setError('Por favor ingresa la URL de tu tienda');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetchPostWithAuth('/api/tiendanube/oauth/connect', {
        storeUrl: storeUrl.trim(),
        storeName: storeName.trim() || undefined,
        context: 'configuration'
      });

      const data = await response.json();

      if (data.success && data.data?.authUrl) {
        window.location.href = data.data.authUrl;
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
    setIsFetchingStoreName(false);
    
    // Limpiar timeout de debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };

  const handleAddStore = () => {
    setShowConnectDialog(true);
  };

  // Clean UI that should always render
  return (
    <div className="space-y-6">

      {/* Store Management - Clean */}
      <Card>
        <CardHeader>
          <CardTitle>Store Management</CardTitle>
          <CardDescription>
            Connect and manage your Tienda Nube stores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stores && stores.length > 0 ? (
              <StoreManagement stores={stores} onStoreUpdate={onStoreUpdate} />
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No stores connected
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect your first store to start using Fini AI
                </p>
                <Button onClick={handleAddStore}>
                  Connect Store
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Management - Clean */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Configuration</CardTitle>
          <CardDescription>
            Set up your WhatsApp number to receive analytics
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
            <DialogTitle>Connect Store</DialogTitle>
            <DialogDescription>
              Connect your Tienda Nube store to start using Fini AI
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-900">Store URL *</label>
              <Input
                type="url"
                placeholder="https://yourstore.mitiendanube.com"
                value={storeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="mt-1"
                disabled={isConnecting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Store name will be detected automatically
              </p>
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-900">Store Name</label>
                {isFetchingStoreName && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                )}
              </div>
              <Input
                type="text"
                placeholder={isFetchingStoreName ? "Detecting name..." : "My Store"}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="mt-1"
                disabled={isConnecting || isFetchingStoreName}
              />
              <p className="text-xs text-gray-500 mt-1">
                {storeName && !isFetchingStoreName ? "✓ Name detected automatically" : "You can edit the name if desired"}
              </p>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleConnectStore} 
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 