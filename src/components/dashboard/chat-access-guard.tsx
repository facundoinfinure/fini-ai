/**
 * 🔒 CHAT ACCESS GUARD
 * ====================
 * 
 * Componente que valida el acceso completo al chat antes de permitir su uso.
 * Requiere: tienda conectada + WhatsApp verificado + suscripción activa + onboarding completo
 */

"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Store, 
  MessageSquare, 
  CreditCard, 
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export interface ChatAccessStatus {
  canAccess: boolean;
  missing: string[];
  details: {
    hasActiveStore: boolean;
    hasVerifiedWhatsApp: boolean;
    hasActiveSubscription: boolean;
    onboardingCompleted: boolean;
    storeCount: number;
    whatsappNumbers: number;
  };
}

interface ChatAccessGuardProps {
  children: React.ReactNode;
  onAccessStatusChange?: (status: ChatAccessStatus) => void;
}

export function ChatAccessGuard({ children, onAccessStatusChange }: ChatAccessGuardProps) {
  const { user } = useAuth();
  const [accessStatus, setAccessStatus] = useState<ChatAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkChatAccess = async () => {
    if (!user?.id) return;
    
    setChecking(true);
    try {
      const response = await fetch('/api/chat/access-validation');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const status: ChatAccessStatus = {
            canAccess: data.canAccess,
            missing: data.missing || [],
            details: data.details
          };
          
          setAccessStatus(status);
          onAccessStatusChange?.(status);
        }
      }
    } catch (error) {
      console.error('[CHAT-ACCESS] Error checking access:', error);
    } finally {
      setChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkChatAccess();
    }
  }, [user?.id]);

  const getMissingRequirementMessage = (requirement: string) => {
    const messages = {
      store_connection: 'Necesitas conectar al menos una tienda de TiendaNube',
      whatsapp_verification: 'Necesitas verificar al menos un número de WhatsApp',
      active_subscription: 'Necesitas una suscripción activa para acceder al chat',
      onboarding: 'Debes completar el proceso de onboarding primero',
      personal_info: 'Debes completar tu información personal (nombre completo)',
      business_info: 'Debes completar la información de tu negocio (nombre, tipo, descripción)',
      user_profile: 'Debes completar tu perfil de usuario',
      validation_error: 'Error al validar tu perfil. Intenta nuevamente.'
    };
    return messages[requirement as keyof typeof messages] || requirement;
  };

  const getActionButton = (requirement: string) => {
    const actions = {
      store_connection: {
        text: 'Conectar Tienda',
        href: '#configuration',
        onClick: () => {
          // Cambiar a tab de configuración
          const configTab = document.querySelector('[data-tab="configuration"]');
          if (configTab) {
            (configTab as HTMLElement).click();
          }
        }
      },
      whatsapp_verification: {
        text: 'Verificar WhatsApp',
        href: '#configuration',
        onClick: () => {
          const configTab = document.querySelector('[data-tab="configuration"]');
          if (configTab) {
            (configTab as HTMLElement).click();
          }
        }
      },
      active_subscription: {
        text: 'Ver Suscripción',
        href: '#subscription',
        onClick: () => {
          const subTab = document.querySelector('[data-tab="subscription"]');
          if (subTab) {
            (subTab as HTMLElement).click();
          }
        }
      },
      personal_info: {
        text: 'Completar Perfil',
        href: '#profile',
        onClick: () => {
          // Try to find profile tab or configuration tab
          const profileTab = document.querySelector('[data-tab="profile"]') || 
                            document.querySelector('[data-tab="configuration"]');
          if (profileTab) {
            (profileTab as HTMLElement).click();
          }
        }
      },
      business_info: {
        text: 'Completar Perfil',
        href: '#profile',
        onClick: () => {
          // Try to find profile tab or configuration tab
          const profileTab = document.querySelector('[data-tab="profile"]') || 
                            document.querySelector('[data-tab="configuration"]');
          if (profileTab) {
            (profileTab as HTMLElement).click();
          }
        }
      },
      user_profile: {
        text: 'Completar Perfil',
        href: '#profile',
        onClick: () => {
          // Try to find profile tab or configuration tab
          const profileTab = document.querySelector('[data-tab="profile"]') || 
                            document.querySelector('[data-tab="configuration"]');
          if (profileTab) {
            (profileTab as HTMLElement).click();
          }
        }
      }
    };
    
    return actions[requirement as keyof typeof actions];
  };

  const getRequirementIcon = (requirement: string) => {
    const icons = {
      store_connection: Store,
      whatsapp_verification: MessageSquare,
      active_subscription: CreditCard,
      onboarding: Shield
    };
    
    const Icon = icons[requirement as keyof typeof icons] || AlertTriangle;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Verificando acceso al chat...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!accessStatus) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error al verificar el acceso al chat. Por favor, intenta nuevamente.
            </AlertDescription>
          </Alert>
          <Button onClick={checkChatAccess} className="mt-4" disabled={checking}>
            {checking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Reintentar'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Si tiene acceso completo, mostrar el chat
  if (accessStatus.canAccess) {
    return <>{children}</>;
  }

  // Si no tiene acceso, mostrar los requisitos faltantes
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <span>Perfil Requerido</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Para acceder al chat necesitas completar tu perfil personal y de negocio.
          </AlertDescription>
        </Alert>

        {/* Estado actual */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Store className="h-4 w-4" />
              <span className="text-sm font-medium">Tiendas</span>
              <Badge variant={accessStatus.details.hasActiveStore ? "default" : "secondary"}>
                {accessStatus.details.storeCount} conectada{accessStatus.details.storeCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">WhatsApp</span>
              <Badge variant={accessStatus.details.hasVerifiedWhatsApp ? "default" : "secondary"}>
                {accessStatus.details.whatsappNumbers} número{accessStatus.details.whatsappNumbers !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-medium">Suscripción</span>
              <Badge variant={accessStatus.details.hasActiveSubscription ? "default" : "destructive"}>
                {accessStatus.details.hasActiveSubscription ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Onboarding</span>
              <Badge variant={accessStatus.details.onboardingCompleted ? "default" : "destructive"}>
                {accessStatus.details.onboardingCompleted ? 'Completo' : 'Pendiente'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Requisitos faltantes */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pasos pendientes:
          </h3>
          
          {accessStatus.missing.map((requirement, index) => {
            const action = getActionButton(requirement);
            return (
              <div key={requirement} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full">
                    <span className="text-xs font-medium text-amber-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRequirementIcon(requirement)}
                    <span className="text-sm">
                      {getMissingRequirementMessage(requirement)}
                    </span>
                  </div>
                </div>
                
                {action && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={action.onClick}
                  >
                    {action.text}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Botón de recheck */}
        <div className="pt-4 border-t">
          <Button 
            onClick={checkChatAccess} 
            variant="outline" 
            size="sm"
            disabled={checking}
            className="w-full"
          >
            {checking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Verificando configuración...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar configuración nuevamente
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 