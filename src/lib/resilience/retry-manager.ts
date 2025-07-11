/**
 * Retry Manager - Sistema robusto de reintentos con backoff exponencial
 * Maneja fallos temporales en servicios externos
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  error?: Error;
  timestamp: Date;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: RetryAttempt[];
  totalTime: number;
}

export class RetryManager {
  private static instance: RetryManager;
  private retryHistory: Map<string, RetryAttempt[]> = new Map();

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * Ejecuta una función con retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationName?: string
  ): Promise<RetryResult<T>> {
    const finalConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['timeout', 'network', 'connection', 'rate limit', '5', 'ECONNRESET', 'ETIMEDOUT'],
      nonRetryableErrors: ['authentication', 'authorization', '401', '403', '404'],
      ...config
    };

    const attempts: RetryAttempt[] = [];
    const startTime = Date.now();

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      const attemptStart = Date.now();
      
      try {
        console.log(`[RETRY-MANAGER] ${operationName || 'Operation'}: Attempt ${attempt}/${finalConfig.maxAttempts}`);
        
        const result = await fn();
        
        // Éxito
        const attemptData: RetryAttempt = {
          attempt,
          delay: 0,
          timestamp: new Date()
        };
        attempts.push(attemptData);

        if (operationName) {
          this.recordAttempt(operationName, attemptData);
        }

        return {
          success: true,
          data: result,
          attempts,
          totalTime: Date.now() - startTime
        };

      } catch (error) {
        const attemptError = error instanceof Error ? error : new Error(String(error));
        
        const attemptData: RetryAttempt = {
          attempt,
          delay: 0,
          error: attemptError,
          timestamp: new Date()
        };
        attempts.push(attemptData);

        if (operationName) {
          this.recordAttempt(operationName, attemptData);
        }

        // Verificar si el error es retryable
        if (!this.isRetryableError(attemptError, finalConfig)) {
          console.log(`[RETRY-MANAGER] ${operationName || 'Operation'}: Non-retryable error: ${attemptError.message}`);
          return {
            success: false,
            error: attemptError,
            attempts,
            totalTime: Date.now() - startTime
          };
        }

        // Si es el último intento, fallar
        if (attempt === finalConfig.maxAttempts) {
          console.log(`[RETRY-MANAGER] ${operationName || 'Operation'}: All attempts failed`);
          return {
            success: false,
            error: attemptError,
            attempts,
            totalTime: Date.now() - startTime
          };
        }

        // Calcular delay para el próximo intento
        const delay = this.calculateDelay(attempt, finalConfig);
        attemptData.delay = delay;

        console.log(`[RETRY-MANAGER] ${operationName || 'Operation'}: Attempt ${attempt} failed, retrying in ${delay}ms: ${attemptError.message}`);
        
        await this.sleep(delay);
      }
    }

    // Fallback (no debería llegar aquí)
    return {
      success: false,
      error: new Error('Unexpected retry loop exit'),
      attempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Verifica si un error es retryable
   */
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Verificar errores no retryables primero
    if (config.nonRetryableErrors) {
      const isNonRetryable = config.nonRetryableErrors.some(nonRetryable => 
        errorMessage.includes(nonRetryable.toLowerCase())
      );
      if (isNonRetryable) return false;
    }

    // Verificar errores retryables
    if (config.retryableErrors) {
      return config.retryableErrors.some(retryable => 
        errorMessage.includes(retryable.toLowerCase())
      );
    }

    // Por defecto, reintentar errores de red/timeout
    return errorMessage.includes('timeout') || 
           errorMessage.includes('network') || 
           errorMessage.includes('connection') ||
           errorMessage.includes('econnreset') ||
           errorMessage.includes('etimedout');
  }

  /**
   * Calcula el delay para el próximo intento con backoff exponencial
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Aplicar límite máximo
    delay = Math.min(delay, config.maxDelay);
    
    // Aplicar jitter para evitar thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Registra un intento en el historial
   */
  private recordAttempt(operationName: string, attempt: RetryAttempt): void {
    const history = this.retryHistory.get(operationName) || [];
    history.push(attempt);
    
    // Mantener solo los últimos 100 intentos
    if (history.length > 100) {
      history.shift();
    }
    
    this.retryHistory.set(operationName, history);
  }

  /**
   * Obtiene estadísticas de retry para una operación
   */
  getRetryStats(operationName: string): {
    totalAttempts: number;
    successRate: number;
    avgAttemptsPerOperation: number;
    recentFailures: RetryAttempt[];
  } {
    const history = this.retryHistory.get(operationName) || [];
    
    if (history.length === 0) {
      return {
        totalAttempts: 0,
        successRate: 0,
        avgAttemptsPerOperation: 0,
        recentFailures: []
      };
    }

    const successes = history.filter(h => !h.error).length;
    const failures = history.filter(h => h.error).length;
    const recentFailures = history.filter(h => h.error).slice(-10);

    return {
      totalAttempts: history.length,
      successRate: successes / history.length,
      avgAttemptsPerOperation: history.length / (successes + failures),
      recentFailures
    };
  }

  /**
   * Obtiene estadísticas globales de retry
   */
  getGlobalStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.retryHistory.forEach((history, operationName) => {
      stats[operationName] = this.getRetryStats(operationName);
    });

    return stats;
  }

  /**
   * Limpia el historial de retry
   */
  clearHistory(operationName?: string): void {
    if (operationName) {
      this.retryHistory.delete(operationName);
    } else {
      this.retryHistory.clear();
    }
  }
}

/**
 * Configuraciones predefinidas para diferentes tipos de operaciones
 */
export const RetryConfigs = {
  // Para APIs externas (Tienda Nube, etc.)
  EXTERNAL_API: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['timeout', 'network', 'connection', 'rate limit', '5', 'ECONNRESET'],
    nonRetryableErrors: ['401', '403', '404', 'authentication', 'authorization']
  } as RetryConfig,

  // Para base de datos
  DATABASE: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true,
    retryableErrors: ['timeout', 'connection', 'deadlock', 'lock'],
    nonRetryableErrors: ['constraint', 'syntax', 'permission']
  } as RetryConfig,

  // Para servicios de AI/ML
  AI_SERVICE: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['timeout', 'rate limit', 'overload', '5'],
    nonRetryableErrors: ['401', '403', 'invalid_request', 'quota_exceeded']
  } as RetryConfig,

  // Para operaciones críticas
  CRITICAL: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 1.8,
    jitter: true,
    retryableErrors: ['timeout', 'network', 'connection', 'temporary', '5'],
    nonRetryableErrors: ['401', '403', '404', 'permanent']
  } as RetryConfig
}; 