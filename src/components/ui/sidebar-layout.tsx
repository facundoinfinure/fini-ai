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
  MessageCircle
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
  className 
}: SidebarLayoutProps) {
  const [chatExpanded, setChatExpanded] = useState(activeTab === 'chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Expand chat submenu when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      setChatExpanded(true);
      loadConversations();
    }
  }, [activeTab]);

  const loadConversations = async () => {
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
      // Fallback to mock data if API not available
      setConversations([
        { id: 'new', title: 'Nueva conversación', unreadCount: 0 }
      ]);
    }
  };

  const handleChatToggle = () => {
    setChatExpanded(!chatExpanded);
    if (!chatExpanded) {
      loadConversations();
    }
  };

  const handleNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedConversation(data.data.id);
        loadConversations();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    // Trigger conversation change event if needed
    if (onTabChange) {
      onTabChange('chat');
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
                          onClick={() => handleConversationSelect(conversation.id)}
                          className={cn(
                            "sidebar-conversation-item",
                            selectedConversation === conversation.id && "active"
                          )}
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