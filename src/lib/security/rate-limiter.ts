/**
 * Rate Limiting System
 * Prevents abuse and ensures fair resource usage per store and user
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * In-memory rate limiter with Redis-like interface
 * TODO: Replace with Redis/Upstash in production
 */
class MemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const fullKey = `${config.keyPrefix}:${key}`;
    const entry = this.store.get(fullKey);

    // If no entry or window expired, create new one
    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      this.store.set(fullKey, newEntry);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: entry.resetTime - now
      };
    }

    // Increment counter
    entry.count++;
    this.store.set(fullKey, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new MemoryRateLimiter();

/**
 * Rate limiting configurations for different operations
 */
export const RATE_LIMITS = {
  // General store data access
  store_access: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'store_access'
  },
  
  // RAG/Vector searches (more expensive)
  rag_search: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'rag_search'
  },
  
  // Agent queries (AI generation)
  agent_query: {
    maxRequests: 30,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'agent_query'
  },
  
  // WhatsApp message processing
  whatsapp_process: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'whatsapp'
  },
  
  // Data indexing operations
  data_indexing: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'data_index'
  },
  
  // Tienda Nube API calls
  tiendanube_api: {
    maxRequests: 500,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'tn_api'
  }
} as const;

/**
 * Check rate limit for store-specific operations
 */
export async function checkStoreRateLimit(
  storeId: string,
  operation: keyof typeof RATE_LIMITS,
  userId?: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  const key = userId ? `${storeId}:${userId}` : storeId;
  
  const result = await rateLimiter.check(key, config);
  
  // Log rate limiting events
  if (!result.allowed) {
    console.warn(`[RATE_LIMIT] ${operation} blocked for store ${storeId}${userId ? ` user ${userId}` : ''}`, {
      remaining: result.remaining,
      retryAfter: result.retryAfter,
      resetTime: new Date(result.resetTime).toISOString()
    });
  }
  
  return result;
}

/**
 * Check rate limit for user-wide operations (across all stores)
 */
export async function checkUserRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  
  const result = await rateLimiter.check(userId, config);
  
  if (!result.allowed) {
    console.warn(`[RATE_LIMIT] ${operation} blocked for user ${userId}`, {
      remaining: result.remaining,
      retryAfter: result.retryAfter,
      resetTime: new Date(result.resetTime).toISOString()
    });
  }
  
  return result;
}

/**
 * Check combined rate limits (both store and user)
 */
export async function checkCombinedRateLimit(
  storeId: string,
  userId: string,
  operation: keyof typeof RATE_LIMITS
): Promise<{
  allowed: boolean;
  storeLimit: RateLimitResult;
  userLimit: RateLimitResult;
  blockedBy?: 'store' | 'user';
}> {
  const [storeLimit, userLimit] = await Promise.all([
    checkStoreRateLimit(storeId, operation, userId),
    checkUserRateLimit(userId, operation)
  ]);
  
  const allowed = storeLimit.allowed && userLimit.allowed;
  const blockedBy = !storeLimit.allowed ? 'store' : !userLimit.allowed ? 'user' : undefined;
  
  if (!allowed) {
    console.warn(`[RATE_LIMIT] Combined ${operation} blocked for store ${storeId} user ${userId}`, {
      blockedBy,
      storeRemaining: storeLimit.remaining,
      userRemaining: userLimit.remaining
    });
  }
  
  return {
    allowed,
    storeLimit,
    userLimit,
    blockedBy
  };
}

/**
 * Middleware function for route protection
 */
export function createRateLimitMiddleware(operation: keyof typeof RATE_LIMITS) {
  return async (req: Request, storeId: string, userId: string) => {
    const result = await checkCombinedRateLimit(storeId, userId, operation);
    
    if (!result.allowed) {
      const retryAfter = Math.max(
        result.storeLimit.retryAfter || 0,
        result.userLimit.retryAfter || 0
      );
      
      throw new Error(`Rate limit exceeded for ${operation}. Try again in ${Math.ceil(retryAfter / 1000)} seconds.`);
    }
    
    return result;
  };
}

/**
 * Get rate limit status for monitoring
 */
export async function getRateLimitStatus(storeId: string, userId: string): Promise<{
  [K in keyof typeof RATE_LIMITS]: {
    store: RateLimitResult;
    user: RateLimitResult;
    healthy: boolean;
  }
}> {
  const results: any = {};
  
  for (const operation of Object.keys(RATE_LIMITS) as (keyof typeof RATE_LIMITS)[]) {
    const [storeResult, userResult] = await Promise.all([
      checkStoreRateLimit(storeId, operation, userId),
      checkUserRateLimit(userId, operation)
    ]);
    
    // Don't increment counters, just check status
    results[operation] = {
      store: storeResult,
      user: userResult,
      healthy: storeResult.remaining > 5 && userResult.remaining > 5
    };
  }
  
  return results;
}

/**
 * Premium plan rate limit overrides
 */
export const PREMIUM_RATE_LIMITS = {
  pro: {
    multiplier: 3, // 3x limits for Pro plan
    operations: ['rag_search', 'agent_query', 'data_indexing']
  },
  enterprise: {
    multiplier: 10, // 10x limits for Enterprise plan
    operations: ['rag_search', 'agent_query', 'data_indexing', 'store_access']
  }
} as const;

/**
 * Check rate limit with subscription plan adjustments
 */
export async function checkPremiumRateLimit(
  storeId: string,
  userId: string,
  operation: keyof typeof RATE_LIMITS,
  subscriptionPlan: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<RateLimitResult> {
  let config = RATE_LIMITS[operation];
  
  // Apply premium multipliers
  if (subscriptionPlan === 'pro' && PREMIUM_RATE_LIMITS.pro.operations.includes(operation)) {
    config = {
      ...config,
      maxRequests: config.maxRequests * PREMIUM_RATE_LIMITS.pro.multiplier
    };
  } else if (subscriptionPlan === 'enterprise' && PREMIUM_RATE_LIMITS.enterprise.operations.includes(operation)) {
    config = {
      ...config,
      maxRequests: config.maxRequests * PREMIUM_RATE_LIMITS.enterprise.multiplier
    };
  }
  
  const key = `${storeId}:${userId}`;
  const result = await rateLimiter.check(key, config);
  
  if (!result.allowed) {
    console.warn(`[RATE_LIMIT:PREMIUM] ${operation} blocked for ${subscriptionPlan} user ${userId} store ${storeId}`, {
      plan: subscriptionPlan,
      limit: config.maxRequests,
      remaining: result.remaining
    });
  }
  
  return result;
}

// Export rate limiter instance for cleanup in tests
export { rateLimiter }; 