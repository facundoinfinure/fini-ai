/**
 * Performance Monitoring System
 * Tracks critical business metrics and performance data
 */

import { createLogger } from './logger';

const logger = createLogger('Performance');

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'seconds' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface BusinessMetric {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  trend: 'up' | 'down' | 'stable';
  timestamp: number;
  context?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private businessMetrics: BusinessMetric[] = [];
  private timers = new Map<string, number>();

  /**
   * Start a performance timer
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End a performance timer and record the metric
   */
  endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn('Timer not found', { name });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags
    });

    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    logger.performance(metric.name, metric.value, {
      unit: metric.unit,
      tags: metric.tags
    });

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric);
    }
  }

  /**
   * Record business metrics
   */
  recordBusinessMetric(metric: BusinessMetric): void {
    this.businessMetrics.push(metric);
    
    // Keep only last 500 business metrics
    if (this.businessMetrics.length > 500) {
      this.businessMetrics = this.businessMetrics.slice(-500);
    }

    logger.info('Business metric recorded', {
      name: metric.name,
      value: metric.value,
      trend: metric.trend,
      change: metric.change,
      context: metric.context
    });

    // Send to business analytics
    if (process.env.NODE_ENV === 'production') {
      this.sendBusinessMetric(metric);
    }
  }

  /**
   * Get performance metrics for a specific operation
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (!name) return this.metrics;
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(name?: string): BusinessMetric[] {
    if (!name) return this.businessMetrics;
    return this.businessMetrics.filter(m => m.name === name);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalMetrics: number;
    averageResponseTime: number;
    slowestOperations: Array<{ name: string; avgTime: number; count: number }>;
    recentErrors: number;
  } {
    const responseTimeMetrics = this.metrics.filter(m => 
      m.name.includes('Response') || m.name.includes('API') || m.name.includes('Agent')
    );

    const avgResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;

    // Group by operation name and calculate averages
    const operationGroups = new Map<string, { total: number; count: number }>();
    this.metrics.forEach(metric => {
      const existing = operationGroups.get(metric.name) || { total: 0, count: 0 };
      operationGroups.set(metric.name, {
        total: existing.total + metric.value,
        count: existing.count + 1
      });
    });

    const slowestOperations = Array.from(operationGroups.entries())
      .map(([name, data]) => ({
        name,
        avgTime: data.total / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    return {
      totalMetrics: this.metrics.length,
      averageResponseTime: avgResponseTime,
      slowestOperations,
      recentErrors: 0 // TODO: Implement error tracking
    };
  }

  /**
   * Clear old metrics (cleanup)
   */
  clearOldMetrics(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs;
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.businessMetrics = this.businessMetrics.filter(m => m.timestamp > cutoff);
    
    const removed = initialCount - this.metrics.length;
    if (removed > 0) {
      logger.info('Old metrics cleared', { removed, remaining: this.metrics.length });
    }
  }

  private sendToAnalytics(metric: PerformanceMetric): void {
    // TODO: Integrate with analytics service (PostHog, Mixpanel, etc.)
    // For now, just log to console in production
    if (metric.value > 5000) { // Alert on operations taking > 5s
      logger.warn('Slow operation detected', {
        operation: metric.name,
        duration: metric.value,
        tags: metric.tags
      });
    }
  }

  private sendBusinessMetric(metric: BusinessMetric): void {
    // TODO: Integrate with business analytics dashboard
    // This could go to your BI tool, dashboard, or alerting system
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Agent-specific performance tracking
export class AgentPerformanceTracker {
  private agentType: string;

  constructor(agentType: string) {
    this.agentType = agentType;
  }

  trackRequest(operation: string, duration: number, success: boolean, confidence?: number): void {
    performanceMonitor.recordMetric({
      name: `Agent_${this.agentType}_${operation}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        agentType: this.agentType,
        operation,
        success: success.toString(),
        confidence: confidence?.toString() || 'unknown'
      }
    });

    // Track business metrics for agent performance
    performanceMonitor.recordBusinessMetric({
      name: `agent_${this.agentType}_requests`,
      value: 1,
      trend: 'up',
      timestamp: Date.now(),
      context: {
        operation,
        success,
        confidence,
        duration
      }
    });
  }

  trackRAGUsage(vectorSearchTime: number, documentsFound: number, relevanceScore: number): void {
    performanceMonitor.recordMetric({
      name: `Agent_${this.agentType}_RAG_Search`,
      value: vectorSearchTime,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        agentType: this.agentType,
        documentsFound: documentsFound.toString(),
        relevanceScore: relevanceScore.toString()
      }
    });
  }
}

// WhatsApp specific performance tracking
export class WhatsAppPerformanceTracker {
  trackMessageResponse(fromReceived: number, toSent: number, agentType: string): void {
    const totalTime = toSent - fromReceived;
    
    performanceMonitor.recordMetric({
      name: 'WhatsApp_Message_Response_Time',
      value: totalTime,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        agentType,
        platform: 'whatsapp'
      }
    });

    // Business metric for customer satisfaction
    const satisfactionScore = totalTime < 3000 ? 5 : totalTime < 10000 ? 4 : 3;
    performanceMonitor.recordBusinessMetric({
      name: 'customer_response_satisfaction',
      value: satisfactionScore,
      trend: satisfactionScore >= 4 ? 'up' : 'down',
      timestamp: Date.now(),
      context: {
        responseTime: totalTime,
        agentType,
        platform: 'whatsapp'
      }
    });
  }

  trackWebhookProcessing(processingTime: number, success: boolean): void {
    performanceMonitor.recordMetric({
      name: 'WhatsApp_Webhook_Processing',
      value: processingTime,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        success: success.toString(),
        platform: 'whatsapp'
      }
    });
  }
}

// API Performance tracking
export function trackAPICall<T>(
  operation: string,
  apiCall: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = performance.now();
  
  return apiCall()
    .then(result => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `API_${operation}`,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        tags: { ...tags, success: 'true' }
      });
      return result;
    })
    .catch(error => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `API_${operation}`,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        tags: { ...tags, success: 'false', error: error.message }
      });
      throw error;
    });
}

// Business metrics helpers
export const businessMetrics = {
  recordUserAction(action: string, userId: string, metadata?: Record<string, unknown>): void {
    performanceMonitor.recordBusinessMetric({
      name: `user_action_${action}`,
      value: 1,
      trend: 'up',
      timestamp: Date.now(),
      context: {
        userId,
        action,
        ...metadata
      }
    });
  },

  recordRevenue(amount: number, currency: string = 'USD', source?: string): void {
    performanceMonitor.recordBusinessMetric({
      name: 'revenue',
      value: amount,
      trend: 'up',
      timestamp: Date.now(),
      context: {
        currency,
        source
      }
    });
  },

  recordConversion(conversionType: string, value: number = 1): void {
    performanceMonitor.recordBusinessMetric({
      name: `conversion_${conversionType}`,
      value,
      trend: 'up',
      timestamp: Date.now(),
      context: {
        conversionType
      }
    });
  }
};

// Cleanup old metrics every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceMonitor.clearOldMetrics();
  }, 60 * 60 * 1000);
} 