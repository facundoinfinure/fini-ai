/**
 * Circuit Breaker Pattern Implementation
 * Previene cascading failures y permite graceful degradation
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, calls fail immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  totalFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private nextAttempt?: Date;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Ejecuta una función con circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`[CIRCUIT-BREAKER] ${this.name}: Attempting reset (HALF_OPEN)`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Maneja éxito de la operación
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = new Date();
    
    if (this.state === CircuitState.HALF_OPEN) {
      console.log(`[CIRCUIT-BREAKER] ${this.name}: Reset successful (CLOSED)`);
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
    }
  }

  /**
   * Maneja fallo de la operación
   */
  private onFailure(error: unknown): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = new Date();

    // Verificar si es un error esperado
    if (this.isExpectedError(error)) {
      console.log(`[CIRCUIT-BREAKER] ${this.name}: Expected error, not counting towards threshold`);
      return;
    }

    console.log(`[CIRCUIT-BREAKER] ${this.name}: Failure ${this.failureCount}/${this.config.failureThreshold}`);

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
      console.log(`[CIRCUIT-BREAKER] ${this.name}: Circuit OPENED until ${this.nextAttempt}`);
    }
  }

  /**
   * Verifica si es momento de intentar reset
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttempt ? new Date() >= this.nextAttempt : false;
  }

  /**
   * Verifica si el error es esperado y no debe contar para el threshold
   */
  private isExpectedError(error: unknown): boolean {
    if (!this.config.expectedErrors) return false;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return this.config.expectedErrors.some(expected => 
      errorMessage.includes(expected)
    );
  }

  /**
   * Obtiene métricas del circuit breaker
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures
    };
  }

  /**
   * Resetea manualmente el circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.nextAttempt = undefined;
    console.log(`[CIRCUIT-BREAKER] ${this.name}: Manual reset`);
  }

  /**
   * Fuerza apertura del circuit breaker
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    console.log(`[CIRCUIT-BREAKER] ${this.name}: Forced OPEN`);
  }
}

/**
 * Circuit Breaker Manager - Gestiona múltiples circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers: Map<string, CircuitBreaker> = new Map();

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Obtiene o crea un circuit breaker
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minuto
        monitoringPeriod: 10000, // 10 segundos
        expectedErrors: ['timeout', 'rate limit', 'temporary']
      };

      this.breakers.set(name, new CircuitBreaker(name, { ...defaultConfig, ...config }));
    }

    return this.breakers.get(name)!;
  }

  /**
   * Obtiene métricas de todos los circuit breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });

    return metrics;
  }

  /**
   * Resetea todos los circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
    console.log('[CIRCUIT-BREAKER-MANAGER] All breakers reset');
  }

  /**
   * Obtiene estado general del sistema
   */
  getSystemHealth(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    this.breakers.forEach(breaker => {
      const metrics = breaker.getMetrics();
      switch (metrics.state) {
        case CircuitState.CLOSED:
          healthy++;
          break;
        case CircuitState.HALF_OPEN:
          degraded++;
          break;
        case CircuitState.OPEN:
          unhealthy++;
          break;
      }
    });

    return {
      healthy,
      degraded,
      unhealthy,
      total: this.breakers.size
    };
  }
} 