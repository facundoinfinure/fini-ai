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
    <div className={`space-y-3 ${className}`}>
      {/* Compact Header */}
      <div className="text-center pb-2 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 text-sm flex items-center justify-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Métricas Chat
        </h4>
      </div>

      {/* Main Stats - Compact Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 p-2 rounded-lg text-center">
          <MessageSquare className="h-3 w-3 text-blue-600 mx-auto mb-1" />
          <div className="text-sm font-bold text-blue-700">{metrics.totalMessages}</div>
          <div className="text-xs text-blue-600">Mensajes</div>
        </div>

        <div className="bg-green-50 p-2 rounded-lg text-center">
          <Users className="h-3 w-3 text-green-600 mx-auto mb-1" />
          <div className="text-sm font-bold text-green-700">{metrics.totalConversations}</div>
          <div className="text-xs text-green-600">Conversaciones</div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-purple-50 p-2 rounded-lg text-center">
          <Target className="h-3 w-3 text-purple-600 mx-auto mb-1" />
          <div className="text-sm font-bold text-purple-700">
            {Math.round(metrics.averageConfidence * 100)}%
          </div>
          <div className="text-xs text-purple-600">Confianza</div>
        </div>

        <div className="bg-orange-50 p-2 rounded-lg text-center">
          <Clock className="h-3 w-3 text-orange-600 mx-auto mb-1" />
          <div className="text-sm font-bold text-orange-700">
            {Math.round(metrics.averageResponseTime)}ms
          </div>
          <div className="text-xs text-orange-600">Respuesta</div>
        </div>
      </div>

      {/* Top Agents - Compact */}
      <div className="bg-gray-50 p-2 rounded-lg">
        <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center justify-center gap-1">
          <Bot className="h-3 w-3" />
          Top Agentes
        </h5>
        <div className="space-y-1">
          {Object.entries(metrics.agentBreakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([agent, count]) => (
            <div key={agent} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1">
                {agent === 'analytics' && <TrendingUp className="h-3 w-3 text-blue-500" />}
                {agent === 'marketing' && <Sparkles className="h-3 w-3 text-purple-500" />}
                {agent === 'customer_service' && <HeadphonesIcon className="h-3 w-3 text-green-500" />}
                {agent === 'orchestrator' && <Bot className="h-3 w-3 text-gray-500" />}
                <span className="text-gray-700 capitalize truncate">
                  {agent === 'customer_service' ? 'Support' : 
                   agent === 'analytics' ? 'Analytics' :
                   agent === 'marketing' ? 'Marketing' :
                   'Orchestrator'}
                </span>
              </div>
              <span className="bg-white px-1.5 py-0.5 rounded text-xs font-medium">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-2">
        {/* WhatsApp Status - Compact */}
        <div className={`p-2 rounded border ${
          metrics.whatsappSync.enabled 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Smartphone className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-gray-700">WhatsApp</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${
              metrics.whatsappSync.enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {metrics.whatsappSync.messagesSynced} sincronizados
          </div>
        </div>

        {/* Database Status - Compact */}
        <div className="bg-blue-50 p-2 rounded border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Base Datos</span>
            </div>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {metrics.namespaceUsage.documentsIndexed} docs indexados
          </div>
        </div>
      </div>
    </div>
  );
}
