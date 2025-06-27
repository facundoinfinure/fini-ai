"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Bot, 
  TrendingUp, 
  Users, 
  HeadphonesIcon, 
  Sparkles,
  Clock,
  Target,
  Database,
  Smartphone
} from 'lucide-react';

interface ChatMetrics {
  totalMessages: number;
  totalConversations: number;
  agentBreakdown: {
    analytics: number;
    marketing: number;
    customer_service: number;
    orchestrator: number;
  };
  averageConfidence: number;
  averageResponseTime: number;
  whatsappSync: {
    enabled: boolean;
    messagesSynced: number;
    lastSync?: string;
  };
  namespaceUsage: {
    namespace: string;
    documentsIndexed: number;
    lastUpdate?: string;
  };
}

interface ChatMetricsProps {
  storeId: string;
  className?: string;
}

export function ChatMetrics({ storeId, className }: ChatMetricsProps) {
  const [metrics, setMetrics] = useState<ChatMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadMetrics();
  }, [storeId]);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat/send?storeId=${storeId}&metrics=true`);
      const data = await response.json();

      if (data.success && data.conversations) {
        // Calculate metrics from conversations data
        const conversations = data.conversations;
        let totalMessages = 0;
        let totalResponseTime = 0;
        let totalConfidence = 0;
        let confidenceCount = 0;
        let responseTimeCount = 0;
        let whatsappMessages = 0;

        const agentBreakdown = {
          analytics: 0,
          marketing: 0,
          customer_service: 0,
          orchestrator: 0
        };

        conversations.forEach((conv: any) => {
          if (conv.messages) {
            totalMessages += conv.messages.length;
            
            conv.messages.forEach((msg: any) => {
              // Count WhatsApp synced messages
              if (msg.direction === 'inbound' && msg.body) {
                whatsappMessages++;
              }
              
              // Agent breakdown
              if (msg.agent_type && agentBreakdown.hasOwnProperty(msg.agent_type)) {
                agentBreakdown[msg.agent_type as keyof typeof agentBreakdown]++;
              }
              
              // Confidence tracking
              if (msg.confidence !== null && msg.confidence !== undefined) {
                totalConfidence += msg.confidence;
                confidenceCount++;
              }
              
              // Response time tracking
              if (msg.processing_time_ms) {
                totalResponseTime += msg.processing_time_ms;
                responseTimeCount++;
              }
            });
          }
        });

        const calculatedMetrics: ChatMetrics = {
          totalMessages,
          totalConversations: conversations.length,
          agentBreakdown,
          averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
          averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
          whatsappSync: {
            enabled: whatsappMessages > 0,
            messagesSynced: whatsappMessages,
            lastSync: conversations[0]?.messages?.[0]?.created_at
          },
          namespaceUsage: {
            namespace: `store-${storeId}`,
            documentsIndexed: 0, // This would come from RAG system
            lastUpdate: new Date().toISOString()
          }
        };

        setMetrics(calculatedMetrics);
        setError(undefined);
      } else {
        throw new Error(data.error || 'Error loading metrics');
      }
    } catch (metricsError) {
      console.error('[CHAT-METRICS] Error loading metrics:', metricsError);
      setError(metricsError instanceof Error ? metricsError.message : 'Error loading metrics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Métricas de Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Métricas de Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">
            {error || 'Error cargando métricas'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Métricas de Chat
          <Badge variant="outline" className="ml-2">
            Tiempo Real
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total Messages */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Mensajes Totales</p>
                <p className="text-2xl font-bold text-blue-800">{metrics.totalMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          {/* Total Conversations */}
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Conversaciones</p>
                <p className="text-2xl font-bold text-green-800">{metrics.totalConversations}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </div>

          {/* Average Confidence */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Confianza Promedio</p>
                <p className="text-2xl font-bold text-purple-800">
                  {Math.round(metrics.averageConfidence * 100)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          {/* Average Response Time */}
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Tiempo Respuesta</p>
                <p className="text-2xl font-bold text-orange-800">
                  {Math.round(metrics.averageResponseTime)}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Agent Breakdown */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Bot className="mr-2 h-4 w-4" />
            Distribución por Agente
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm">Analytics AI</span>
              </div>
              <Badge variant="secondary">{metrics.agentBreakdown.analytics}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                <span className="text-sm">Marketing AI</span>
              </div>
              <Badge variant="secondary">{metrics.agentBreakdown.marketing}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <HeadphonesIcon className="h-4 w-4 mr-2 text-green-500" />
                <span className="text-sm">Support AI</span>
              </div>
              <Badge variant="secondary">{metrics.agentBreakdown.customer_service}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">Orchestrator</span>
              </div>
              <Badge variant="secondary">{metrics.agentBreakdown.orchestrator}</Badge>
            </div>
          </div>
        </div>

        {/* WhatsApp Sync Status */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Smartphone className="mr-2 h-4 w-4" />
            Sincronización WhatsApp
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Estado</span>
              <Badge variant={metrics.whatsappSync.enabled ? "default" : "secondary"}>
                {metrics.whatsappSync.enabled ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Mensajes Sincronizados</span>
              <span className="text-sm font-medium">{metrics.whatsappSync.messagesSynced}</span>
            </div>
            {metrics.whatsappSync.lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Última Sincronización</span>
                <span className="text-xs text-gray-600">
                  {new Date(metrics.whatsappSync.lastSync).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Namespace Usage */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Database className="mr-2 h-4 w-4" />
            Datos Específicos del Cliente
          </h4>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Namespace</span>
              <Badge variant="outline" className="text-xs">
                {metrics.namespaceUsage.namespace}
              </Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Documentos Indexados</span>
              <span className="text-sm font-medium">{metrics.namespaceUsage.documentsIndexed}</span>
            </div>
            <div className="text-xs text-blue-600 mt-2">
              🔐 Todos tus datos están completamente aislados por tienda
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
