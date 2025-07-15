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
  ChevronRight,
  Signal,
  Clock,
  Link2,
  Power,
  PowerOff,
} from 'lucide-react';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Store } from '@/types/db';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

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
      console.log('[DEBUG] Setting up OTP timer for:', otpExpiresAt);
      const interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((otpExpiresAt.getTime() - now.getTime()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          console.log('[DEBUG] OTP expired, clearing timer');
          setOtpExpiresAt(null);
          setTimeRemaining(null);
          clearInterval(interval);
        }
      }, 1000);

      return () => {
        console.log('[DEBUG] Cleaning up OTP timer');
        clearInterval(interval);
      };
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

        // Stats are calculated but not currently displayed in the UI

      } else {
        setError(`Failed to load WhatsApp configurations: ${data.error}`);
        setConfigs([]);
      }

    } catch (err) {
      setError('Failed to connect to WhatsApp service. Please try again.');
      console.error('[WHATSAPP-MANAGEMENT] Error fetching configs:', err);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    console.log('[DEBUG] Starting handleAddNumber with values:', {
      phoneValue,
      formDisplayName,
      selectedStoreId
    });
    
    if (!phoneValue || !formDisplayName || !selectedStoreId) {
      console.log('[DEBUG] Missing required values, aborting');
      setPhoneError('All fields are required');
      return;
    }
    
    // Validate phone number
    if (!isValidPhoneNumber(phoneValue)) {
      console.log('[DEBUG] Invalid phone number:', phoneValue);
      setPhoneError('Please enter a valid number for the selected country');
      return;
    }
    
    setPhoneError(null);
    setIsAdding(true);
    setError(null);
    
    // 🔒 RESET OTP STATE - Limpiar cualquier estado anterior
    console.log('[DEBUG] Resetting OTP state completely...');
    
    // Use functional updates to ensure we get the latest state
    setShowOTPDialog(() => false);
    setPendingVerification(() => null);
    setOtpCode(() => '');
    setOtpError(() => null);
    setOtpExpiresAt(() => null);
    setTimeRemaining(() => null);
    
    console.log('[DEBUG] Starting fresh WhatsApp number creation with OTP verification');
    
    try {
      const requestBody = { 
        phone_number: phoneValue,
        display_name: formDisplayName,
        store_id: selectedStoreId
      };
      console.log('[DEBUG] Sending POST request to /api/whatsapp/numbers with:', requestBody);
      
      const response = await fetch('/api/whatsapp/numbers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      console.log('[DEBUG] Number creation response:', data);
      
      if (data.success) {
        console.log('[DEBUG] Number created successfully, forcing OTP verification for:', data.data.id);
        
        // Close add dialog 
        setPhoneValue('');
        setFormDisplayName('');
        setIsDialogOpen(false);
        
        // 🔒 CRITICAL FIX: Set pending verification first, then send OTP in next tick
        setPendingVerification(() => data.data.id);
        
        // Use setTimeout to ensure state update is processed before sending OTP
        setTimeout(async () => {
          console.log('[DEBUG] Delayed OTP send for number:', data.data.id);
          await sendOTP(data.data.id);
        }, 200);
        
        // Refresh configs to show pending status
        console.log('[DEBUG] Refreshing configs...');
        await fetchConfigs();
      } else {
        console.error('[ERROR] Failed to add WhatsApp number:', data);
        setError(data.error || 'Failed to add number');
      }
    } catch (err) {
      console.error('[ERROR] Network error adding WhatsApp number:', err);
      setError('Failed to add number');
    } finally {
      setIsAdding(false);
      console.log('[DEBUG] handleAddNumber completed');
    }
  };

  const sendOTP = async (whatsappNumberId: string) => {
    console.log('[DEBUG] Sending OTP for number ID:', whatsappNumberId);
    console.log('[DEBUG] Current state before OTP send:', {
      showOTPDialog,
      pendingVerification,
      isSendingOTP
    });
    
    setIsSendingOTP(true);
    setOtpError(null);
    
    try {
      const response = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ whatsapp_number_id: whatsappNumberId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[DEBUG] OTP send response:', data);
      
      if (data.success) {
        console.log('[DEBUG] OTP sent successfully, showing dialog');
        
        // 🔒 CRITICAL: Set all states in the correct order
        setShowOTPDialog(true);
        const expiresAt = new Date(Date.now() + (data.data.expires_in * 1000));
        setOtpExpiresAt(expiresAt);
        setTimeRemaining(data.data.expires_in);
        
        console.log('[DEBUG] OTP dialog state set:', {
          showOTPDialog: true,
          expiresAt,
          timeRemaining: data.data.expires_in,
          pendingVerification: whatsappNumberId
        });
        
      } else {
        console.error('[ERROR] Failed to send OTP:', data.error);
        setError(data.error || 'Error sending verification code');
        // Clear pending verification on failure
        setPendingVerification(null);
      }
    } catch (err) {
      console.error('[ERROR] Network error sending OTP:', err);
      setError(`Error sending verification code: ${err instanceof Error ? err.message : 'Network error'}`);
      // Clear pending verification on failure
      setPendingVerification(null);
    } finally {
      setIsSendingOTP(false);
      console.log('[DEBUG] OTP send process completed. showOTPDialog:', showOTPDialog);
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
        setOtpError(data.error || 'Incorrect verification code');
      }
    } catch (err) {
      setOtpError('Error verifying code');
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
      setError('Error changing status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: string, configName: string) => {
    showConfirmation({
      title: 'Delete Configuration',
      description: `Are you sure you want to delete "${configName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          
          // 🔒 CLEAN OTP STATE - Limpiar estado OTP si se está eliminando el número pendiente
          if (pendingVerification === configId) {
            console.log('[DEBUG] Cleaning OTP state for deleted number');
            setShowOTPDialog(false);
            setPendingVerification(null);
            setOtpCode('');
            setOtpError(null);
            setOtpExpiresAt(null);
            setTimeRemaining(null);
          }
          
          const response = await fetch(`/api/whatsapp/numbers/${configId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          const data = await response.json();
          if (data.success) {
            console.log('[DEBUG] Number deleted successfully, refreshing configs');
            await fetchConfigs();
          } else {
            setError(data.error || 'Error deleting configuration');
          }
        } catch (err) {
          setError('Error deleting configuration');
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
    if (isActive && isVerified) return 'Verified';
    if (!isVerified) return 'Pending Verification';
    return 'Inactive';
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
        setError(data.error || 'Error connecting number to store');
      }
    } catch (err) {
      setError('Error connecting number to store');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectFromStore = async (whatsappNumberId: string, storeId: string) => {
    showConfirmation({
      title: 'Disconnect Store',
      description: 'Are you sure you want to disconnect this number from the store?',
      confirmText: 'Disconnect',
      cancelText: 'Cancel',
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
            setError(data.error || 'Error disconnecting number from store');
          }
        } catch (err) {
          setError('Error disconnecting number from store');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (loading && configs.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Phone className="mr-3 h-5 w-5 text-gray-600" />
            WhatsApp Management
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure and manage your WhatsApp Business numbers
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <div className="absolute inset-0 h-8 w-8 border-2 border-blue-200 rounded-full animate-ping"></div>
            </div>
            <p className="text-sm text-gray-500 animate-pulse">Loading configurations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stores.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Phone className="mr-3 h-5 w-5 text-gray-600" />
            WhatsApp Management
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure and manage your WhatsApp Business numbers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You need to connect at least one store before configuring WhatsApp.
              Go to the &quot;Stores&quot; tab to connect your first store.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main WhatsApp Management - Clean Qatalog Style */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Phone className="mr-3 h-5 w-5 text-gray-600" />
              WhatsApp Numbers
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage numbers connected to your stores
            </p>
          </div>
          {configs && configs.length > 0 && (
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Number
            </Button>
          )}
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

          {/* Configuration List - Clean Style */}
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
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      
                      {/* Number Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {config.display_name || config.phone_numbers[0] || 'Unknown Number'}
                          </h4>
                          
                          {/* Status Badges */}
                          {config.is_verified ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              Pending Verification
                            </Badge>
                          )}
                          
                          {config.is_configured && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              <Link2 className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>📱 {config.phone_numbers[0]}</div>
                          {config.store_name && (
                            <div>🏪 {config.store_name}</div>
                          )}
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {config.message_count || 0} messages
                            </span>
                            {config.last_activity && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last: {format(new Date(config.last_activity), 'MMM d', { locale: enUS })}
                              </span>
                            )}
                          </div>
                        </div>
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
                          className={`${
                            config.is_active 
                              ? 'border-green-200 text-green-700 hover:bg-green-50' 
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {config.is_active ? (
                            <>
                              <Power className="h-4 w-4 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <PowerOff className="h-4 w-4 mr-1" />
                              Inactive
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
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      
                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id, config.display_name || config.phone_numbers[0] || 'WhatsApp Configuration')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
            /* Enhanced Empty State - Qatalog Style */
            <div className="text-center py-16 px-6">
              <div className="mx-auto w-24 h-24 bg-green-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Phone className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Set up your first WhatsApp number
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Connect your WhatsApp Business number and start offering automated analytics to your customers 24/7.
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-5 w-5" />
                Configure WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>

             {/* Add/Edit WhatsApp Number Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
           <DialogHeader className="space-y-3">
             <DialogTitle className="text-xl font-semibold text-gray-900">
              {editingConfig ? 'Edit Configuration' : 'Add WhatsApp Number'}
            </DialogTitle>
             <DialogDescription className="text-gray-600 leading-relaxed">
              {editingConfig 
                 ? 'Update your WhatsApp Business number information' 
                 : 'Connect a new WhatsApp Business number. You will receive a verification code via WhatsApp.'
              }
            </DialogDescription>
          </DialogHeader>
          
           <div className="space-y-6 mt-6">
            {/* Phone Number Input */}
            {!editingConfig && (
              <div>
                <label htmlFor="phoneInput" className="block text-sm font-semibold text-gray-700 mb-3">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <PhoneInput
                    id="phoneInput"
                    value={phoneValue}
                    onChange={(value) => {
                      setPhoneValue(value || '');
                      setPhoneError(null);
                    }}
                    defaultCountry="AR"
                    placeholder="Enter WhatsApp number"
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  />
                  {phoneError && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {phoneError}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div>
               <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700 mb-3">
                 Display Name
              </label>
              <Input
                id="displayName"
                type="text"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                 placeholder="e.g., John Smith - Main Store"
                 className="border-gray-200 focus:ring-green-500 focus:border-green-500 rounded-xl h-12"
              />
            </div>
            
            {!editingConfig && (
              <div>
                 <label htmlFor="storeSelect" className="block text-sm font-semibold text-gray-700 mb-3">
                   Connect to Store
                </label>
                 <div className="relative">
                <select
                  id="storeSelect"
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                     className="w-full h-12 px-4 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white appearance-none"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                   <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                 </div>
              </div>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingConfig(null);
                setPhoneValue('');
                setFormDisplayName('');
                setPhoneError(null);
              }}
              className="border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNumber}
              disabled={isAdding || loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAdding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {editingConfig ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                editingConfig ? 'Update Number' : 'Add Number'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Verify Your Number
            </DialogTitle>
            <DialogDescription className="text-gray-600 leading-relaxed">
              We sent a 6-digit code to your WhatsApp number. Enter it below to verify.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-6">
            <div>
              <label htmlFor="otpInput" className="block text-sm font-semibold text-gray-700 mb-3">
                Verification Code
              </label>
              <Input
                id="otpInput"
                type="text"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value);
                  setOtpError(null);
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="border-gray-200 focus:ring-green-500 focus:border-green-500 rounded-xl h-12 text-center text-lg tracking-widest"
              />
              {otpError && (
                <p className="text-red-600 text-sm mt-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {otpError}
                </p>
              )}
            </div>

            {timeRemaining && timeRemaining > 0 && (
              <div className="text-center text-sm text-gray-600">
                Code expires in {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          {/* OTP Dialog Actions */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={resendOTP}
              disabled={isSendingOTP || (timeRemaining && timeRemaining > 0)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isSendingOTP ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Code'
              )}
            </Button>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOTPDialog(false);
                  setOtpCode('');
                  setOtpError(null);
                  setPendingVerification(null);
                }}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={verifyOTP}
                disabled={isVerifying || otpCode.length !== 6}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmationDialog}
    </div>
  );
} 