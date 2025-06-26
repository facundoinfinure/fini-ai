"use client";

import { Store } from '@/types/db';
import { StoreManagement } from './store-management';
import { WhatsAppManagement } from './whatsapp-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Store as StoreIcon, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfigurationManagementProps {
  stores: Store[];
  onStoreUpdate: () => Promise<void>;
}

const handleAddStore = async () => {
  try {
    // Redirect to onboarding to collect store information first
    window.location.href = '/onboarding';
  } catch (err) {
    console.error('Failed to redirect to onboarding');
  }
};

export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {
  return (
    <div className="config-container">
      {/* Header - Origin Style */}
      <div className="config-header">
        <h1 className="config-title">Configuración</h1>
        <p className="config-subtitle">Gestiona tus tiendas y números de WhatsApp en un solo lugar</p>
      </div>

      {/* Gestión de Tiendas Section */}
      <div className="config-section">
        <div className="section-header">
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="section-title">
                <StoreIcon className="h-5 w-5" />
                Gestión de Tiendas
              </h2>
              <p className="section-description">Administra tus tiendas conectadas a Fini AI</p>
            </div>
            <Button 
              onClick={handleAddStore}
              className="btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Conectar Tienda
            </Button>
          </div>
        </div>
        <div className="section-content">
          <StoreManagement stores={stores} onStoreUpdate={onStoreUpdate} />
        </div>
      </div>

      {/* Gestión de WhatsApp Section */}
      <div className="config-section">
        <div className="section-header">
          <h2 className="section-title">
            <MessageSquare className="h-5 w-5" />
            Gestión de WhatsApp
          </h2>
          <p className="section-description">Administra los números conectados a tus tiendas</p>
        </div>
        <div className="section-content">
          <WhatsAppManagement stores={stores} />
        </div>
      </div>
    </div>
  );
} 