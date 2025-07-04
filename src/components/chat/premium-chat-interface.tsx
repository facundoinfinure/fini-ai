"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2,
  Sparkles,
  Brain,
  Zap,
  Clock,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PremiumMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  confidence?: number;
  reasoning?: string;
  sources?: Array<{
    content: string;
    metadata: any;
  }>;
  processingTime?: number;
}

interface Store {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'pending';
}

interface PremiumChatInterfaceProps {
  selectedStore?: Store;
  className?: string;
}

export function PremiumChatInterface({ selectedStore, className = '' }: PremiumChatInterfaceProps) {
  const [messages, setMessages] = useState<PremiumMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => `premium-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !selectedStore) return;

    const userMessage: PremiumMessage = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log(`[PREMIUM-CHAT] Sending: "${userMessage.content}"`);
      
      const response = await fetch('/api/chat/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          storeId: selectedStore.id,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const assistantMessage: PremiumMessage = {
          id: `assistant-${Date.now()}`,
          content: result.data.message,
          role: 'assistant',
          timestamp: new Date(),
          confidence: result.data.confidence,
          reasoning: result.data.reasoning,
          sources: result.data.sources,
          processingTime: result.data.processingTime,
        };

        setMessages(prev => [...prev, assistantMessage]);
        console.log(`[PREMIUM-CHAT] Response received with confidence: ${result.data.confidence}`);
      } else {
        const errorMessage: PremiumMessage = {
          id: `assistant-${Date.now()}`,
          content: result.message || 'Lo siento, hubo un error. Por favor intenta de nuevo.',
          role: 'assistant',
          timestamp: new Date(),
          confidence: 0,
        };
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error('[PREMIUM-CHAT] Error:', error);
      const errorMessage: PremiumMessage = {
        id: `assistant-${Date.now()}`,
        content: 'Error de conexión. Por favor verifica tu conexión a internet.',
        role: 'assistant',
        timestamp: new Date(),
        confidence: 0,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickSuggestions = [
    "¿Cuál es mi producto más caro?",
    "¿Cuál es mi producto más barato?", 
    "Analiza mis ventas del último mes",
    "¿Qué productos tengo disponibles?",
    "Dame ideas para aumentar ventas",
    "Estado del inventario actual"
  ];

  return (
    <div className={`flex flex-col h-[700px] bg-white rounded-xl border border-gray-200 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center">
              Fini AI Premium
              <Sparkles className="w-4 h-4 ml-2 text-purple-600" />
            </h3>
            <p className="text-sm text-gray-600">Sistema RAG con memoria conversacional</p>
          </div>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          <Zap className="w-3 h-3 mr-1" />
          En línea
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <Brain className="w-10 h-10 text-purple-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Hola! Soy tu asistente premium
              </h3>
              <p className="text-gray-600 max-w-md">
                Sistema RAG de última generación con memoria conversacional. 
                Puedo analizar tu tienda y responder preguntas específicas sobre tus datos.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
              {quickSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(suggestion)}
                  className="px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors border border-gray-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-md' 
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {message.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-1">
                    {message.confidence && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Target className="w-3 h-3" />
                        <span>Confianza: {Math.round(message.confidence * 100)}%</span>
                        {message.processingTime && (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>{message.processingTime}ms</span>
                          </>
                        )}
                      </div>
                    )}
                    {message.sources && message.sources.length > 0 && (
                      <div className="text-gray-600">
                        📄 {message.sources.length} fuente{message.sources.length > 1 ? 's' : ''} consultada{message.sources.length > 1 ? 's' : ''}
                      </div>
                    )}
                    {message.reasoning && (
                      <div className="text-blue-600 text-xs">
                        🧠 {message.reasoning}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {format(message.timestamp, 'HH:mm', { locale: es })}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-gray-600">Analizando con RAG premium...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Pregúntame sobre tu tienda...${selectedStore ? ` (${selectedStore.name})` : ''}`}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !selectedStore}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 h-12"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>🚀 Powered by Fini AI Premium RAG • ID: {conversationId.slice(-8)}</span>
          <span>Enter para enviar • Shift+Enter para nueva línea</span>
        </div>
      </div>
    </div>
  );
}
