"use client";

import { Store } from '@/types/db';
import { StoreManagement } from './store-management';
import { WhatsAppManagement } from './whatsapp-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  Store as StoreIcon, 
  MessageSquare, 
  Plus, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Zap,
  Users,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchPostWithAuth } from '@/lib/fetch-with-auth';
import { Badge } from '@/components/ui/badge';

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

  // Check setup status
  const hasConnectedStores = stores.length > 0;
  const hasActiveStores = stores.some(store => store.is_active && store.access_token);
  const hasWhatsAppConfigured = stores.some(store => store.whatsapp_verified);

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

  const handleConnectStore = async () => {
    if (!storeUrl.trim()) {
      setError('Please enter a store URL');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetchPostWithAuth('/api/stores', {
        url: storeUrl.trim(),
        name: storeName.trim() || undefined
      });

      if (response.success) {
        // Redirect to OAuth
        const oauthUrl = response.data?.oauth_url;
        if (oauthUrl) {
          window.location.href = oauthUrl;
        } else {
          await onStoreUpdate();
          handleCloseDialog();
        }
      } else {
        setError(response.error || 'Failed to connect store');
      }
    } catch (error) {
      console.error('[ERROR] Connect store failed:', error);
      setError('Failed to connect store. Please try again.');
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6">
          <Settings className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Let's get you set up</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Connect your store and configure WhatsApp to unlock the full power of Fini AI
        </p>
      </div>

      {/* Setup Progress */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${
            hasConnectedStores 
              ? 'border-green-200 bg-green-50' 
              : 'border-blue-200 bg-blue-50'
          }`}>
            {hasConnectedStores ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-blue-400" />
            )}
            <span className={`font-medium ${
              hasConnectedStores ? 'text-green-700' : 'text-blue-700'
            }`}>
              Store Connected
            </span>
          </div>
          
          <ArrowRight className="w-4 h-4 text-gray-400" />
          
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${
            hasWhatsAppConfigured 
              ? 'border-green-200 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            {hasWhatsAppConfigured ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
            )}
            <span className={`font-medium ${
              hasWhatsAppConfigured ? 'text-green-700' : 'text-gray-500'
            }`}>
              WhatsApp Ready
            </span>
          </div>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Connect Store */}
        <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group ${
          hasConnectedStores ? 'border-green-200 bg-green-50/50' : 'border-blue-200 hover:border-blue-300'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5" />
          <CardHeader className="relative pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  hasConnectedStores 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                }`}>
                  {hasConnectedStores ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <StoreIcon className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {hasConnectedStores ? 'Manage Stores' : 'Connect your store'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {hasConnectedStores 
                      ? `${stores.length} store${stores.length > 1 ? 's' : ''} connected`
                      : 'Link your Tienda Nube account to get started'
                    }
                  </CardDescription>
                </div>
              </div>
              {hasConnectedStores && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative">
            {hasConnectedStores ? (
              <StoreManagement stores={stores} onStoreUpdate={onStoreUpdate} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4" />
                  <span>Instant sync with your store data</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>Real-time analytics and insights</span>
                </div>
                                 <Button 
                   onClick={handleAddStore}
                   data-tour="connect-store-button"
                   className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                 >
                   Connect Store
                   <ExternalLink className="w-4 h-4 ml-2" />
                 </Button>
              </div>
            )}
          </CardContent>
        </Card>

                 {/* Configure WhatsApp */}
         <Card 
           data-tour="whatsapp-section"
           className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group ${
             hasWhatsAppConfigured ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:border-gray-300'
           }`}
         >
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-blue-600/5" />
          <CardHeader className="relative pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  hasWhatsAppConfigured 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }`}>
                  {hasWhatsAppConfigured ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <MessageSquare className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {hasWhatsAppConfigured ? 'WhatsApp Active' : 'Configure WhatsApp'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {hasWhatsAppConfigured 
                      ? 'Receive analytics via WhatsApp' 
                      : 'Get real-time insights on your phone'
                    }
                  </CardDescription>
                </div>
              </div>
              {hasWhatsAppConfigured && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative">
            {!hasConnectedStores ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <StoreIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  Connect a store first to configure WhatsApp
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {!hasWhatsAppConfigured && (
                  <>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Sparkles className="w-4 h-4" />
                      <span>Get insights sent directly to WhatsApp</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Quick access for your team</span>
                    </div>
                  </>
                )}
                <WhatsAppManagement stores={stores} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Help */}
      {!hasConnectedStores && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need help getting started?
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Let's start by clicking the "Connect Store" button and selecting your Tienda Nube store.
            </p>
            <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100">
              Watch Setup Guide
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connect Store Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-4">
              <StoreIcon className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Connect your store</DialogTitle>
            <DialogDescription>
              Enter your Tienda Nube store URL to get started
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-2">
                Store URL *
              </label>
              <Input
                type="url"
                placeholder="https://yourstore.mitiendanube.com"
                value={storeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={isConnecting}
                className="text-center"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                We'll detect your store name automatically
              </p>
            </div>
            
            {(storeName || isFetchingStoreName) && (
              <div>
                <label className="text-sm font-medium text-gray-900 block mb-2">
                  Store Name
                  {isFetchingStoreName && (
                    <Loader2 className="inline w-3 h-3 ml-2 animate-spin text-blue-600" />
                  )}
                </label>
                <Input
                  type="text"
                  placeholder={isFetchingStoreName ? "Detecting..." : "My Store"}
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={isConnecting || isFetchingStoreName}
                  className="text-center"
                />
                {storeName && !isFetchingStoreName && (
                  <p className="text-xs text-green-600 mt-2 text-center flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Name detected automatically
                  </p>
                )}
              </div>
            )}
            
            <div className="flex space-x-3 pt-6">
              <Button 
                variant="outline" 
                onClick={handleCloseDialog} 
                className="flex-1"
                disabled={isConnecting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnectStore} 
                disabled={isConnecting || !storeUrl.trim()}
                className="flex-1"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 