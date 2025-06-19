"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Bot, User, ArrowRight, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
}

interface ChatPreviewProps {
  messages?: ChatMessage[];
  onStartChat?: () => void;
}

const defaultMessages: ChatMessage[] = [
  {
    id: '1',
    type: 'user',
    content: 'Hola Fini, ¿cuáles fueron mis ventas ayer?',
    timestamp: '10:30'
  },
  {
    id: '2',
    type: 'bot',
    content: '¡Hola! Ayer vendiste $2,450 en 12 pedidos. Tu producto más vendido fue "Camiseta Premium" con 8 unidades. ¿Te gustaría ver más detalles?',
    timestamp: '10:31'
  },
  {
    id: '3',
    type: 'user',
    content: 'Sí, dame ideas para promocionar más ese producto',
    timestamp: '10:32'
  },
  {
    id: '4',
    type: 'bot',
    content: '¡Perfecto! Te sugiero: 1) Bundle con jeans (-15%), 2) Flash sale 24h, 3) Email a clientes que lo vieron. ¿Cuál te interesa más?',
    timestamp: '10:33'
  }
];

export function ChatPreview({ messages = defaultMessages, onStartChat }: ChatPreviewProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
          Preview del Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'bot' && (
                    <Bot className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp}
                    </p>
                  </div>
                  {message.type === 'user' && (
                    <User className="w-4 h-4 mt-0.5 text-green-100 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-green-600" />
                ¡Prueba Fini AI ahora!
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Chatea con tu tienda y obtén insights en tiempo real
              </p>
            </div>
            <Button 
              onClick={onStartChat}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chatear
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Features Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            Analytics en tiempo real
          </Badge>
          <Badge variant="secondary" className="text-xs">
            IA Multi-agente
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Respuestas instantáneas
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
} 