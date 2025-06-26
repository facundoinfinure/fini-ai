import React from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  MessageSquare, 
  Store, 
  CreditCard, 
  Settings, 
  LogOut,
  Bell,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarLayoutProps {
  children: React.ReactNode;
  user?: any;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  className?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'resumen',
    label: 'Resumen',
    icon: BarChart3,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'tiendas',
    label: 'Tiendas',
    icon: Store,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
  },
  {
    id: 'suscripcion',
    label: 'Suscripción',
    icon: CreditCard,
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
  },
];

export function SidebarLayout({ 
  children, 
  user, 
  activeTab = 'resumen', 
  onTabChange, 
  onSignOut,
  className 
}: SidebarLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-[#f8f9fa] flex", className)}>
      {/* Sidebar */}
      <div className="w-60 bg-white border-r border-[#e5e7eb] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#10b981] to-[#059669] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1a1a1a]">Fini AI</h1>
              <p className="text-xs text-[#6b7280]">Analytics Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange?.(item.id)}
                className={cn(
                  "nav-item w-full text-left",
                  isActive && "active"
                )}
              >
                <Icon className="nav-icon" />
                <span className="nav-text">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[#e5e7eb]">
          {user && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-[#6b7280]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-[#6b7280]">Plan Básico</p>
                </div>
              </div>
              
              <Button
                onClick={onSignOut}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#f3f4f6]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#e5e7eb] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#1a1a1a] capitalize">
                {activeTab}
              </h2>
              <p className="text-sm text-[#6b7280]">
                {getPageDescription(activeTab)}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#f3f4f6]"
              >
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function getPageDescription(activeTab: string): string {
  const descriptions: Record<string, string> = {
    resumen: 'Vista general de tu dashboard y métricas principales',
    analytics: 'Análisis detallado de rendimiento y estadísticas',
    tiendas: 'Gestión de tus tiendas conectadas',
    whatsapp: 'Configuración y gestión de WhatsApp Business',
    suscripcion: 'Gestión de tu plan y facturación',
    chat: 'Vista previa de conversaciones activas',
  };
  
  return descriptions[activeTab] || 'Gestiona tu tienda con Fini AI';
} 