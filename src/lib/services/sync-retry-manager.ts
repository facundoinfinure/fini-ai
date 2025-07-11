/**
 * 🔄🔧 SYNC RETRY MANAGER SERVICE
 * ==============================
 * 
 * Advanced retry management for sync operations with:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Retry categorization by error type
 * - Rate limiting and backpressure
 * - Detailed retry analytics
 * 
 * RETRY CATEGORIES:
 * - IMMEDIATE: Network timeouts, temporary API errors
 * - DELAYED: Rate limiting, temporary service unavailable
 * - NEVER: Authentication errors, invalid data, critical failures
 * 
 * CIRCUIT BREAKER STATES:
 * - CLOSED: Normal operation
 * - OPEN: Failing fast after consecutive failures
 * - HALF_OPEN: Testing if service has recovered
 */

import { v4 as uuidv4 } from 'uuid';

// ===== TYPES & INTERFACES =====

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterFactor: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export interface RetryAttempt {
  attemptId: string;
  operationId: string;
  attemptNumber: number;
  startTime: number;
  endTime?: number;
  error?: string;
  delayMs: number;
  circuitBreakerState: 'closed' | 'open' | 'half_open';
  success: boolean;
}

export interface RetryStats {
  operationId: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  totalDelayTime: number;
  averageDelayTime: number;
  finalResult: 'success' | 'failed' | 'circuit_open';
  executionTime: number;
  errorCategories: Record<string, number>;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
  totalRequests: number;
  successfulRequests: number;
}

// ===== RETRY MANAGER SERVICE =====

export class SyncRetryManager {
  private static instance: SyncRetryManager;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryStats: Map<string, RetryStats> = new Map();
  private activeOperations: Map<string, RetryAttempt[]> = new Map();
  private config: RetryConfig;

  private constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      exponentialBase: 2,
      jitterFactor: 0.1,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeoutMs: 60000,
      retryableErrors: [
        'timeout',
        'network',
        'rate_limit',
        'service_unavailable',
        'internal_server_error',
        'connection_reset',
        'dns_resolution_failed'
      ],
      nonRetryableErrors: [
        'authentication',
        'authorization',
        'invalid_token',
        'forbidden',
        'not_found',
        'invalid_data',
        'malformed_request',
        'duplicate_resource'
      ],
      ...config
    };

    console.log(`[SYNC:RETRY] 🔄 Retry manager initialized with config:`, {
      maxRetries: this.config.maxRetries,
      baseDelayMs: this.config.baseDelayMs,
      circuitBreakerThreshold: this.config.circuitBreakerThreshold
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<RetryConfig>): SyncRetryManager {
    if (!SyncRetryManager.instance) {
      SyncRetryManager.instance = new SyncRetryManager(config);
    }
    return SyncRetryManager.instance;
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  async executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    const attempts: RetryAttempt[] = [];
    
    console.log(`[SYNC:RETRY] 🚀 Starting operation with retry: ${operationId}`);

    // Check circuit breaker
    const circuitState = this.getCircuitBreakerState(operationId);
    if (circuitState.state === 'open') {
      if (Date.now() < circuitState.nextRetryTime) {
        console.warn(`[SYNC:RETRY] ⚡ Circuit breaker open for ${operationId}, failing fast`);
        throw new Error(`Circuit breaker open for operation: ${operationId}`);
      } else {
        // Move to half-open state
        this.updateCircuitBreaker(operationId, 'half_open');
        console.log(`[SYNC:RETRY] 🔄 Circuit breaker moving to half-open: ${operationId}`);
      }
    }

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const attemptId = uuidv4();
      const startTime = Date.now();
      
      const attemptInfo: RetryAttempt = {
        attemptId,
        operationId,
        attemptNumber: attempt + 1,
        startTime,
        delayMs: 0,
        circuitBreakerState: circuitState.state,
        success: false
      };

      attempts.push(attemptInfo);

      try {
        console.log(`[SYNC:RETRY] 🎯 Attempt ${attempt + 1}/${config.maxRetries + 1} for: ${operationId}`);
        
        const result = await operation();
        
        // Success
        attemptInfo.success = true;
        attemptInfo.endTime = Date.now();
        
        this.recordSuccess(operationId, attempts);
        console.log(`[SYNC:RETRY] ✅ Operation succeeded on attempt ${attempt + 1}: ${operationId}`);
        
        return result;

      } catch (error) {
        attemptInfo.error = error instanceof Error ? error.message : 'Unknown error';
        attemptInfo.endTime = Date.now();
        
        console.error(`[SYNC:RETRY] ❌ Attempt ${attempt + 1} failed for ${operationId}:`, error);
        
        // Check if error is retryable
        const isRetryable = this.isErrorRetryable(attemptInfo.error);
        const isLastAttempt = attempt === config.maxRetries;
        
        if (!isRetryable || isLastAttempt) {
          this.recordFailure(operationId, attempts, isRetryable ? 'max_retries' : 'non_retryable');
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        attemptInfo.delayMs = delay;
        
        console.log(`[SYNC:RETRY] ⏳ Waiting ${delay}ms before attempt ${attempt + 2}`);
        await this.delay(delay);
      }
    }

    // This should never be reached due to the loop logic above
    throw new Error(`Max retries exceeded for operation: ${operationId}`);
  }

  /**
   * Check if an error should be retried
   */
  private isErrorRetryable(errorMessage: string): boolean {
    const message = errorMessage.toLowerCase();
    
    // Check non-retryable errors first (these take precedence)
    const isNonRetryable = this.config.nonRetryableErrors.some(error => 
      message.includes(error.toLowerCase())
    );
    
    if (isNonRetryable) {
      console.log(`[SYNC:RETRY] 🚫 Error is non-retryable: ${errorMessage}`);
      return false;
    }
    
    // Check retryable errors
    const isRetryable = this.config.retryableErrors.some(error => 
      message.includes(error.toLowerCase())
    );
    
    if (isRetryable) {
      console.log(`[SYNC:RETRY] 🔄 Error is retryable: ${errorMessage}`);
      return true;
    }
    
    // Default: retry unknown errors (conservative approach)
    console.log(`[SYNC:RETRY] ❓ Unknown error type, defaulting to retryable: ${errorMessage}`);
    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff
    const exponentialDelay = config.baseDelayMs * Math.pow(config.exponentialBase, attempt);
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maximum delay
    const finalDelay = Math.min(delayWithJitter, config.maxDelayMs);
    
    return Math.round(finalDelay);
  }

  /**
   * Delay execution
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state for operation
   */
  private getCircuitBreakerState(operationId: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationId)) {
      this.circuitBreakers.set(operationId, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
        totalRequests: 0,
        successfulRequests: 0
      });
    }
    
    return this.circuitBreakers.get(operationId)!;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(operationId: string, newState: 'closed' | 'open' | 'half_open'): void {
    const state = this.getCircuitBreakerState(operationId);
    const oldState = state.state;
    
    state.state = newState;
    
    if (newState === 'open') {
      state.nextRetryTime = Date.now() + this.config.circuitBreakerTimeoutMs;
      console.warn(`[SYNC:RETRY] ⚡ Circuit breaker opened for ${operationId} until ${new Date(state.nextRetryTime).toISOString()}`);
    } else if (newState === 'closed' && oldState !== 'closed') {
      state.failureCount = 0;
      console.log(`[SYNC:RETRY] ✅ Circuit breaker closed for ${operationId}`);
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(operationId: string, attempts: RetryAttempt[]): void {
    const circuitState = this.getCircuitBreakerState(operationId);
    circuitState.totalRequests++;
    circuitState.successfulRequests++;
    
    // If we were in half-open state, close the circuit
    if (circuitState.state === 'half_open') {
      this.updateCircuitBreaker(operationId, 'closed');
    }
    
    // Record retry stats
    this.recordRetryStats(operationId, attempts, 'success');
  }

  /**
   * Record failed operation
   */
  private recordFailure(operationId: string, attempts: RetryAttempt[], reason: string): void {
    const circuitState = this.getCircuitBreakerState(operationId);
    circuitState.totalRequests++;
    circuitState.failureCount++;
    circuitState.lastFailureTime = Date.now();
    
    // Check if we should open the circuit breaker
    if (circuitState.failureCount >= this.config.circuitBreakerThreshold) {
      this.updateCircuitBreaker(operationId, 'open');
    }
    
    // Record retry stats
    this.recordRetryStats(operationId, attempts, reason === 'max_retries' ? 'failed' : 'circuit_open');
  }

  /**
   * Record retry statistics
   */
  private recordRetryStats(
    operationId: string, 
    attempts: RetryAttempt[], 
    finalResult: 'success' | 'failed' | 'circuit_open'
  ): void {
    const totalDelayTime = attempts.reduce((sum, attempt) => sum + attempt.delayMs, 0);
    const successfulAttempts = attempts.filter(a => a.success).length;
    const failedAttempts = attempts.length - successfulAttempts;
    const executionTime = attempts[attempts.length - 1].endTime! - attempts[0].startTime;

    // Categorize errors
    const errorCategories: Record<string, number> = {};
    attempts.forEach(attempt => {
      if (attempt.error) {
        const category = this.categorizeError(attempt.error);
        errorCategories[category] = (errorCategories[category] || 0) + 1;
      }
    });

    const stats: RetryStats = {
      operationId,
      totalAttempts: attempts.length,
      successfulAttempts,
      failedAttempts,
      totalDelayTime,
      averageDelayTime: totalDelayTime / Math.max(failedAttempts, 1),
      finalResult,
      executionTime,
      errorCategories
    };

    this.retryStats.set(operationId, stats);
    
    console.log(`[SYNC:RETRY] 📊 Retry stats for ${operationId}:`, {
      attempts: stats.totalAttempts,
      result: stats.finalResult,
      executionTime: `${stats.executionTime}ms`,
      totalDelay: `${stats.totalDelayTime}ms`
    });
  }

  /**
   * Categorize error for statistics
   */
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network') || message.includes('connection')) return 'network';
    if (message.includes('rate') || message.includes('limit')) return 'rate_limit';
    if (message.includes('auth')) return 'authentication';
    if (message.includes('503') || message.includes('unavailable')) return 'service_unavailable';
    if (message.includes('500') || message.includes('internal')) return 'internal_error';
    
    return 'unknown';
  }

  /**
   * Get retry statistics for an operation
   */
  getRetryStats(operationId: string): RetryStats | null {
    return this.retryStats.get(operationId) || null;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(operationId: string): CircuitBreakerState {
    return this.getCircuitBreakerState(operationId);
  }

  /**
   * Reset circuit breaker (for manual intervention)
   */
  resetCircuitBreaker(operationId: string): void {
    console.log(`[SYNC:RETRY] 🔄 Manually resetting circuit breaker for: ${operationId}`);
    this.circuitBreakers.delete(operationId);
  }

  /**
   * Get overall statistics
   */
  getOverallStats(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageRetries: number;
    circuitBreakersOpen: number;
    topErrorCategories: Array<{ category: string; count: number }>;
  } {
    const allStats = Array.from(this.retryStats.values());
    const totalOperations = allStats.length;
    const successfulOperations = allStats.filter(s => s.finalResult === 'success').length;
    const failedOperations = totalOperations - successfulOperations;
    const averageRetries = allStats.reduce((sum, s) => sum + s.totalAttempts, 0) / totalOperations;
    
    const circuitBreakersOpen = Array.from(this.circuitBreakers.values())
      .filter(cb => cb.state === 'open').length;
    
    // Aggregate error categories
    const errorCategoryTotals: Record<string, number> = {};
    allStats.forEach(stats => {
      Object.entries(stats.errorCategories).forEach(([category, count]) => {
        errorCategoryTotals[category] = (errorCategoryTotals[category] || 0) + count;
      });
    });
    
    const topErrorCategories = Object.entries(errorCategoryTotals)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageRetries: isNaN(averageRetries) ? 0 : averageRetries,
      circuitBreakersOpen,
      topErrorCategories
    };
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Execute sync operation with retry
 */
export async function executeWithRetry<T>(
  operationId: string,
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryManager = SyncRetryManager.getInstance(config);
  return await retryManager.executeWithRetry(operationId, operation, config);
}

/**
 * Create retry-aware sync operation wrapper
 */
export function createRetryableOperation<T extends any[], R>(
  operationName: string,
  fn: (...args: T) => Promise<R>,
  config?: Partial<RetryConfig>
) {
  return async (...args: T): Promise<R> => {
    const operationId = `${operationName}-${Date.now()}`;
    return executeWithRetry(operationId, () => fn(...args), config);
  };
} 