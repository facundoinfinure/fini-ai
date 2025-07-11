'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SyncProgress } from './sync-progress';
import { useToast } from '@/components/ui/toast';

interface StoreConnectionHandlerProps {
  children: React.ReactNode;
  onStoreConnected?: (storeId: string, storeName: string) => void;
}

export function StoreConnectionHandler({ children, onStoreConnected }: StoreConnectionHandlerProps) {
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [syncStoreId, setSyncStoreId] = useState<string | null>(null);
  const [syncStoreName, setSyncStoreName] = useState<string | null>(null);
  
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Detectar si el usuario volvió del OAuth y debe iniciar sincronización
    const success = searchParams?.get('success');
    const storeId = searchParams?.get('store_id');
    const storeName = searchParams?.get('store_name');
    const syncNeeded = searchParams?.get('sync_needed');

    if (success && storeId && syncNeeded === 'true' && (success === 'store_connected' || success === 'store_reconnected')) {
      console.log(`[STORE-CONNECTION] Detected OAuth return: ${success}, store: ${storeName}`);
      
      // Mostrar toast de éxito
      if (success === 'store_connected') {
        addToast({
          title: `¡Tienda "${storeName}" conectada exitosamente!`,
          description: 'Iniciando sincronización de datos...',
          variant: 'success'
        });
      } else {
        addToast({
          title: `¡Tienda "${storeName}" reconectada!`,
          description: 'Actualizando datos...',
          variant: 'success'
        });
      }

      // Iniciar sincronización inmediata con UI visible
      setTimeout(() => {
        setSyncStoreId(storeId);
        setSyncStoreName(storeName);
        setShowSyncProgress(true);
      }, 1000); // Pequeño delay para que el usuario vea el toast

      // Limpiar URL params para evitar re-triggers
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('store_id');
      url.searchParams.delete('store_name');
      url.searchParams.delete('sync_needed');
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleSyncComplete = (success: boolean, stats?: any) => {
    console.log(`[STORE-CONNECTION] Sync completed:`, { success, stats });
    
    setShowSyncProgress(false);
    
    if (success && stats) {
      // Mostrar resultado exitoso
      addToast({
        title: '¡Sincronización completada!',
        description: `${stats.products} productos, ${stats.orders} pedidos, ${stats.customers} clientes sincronizados`,
        variant: 'success'
      });

      // Notificar al componente padre
      if (syncStoreId && syncStoreName && onStoreConnected) {
        onStoreConnected(syncStoreId, syncStoreName);
      }
    } else {
      // Mostrar error
      addToast({
        title: 'Error en la sincronización',
        description: 'Los datos se sincronizarán automáticamente en segundo plano',
        variant: 'error'
      });
    }

    // Limpiar estado
    setSyncStoreId(null);
    setSyncStoreName(null);
  };

  return (
    <>
      {children}
      
      {/* Modal de progreso de sincronización */}
      <SyncProgress
        storeId={syncStoreId || ''}
        storeName={syncStoreName || undefined}
        isVisible={showSyncProgress}
        onComplete={handleSyncComplete}
      />
    </>
  );
} 