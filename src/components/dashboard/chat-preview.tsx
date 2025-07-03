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
  selectedStore?: {
    id: string;
    name: string;
    domain?: string;
  };
  // Nuevas props para coordinar con el sidebar
  conversations?: Conversation[];
  selectedConversationId?: string | null;
  onConversationUpdate?: () => void;
  onConversationDelete?: (conversationId: string) => void;
}

export function ChatPreview({ 
  selectedStore,
  conversations: propConversations,
  selectedConversationId,
  onConversationUpdate,
  onConversationDelete
}: ChatPreviewProps) {
  const [conversations, setConversations] = useState<Conversation[]>(propConversations || []);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [generatingTitle, setGeneratingTitle] = useState<string | null>(null);
  
  // 🔒 CHAT ACCESS VALIDATION
  const [chatAccessStatus, setChatAccessStatus] = useState<{
    canAccess: boolean;
    missing: string[];
    checking: boolean;
  }>({ canAccess: false, missing: [], checking: true });
  
  // Estados para la nueva interfaz moderna
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🔒 Verificar acceso al chat
  const checkChatAccess = async () => {
    setChatAccessStatus(prev => ({ ...prev, checking: true }));
    try {
      const response = await fetch('/api/chat/access-validation');
      if (response.ok) {
        const data = await response.json();
        setChatAccessStatus({
          canAccess: data.canAccess,
          missing: data.missing || [],
          checking: false
        });
      } else {
        setChatAccessStatus({
          canAccess: false,
          missing: ['validation_error'],
          checking: false
        });
      }
    } catch (error) {
      console.error('[CHAT-ACCESS] Error checking access:', error);
      setChatAccessStatus({
        canAccess: false,
        missing: ['validation_error'],
        checking: false
      });
    }
  };

  // Verificar acceso al cargar el componente
  useEffect(() => {
    checkChatAccess();
  }, []);

  // Sincronizar conversaciones desde props
  useEffect(() => {
    if (propConversations) {
      setConversations(propConversations);
      setLoading(false);
    } else {
      fetchChatData();
    }
  }, [propConversations]);

  // Sincronizar conversación seleccionada desde props
  useEffect(() => {
    if (selectedConversationId && conversations.length > 0) {
      const selected = conversations.find(c => c.id === selectedConversationId);
      if (selected) {
        setSelectedConversation(selected);
        loadConversationMessages(selected);
      }
    }
  }, [selectedConversationId, conversations]);

  const loadConversationMessages = async (conversation: Conversation) => {
    try {
      // Cargar mensajes específicos de esta conversación
      const response = await fetch(`/api/conversations/${conversation.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.messages) {
          const loadedMessages = data.data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.body,
            timestamp: msg.created_at,
            direction: msg.direction,
            type: 'text',
            status: 'read',
            agent: msg.agent_type,
            confidence: msg.confidence
          }));
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      setMessages([]);
    }
  };

  const fetchChatData = async () => {
    // Solo ejecutar si no se pasan conversaciones como props
    if (propConversations) return;
    
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
        
        // 🚫 REMOVIDO: Auto-selección en fetchChatData
        // Set first conversation as selected if available
        // if (conversationsData.data && conversationsData.data.length > 0) {
        //   setSelectedConversation(conversationsData.data[0]);
        //   loadConversationMessages(conversationsData.data[0]);
        // }
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
          content: result.response?.message || result.response || 'Respuesta recibida',
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          type: 'analytics',
          status: 'sent',
          agent: result.response?.agentType || 'orchestrator',
          confidence: result.response?.confidence
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
      
      // Validar que hay una tienda seleccionada
      if (!selectedStore?.id) {
        console.error('[ERROR] No store selected');
        setError('Por favor selecciona una tienda primero');
        return;
      }
      
      const response = await fetch('/api/conversations/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStore.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchChatData(); // Refrescar lista
        setSelectedConversation(result.data);
        console.log('Nueva conversación creada:', result.data.id);
      } else {
        console.error('Error creando conversación:', result.error);
        setError(result.error || 'Error creando conversación');
      }
    } catch (error) {
      console.error('Error creando conversación:', error);
      setError('Error de conexión creando conversación');
    } finally {
      setCreatingConversation(false);
    }
  };

  // 🗑️ Eliminar conversación
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      console.log('[CHAT-PREVIEW] Initiating conversation deletion:', conversationId);
      
      // 🔥 PREVENT MULTIPLE SIMULTANEOUS DELETIONS
      if (deletingConversation === conversationId) {
        console.warn(`[CHAT-PREVIEW] Deletion already in progress for conversation: ${conversationId}`);
        return;
      }
      
      setDeletingConversation(conversationId);
      
      // 🔥 COORDINATED DELETION: Use parent callback if available (preferred approach)
      if (onConversationDelete) {
        console.log('[CHAT-PREVIEW] Delegating deletion to parent component for coordination');
        
        // Delegate to parent component for coordinated deletion
        await onConversationDelete(conversationId);
        
        return;
      }
      
      // 🔥 FALLBACK: Direct deletion if no parent callback
      // Optimistically update UI
      const currentConversations = conversations;
      const currentSelected = selectedConversation;
      const currentMessages = messages;
      
      const remaining = conversations.filter(c => c.id !== conversationId);
      setConversations(remaining);
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(remaining[0] || null);
        setMessages([]);
      }
      
      // Make delete request
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log(`[CHAT-PREVIEW] ✅ Conversation deleted successfully: ${conversationId}`);
          // 🔥 IMMEDIATE FEEDBACK: Show success message to user
          alert(`✅ Conversación "${result.deletedConversation?.title || conversationId}" eliminada correctamente`);
          // Keep optimistic update - deletion successful
        } else {
          throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (deleteError: any) {
        console.error(`[CHAT-PREVIEW] Delete request failed:`, deleteError?.message || deleteError);
        
        // 🔥 ROLLBACK: Restore previous state
        setConversations(currentConversations);
        setSelectedConversation(currentSelected);
        setMessages(currentMessages);
        
        setError(`Error eliminando conversación: ${deleteError?.message || 'Error desconocido'}`);
      }
      
    } catch (error) {
      console.error('[CHAT-PREVIEW] Unexpected error during conversation deletion:', error);
      setError('Error inesperado eliminando conversación');
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

  // 🔒 MOSTRAR VALIDACIÓN DE ACCESO PRIMERO
  if (chatAccessStatus.checking) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50/30">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Verificando acceso al chat...</span>
          </div>
        </div>
      </div>
    );
  }

  // Si no tiene acceso completo, mostrar requisitos
  if (!chatAccessStatus.canAccess) {
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

    return (
      <div className="flex-1 flex flex-col bg-gray-50/30">
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span>Perfil Requerido</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Para acceder al chat necesitas completar tu perfil personal y de negocio.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Pasos pendientes:
                </h3>
                
                {chatAccessStatus.missing.map((requirement, index) => (
                  <div key={requirement} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full">
                      <span className="text-xs font-medium text-amber-600">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm">
                      {getMissingRequirementMessage(requirement)}
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={checkChatAccess} 
                variant="outline" 
                size="sm"
                className="w-full mt-4"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar configuración nuevamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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
    // Empty State - Interfaz moderna estilo ChatGPT
    return (
      <div className="flex-1 flex flex-col bg-gray-50/30">
        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            ¡Hola! Soy Fini AI
          </h3>
          
          <p className="text-gray-600 mb-8 max-w-lg leading-relaxed">
            Tu asistente inteligente multi-agente. Pregúntame sobre analytics, ventas, productos, marketing, inventario y más.
          </p>

          {/* Quick Suggestions - ChatGPT Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
            {quickActions.slice(0, 6).map((action, index) => (
              <button
                key={index}
                onClick={() => setInputValue(action.text)}
                className="p-4 bg-white border border-gray-200 rounded-xl text-left hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{action.text}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modern Input Area - Fixed at bottom */}
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Envía un mensaje a Fini AI..."
                className="w-full resize-none bg-white border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent max-h-[120px] min-h-[48px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 bottom-2 w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat with Messages - Interfaz de conversación activa estilo ChatGPT
  return (
    <div className="flex-1 flex flex-col bg-gray-50/30">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`group px-6 py-6 ${
                message.direction === 'outbound' ? 'bg-gray-50/50' : ''
              }`}
            >
              {/* 🔥 MODERN LAYOUT: WhatsApp/ChatGPT Style */}
              <div className={`flex items-start gap-4 ${
                message.direction === 'inbound' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.direction === 'inbound' 
                    ? 'bg-blue-600 text-white' // Usuario: avatar azul a la derecha
                    : 'bg-green-500 text-white' // Agente: avatar verde a la izquierda
                }`}>
                  {message.direction === 'inbound' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Content Container */}
                <div className={`flex flex-col max-w-[75%] ${
                  message.direction === 'inbound' ? 'items-end' : 'items-start'
                }`}>
                  {/* Agent Badge for AI responses */}
                  {message.direction === 'outbound' && message.agent && (
                    <div className="mb-2">
                      {getAgentBadge(message.agent)}
                    </div>
                  )}

                  {/* Message Bubble - Modern Style */}
                  <div className={`rounded-2xl px-4 py-3 max-w-full break-words ${
                    message.direction === 'inbound'
                      ? 'bg-blue-600 text-white shadow-sm' // Usuario: burbuja azul
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm' // Agente: burbuja blanca
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap m-0">
                      {message.content}
                    </p>
                  </div>

                  {/* Message metadata */}
                  <div className={`flex items-center gap-3 mt-2 text-xs text-gray-500 px-1 ${
                    message.direction === 'inbound' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>
                      {format(new Date(message.timestamp), 'HH:mm', { locale: es })}
                    </span>
                    {message.confidence && (
                      <span>
                        Confianza: {Math.round(message.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="px-6 py-6 bg-gray-50/50">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex items-center">
                  <div className="flex gap-1 bg-gray-200 rounded-full px-3 py-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modern Input Area - Fixed at bottom */}
      <div className="p-6 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Envía un mensaje a Fini AI..."
              className="w-full resize-none bg-white border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent max-h-[120px] min-h-[48px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 bottom-2 w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
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