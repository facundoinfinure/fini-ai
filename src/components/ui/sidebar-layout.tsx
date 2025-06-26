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
  User,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarLayoutProps {
  children: React.ReactNode;
  user?: any;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  onRefresh?: () => void;
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
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'suscripcion',
    label: 'Suscripción',
    icon: CreditCard,
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: Settings,
  },
];

export function SidebarLayout({ 
  children, 
  user, 
  activeTab = 'chat', 
  onTabChange, 
  onSignOut,
  onRefresh,
  className 
}: SidebarLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-[#f8f9fa] flex", className)}>
      {/* Sidebar - Origin Style */}
      <div className="w-60 bg-white border-r border-[#e5e7eb] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1a1a1a]">Fini AI</h1>
              <p className="text-xs text-[#6b7280]">Analytics Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation - Origin Style */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange?.(item.id)}
                className={cn(
                  "origin-sidebar-item w-full text-left",
                  isActive && "active"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
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
        {/* Header - Origin Style: 64px height */}
        <header className="origin-header">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="page-title">
                {getPageTitle(activeTab)}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="refresh-button"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            )}
            
            {user && (
              <div className="w-8 h-8 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-[#6b7280]" />
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="main-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function getPageTitle(activeTab: string): string {
  const titles: Record<string, string> = {
    chat: 'Chat Preview',
    analytics: 'Analytics',
    suscripcion: 'Suscripción',
    configuracion: 'Configuración',
  };
  
  return titles[activeTab] || 'Dashboard';
} 