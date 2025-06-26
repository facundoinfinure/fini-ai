"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'libphonenumber-js';
import 'react-phone-number-input/style.css';
import {
  Phone,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Settings,
  MessageSquare,
  Zap,
  ChevronRight,
  Signal,
  Clock,
  Users,
  TrendingUp,
  Link2,
  Unlink,
  Power,
  PowerOff,
} from 'lucide-react';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Store } from '@/types/db';

interface WhatsAppConfig {
  id: string;
  phone_numbers: string[];
  display_name?: string;
  is_active: boolean;
  is_configured: boolean;
  is_verified: boolean;
  store_name?: string;
  store_id?: string;
  last_activity?: string;
  message_count?: number;
}

interface WhatsAppStats {
  totalNumbers: number;
  activeNumbers: number;
  totalMessages: number;
  avgResponseTime: number;
}

interface WhatsAppManagementProps {
  stores: Store[];
}

export function WhatsAppManagement({ stores }: WhatsAppManagementProps) {
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | null>(null);
  const [formDisplayName, setFormDisplayName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [hoveredConfig, setHoveredConfig] = useState<string | null>(null);
  
  // OTP Verification states
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (stores && stores.length > 0) {
      const storeIds = stores.map(s => s.id);
      if (!selectedStoreId || !storeIds.includes(selectedStoreId)) {
        setSelectedStoreId(stores[0].id);
      }
    } else {
      setSelectedStoreId(null);
    }
  }, [stores, selectedStoreId]);

  // Timer for OTP expiration
  useEffect(() => {
    if (otpExpiresAt) {
      const interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((otpExpiresAt.getTime() - now.getTime()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          setOtpExpiresAt(null);
          setTimeRemaining(null);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [otpExpiresAt]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real WhatsApp configurations from the corrected API
      const response = await fetch('/api/whatsapp/numbers', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        // Handle the actual data structure from the API
        const whatsappNumbers = data.data;
        if (whatsappNumbers && Array.isArray(whatsappNumbers)) {
          const configsWithStoreInfo: WhatsAppConfig[] = whatsappNumbers.map(number => ({
            id: number.id,
            phone_numbers: [number.phone_number],
            display_name: number.display_name,
            is_active: number.is_active,
            is_configured: number.connected_stores?.length > 0,
            is_verified: number.is_verified || false,
            store_name: number.connected_stores?.[0]?.name,
            store_id: number.connected_stores?.[0]?.id,
            last_activity: number.last_message_at || number.created_at,
            message_count: number.total_conversations || 0
          }));
          setConfigs(configsWithStoreInfo);
        } else {
          setConfigs([]);
        }

        // Calculate simple stats from the numbers data
        const totalNumbers = whatsappNumbers?.length || 0;
        const activeNumbers = whatsappNumbers?.filter(n => n.is_active)?.length || 0;
        const totalMessages = whatsappNumbers?.reduce((sum, n) => sum + (n.total_conversations || 0), 0) || 0;

        setStats({
          totalNumbers,
          activeNumbers,
          totalMessages,
          avgResponseTime: 30 // Default value until we have real metrics
        });

      } else {
        setError(`Error al cargar las configuraciones de WhatsApp: ${data.error}`);
        setConfigs([]);
        setStats(null);
      }
    } catch (err) {
      setError('Error al cargar las configuraciones de WhatsApp');
      console.error('WhatsApp config fetch error:', err);
      setConfigs([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    if (!phoneValue || !formDisplayName || !selectedStoreId) return;
    
    // Validate phone number
    if (!isValidPhoneNumber(phoneValue)) {
      setPhoneError('Por favor ingresa un número válido para el país seleccionado');
      return;
    }
    
    setPhoneError(null);
    setIsAdding(true);
    setError(null);
    
    try {
      const response = await fetch('/api/whatsapp/numbers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          phone_number: phoneValue,
          display_name: formDisplayName,
          store_id: selectedStoreId
        })
      });
      const data = await response.json();
      
      if (data.success) {
        // Close add dialog and show OTP verification
        setPhoneValue('');
        setFormDisplayName('');
        setIsDialogOpen(false);
        
        // Start OTP verification flow
        setPendingVerification(data.data.id);
        await sendOTP(data.data.id);
        
        // Refresh configs to show pending status
        await fetchConfigs();
      } else {
        setError(data.error || 'Failed to add number');
        console.error('[ERROR] Failed to add WhatsApp number:', data);
      }
    } catch (err) {
      setError('Failed to add number');
      console.error('[ERROR] Network error adding WhatsApp number:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const sendOTP = async (whatsappNumberId: string) => {
    setIsSendingOTP(true);
    setOtpError(null);
    
    try {
      const response = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ whatsapp_number_id: whatsappNumberId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowOTPDialog(true);
        const expiresAt = new Date(Date.now() + data.data.expires_in * 1000);
        setOtpExpiresAt(expiresAt);
        setTimeRemaining(data.data.expires_in);
      } else {
        setError(data.error || 'Error al enviar código de verificación');
      }
    } catch (err) {
      setError('Error al enviar código de verificación');
      console.error('[ERROR] Failed to send OTP:', err);
    } finally {
      setIsSendingOTP(false);
    }
  };

  const verifyOTP = async () => {
    if (!pendingVerification || !otpCode) return;
    
    setIsVerifying(true);
    setOtpError(null);
    
    try {
      const response = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          whatsapp_number_id: pendingVerification,
          otp_code: otpCode 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Success! Close dialogs and refresh
        setShowOTPDialog(false);
        setPendingVerification(null);
        setOtpCode('');
        setOtpExpiresAt(null);
        setTimeRemaining(null);
        
        // Show success message
        setError(null);
        await fetchConfigs();
        
        // You could add a success toast here
        console.log('[INFO] Number verified successfully!');
      } else {
        setOtpError(data.error || 'Código de verificación incorrecto');
      }
    } catch (err) {
      setOtpError('Error al verificar código');
      console.error('[ERROR] Failed to verify OTP:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOTP = async () => {
    if (!pendingVerification) return;
    
    setOtpCode('');
    setOtpError(null);
    await sendOTP(pendingVerification);
  };

  const handleToggleStatus = async (configId: string) => {
    try {
      setLoading(true);
      const config = configs.find(c => c.id === configId);
      if (!config) return;

      const response = await fetch(`/api/whatsapp/numbers/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !config.is_active })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchConfigs();
      } else {
        setError(data.error || 'Failed to toggle status');
      }
    } catch (err) {
      setError('Error al cambiar el estado');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: string, configName: string) => {
    showConfirmation({
      title: 'Eliminar Configuración',
      description: `¿Estás seguro de que quieres eliminar "${configName}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/whatsapp/numbers/${configId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          const data = await response.json();
          if (data.success) {
            await fetchConfigs();
          } else {
            setError(data.error || 'Error al eliminar la configuración');
          }
        } catch (err) {
          setError('Error al eliminar la configuración');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getStatusColor = (isActive: boolean, isVerified: boolean) => {
    if (isActive && isVerified) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (!isVerified) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (isActive: boolean, isVerified: boolean) => {
    if (isActive && isVerified) return 'Verificado';
    if (!isVerified) return 'Pendiente Verificación';
    return 'Inactivo';
  };

  const getStatusIcon = (isActive: boolean, isVerified: boolean) => {
    if (isActive && isVerified) return Signal;
    if (!isVerified) return Clock;
    return PowerOff;
  };

  const handleConnectToStore = async (whatsappNumberId: string, storeId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ whatsapp_number_id: whatsappNumberId, store_id: storeId })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchConfigs();
      } else {
        setError(data.error || 'Error al conectar número a tienda');
      }
    } catch (err) {
      setError('Error al conectar número a tienda');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectFromStore = async (whatsappNumberId: string, storeId: string) => {
    showConfirmation({
      title: 'Desconectar de Tienda',
      description: '¿Estás seguro de que quieres desconectar este número de la tienda?',
      confirmText: 'Desconectar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/whatsapp/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ whatsapp_number_id: whatsappNumberId, store_id: storeId })
          });
          
          const data = await response.json();
          if (data.success) {
            await fetchConfigs();
          } else {
            setError(data.error || 'Error al desconectar número de tienda');
          }
        } catch (err) {
          setError('Error al desconectar número de tienda');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (loading && configs.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-900">
            <Phone className="mr-3 h-5 w-5 text-emerald-600" />
            Gestión de WhatsApp
          </CardTitle>
          <CardDescription className="text-slate-600">
            Configura y administra tus números de WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
              <div className="absolute inset-0 h-8 w-8 border-2 border-emerald-200 rounded-full animate-ping"></div>
            </div>
            <p className="text-sm text-slate-500 animate-pulse">Cargando configuraciones...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stores.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-900">
            <Phone className="mr-3 h-5 w-5 text-emerald-600" />
            Gestión de WhatsApp
          </CardTitle>
          <CardDescription className="text-slate-600">
            Configura y administra tus números de WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Necesitas conectar al menos una tienda antes de configurar WhatsApp.
              Ve a la pestaña &quot;Tiendas&quot; para conectar tu primera tienda.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main WhatsApp Management - Origin Style */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Phone className="mr-3 h-5 w-5 text-gray-600" />
              Números de WhatsApp
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Administra los números conectados a tus tiendas
            </p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="btn-success"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Número
          </Button>
        </div>

        <div className="p-0">
          {/* Error Alert */}
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
              <span className="text-red-800 flex-1">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 hover:bg-red-100 ml-2"
              >
                ×
              </Button>
            </div>
          )}

          {/* Configuration List - Origin Style */}
          {configs && configs.length > 0 ? (
            <div className="p-6">
              <div className="space-y-3">
              {configs.map((config) => {
                const StatusIcon = getStatusIcon(config.is_active, config.is_configured);
                
                return (
                  <div key={config.id} className="number-item"
                    onMouseEnter={() => setHoveredConfig(config.id)}
                    onMouseLeave={() => setHoveredConfig(null)}
                  >
                    {/* Left Section - Main Info */}
                    <div className="number-info">
                      {/* Status Indicator */}
                      <div className={`number-status ${config.is_active && config.is_configured ? '' : 
                        !config.is_configured ? 'warning' : 'inactive'}`} />
                      
                      {/* WhatsApp Logo */}
                      <div className="p-3 rounded-xl bg-green-100 text-green-600">
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.484 3.687"/>
                        </svg>
                      </div>
                      
                      {/* Number Info */}
                      <div className="number-details">
                        <div className="flex items-center justify-between">
                          <h4>
                            {config.display_name || config.phone_numbers[0]}
                          </h4>
                          {config.is_verified && (
                            <div className="status-badge verified ml-4">
                              Verificado
                            </div>
                          )}
                        </div>
                        {config.display_name && (
                          <p className="font-mono">
                            {config.phone_numbers[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="number-actions">
                      {config.is_configured && config.is_verified && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(config.id)}
                          disabled={loading}
                          className={`btn-secondary ${
                            config.is_active 
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' 
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {config.is_active ? (
                            <>
                              <Power className="h-4 w-4 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <PowerOff className="h-4 w-4 mr-1" />
                              Inactivo
                            </>
                          )}
                        </Button>
                      )}
                      
                      {/* Settings */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingConfig(config);
                          setPhoneValue(config.phone_numbers[0]);
                          setFormDisplayName(config.display_name || '');
                          setIsDialogOpen(true);
                        }}
                        className="btn-icon"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      
                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id, config.display_name || config.phone_numbers[0] || 'Configuración de WhatsApp')}
                        className="btn-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ) : (
            /* Enhanced Empty State */
            <div className="text-center py-16 px-6">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Phone className="h-12 w-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                ¡Configura tu primer número!
              </h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                Conecta tu número de WhatsApp Business y comienza a ofrecer analytics automáticos a tus clientes las 24 horas.
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                className="btn-success"
              >
                <Plus className="mr-2 h-5 w-5" />
                Configurar WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>

             {/* Add/Edit WhatsApp Number Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
           <DialogHeader className="space-y-3">
             <DialogTitle className="text-xl font-semibold text-slate-900">
              {editingConfig ? 'Editar Configuración' : 'Agregar Número de WhatsApp'}
            </DialogTitle>
             <DialogDescription className="text-slate-600 leading-relaxed">
              {editingConfig 
                 ? 'Actualiza la información de tu número de WhatsApp Business' 
                 : 'Conecta un nuevo número de WhatsApp Business. Recibirás un código de verificación por WhatsApp.'
              }
            </DialogDescription>
          </DialogHeader>
          
           <div className="space-y-6 mt-6">
            <div>
               <label htmlFor="phoneNumber" className="block text-sm font-semibold text-slate-700 mb-3">
                Número de WhatsApp
              </label>
               <div className="phone-input-container border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all duration-200">
                <PhoneInput
                  international
                  countryCallingCodeEditable={false}
                  defaultCountry="AR"
                  value={phoneValue}
                  onChange={(value) => {
                    setPhoneValue(value || '');
                    setPhoneError(null);
                  }}
                  className="w-full"
                  style={{
                     '--PhoneInputCountryFlag-height': '1.2em',
                    '--PhoneInputCountryFlag-borderColor': 'transparent',
                     '--PhoneInput-color--focus': '#10b981',
                  }}
                />
              </div>
              {phoneError && (
                 <p className="text-sm text-red-600 mt-2 flex items-center">
                   <AlertCircle className="h-4 w-4 mr-1" />
                  {phoneError}
                </p>
              )}
               <p className="text-xs text-slate-500 mt-2">
                 Selecciona tu país y completa el número sin códigos adicionales
              </p>
            </div>
            
            <div>
               <label htmlFor="displayName" className="block text-sm font-semibold text-slate-700 mb-3">
                 Nombre para mostrar
              </label>
              <Input
                id="displayName"
                type="text"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                 placeholder="Ej: Juan Pérez - Tienda Principal"
                 className="border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl h-12"
              />
            </div>
            
            {!editingConfig && (
              <div>
                 <label htmlFor="storeSelect" className="block text-sm font-semibold text-slate-700 mb-3">
                   Tienda a conectar
                </label>
                 <div className="relative">
                <select
                  id="storeSelect"
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                     className="w-full h-12 px-4 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white appearance-none"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                   <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                 </div>
              </div>
            )}
          </div>
          
           <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingConfig(null);
                setPhoneValue('');
                setFormDisplayName('');
                setPhoneError(null);
              }}
               className="border-slate-200 text-slate-600 hover:bg-slate-50 px-6"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddNumber} 
              disabled={isAdding || !phoneValue || !formDisplayName || !!phoneError}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isAdding ? (
                 <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                   Agregando...
                 </>
               ) : (
                 editingConfig ? 'Actualizar' : 'Agregar Número'
               )}
             </Button>
           </div>
         </DialogContent>
       </Dialog>

       {/* OTP Verification Dialog */}
       <Dialog open={showOTPDialog} onOpenChange={(open) => {
        if (!open && !isVerifying) {
          setShowOTPDialog(false);
          setOtpCode('');
          setOtpError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-slate-900 flex items-center">
              <MessageSquare className="mr-3 h-6 w-6 text-emerald-600" />
              Verificar Número de WhatsApp
            </DialogTitle>
            <DialogDescription className="text-slate-600 leading-relaxed">
              Hemos enviado un código de 6 dígitos a tu WhatsApp. Ingresa el código para completar la verificación.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-emerald-600" />
              </div>
              
              {timeRemaining !== null && timeRemaining > 0 ? (
                <p className="text-sm text-slate-600">
                  El código expira en: <span className="font-mono text-emerald-600 font-semibold">
                    {formatTimeRemaining(timeRemaining)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-red-600 font-medium">
                  El código ha expirado. Solicita uno nuevo.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="otpCode" className="block text-sm font-semibold text-slate-700 mb-3">
                Código de Verificación
              </label>
              <Input
                id="otpCode"
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setOtpError(null);
                }}
                placeholder="123456"
                className="text-center text-2xl font-mono border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl h-14 tracking-widest"
                maxLength={6}
                disabled={isVerifying || timeRemaining === 0}
              />
              {otpError && (
                <p className="text-sm text-red-600 mt-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {otpError}
                </p>
              )}
            </div>

            <div className="text-center space-y-2">
              <Button
                variant="ghost"
                onClick={resendOTP}
                disabled={isSendingOTP || timeRemaining === null || timeRemaining > 0}
                className="text-emerald-600 hover:bg-emerald-50"
              >
                {isSendingOTP ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  'Reenviar Código'
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowOTPDialog(false);
                setOtpCode('');
                setOtpError(null);
                setPendingVerification(null);
              }}
              disabled={isVerifying}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 px-6"
            >
              Cancelar
            </Button>
            <Button 
              onClick={verifyOTP}
              disabled={isVerifying || otpCode.length !== 6 || timeRemaining === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      {ConfirmationDialog}
    </div>
  );
} 