"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
  AlertCircle,
  CheckCircle,
  Loader2,
  BarChart3,
  Sparkles,
  Users,
  Package,
  DollarSign,
  Target,
  Briefcase,
  Cog,
  TrendingUp,
  HeadphonesIcon,
  Smartphone,
  Brain,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'analytics' | 'system';
  agent?: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing' | 'stock_manager' | 'financial_advisor' | 'business_consultant' | 'product_manager' | 'operations_manager' | 'sales_coach';
  confidence?: number;
  reasoning?: string;
  processingTime?: number;
}

interface Conversation {
  id: string;
  title?: string;
  lastMessage: string;
  lastMessageTime: string;
  status: 'active' | 'waiting' | 'closed';
  unreadCount: number;
  messages: Message[];
}

interface Store {
  id: string;
  name: string;
  domain?: string;
  whatsapp_number?: string;
  whatsapp_display_name?: string;
  whatsapp_verified?: boolean;
  status: 'connected' | 'disconnected' | 'pending';
}

interface FiniChatInterfaceProps {
  selectedStore?: Store;
  className?: string;
}

export function FiniChatInterface({ selectedStore, className = '' }: FiniChatInterfaceProps) {
  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation messages when selected
  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      
      if (data.success && data.data) {
        setConversations(data.data);
        // 🚫 REMOVIDO: Auto-selección automática de primera conversación
        // El chat debe empezar limpio, sin auto-seleccionar conversaciones
        // if (data.data.length > 0 && !selectedConversation) {
        //   setSelectedConversation(data.data[0]);
        // }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = await response.json();
      
      if (data.success && data.data.messages) {
        const loadedMessages = data.data.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.body,
          timestamp: msg.created_at,
          direction: msg.direction,
          type: 'text',
          agent: msg.agent_type,
          confidence: msg.confidence
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !selectedStore) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      timestamp: new Date().toISOString(),
      direction: 'inbound',
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          storeId: selectedStore.id,
          conversationId: selectedConversation?.id || 'new'
        })
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.response?.message || result.response || 'Respuesta recibida',
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          type: 'analytics',
          agent: result.response?.agentType || 'orchestrator',
          confidence: result.response?.confidence,
          reasoning: result.response?.reasoning,           // 🔥 NEW: Agent reasoning for transparency
          processingTime: result.response?.processing_time_ms // 🔥 NEW: Processing time in ms
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // If this was a new conversation, refresh conversations list
        if (!selectedConversation || selectedConversation.id === 'new') {
          await loadConversations();
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Lo siento, ha ocurrido un error. Por favor intenta nuevamente.',
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          type: 'system'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = async () => {
    setCreatingConversation(true);
    try {
      const response = await fetch('/api/conversations/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore?.id
        })
      });

      const data = await response.json();
      if (data.success) {
        const newConv = data.data;
        setConversations(prev => [newConv, ...prev]);
        setSelectedConversation(newConv);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    // 🔥 OPTIMISTIC UI: Update immediately, rollback if fails
    setDeletingConversation(conversationId);
    
    // Backup current state for potential rollback
    const currentConversations = conversations;
    const currentSelected = selectedConversation;
    const currentMessages = messages;
    
    // Optimistically update UI
    const remaining = conversations.filter(c => c.id !== conversationId);
    setConversations(remaining);
    
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(remaining[0] || null);
      setMessages([]);
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      console.log('[INFO] Conversation deleted successfully:', conversationId);
      
    } catch (error) {
      console.error('[ERROR] Failed to delete conversation:', error);
      
      // 🔥 ROLLBACK: Restore previous state
      setConversations(currentConversations);
      setSelectedConversation(currentSelected);
      setMessages(currentMessages);
      
      // TODO: Show error toast to user
      alert('Error al eliminar la conversación. Inténtalo de nuevo.');
      
    } finally {
      setDeletingConversation(null);
    }
  };

  const handleUpdateTitle = async (conversationId: string, title: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/generate-title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });

      if (response.ok) {
        setConversations(prev => 
          prev.map(c => c.id === conversationId ? { ...c, title } : c)
        );
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(prev => prev ? { ...prev, title } : null);
        }
      }
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const getAgentConfig = (agent?: string) => {
    const configs = {
      orchestrator: { icon: Bot, label: 'Orquestador', color: 'bg-gray-600', description: 'Coordinador principal' },
      analytics: { icon: BarChart3, label: 'Analytics', color: 'bg-blue-600', description: 'Especialista en datos' },
      customer_service: { icon: HeadphonesIcon, label: 'Soporte', color: 'bg-green-600', description: 'Atención al cliente' },
      marketing: { icon: Sparkles, label: 'Marketing', color: 'bg-purple-600', description: 'Estrategias comerciales' },
      stock_manager: { icon: Package, label: 'Inventario', color: 'bg-orange-600', description: 'Gestión de stock' },
      financial_advisor: { icon: DollarSign, label: 'Finanzas', color: 'bg-emerald-600', description: 'Análisis financiero' },
      business_consultant: { icon: Briefcase, label: 'Consultor', color: 'bg-indigo-600', description: 'Consultoría empresarial' },
      product_manager: { icon: Cog, label: 'Productos', color: 'bg-red-600', description: 'Gestión de catálogo' },
      operations_manager: { icon: TrendingUp, label: 'Operaciones', color: 'bg-cyan-600', description: 'Optimización operativa' },
      sales_coach: { icon: Target, label: 'Ventas', color: 'bg-pink-600', description: 'Estrategias de venta' }
    };
    return configs[agent as keyof typeof configs] || configs.orchestrator;
  };

  // 🔥 NEW: Toggle reasoning display
  const toggleReasoning = (messageId: string) => {
    setExpandedReasoning(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const quickSuggestions = [
    "¿Qué productos tengo en mi tienda?",
    "Mostrar ventas de hoy",
    "Ideas de marketing para aumentar ventas",
    "¿Cuál es mi producto más vendido?",
    "Estado del inventario",
    "Análisis de mis clientes",
    "Estrategias para mejorar conversiones",
    "Resumen financiero del mes"
  ];

  // Empty state when no conversation is selected
  if (conversations.length === 0 || !selectedConversation) {
    return (
      <div className={`flex h-[600px] bg-white rounded-lg border border-gray-200 ${className}`}>
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <Button 
                onClick={handleNewConversation}
                disabled={creatingConversation}
                className="w-full bg-black text-white hover:bg-gray-800"
              >
                {creatingConversation ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Nueva conversación
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8">
                  Sin conversaciones aún
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Chat Area - Empty State */}
        <div className="flex-1 flex flex-col">
          {/* WhatsApp Status */}
          {selectedStore && !selectedStore.whatsapp_verified && (
            <Alert className="m-4 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-orange-800">
                <strong>WhatsApp no configurado</strong> - El chat funciona solo en dashboard. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-orange-800 underline ml-1"
                  onClick={() => window.location.href = '/dashboard?tab=configuracion'}
                >
                  Configurar WhatsApp
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              ¡Hola! Soy tu asistente Fini AI
            </h3>
            
            <p className="text-gray-600 mb-8 max-w-2xl leading-relaxed">
              Sistema multi-agente inteligente para tu tienda. Tengo 10 especialistas listos para ayudarte con analytics, marketing, soporte, inventario, finanzas y más.
            </p>

            {/* Agent Showcase */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8 max-w-4xl">
              {['analytics', 'marketing', 'customer_service', 'stock_manager', 'financial_advisor'].map((agent) => {
                const config = getAgentConfig(agent);
                const Icon = config.icon;
                return (
                  <div key={agent} className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center mb-2`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{config.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-4xl">
              {quickSuggestions.slice(0, 6).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(suggestion)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pregúntame sobre tu tienda, ventas, productos, marketing..."
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent max-h-[120px]"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-black text-white hover:bg-gray-800 p-3 rounded-lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface with conversations
  return (
    <div className={`flex h-[600px] bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 flex flex-col">
          {/* New Chat Button */}
          <div className="p-4 border-b border-gray-200">
            <Button 
              onClick={handleNewConversation}
              disabled={creatingConversation}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              {creatingConversation ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Nueva conversación
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200 ${
                  deletingConversation === conversation.id 
                    ? 'opacity-50 pointer-events-none bg-red-50 border border-red-200' 
                    : selectedConversation?.id === conversation.id
                      ? 'bg-blue-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-50 hover:shadow-sm border border-transparent'
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingTitle === conversation.id ? (
                      <input
                        ref={titleInputRef}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={() => {
                          handleUpdateTitle(conversation.id, newTitle);
                          setEditingTitle(null);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateTitle(conversation.id, newTitle);
                            setEditingTitle(null);
                          }
                        }}
                        className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none"
                      />
                    ) : (
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title || 'Nueva conversación'}
                      </h4>
                    )}
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {conversation.lastMessage || 'Sin mensajes'}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitle(conversation.id);
                          setNewTitle(conversation.title || '');
                        }}
                      >
                        <Edit3 className="w-3 h-3 mr-2" />
                        Editar título
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conversation.id);
                        }}
                        className="text-red-600"
                        disabled={deletingConversation === conversation.id}
                      >
                        {deletingConversation === conversation.id ? (
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-2" />
                        )}
                        {deletingConversation === conversation.id ? 'Eliminando...' : 'Eliminar'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Fini AI</h3>
                <p className="text-xs text-gray-600">Sistema Multi-Agente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Activo</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.direction === 'inbound' ? 'flex-row-reverse justify-start' : 'flex-row justify-start'} max-w-[85%] ${
                message.direction === 'inbound' ? 'ml-auto' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                message.direction === 'inbound' 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
              }`}>
                {message.direction === 'inbound' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Content */}
              <div className="flex flex-col gap-2 max-w-full">
                {/* Agent Badge & Processing Time */}
                {message.direction === 'outbound' && message.agent && (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {(() => {
                      const config = getAgentConfig(message.agent);
                      const Icon = config.icon;
                      return (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className={`w-3 h-3 ${config.color} rounded flex items-center justify-center`}>
                            <Icon className="w-2 h-2 text-white" />
                          </div>
                          <span className="font-medium text-xs text-gray-700">{config.label}</span>
                        </div>
                      );
                    })()}
                    
                    {/* Processing Time Badge */}
                    {message.processingTime && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                        <Zap className="w-3 h-3" />
                        <span>{message.processingTime}ms</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-3 text-sm transition-all duration-200 hover:shadow-sm ${
                  message.direction === 'inbound'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-sm hover:border-gray-300'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {/* Reasoning Section */}
                {message.reasoning && message.direction === 'outbound' && (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReasoning(message.id)}
                      className="h-6 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 -ml-2"
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      {expandedReasoning.has(message.id) ? 'Ocultar' : 'Ver'} proceso de análisis
                    </Button>
                    
                    {expandedReasoning.has(message.id) && (
                      <div className="animate-in slide-in-from-top-2 duration-200 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-gray-600" />
                          <span className="text-xs font-medium text-gray-700">Proceso de análisis</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {message.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata: Timestamp, Confidence */}
                <div className={`flex items-center gap-3 text-xs text-gray-500 px-1 ${
                  message.direction === 'inbound' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <span>{format(new Date(message.timestamp), 'HH:mm', { locale: es })}</span>
                  
                  {message.confidence && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Confianza: {Math.round(message.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border border-gray-300 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600 ml-2">Analizando tu consulta...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-black text-white hover:bg-gray-800 p-3 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 