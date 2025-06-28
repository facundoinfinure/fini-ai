"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  MoreHorizontal, 
  Bot, 
  User, 
  CheckCheck, 
  Check, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles,
  Loader2,
  BarChart3,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Briefcase,
  Target,
  Cog
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
  status: 'sent' | 'delivered' | 'read';
  agent?: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing' | 'stock_manager' | 'financial_advisor' | 'business_consultant' | 'product_manager' | 'operations_manager' | 'sales_coach';
  confidence?: number;
}

interface Conversation {
  id: string;
  title?: string; // Título auto-generado o personalizado
  customerName: string;
  customerPhone: string;
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

interface ChatPreviewProps {
  selectedStore?: Store;
}

export function ChatPreview({ selectedStore }: ChatPreviewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [generatingTitle, setGeneratingTitle] = useState<string | null>(null);
  
  // Estados para la nueva interfaz moderna
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchChatData();
  }, []);

  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch conversations from API
      const conversationsResponse = await fetch('/api/conversations');
      if (!conversationsResponse.ok) {
        if (conversationsResponse.status === 401) {
          setError('Debes iniciar sesión para ver las conversaciones');
          return;
        }
        throw new Error('Failed to fetch conversations');
      }
      
      const conversationsData = await conversationsResponse.json();
      
      if (conversationsData.success) {
        setConversations(conversationsData.data || []);
        
        // Set first conversation as selected if available
        if (conversationsData.data && conversationsData.data.length > 0) {
          setSelectedConversation(conversationsData.data[0]);
        }
              } else {
          throw new Error(conversationsData.error || 'Failed to load chat data');
        }
        
      } catch (err) {
        // Show empty state instead of error for now since conversations feature is not fully implemented
        setConversations([]);
        setError(null); // Don't show error, just empty state
      console.log('Chat data not available yet:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funciones para la nueva interfaz moderna
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Validate that we have a selected store
    if (!selectedStore?.id) {
      console.error('No store selected');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Error: No hay una tienda seleccionada. Por favor selecciona una tienda desde la configuración.',
        timestamp: new Date().toISOString(),
        direction: 'outbound',
        type: 'system',
        status: 'sent'
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      timestamp: new Date().toISOString(),
      direction: 'inbound',
      type: 'text',
      status: 'sent'
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
          message: inputValue,
          storeId: selectedStore.id, // Use actual store UUID
          conversationId: selectedConversation?.id || 'current'
        })
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.data.response,
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          type: 'analytics',
          status: 'sent',
          agent: result.data.agentType || 'orchestrator',
          confidence: result.data.confidence
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('Error sending message:', result.error);
        // Mostrar mensaje de error más específico
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Error del servidor: ${result.error || 'Error desconocido'}. Por favor intenta nuevamente.`,
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          type: 'system',
          status: 'sent'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Error de conexión. Verifica tu conexión a internet y vuelve a intentar.',
        timestamp: new Date().toISOString(),
        direction: 'outbound',
        type: 'system',
        status: 'sent'
      };
      setMessages(prev => [...prev, errorMessage]);
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

  // Configuración completa de todos los 10 agentes
  const getAgentBadge = (agent?: string) => {
    const agentConfig = {
      orchestrator: { 
        label: 'Orchestrator', 
        color: 'bg-[#1a1a1a]', 
        icon: Cog,
        description: 'Coordinador Principal'
      },
      analytics: { 
        label: 'Analytics AI', 
        color: 'bg-[#3b82f6]', 
        icon: BarChart3,
        description: 'Análisis de Datos'
      },
      customer_service: { 
        label: 'Support AI', 
        color: 'bg-[#10b981]', 
        icon: Users,
        description: 'Atención al Cliente'
      },
      marketing: { 
        label: 'Marketing AI', 
        color: 'bg-[#8b5cf6]', 
        icon: Sparkles,
        description: 'Estrategias de Marketing'
      },
      stock_manager: { 
        label: 'Stock Manager', 
        color: 'bg-[#f59e0b]', 
        icon: Package,
        description: 'Gestión de Inventario'
      },
      financial_advisor: { 
        label: 'Financial AI', 
        color: 'bg-[#059669]', 
        icon: DollarSign,
        description: 'Asesor Financiero'
      },
      business_consultant: { 
        label: 'Business AI', 
        color: 'bg-[#7c3aed]', 
        icon: Briefcase,
        description: 'Consultor de Negocio'
      },
      product_manager: { 
        label: 'Product AI', 
        color: 'bg-[#dc2626]', 
        icon: ShoppingCart,
        description: 'Gestor de Productos'
      },
      operations_manager: { 
        label: 'Operations AI', 
        color: 'bg-[#0891b2]', 
        icon: Cog,
        description: 'Gestor de Operaciones'
      },
      sales_coach: { 
        label: 'Sales Coach', 
        color: 'bg-[#ea580c]', 
        icon: Target,
        description: 'Entrenador de Ventas'
      }
    };

    const config = agentConfig[agent as keyof typeof agentConfig];
    if (!config) return null;

    const Icon = config.icon;
    
    return (
      <div className="responding-agent">
        <div className={`agent-badge ${config.color}`}>
          <Icon className="w-2 h-2" />
        </div>
        <span>{config.label}</span>
        <span className="text-xs opacity-75">• {config.description}</span>
      </div>
    );
  };

  // Sugerencias rápidas categorizadas por agente
  const quickActions = [
    { text: "¿Qué productos tengo?", category: "products" },
    { text: "Mostrar ventas de hoy", category: "analytics" },
    { text: "Ideas de marketing", category: "marketing" },
    { text: "Estado del inventario", category: "stock" },
    { text: "Análisis financiero", category: "finance" },
    { text: "Consulta de negocio", category: "business" },
    { text: "Estrategia de ventas", category: "sales" },
    { text: "Optimizar operaciones", category: "operations" }
  ];

  const getStatusColor = (status: Conversation['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Conversation['status']) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'waiting': return 'Esperando';
      case 'closed': return 'Cerrado';
      default: return 'Desconocido';
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.direction === 'outbound') {
      switch (message.status) {
        case 'sent': return <Check className="h-3 w-3 text-gray-400" />;
        case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-400" />;
        case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      }
    }
    return null;
  };

  // 🆕 Crear nueva conversación
  const handleCreateNewConversation = async () => {
    try {
      setCreatingConversation(true);
      
      // Obtener primer store disponible (simplificado, se puede mejorar)
      const storeId = 'default-store-id'; // TODO: Obtener store ID real
      
      const response = await fetch('/api/conversations/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchChatData(); // Refrescar lista
        setSelectedConversation(result.data);
        console.log('Nueva conversación creada:', result.data.id);
      } else {
        console.error('Error creando conversación:', result.error);
      }
    } catch (error) {
      console.error('Error creando conversación:', error);
    } finally {
      setCreatingConversation(false);
    }
  };

  // 🗑️ Eliminar conversación
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      setDeletingConversation(conversationId);
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remover de la lista local
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // Si era la conversación seleccionada, limpiar selección
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
        }
        
        console.log('Conversación eliminada:', conversationId);
      } else {
        console.error('Error eliminando conversación:', result.error);
      }
    } catch (error) {
      console.error('Error eliminando conversación:', error);
    } finally {
      setDeletingConversation(null);
    }
  };

  // ✨ Generar título automáticamente
  const handleGenerateTitle = async (conversationId: string) => {
    try {
      setGeneratingTitle(conversationId);
      
      const response = await fetch(`/api/conversations/${conversationId}/generate-title`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Actualizar título en la lista local
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, title: result.data.title }
            : c
        ));
        
        // Actualizar conversación seleccionada si es la misma
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(prev => prev ? { ...prev, title: result.data.title } : null);
        }
        
        console.log('Título generado:', result.data.title);
      } else {
        console.error('Error generando título:', result.error);
      }
    } catch (error) {
      console.error('Error generando título:', error);
    } finally {
      setGeneratingTitle(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Chat Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Chat Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // NUEVA INTERFAZ MODERNA CHATGPT/CLAUDE - Preservando funcionalidad existente
  if (messages.length === 0) {
    // Empty State - Interfaz de bienvenida con TODOS los 10 agentes
    return (
      <div className="flex-1 flex flex-col min-h-[600px]">
        <div className="chat-empty-state">
          <div className="empty-state-icon">
            <MessageSquare className="w-10 h-10 text-[#6b7280]" />
          </div>
          <h3 className="empty-state-title">¡Hola! Soy Fini AI</h3>
          <p className="empty-state-description">
            Tu asistente inteligente multi-agente para tu tienda. Tengo 10 especialistas listos para ayudarte con análisis, marketing, atención al cliente, inventario, finanzas, consultoría, productos, operaciones, ventas y coordinación general.
          </p>
          
          {/* Agent Showcase - Mostrando TODOS los 10 agentes disponibles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 max-w-4xl">
            <div className="agent-showcase-item">
              <BarChart3 className="w-5 h-5 text-[#3b82f6]" />
              <span>Analytics AI</span>
            </div>
            <div className="agent-showcase-item">
              <Sparkles className="w-5 h-5 text-[#8b5cf6]" />
              <span>Marketing AI</span>
            </div>
            <div className="agent-showcase-item">
              <Users className="w-5 h-5 text-[#10b981]" />
              <span>Support AI</span>
            </div>
            <div className="agent-showcase-item">
              <Package className="w-5 h-5 text-[#f59e0b]" />
              <span>Stock Manager</span>
            </div>
            <div className="agent-showcase-item">
              <DollarSign className="w-5 h-5 text-[#059669]" />
              <span>Financial AI</span>
            </div>
            <div className="agent-showcase-item">
              <Briefcase className="w-5 h-5 text-[#7c3aed]" />
              <span>Business AI</span>
            </div>
            <div className="agent-showcase-item">
              <ShoppingCart className="w-5 h-5 text-[#dc2626]" />
              <span>Product AI</span>
            </div>
            <div className="agent-showcase-item">
              <Cog className="w-5 h-5 text-[#0891b2]" />
              <span>Operations AI</span>
            </div>
            <div className="agent-showcase-item">
              <Target className="w-5 h-5 text-[#ea580c]" />
              <span>Sales Coach</span>
            </div>
            <div className="agent-showcase-item">
              <Cog className="w-5 h-5 text-[#1a1a1a]" />
              <span>Orchestrator</span>
            </div>
          </div>
          
          <div className="empty-state-suggestions">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInputValue(action.text)}
                className="suggestion-chip"
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="chat-input-container">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregúntame sobre tu tienda, ventas, productos, marketing, finanzas, inventario..."
              className="chat-input"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="chat-quick-actions">
            {quickActions.slice(0, 4).map((action, index) => (
              <button
                key={index}
                onClick={() => setInputValue(action.text)}
                className="quick-action"
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chat with Messages - Interfaz de conversación activa
  return (
    <div className="flex-1 flex flex-col min-h-[600px]">
      {/* Messages Area */}
      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.direction === 'inbound' ? 'user' : 'assistant'}`}
          >
            <div className="message-avatar">
              {message.direction === 'inbound' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className="message-content">
              {message.direction === 'outbound' && message.agent && getAgentBadge(message.agent)}
              <div className="message-text">{message.content}</div>
              <div className="message-time">
                {format(new Date(message.timestamp), 'HH:mm', { locale: es })}
                {message.confidence && (
                  <span className="ml-2 text-xs opacity-60">
                    Confianza: {Math.round(message.confidence * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="typing-indicator">
            <div className="message-avatar">
              <Bot className="w-4 h-4" />
            </div>
            <div className="typing-dots">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-container">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="chat-input"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden: Preservar funcionalidad de conversaciones sin mostrar elementos duplicados */}
      <div className="technical-info hidden">
        {conversations.map((conversation) => (
          <div key={conversation.id} data-conversation-id={conversation.id}>
            {/* Funcionalidad de conversaciones preservada pero oculta para evitar elementos duplicados */}
            <div className="hidden">
              <button 
                onClick={handleCreateNewConversation}
                disabled={creatingConversation}
              />
              <button 
                onClick={() => handleGenerateTitle(conversation.id)}
                disabled={generatingTitle === conversation.id}
              />
              <button 
                onClick={() => handleDeleteConversation(conversation.id)}
                disabled={deletingConversation === conversation.id}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 