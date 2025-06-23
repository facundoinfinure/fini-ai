/**
 * Enterprise Logger System
 * Centralizes all logging with consistent formatting, levels, and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: LogContext;
  requestId?: string;
  userId?: string;
  storeId?: string;
}

export class Logger {
  private component: string;
  private static isDevelopment = process.env.NODE_ENV === 'development';
  private static isProduction = process.env.NODE_ENV === 'production';

  constructor(component: string) {
    this.component = component;
  }

  /**
   * Create a logger instance for a specific component
   */
  static create(component: string): Logger {
    return new Logger(component);
  }

  /**
   * Debug level - Only in development
   */
  debug(message: string, context?: LogContext): void {
    if (!Logger.isDevelopment) return;
    this.log('debug', message, context);
  }

  /**
   * Info level - General information
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warn level - Warning conditions
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error level - Error conditions
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Critical level - Critical conditions requiring immediate attention
   */
  critical(message: string, context?: LogContext): void {
    this.log('critical', message, context);
    
    // In production, critical errors should trigger alerts
    if (Logger.isProduction) {
      this.sendAlert(message, context);
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      duration_ms: duration,
      performance: true
    });
  }

  /**
   * Log agent-specific events
   */
  agent(agentType: string, event: string, context?: LogContext): void {
    this.info(`Agent[${agentType}]: ${event}`, {
      ...context,
      agentType,
      isAgent: true
    });
  }

  /**
   * Log API calls
   */
  api(method: string, endpoint: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, `API ${method} ${endpoint}`, {
      ...context,
      method,
      endpoint,
      status,
      duration_ms: duration,
      isAPI: true
    });
  }

  /**
   * Log webhook events
   */
  webhook(source: string, event: string, context?: LogContext): void {
    this.info(`Webhook[${source}]: ${event}`, {
      ...context,
      source,
      isWebhook: true
    });
  }

  /**
   * Log database operations
   */
  database(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB[${table}]: ${operation}`, {
      ...context,
      table,
      isDatabase: true
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      context
    };

    // Format for console output
    const prefix = this.getLogPrefix(level);
    const formattedMessage = `${prefix}[${this.component}] ${message}`;
    
    // Add context if provided
    const logArgs = context ? [formattedMessage, context] : [formattedMessage];

    // Output to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(...logArgs);
        break;
      case 'info':
        console.info(...logArgs);
        break;
      case 'warn':
        console.warn(...logArgs);
        break;
      case 'error':
      case 'critical':
        console.error(...logArgs);
        break;
    }

    // In production, send to logging service
    if (Logger.isProduction) {
      this.sendToLoggingService(entry);
    }
  }

  /**
   * Get prefix for log level
   */
  private getLogPrefix(level: LogLevel): string {
    const now = new Date().toLocaleTimeString();
    switch (level) {
      case 'debug': return `🐛 ${now}`;
      case 'info': return `ℹ️  ${now}`;
      case 'warn': return `⚠️  ${now}`;
      case 'error': return `❌ ${now}`;
      case 'critical': return `🚨 ${now}`;
      default: return `📝 ${now}`;
    }
  }

  /**
   * Send critical alerts (implement based on your alerting system)
   */
  private sendAlert(message: string, context?: LogContext): void {
    // TODO: Implement alerting system integration
    // Examples: Slack, Discord, PagerDuty, email
    console.error('🚨 CRITICAL ALERT:', message, context);
  }

  /**
   * Send logs to external service in production
   */
  private sendToLoggingService(entry: LogEntry): void {
    // TODO: Implement logging service integration
    // Examples: DataDog, New Relic, LogRocket, Sentry
    // For now, we'll just ensure it's logged
  }
}

/**
 * Global logger utilities
 */
export const createLogger = (component: string) => Logger.create(component);

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = performance.now();
  }

  /**
   * End timing and log performance
   */
  end(context?: LogContext): number {
    const duration = performance.now() - this.startTime;
    this.logger.performance(this.operation, duration, context);
    return duration;
  }
}

/**
 * Request ID generator for tracing
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Default logger for general use
 */
export const logger = Logger.create('App'); 