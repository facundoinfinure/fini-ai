"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  AlertCircle,
  CheckCircle,
  BarChart3,
  Sparkles,
  Smartphone,
  Loader2,
  TrendingUp,
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

interface Message {
  id: string;
  content: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'analytics' | 'system';
  agent?: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing' | 'stock_manager' | 'financial_advisor' | 'business_consultant' | 'product_manager' | 'operations_manager' | 'sales_coach';
  confidence?: number;
}

interface Store {
  id: string;
  name: string;
  whatsapp_verified?: boolean;
  whatsapp_number?: string;
  status: 'connected' | 'disconnected' | 'pending';
}

interface ModernChatInterfaceProps {
  selectedStore?: Store;
  onStoreUpdate?: () => void;
}

export function ModernChatInterface({ selectedStore, onStoreUpdate }: ModernChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          message: inputValue,
          storeId: selectedStore?.id,
          conversationId: 'current' // Simplificado por ahora
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
          confidence: result.response?.confidence
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('Error sending message:', result.error);
        // Mostrar mensaje de error
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
      console.error('Error:', error);
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

  // Empty State
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        {/* WhatsApp Status Notification */}
        {selectedStore && !selectedStore.whatsapp_verified && (
          <div className="whatsapp-status-notification">
            <AlertCircle className="status-icon" />
            <div className="status-message">
              <strong>WhatsApp no configurado</strong> - Solo funciona en dashboard. 
              <button 
                className="configure-whatsapp-link"
                onClick={() => window.location.href = '/dashboard?tab=configuracion'}
              >
                Configurar WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        <div className="chat-empty-state">
          <div className="empty-state-icon">
            <MessageSquare className="w-10 h-10 text-[#6b7280]" />
          </div>
          <h3 className="empty-state-title">¡Hola! Soy Fini AI</h3>
          <p className="empty-state-description">
            Tu asistente inteligente multi-agente para tu tienda. Tengo 10 especialistas listos para ayudarte:
            Analytics, Marketing, Atención al Cliente, Inventario, Finanzas, Consultoría, Productos, Operaciones, Ventas y más.
          </p>
          
          {/* Agent Showcase */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8 max-w-2xl">
            <div className="agent-showcase-item">
              <BarChart3 className="w-5 h-5 text-[#3b82f6]" />
              <span>Analytics</span>
            </div>
            <div className="agent-showcase-item">
              <Sparkles className="w-5 h-5 text-[#8b5cf6]" />
              <span>Marketing</span>
            </div>
            <div className="agent-showcase-item">
              <Users className="w-5 h-5 text-[#10b981]" />
              <span>Support</span>
            </div>
            <div className="agent-showcase-item">
              <Package className="w-5 h-5 text-[#f59e0b]" />
              <span>Inventario</span>
            </div>
            <div className="agent-showcase-item">
              <DollarSign className="w-5 h-5 text-[#059669]" />
              <span>Finanzas</span>
            </div>
            <div className="agent-showcase-item">
              <Target className="w-5 h-5 text-[#ea580c]" />
              <span>Ventas</span>
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
              onChange={(_e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregúntame sobre tu tienda, ventas, productos, marketing, finanzas..."
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

  // Chat with Messages
  return (
    <div className="flex-1 flex flex-col">
      {/* WhatsApp Status Notification */}
      {selectedStore && !selectedStore.whatsapp_verified && (
        <div className="whatsapp-status-notification">
          <AlertCircle className="status-icon" />
          <div className="status-message">
            <strong>WhatsApp no configurado</strong> - Solo funciona en dashboard. 
            <button 
              className="configure-whatsapp-link"
              onClick={() => window.location.href = '/dashboard?tab=configuracion'}
            >
              Configurar WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.map((_message) => (
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
            onChange={(_e) => setInputValue(e.target.value)}
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
    </div>
  );
} 