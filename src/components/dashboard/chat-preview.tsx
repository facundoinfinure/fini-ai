"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, MoreHorizontal, Bot, User, CheckCheck, Check, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'analytics' | 'system';
  status: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  status: 'active' | 'waiting' | 'closed';
  unreadCount: number;
  messages: Message[];
}

interface ChatStats {
  totalConversations: number;
  activeChats: number;
  avgResponseTime: number;
  satisfactionRate: number;
  automatedResponses: number;
}

export function ChatPreview() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChatData();
  }, []);

  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data - in production, this would call your chat API
      const mockConversations: Conversation[] = [
        {
          id: '1',
          customerName: 'María González',
          customerPhone: '+549112345678',
          lastMessage: '¿Cuántas ventas tuvieron esta semana?',
          lastMessageTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          status: 'active',
          unreadCount: 1,
          messages: [
            {
              id: '1',
              content: 'Hola! ¿Cuántas ventas tuvieron esta semana?',
              timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
              direction: 'inbound',
              type: 'text',
              status: 'read'
            },
            {
              id: '2',
              content: '¡Hola María! Esta semana tuvimos 23 ventas por un total de $45,200. Un aumento del 15% respecto a la semana anterior 📈',
              timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
              direction: 'outbound',
              type: 'analytics',
              status: 'read'
            },
            {
              id: '3',
              content: '¿Cuáles fueron los productos más vendidos?',
              timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
              direction: 'inbound',
              type: 'text',
              status: 'delivered'
            }
          ]
        },
        {
          id: '2',
          customerName: 'Carlos Rodríguez',
          customerPhone: '+549987654321',
          lastMessage: 'Muchas gracias por la información!',
          lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'waiting',
          unreadCount: 0,
          messages: [
            {
              id: '4',
              content: '¿Cómo van las ventas del mes?',
              timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              direction: 'inbound',
              type: 'text',
              status: 'read'
            },
            {
              id: '5',
              content: 'Este mes llevamos $156,000 en ventas con 89 órdenes. El ticket promedio es de $1,753 🎉',
              timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
              direction: 'outbound',
              type: 'analytics',
              status: 'read'
            },
            {
              id: '6',
              content: 'Muchas gracias por la información!',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              direction: 'inbound',
              type: 'text',
              status: 'read'
            }
          ]
        },
        {
          id: '3',
          customerName: 'Ana López',
          customerPhone: '+549556677889',
          lastMessage: '¿Pueden enviarme el reporte diario?',
          lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          unreadCount: 2,
          messages: [
            {
              id: '7',
              content: '¿Pueden enviarme el reporte diario?',
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              direction: 'inbound',
              type: 'text',
              status: 'sent'
            }
          ]
        }
      ];

      const mockStats: ChatStats = {
        totalConversations: 156,
        activeChats: 12,
        avgResponseTime: 45,
        satisfactionRate: 94.5,
        automatedResponses: 89
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setConversations(mockConversations);
      setStats(mockStats);
      setSelectedConversation(mockConversations[0]);
    } catch (err) {
      setError('Error al cargar las conversaciones');
      console.error('Chat fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Chat Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              WhatsApp Analytics
            </CardTitle>
            <CardDescription>
              Métricas de conversaciones y respuesta automatizada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalConversations}
                </div>
                <div className="text-xs text-blue-700">Total Conversaciones</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.activeChats}
                </div>
                <div className="text-xs text-green-700">Chats Activos</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.avgResponseTime}s
                </div>
                <div className="text-xs text-orange-700">Tiempo Respuesta</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.satisfactionRate}%
                </div>
                <div className="text-xs text-purple-700">Satisfacción</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="h-96">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Conversaciones Recientes
            </span>
            <Button variant="outline" size="sm">
              Ver Todas
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-80">
            {/* Conversation List */}
            <div className="w-1/2 border-r overflow-y-auto">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {conversation.customerName}
                        </h4>
                        <Badge 
                          className={`text-xs px-1 py-0 ${getStatusColor(conversation.status)}`}
                        >
                          {getStatusText(conversation.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 truncate mb-1">
                        {conversation.lastMessage}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(conversation.lastMessageTime), 'HH:mm', { locale: es })}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Message View */}
            <div className="w-1/2 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">
                          {selectedConversation.customerName}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {selectedConversation.customerPhone}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-2 text-xs ${
                            message.direction === 'outbound'
                              ? message.type === 'analytics'
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="flex items-start space-x-1">
                            {message.direction === 'outbound' && message.type === 'analytics' && (
                              <Bot className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            )}
                            {message.direction === 'inbound' && (
                              <User className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p>{message.content}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs opacity-75">
                                  {format(new Date(message.timestamp), 'HH:mm', { locale: es })}
                                </span>
                                {getMessageIcon(message)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-3 border-t bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Escribe un mensaje..."
                        className="flex-1 text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button size="sm" className="px-3">
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Selecciona una conversación</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 