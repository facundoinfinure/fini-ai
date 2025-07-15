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
  Edit3,
  Edit2
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
  created_at?: string; // Added for new UI
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
    label: 'Subscription',
    icon: CreditCard,
  },
  {
    id: 'configuracion',
    label: 'Settings',
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
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform conversations data
        const conversationsData = data.data.map((conv: any) => ({
          id: conv.id,
          title: conv.title || 'Nueva conversación',
          unreadCount: conv.unreadCount || 0,
          lastActivity: conv.lastMessageTime,
          created_at: conv.created_at // Added for new UI
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
    event.stopPropagation();
    
    console.log('[SIDEBAR] Initiating optimistic conversation deletion:', conversationId);
    
    // 🔥 OPTIMISTIC UPDATE: Remove from UI immediately
    const currentConversations = conversations;
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    
    // Clear selection if it was the selected conversation
    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
    }
    
    // 🔄 COORDINATED DELETION: Always use parent callback when available
    if (onConversationDelete) {
      console.log('[SIDEBAR] Delegating deletion to parent component for backend sync');
      try {
        await onConversationDelete(conversationId);
        console.log('[SIDEBAR] ✅ Parent deletion completed successfully');
      } catch (error) {
        console.error('[SIDEBAR] ❌ Parent deletion failed, rolling back:', error);
        // 🔄 ROLLBACK: Restore previous state on failure
        setConversations(currentConversations);
        if (selectedConversation === conversationId) {
          setSelectedConversation(conversationId);
        }
      }
      return;
    }
    
    // 🚨 FALLBACK: Direct deletion if no parent callback
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      console.log('[SIDEBAR] ✅ Fallback deletion successful');
      
      // Trigger parent update if callback exists
      if (onConversationUpdate) {
        onConversationUpdate();
      }
      
    } catch (error) {
      console.error('[SIDEBAR] ❌ Deletion failed, rolling back:', error);
      // 🔄 ROLLBACK: Restore previous state
      setConversations(currentConversations);
      if (selectedConversation === conversationId) {
        setSelectedConversation(conversationId);
      }
    }
  };;

  return (
    <div className={cn("min-h-screen bg-gray-50 flex", className)}>
      {/* Sidebar - Ultra Premium Design */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Fini AI</h1>
              <p className="text-xs text-gray-500">Analytics Premium</p>
            </div>
          </div>
        </div>

        {/* Navigation - Ultra Premium Style */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => onTabChange?.('chat')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 group",
              activeTab === 'chat' ? 'bg-gray-900 text-white shadow-lg hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <MessageCircle className={cn(
              "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
              activeTab === 'chat' ? 'text-white' : 'text-gray-400'
            )} />
            <span>Chat</span>
          </button>
          
          <button
            onClick={() => onTabChange?.('analytics')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 group",
              activeTab === 'analytics' ? 'bg-gray-900 text-white shadow-lg hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <BarChart3 className={cn(
              "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
              activeTab === 'analytics' ? 'text-white' : 'text-gray-400'
            )} />
            <span>Analytics</span>
          </button>
          
          <button
            onClick={() => onTabChange?.('configuracion')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 group",
              activeTab === 'configuracion' ? 'bg-gray-900 text-white shadow-lg hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Settings className={cn(
              "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
              activeTab === 'configuracion' ? 'text-white' : 'text-gray-400'
            )} />
            <span>Configuración</span>
          </button>
        </nav>

        {/* Chat Conversations - Ultra Premium */}
        {activeTab === 'chat' && (
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Conversaciones</h3>
              <button
                onClick={() => onNewConversation?.()}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                title="Nueva conversación"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100",
                    selectedConversationId === conversation.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  )}
                  onClick={() => onConversationSelect?.(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        selectedConversationId === conversation.id ? 'text-blue-900' : 'text-gray-900'
                      )}>
                        {conversation.title || 'Nueva conversación'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {conversation.created_at && new Date(conversation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle edit conversation
                        }}
                        className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded transition-all duration-200 hover:scale-110"
                        title="Editar"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConversationDelete?.(conversation.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-all duration-200 hover:scale-110"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Profile - Ultra Premium */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email && user?.full_name ? user.email : 'Usuario'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onRefresh?.()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:scale-105"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Actualizar</span>
            </button>
            
            <button
              onClick={() => onSignOut?.()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all duration-200 hover:scale-105"
            >
              <LogOut className="h-3 w-3" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Ultra Premium */}
      <div className="flex-1 flex flex-col bg-white">
        {children}
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