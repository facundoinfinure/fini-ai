import { useState, useCallback, useRef, useEffect } from 'react';

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

interface ConversationMessage {
  id: string;
  body: string;
  direction: 'inbound' | 'outbound';
  agent_type?: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing';
  confidence?: number;
  created_at: string;
  processing_time_ms?: number;
}

interface ConversationData {
  id: string;
  messages: ConversationMessage[];
  namespace?: string;
}

interface SyncStatus {
  whatsappConnected: boolean;
  whatsappNumber?: string;
  lastSync?: string;
  syncEnabled: boolean;
  namespace?: string;
}

interface UseChatConfig {
  storeId: string;
  whatsappNumber?: string;
  enablePolling?: boolean;
  pollingInterval?: number;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string;
  conversationId?: string;
  syncStatus: SyncStatus;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  toggleSync: () => void;
  loadHistory: () => Promise<void>;
}

export function useChat({
  storeId,
  whatsappNumber,
  enablePolling = true,
  pollingInterval = 2000
}: UseChatConfig): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [conversationId, setConversationId] = useState<string>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    whatsappConnected: !!whatsappNumber,
    whatsappNumber,
    syncEnabled: true,
    namespace: `store-${storeId}`
  });

  const pollingRef = useRef<NodeJS.Timeout>();
  const lastSyncRef = useRef<string>(new Date().toISOString());

  // 🔄 REAL-TIME POLLING for new messages
  const pollForUpdates = useCallback(async () => {
    if (!storeId || !syncStatus.syncEnabled || !enablePolling) return;

    try {
      const response = await fetch(
        `/api/chat/send?storeId=${storeId}&since=${lastSyncRef.current}&limit=10`
      );
      const data = await response.json();

      if (data.success && data.conversations && data.conversations.length > 0) {
        const newMessages: ChatMessage[] = [];
        
        data.conversations.forEach((conv: ConversationData) => {
          if (conv.messages && conv.messages.length > 0) {
            conv.messages.forEach((msg: ConversationMessage) => {
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
          console.log('[USE-CHAT] 📱 New messages polled:', newMessages.length);
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const filteredNew = newMessages.filter(m => !existingIds.has(m.id));
            return [...prev, ...filteredNew];
          });
          
          lastSyncRef.current = new Date().toISOString();
          setSyncStatus(prev => ({ ...prev, lastSync: lastSyncRef.current }));
        }
      }
    } catch (pollingError) {
      console.error('[USE-CHAT] Polling error:', pollingError);
    }
  }, [storeId, syncStatus.syncEnabled, enablePolling]);

  // Setup polling
  useEffect(() => {
    if (enablePolling && syncStatus.syncEnabled) {
      pollingRef.current = setInterval(pollForUpdates, pollingInterval);
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [pollForUpdates, enablePolling, syncStatus.syncEnabled, pollingInterval]);

  // Load conversation history
  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/send?storeId=${storeId}&limit=30`);
      const data = await response.json();

      if (data.success && data.conversations && data.conversations.length > 0) {
        const conversation = data.conversations[0] as ConversationData;
        const loadedMessages: ChatMessage[] = conversation.messages.map((msg: ConversationMessage) => ({
          id: msg.id,
          content: msg.body,
          direction: msg.direction,
          agentType: msg.agent_type,
          confidence: msg.confidence,
          timestamp: msg.created_at,
          processingTime: msg.processing_time_ms,
          platform: (msg.direction === 'inbound' ? 'whatsapp' : 'dashboard') as 'dashboard' | 'whatsapp',
          namespace: conversation.namespace
        }));

        setMessages(loadedMessages);
        setConversationId(conversation.id);
        setSyncStatus(prev => ({ ...prev, namespace: conversation.namespace }));
        lastSyncRef.current = new Date().toISOString();
        
        console.log('[USE-CHAT] History loaded:', {
          conversationId: conversation.id,
          messages: loadedMessages.length,
          namespace: conversation.namespace
        });
      }
    } catch (historyError) {
      console.error('[USE-CHAT] Failed to load history:', historyError);
      setError('Error cargando historial de conversación');
    }
  }, [storeId]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: message.trim(),
      direction: 'inbound',
      timestamp: new Date().toISOString(),
      platform: 'dashboard',
      namespace: syncStatus.namespace
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
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

        console.log('[USE-CHAT] Message sent successfully:', {
          agentType: data.response.agentType,
          whatsappSent: data.sync?.whatsappSent,
          namespace: data.response.namespace
        });
      } else {
        throw new Error(data.error || 'Error enviando mensaje');
      }
    } catch (sendError) {
      console.error('[USE-CHAT] Error sending message:', sendError);
      
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
      setError(sendError instanceof Error ? sendError.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, storeId, conversationId, syncStatus]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(undefined);
    setConversationId(undefined);
  }, []);

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  const toggleSync = useCallback(() => {
    setSyncStatus(prev => ({ ...prev, syncEnabled: !prev.syncEnabled }));
  }, []);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    syncStatus,
    sendMessage,
    clearMessages,
    clearError,
    toggleSync,
    loadHistory
  };
}
