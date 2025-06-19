import crypto from 'crypto';

import { z } from 'zod';

// Esquemas de validación (usar zod si no existe SecuritySchemas)
const SecuritySchemas = {
  email: z.string().email(),
  password: z.string().min(8),
};

// Función para generar salt seguro
export function generateSalt(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Función para hashear password con salt
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Función para verificar password
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const _passwordHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(_passwordHash, 'hex'));
}

// Función para generar token seguro
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Función para generar JWT secret
export function generateJWTSecret(): string {
  return crypto.randomBytes(64).toString('base64');
}

// Función para validar webhook signature (para Tienda Nube)
export function validateWebhookSignature(
  signature: string,
  timestamp: string,
  body: string,
  secret: string
): boolean {
  try {
    const _expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(_expectedSignature, 'hex')
    );
  } catch (error) {
    console.warn('[ERROR] Webhook signature validation failed:', error);
    return false;
  }
}

// Función para sanitizar input
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+\s*=/gi, '') // Remover event handlers
    .trim();
}

// Función para validar y sanitizar email
export function validateAndSanitizeEmail(email: string): string | null {
  try {
    const _sanitized = sanitizeInput(email.toLowerCase().trim());
    const _validated = SecuritySchemas.email.parse(_sanitized);
    return _validated;
  } catch (error) {
    console.warn('[ERROR] Email validation failed:', error);
    return null;
  }
}

// Función para validar y sanitizar password
export function validateAndSanitizePassword(password: string): string | null {
  try {
    const _sanitized = sanitizeInput(password);
    const _validated = SecuritySchemas.password.parse(_sanitized);
    return _validated;
  } catch (error) {
    console.warn('[ERROR] Password validation failed:', error);
    return null;
  }
}

// Función para detectar patrones maliciosos
export function detectMaliciousPatterns(input: string): boolean {
  const _maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /on\w+\s*=/i,
    /\.\./,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
  ];
  return _maliciousPatterns.some(pattern => pattern.test(input));
}

// Función para rate limiting (implementación básica)
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutos
    private maxRequests: number = 100
  ) {}
  
  isAllowed(identifier: string): boolean {
    const _now = Date.now();
    const _current = this.requests.get(identifier);
    if (!_current || _now > _current.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: _now + this.windowMs });
      return true;
    }
    if (_current.count >= this.maxRequests) {
      return false;
    }
    _current.count++;
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const _current = this.requests.get(identifier);
    if (!_current) return this.maxRequests;
    return Math.max(0, this.maxRequests - _current.count);
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
  
  clear(): void {
    this.requests.clear();
  }
}

// Función para logging de seguridad
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const _logEntry = {
    timestamp: new Date().toISOString(),
    event,
    level,
    ...details,
  };
  const _logMessage = `[SECURITY:${level.toUpperCase()}] ${event}`;
  switch (level) {
    case 'error':
      console.warn(_logMessage, _logEntry);
      break;
    case 'warn':
      console.warn(_logMessage, _logEntry);
      break;
    default:
      console.warn(_logMessage, _logEntry);
  }
}

// Función para validar CORS origin
export function validateCorsOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === '*') return true;
    if (allowedOrigin.startsWith('*.')) {
      const _domain = allowedOrigin.substring(2);
      return origin.endsWith(_domain);
    }
    return origin === allowedOrigin;
  });
}

// Función para generar nonce para CSP
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Función para validar reCAPTCHA (placeholder)
export function validateRecaptcha(_token: string, _secret: string): Promise<boolean> {
  // Implementar validación real de reCAPTCHA
  return Promise.resolve(true);
}

// Función para encriptar datos sensibles
export function encryptSensitiveData(data: string, key: string): string {
  const _iv = crypto.randomBytes(16);
  const _cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), _iv);
  let encrypted = _cipher.update(data, 'utf8', 'hex');
  encrypted += _cipher.final('hex');
  return `${_iv.toString('hex')}:${encrypted}`;
}

// Función para desencriptar datos sensibles
export function decryptSensitiveData(encryptedData: string, key: string): string {
  const [ivHex, encrypted] = encryptedData.split(':');
  const _iv = Buffer.from(ivHex, 'hex');
  const _decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = _decipher.update(encrypted, 'hex', 'utf8');
  decrypted += _decipher.final('utf8');
  return decrypted;
}

// Función para validar UUID
export function isValidUUID(uuid: string): boolean {
  const _uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return _uuidRegex.test(uuid);
}

// Función para generar UUID v4
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Función para validar y sanitizar JSON
export function validateAndSanitizeJSON(jsonString: string): Record<string, unknown> | null {
  try {
    const _parsed = JSON.parse(jsonString);
    
    // Sanitizar valores string en el objeto
    const _sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return sanitizeInput(value);
      }
      if (Array.isArray(value)) {
        return value.map(_sanitizeValue);
      }
      if (value && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[sanitizeInput(key)] = _sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };
    
    return _sanitizeValue(_parsed) as Record<string, unknown>;
  } catch (error) {
    console.warn('[ERROR] JSON validation failed:', error);
    return null;
  }
} 