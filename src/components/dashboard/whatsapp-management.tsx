"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Phone, Plus, Edit, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

interface WhatsAppConfig {
  id: string;
  phone_numbers: string[];
  is_active: boolean;
  is_configured: boolean;
}

export function WhatsAppManagement() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [formNumber, setFormNumber] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/numbers');
      const data = await response.json();
      if (data.success) {
        setConfig(data.data.config);
      } else {
        setError(data.error || 'Failed to fetch WhatsApp numbers');
      }
    } catch (err) {
      setError('Failed to fetch WhatsApp numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    if (!formNumber) return;
    setIsAdding(true);
    setError(null);
    try {
      const response = await fetch('/api/whatsapp/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers: [formNumber] })
      });
      const data = await response.json();
      if (data.success) {
        setFormNumber('');
        setIsDialogOpen(false);
        await fetchConfig();
      } else {
        setError(data.error || 'Failed to add number');
      }
    } catch (err) {
      setError('Failed to add number');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditNumber = async () => {
    if (!editingNumber || !formNumber || !config) return;
    setIsAdding(true);
    setError(null);
    try {
      const updatedNumbers = config.phone_numbers.map(num => num === editingNumber ? formNumber : num);
      const response = await fetch(`/api/whatsapp/numbers/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_numbers: updatedNumbers })
      });
      const data = await response.json();
      if (data.success) {
        setFormNumber('');
        setEditingNumber(null);
        setIsDialogOpen(false);
        await fetchConfig();
      } else {
        setError(data.error || 'Failed to edit number');
      }
    } catch (err) {
      setError('Failed to edit number');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteNumber = async (number: string) => {
    if (!config) return;
    if (!confirm('¿Estás seguro de que quieres eliminar este número de WhatsApp?')) return;
    setError(null);
    try {
      const response = await fetch(`/api/whatsapp/numbers/${config.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers: [number] })
      });
      const data = await response.json();
      if (data.success) {
        await fetchConfig();
      } else {
        setError(data.error || 'Failed to delete number');
      }
    } catch (err) {
      setError('Failed to delete number');
    }
  };

  const openAddDialog = () => {
    setFormNumber('');
    setEditingNumber(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (number: string) => {
    setFormNumber(number);
    setEditingNumber(number);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de WhatsApp</CardTitle>
          <CardDescription>Administra tus números de WhatsApp conectados</CardDescription>
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
                <Phone className="mr-2 h-5 w-5" />
                Gestión de WhatsApp
              </CardTitle>
              <CardDescription>
                Administra los números de WhatsApp conectados a tu tienda
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Número
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

          {!config || !config.phone_numbers || config.phone_numbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes números de WhatsApp conectados
              </h3>
              <p className="text-gray-600 mb-4">
                Agrega tu primer número de WhatsApp para comenzar a usar Fini AI
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Primer Número
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {config.phone_numbers.map((number) => (
                <div
                  key={number}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{number}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={config.is_active ? "default" : "secondary"}>
                          {config.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditDialog(number)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNumber(number)}
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

      {/* Add/Edit Number Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNumber ? 'Editar Número' : 'Agregar Número'}</DialogTitle>
            <DialogDescription>
              {editingNumber ? 'Modifica el número de WhatsApp' : 'Agrega un nuevo número de WhatsApp'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de WhatsApp
              </label>
              <Input
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                type="tel"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={editingNumber ? handleEditNumber : handleAddNumber} disabled={isAdding}>
                {isAdding ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 