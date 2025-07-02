"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  TrendingUp,
  Users,
  HeadphonesIcon,
  Smartphone,
  Monitor,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  agentType?: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing';
  confidence?: number;
  timestamp: string;
  processingTime?: number;
  platform?: 'dashboard' | 'whatsapp';
  namespace?: string;
}

interface SyncStatus {
  whatsappConnected: boolean;
  whatsappNumber?: string;
  lastSync?: string;
  syncEnabled: boolean;
  namespace?: string;
}

interface UnifiedChatProps {
  storeId: string;
  whatsappNumber?: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: ChatMessage) => void;
  onSyncStatusChange?: (status: SyncStatus) => void;
}

export function UnifiedChat({ 
  storeId, 
  whatsappNumber,
  onMessageSent, 
  onResponseReceived,
  onSyncStatusChange 
}: UnifiedChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [error, setError] = useState<string>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    whatsappConnected: !!whatsappNumber,
    whatsappNumber,
    syncEnabled: true,
    namespace: `store-${storeId}`
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout>();
  const lastSyncRef = useRef<string>(new Date().toISOString());

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 🔄 REAL-TIME POLLING: Check for new messages from WhatsApp
  const pollForUpdates = useCallback(async () => {
    if (!storeId || !syncStatus.syncEnabled) return;

    try {
      const response = await fetch(
        `/api/chat/send?storeId=${storeId}&since=${lastSyncRef.current}&limit=10`
      );
      const data = await response.json();

      if (data.success && data.conversations && data.conversations.length > 0) {
        const newMessages: ChatMessage[] = [];
        
        data.conversations.forEach((conv: any) => {
          if (conv.messages && conv.messages.length > 0) {
            conv.messages.forEach((msg: any) => {
              // Only add messages that are newer than our last sync
              if (new Date(msg.created_at) > new Date(lastSyncRef.current)) {
                newMessages.push({
                  id: msg.id,
                  content: msg.body,
                  direction: msg.direction,
                  agentType: msg.agent_type,
                  confidence: msg.confidence,
                  timestamp: msg.created_at,
                  processingTime: msg.processing_time_ms,
                  platform: msg.direction === 'inbound' ? 'whatsapp' : 'dashboard',
                  namespace: conv.namespace
                });
              }
            });
          }
        });

        if (newMessages.length > 0) {
          console.log('[UNIFIED-CHAT] 📱 New messages from WhatsApp:', newMessages.length);
          setMessages(prev => {
            // Avoid duplicates
            const existingIds = new Set(prev.map(m => m.id));
            const filteredNew = newMessages.filter(m => !existingIds.has(m.id));
            return [...prev, ...filteredNew];
          });
          
          lastSyncRef.current = new Date().toISOString();
          setSyncStatus(prev => ({ ...prev, lastSync: lastSyncRef.current }));
        }
      }
    } catch (error) {
      console.error('[UNIFIED-CHAT] Polling error:', error);
    }
  }, [storeId, syncStatus.syncEnabled]);

  // Setup polling for real-time updates
  useEffect(() => {
    if (syncStatus.syncEnabled) {
      // Poll every 2 seconds for new messages
      pollingRef.current = setInterval(pollForUpdates, 2000);
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [pollForUpdates, syncStatus.syncEnabled]);

  // Load initial conversation history
  useEffect(() => {
    loadConversationHistory();
  }, [storeId]);

  // Notify parent of sync status changes
  useEffect(() => {
    onSyncStatusChange?.(syncStatus);
  }, [syncStatus, onSyncStatusChange]);

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/chat/send?storeId=${storeId}&limit=30`);
      const data = await response.json();

      if (data.success && data.conversations && data.conversations.length > 0) {
        const conversation = data.conversations[0]; // Get most recent unified conversation
        const loadedMessages = conversation.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.body,
          direction: msg.direction,
          agentType: msg.agent_type,
          confidence: msg.confidence,
          timestamp: msg.created_at,
          processingTime: msg.processing_time_ms,
          platform: msg.direction === 'inbound' ? 'whatsapp' : 'dashboard',
          namespace: conversation.namespace
        }));

        setMessages(loadedMessages);
        setConversationId(conversation.id);
        setSyncStatus(prev => ({ ...prev, namespace: conversation.namespace }));
        lastSyncRef.current = new Date().toISOString();
        
        console.log('[UNIFIED-CHAT] Loaded conversation history:', {
          conversationId: conversation.id,
          messages: loadedMessages.length,
          namespace: conversation.namespace
        });
      }
    } catch (error) {
      console.error('[UNIFIED-CHAT] Failed to load conversation history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: inputMessage.trim(),
      direction: 'inbound',
      timestamp: new Date().toISOString(),
      platform: 'dashboard',
      namespace: syncStatus.namespace
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(undefined);

    // Clear input and focus
    const messageToSend = inputMessage.trim();
    setInputMessage('');
    inputRef.current?.focus();

    // Callback
    onMessageSent?.(messageToSend);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          storeId,
          conversationId,
          whatsappNumber: syncStatus.whatsappNumber,
          sendToWhatsApp: syncStatus.syncEnabled && syncStatus.whatsappConnected
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        const botMessage: ChatMessage = {
          id: `bot_${Date.now()}`,
          content: data.response.message,
          direction: 'outbound',
          agentType: data.response.agentType,
          confidence: data.response.confidence,
          timestamp: data.response.timestamp,
          processingTime: data.response.processingTime,
          platform: 'dashboard',
          namespace: data.response.namespace
        };

        setMessages(prev => [...prev, botMessage]);
        setConversationId(data.response.conversationId);
        
        // Update sync status
        if (data.sync) {
          setSyncStatus(prev => ({
            ...prev,
            lastSync: new Date().toISOString(),
            whatsappConnected: data.sync.whatsappSent || prev.whatsappConnected,
            namespace: data.metadata?.customerNamespace || prev.namespace
          }));
        }

        // Callback
        onResponseReceived?.(botMessage);
        
        console.log('[UNIFIED-CHAT] 📤 Message sent with sync status:', {
          whatsappSent: data.sync?.whatsappSent,
          whatsappError: data.sync?.whatsappError,
          namespace: data.response.namespace,
          agentType: data.response.agentType
        });
      } else {
        throw new Error(data.error || 'Error enviando mensaje');
      }
    } catch (error) {
      console.error('[UNIFIED-CHAT] Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta nuevamente.',
        direction: 'outbound',
        agentType: 'orchestrator',
        confidence: 0,
        timestamp: new Date().toISOString(),
        platform: 'dashboard',
        namespace: syncStatus.namespace
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleSync = () => {
    setSyncStatus(prev => ({ ...prev, syncEnabled: !prev.syncEnabled }));
  };

  const getAgentIcon = (agentType?: string) => {
    switch (agentType) {
      case 'analytics': return <TrendingUp className="h-3 w-3" />;
      case 'marketing': return <Sparkles className="h-3 w-3" />;
      case 'customer_service': return <HeadphonesIcon className="h-3 w-3" />;
      default: return <Bot className="h-3 w-3" />;
    }
  };

  const getAgentColor = (agentType?: string) => {
    switch (agentType) {
      case 'analytics': return 'bg-blue-500';
      case 'marketing': return 'bg-purple-500';
      case 'customer_service': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentName = (agentType?: string) => {
    switch (agentType) {
      case 'analytics': return 'Analytics AI';
      case 'marketing': return 'Marketing AI';
      case 'customer_service': return 'Support AI';
      default: return 'Fini AI';
    }
  };

  const getPlatformIcon = (platform?: string) => {
    return platform === 'whatsapp' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />;
  };

  return (
    <Card className="h-[700px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Chat Unificado - Fini AI
            <Badge variant="outline" className="ml-2">
              Dashboard ↔ WhatsApp
            </Badge>
            {syncStatus.namespace && (
              <Badge variant="secondary" className="ml-2 flex items-center space-x-1">
                <Database className="h-3 w-3" />
                <span className="text-xs">{syncStatus.namespace}</span>
              </Badge>
            )}
          </div>
          
          {/* Sync Status & Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant={syncStatus.syncEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleSync}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${syncStatus.syncEnabled ? 'animate-spin' : ''}`} />
              <span className="text-xs">
                {syncStatus.syncEnabled ? 'Sincronizado' : 'Paused'}
              </span>
            </Button>
            
            {syncStatus.whatsappConnected ? (
              <Badge variant="default" className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>WhatsApp</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>Solo Dashboard</span>
              </Badge>
            )}
          </div>
        </CardTitle>
        
        {/* Sync Info */}
        <div className="text-xs text-gray-600 space-y-1">
          {syncStatus.whatsappNumber && (
            <div>
              📱 Sincronizado con: {syncStatus.whatsappNumber}
              {syncStatus.lastSync && (
                <span className="ml-2">
                  • Última actualización: {format(new Date(syncStatus.lastSync), 'HH:mm:ss')}
                </span>
              )}
            </div>
          )}
          {syncStatus.namespace && (
            <div className="flex items-center space-x-2">
              <Database className="h-3 w-3" />
              <span>Namespace: {syncStatus.namespace}</span>
              <Badge variant="outline" className="text-xs">
                Datos específicos del cliente
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-8">
              <div className="flex justify-center space-x-4 mb-4">
                <Bot className="h-12 w-12 opacity-50" />
                <RefreshCw className="h-6 w-6 mt-3 opacity-30" />
                <Smartphone className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-lg font-medium mb-2">¡Chat Unificado Activo! 🚀</p>
              <p className="text-sm mb-2">
                Tus mensajes aparecerán aquí y en WhatsApp.
                <br />
                Los mensajes de WhatsApp se sincronizan automáticamente.
              </p>
              {syncStatus.namespace && (
                <p className="text-xs text-blue-600">
                  🔐 Usando datos específicos de tu tienda: {syncStatus.namespace}
                </p>
              )}
            </div>
          )}

          {messages.map((_message) => (
            <div
              key={message.id}
              className={`flex ${
                message.direction === 'outbound' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.direction === 'outbound'
                    ? `${getAgentColor(message.agentType)} text-white`
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between mb-2 text-xs opacity-90">
                  <div className="flex items-center space-x-2">
                    {message.direction === 'outbound' ? (
                      <>
                        {getAgentIcon(message.agentType)}
                        <span className="font-medium">
                          {getAgentName(message.agentType)}
                        </span>
                        {message.confidence !== undefined && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {Math.round(message.confidence * 100)}%
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span className="font-medium">Tú</span>
                      </>
                    )}
                  </div>
                  
                  {/* Platform indicator */}
                  <div className="flex items-center space-x-1 opacity-75">
                    {getPlatformIcon(message.platform)}
                    <span className="text-xs">
                      {message.platform === 'whatsapp' ? 'WhatsApp' : 'Dashboard'}
                    </span>
                  </div>
                </div>

                {/* Message Content */}
                <div className="text-sm leading-relaxed">
                  {message.content}
                </div>

                {/* Message Footer */}
                <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                  <span>
                    {format(new Date(message.timestamp), 'HH:mm', { locale: es })}
                  </span>
                  <div className="flex items-center space-x-2">
                    {message.processingTime && (
                      <span>{message.processingTime}ms</span>
                    )}
                    {message.namespace && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {message.namespace}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 rounded-lg p-3 flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">
                  Fini AI está pensando...
                </span>
                {syncStatus.syncEnabled && (
                  <span className="text-xs text-gray-500">
                    (Enviando a WhatsApp)
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              Error: {error}
            </div>
          )}
          
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(_e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Escribe tu mensaje... ${syncStatus.syncEnabled ? '(se enviará también por WhatsApp)' : '(solo dashboard)'}`}
              className="flex-1 text-sm"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 flex items-center space-x-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {syncStatus.syncEnabled && <Smartphone className="h-3 w-3" />}
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center space-y-1">
            <div>
              💡 Tus mensajes se sincronizan automáticamente con WhatsApp
              {syncStatus.whatsappNumber && (
                <span className="ml-1">({syncStatus.whatsappNumber})</span>
              )}
            </div>
            <div className="flex justify-center items-center space-x-2">
              <span>🤖 Prueba:</span>
              <Badge variant="outline" className="text-xs">¿Cuánto vendí hoy?</Badge>
              <Badge variant="outline" className="text-xs">Ideas de marketing</Badge>
              <Badge variant="outline" className="text-xs">Ayuda con cliente</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
