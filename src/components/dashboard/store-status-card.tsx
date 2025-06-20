"use client";

import { useRouter } from 'next/navigation';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Store, ExternalLink, Edit, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function StoreInfoRow({ label, value }: { label: string, value: string | null }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-right">{value || 'N/A'}</p>
    </div>
  );
}

export function StoreStatusCard() {
  const router = useRouter();
  const { isConnected, store, isLoading, error, refetch } = useStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de la Tienda</CardTitle>
          <CardDescription>Verificando la conexión con tu tienda...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
            Error de Conexión
          </CardTitle>
          <CardDescription>No se pudo obtener el estado de la tienda.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button onClick={() => refetch()} variant="destructive">
            <RefreshCw className="mr-2 h-4 w-4" />
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected || !store) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conecta tu Tienda</CardTitle>
          <CardDescription>Para empezar, necesitas conectar tu Tienda Nube.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/onboarding')} className="w-full">
            <Store className="mr-2 h-4 w-4" />
            Conectar Tienda
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
          Tienda Conectada
        </CardTitle>
        <CardDescription>
          Tu tienda está conectada y lista para recibir analytics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <StoreInfoRow label="Plataforma" value={store.platform} />
        <StoreInfoRow label="Nombre" value={store.name} />
        <StoreInfoRow label="URL" value={store.url} />
        <StoreInfoRow 
          label="Última Sincronización" 
          value={store.lastSync ? format(new Date(store.lastSync), "d MMM yyyy, HH:mm", { locale: es }) : 'Pendiente'} 
        />
        <div className="flex items-center space-x-2 pt-4">
          <Button onClick={() => router.push('/onboarding')} variant="outline" className="w-full">
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <a href={store.url} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button variant="secondary" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Visitar Tienda
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
} 