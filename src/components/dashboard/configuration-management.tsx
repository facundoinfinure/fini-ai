"use client";

import { Store } from '@/types/db';
import { StoreManagement } from './store-management';
import { WhatsAppManagement } from './whatsapp-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Store as StoreIcon, MessageSquare } from 'lucide-react';

interface ConfigurationManagementProps {
  stores: Store[];
  onStoreUpdate: () => Promise<void>;
}

export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Gestiona tus tiendas y números de WhatsApp en un solo lugar</p>
        </div>
      </div>

      {/* Store Management Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Gestión de Tiendas</h2>
        </div>
        <StoreManagement stores={stores} onStoreUpdate={onStoreUpdate} />
      </div>

      {/* WhatsApp Management Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Gestión de WhatsApp</h2>
        </div>
        <WhatsAppManagement stores={stores} />
      </div>
    </div>
  );
} 