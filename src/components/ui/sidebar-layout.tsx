import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Plus,
  MessageCircle,
  Trash2,
  MoreHorizontal,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

interface SidebarLayoutProps {
  children: React.ReactNode;
  user: any;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  onRefresh?: () => void;
  className?: string;
  conversations?: Conversation[];
  selectedConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onConversationUpdate?: () => void;
  onConversationDelete?: (conversationId: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href?: string;
}

interface Conversation {
  id: string;
  title: string;
  unreadCount?: number;
  lastActivity?: string;
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
  className,
  conversations: propConversations,
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
  onConversationUpdate,
  onConversationDelete
}: SidebarLayoutProps) {
  const [chatExpanded, setChatExpanded] = useState(activeTab === 'chat');
  const [conversations, setConversations] = useState<Conversation[]>(propConversations || []);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(selectedConversationId || null);

  // Sincronizar conversaciones desde props
  useEffect(() => {
    if (propConversations) {
      setConversations(propConversations);
    }
  }, [propConversations]);

  // Sincronizar conversación seleccionada desde props
  useEffect(() => {
    if (selectedConversationId !== undefined) {
      setSelectedConversation(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Expand chat submenu when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      setChatExpanded(true);
      // Solo cargar conversaciones si no se pasan como props
      if (!propConversations) {
        loadConversations();
      }
    }
  }, [activeTab, propConversations]);

  const loadConversations = async () => {
    // Solo cargar si no se pasan conversaciones como props
    if (propConversations) return;
    
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform conversations data
        const conversationsData = data.data.map((conv: any) => ({
          id: conv.id,
          title: conv.title || 'Nueva conversación',
          unreadCount: conv.unreadCount || 0,
          lastActivity: conv.lastMessageTime
        }));
        setConversations(conversationsData);
      }
    } catch (error) {
      // Fallback to empty array if API not available
      setConversations([]);
    }
  };

  const handleChatToggle = () => {
    setChatExpanded(!chatExpanded);
    if (!chatExpanded && !propConversations) {
      loadConversations();
    }
  };

  const handleNewConversation = async () => {
    if (onNewConversation) {
      // Usar callback del padre si está disponible
      onNewConversation();
    } else {
      // Fallback a lógica original
      try {
        const response = await fetch('/api/conversations/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        
        const data = await response.json();
        if (data.success) {
          setSelectedConversation(data.data.id);
          if (!propConversations) {
            loadConversations();
          }
          if (onConversationUpdate) {
            onConversationUpdate();
          }
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    
    if (onConversationSelect) {
      // Usar callback del padre si está disponible
      onConversationSelect(conversationId);
    }
    
    // Trigger conversation change event if needed
    if (onTabChange) {
      onTabChange('chat');
    }
  };

  const handleConversationDelete = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevenir que se seleccione la conversación al hacer click en eliminar
    
    console.log('[SIDEBAR] Iniciando eliminación de conversación:', conversationId);
    
    // 🔄 BACKEND FIRST: Eliminar del backend PRIMERO, luego actualizar UI
    if (onConversationDelete) {
      // Usar callback del padre (método recomendado)
      onConversationDelete(conversationId);
    } else {
      // Fallback - eliminar del backend directamente
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
          console.log('[SIDEBAR] Backend deletion successful');
          
          // Actualizar estado local SOLO después de éxito del backend
          setConversations(prev => prev.filter(c => c.id !== conversationId));
          
          // Si era la conversación seleccionada, limpiar selección
          if (selectedConversation === conversationId) {
            setSelectedConversation(null);
          }
          
          // Sincronizar con componente padre
          if (onConversationUpdate) {
            onConversationUpdate();
          }
        } else {
          console.error('[SIDEBAR] Backend deletion failed:', data.error);
          // NO actualizar UI si el backend falló
        }
      } catch (error) {
        console.error('[SIDEBAR] Network error during deletion:', error);
        // NO actualizar UI si hubo error de red
      }
    }
  };

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
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.id === 'chat') {
                      handleChatToggle();
                    }
                    onTabChange?.(item.id);
                  }}
                  className={cn(
                    "origin-sidebar-item w-full text-left",
                    isActive && "active"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'chat' && (
                    <div className="ml-auto">
                      {chatExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </button>

                {/* Chat Submenu */}
                {item.id === 'chat' && (
                  <div className={cn(
                    "sidebar-chat-submenu ml-4 mt-1",
                    chatExpanded && "expanded"
                  )}>
                    {/* New Conversation Button */}
                    <div className="px-2 py-1">
                      <button
                        onClick={handleNewConversation}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg
                                 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1a1a1a]
                                 transition-colors duration-200"
                      >
                        <Plus className="w-3 h-3" />
                        Nueva conversación
                      </button>
                    </div>

                    {/* Conversations List */}
                    <div className="max-h-48 overflow-y-auto">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={cn(
                            "sidebar-conversation-item group",
                            selectedConversation === conversation.id && "active"
                          )}
                        >
                          {/* Conversation Content - Clickable area */}
                          <div 
                            onClick={() => handleConversationSelect(conversation.id)}
                            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3 flex-shrink-0" />
                            <span className="sidebar-conversation-title">
                              {conversation.title}
                            </span>
                            {conversation.unreadCount && conversation.unreadCount > 0 && (
                              <span className="sidebar-conversation-badge">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          
                          {/* Menu Button - Only visible on hover */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="opacity-0 group-hover:opacity-100 
                                         transition-opacity duration-200 flex-shrink-0 
                                         p-1 rounded hover:bg-gray-100 hover:text-gray-700"
                                onClick={(e) => e.stopPropagation()}
                                title="Opciones de conversación"
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implementar edición de título si se necesita
                                  console.log('Editar título:', conversation.id);
                                }}
                              >
                                <Edit3 className="w-3 h-3 mr-2" />
                                Renombrar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConversationDelete(conversation.id, e);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Eliminar conversación
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>

                    {conversations.length === 0 && (
                      <div className="px-4 py-3 text-xs text-[#9ca3af] text-center">
                        No hay conversaciones
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[#e5e7eb]">
          {user && (
            <div className="space-y-3">
              {/* User Profile Card */}
              <div className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-lg">
                <div className="w-10 h-10 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#6b7280]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-xs text-[#6b7280] truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-[#6b7280]">Plan Básico</p>
                </div>
                <button
                  onClick={() => onTabChange?.('perfil')}
                  className="opacity-70 hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
                  title="Editar perfil"
                >
                  <Edit3 className="w-4 h-4 text-[#6b7280]" />
                </button>
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
              {activeTab === 'chat' && selectedConversation && (
                <p className="text-sm text-[#6b7280] mt-1">
                  {conversations.find(c => c.id === selectedConversation)?.title || 'Conversación activa'}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Only show refresh button for non-chat tabs to avoid duplication */}
            {onRefresh && activeTab !== 'chat' && (
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