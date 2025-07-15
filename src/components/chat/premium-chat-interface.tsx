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
  Target,
  Square
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

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
  isStreaming?: boolean;
  error?: boolean;
  metadata?: any;
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId] = useState(() => `premium-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    
    // Mark the streaming message as complete
    setMessages(prev => prev.map(msg => 
      msg.id === streamingMessageId 
        ? { ...msg, isStreaming: false }
        : msg
    ));
  }, [streamingMessageId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isStreaming || !selectedStore) return;

    const userMessage: PremiumMessage = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create abort controller for streaming
    abortControllerRef.current = new AbortController();

    try {
      console.log(`[PREMIUM-CHAT] Starting real streaming for: "${userMessage.content}"`);
      
      // Create assistant message for streaming
      const assistantMessageId = `assistant-${Date.now()}`;
      setStreamingMessageId(assistantMessageId);
      setIsStreaming(true);
      setIsLoading(false);

      const assistantMessage: PremiumMessage = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Set up Server-Sent Events
      const eventSource = new EventSource(
        `/api/chat/premium?${new URLSearchParams({
          message: userMessage.content,
          conversationId,
          storeId: selectedStore.id,
        })}`
      );

      let fullContent = '';
      let metadata: any = {};

      eventSource.onopen = () => {
        console.log('[PREMIUM-CHAT] SSE connection opened');
      };

      // Handle different event types
      eventSource.addEventListener('start', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[PREMIUM-CHAT] Stream started:', data.message);
      });

      eventSource.addEventListener('token', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        fullContent += data.token;
        
        // Update the streaming message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent, isStreaming: true }
              : msg
          )
        );
      });

      eventSource.addEventListener('complete', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        metadata = data.metadata || {};
        
        console.log('[PREMIUM-CHAT] Stream completed:', {
          finalContent: fullContent,
          metadata
        });

        // Finalize the message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: fullContent,
                  isStreaming: false,
                  metadata
                }
              : msg
          )
        );

        eventSource.close();
        setIsStreaming(false);
        setStreamingMessageId(null);
      });

      eventSource.addEventListener('error', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.error('[PREMIUM-CHAT] Stream error:', data);
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: data.error || 'I apologize, but I encountered an error processing your request. Please try again.',
                  isStreaming: false,
                  error: true
                }
              : msg
          )
        );

        eventSource.close();
        setIsStreaming(false);
        setStreamingMessageId(null);
      });

      eventSource.onerror = (error) => {
        console.error('[PREMIUM-CHAT] EventSource error:', error);
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: 'Connection error. Please check your internet connection and try again.',
                  isStreaming: false,
                  error: true
                }
              : msg
          )
        );

        eventSource.close();
        setIsStreaming(false);
        setStreamingMessageId(null);
      };

    } catch (error) {
      console.error('[PREMIUM-CHAT] Error setting up stream:', error);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingMessageId 
            ? { 
                ...msg, 
                content: 'Failed to start conversation. Please try again.',
                isStreaming: false,
                error: true
              }
            : msg
        )
      );
      
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick suggestions for better UX
  const quickSuggestions = [
    "What's my best selling product?",
    "What's my cheapest product?",
    "Analyze last month's sales",
    "What products do I have available?",
    "Give me ideas to increase sales",
    "Current inventory status"
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
            <p className="text-sm text-gray-600">
              {isStreaming ? 'Generating response...' : 'System RAG with conversational memory'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isStreaming && (
            <Button
              onClick={stopStreaming}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
          <Badge variant="outline" className="text-green-600 border-green-200">
            <Zap className="w-3 h-3 mr-1" />
            Online
          </Badge>
        </div>
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
                Hello! I'm your premium AI assistant
              </h3>
              <p className="text-gray-600 max-w-md">
                Next-generation RAG system with conversational memory and real-time responses. 
                I can analyze your store and answer specific questions about your data.
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
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : message.error
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-5 bg-current opacity-75 animate-pulse ml-1" />
                    )}
                  </div>
                  {message.metadata && (
                    <div className="mt-2 text-xs opacity-75">
                      {message.metadata.agentType && (
                        <div>Agent: {message.metadata.agentType}</div>
                      )}
                      {message.metadata.confidence && (
                        <div>Confidence: {Math.round(message.metadata.confidence * 100)}%</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isStreaming 
                  ? "Waiting for response..." 
                  : selectedStore 
                    ? "Ask me about your store..."
                    : "Connect a store to get started..."
              }
              disabled={isLoading || isStreaming || !selectedStore}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || isStreaming || !selectedStore}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isStreaming ? (
              <Square className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {selectedStore && (
          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Connected to: {selectedStore.name}
          </div>
        )}
      </div>
    </div>
  );
}
