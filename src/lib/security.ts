import crypto from 'crypto';
import { z } from 'zod';

// Schemas de validación para seguridad
export const SecuritySchemas = {
  // Validación de email
  email: z.string().email('Email inválido'),
  
  // Validación de password (mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número)
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  // Validación de token
  token: z.string().min(1, 'Token requerido'),
  
  // Validación de IP
  ip: z.string().ip('IP inválida'),
  
  // Validación de User Agent
  userAgent: z.string().min(1, 'User Agent requerido'),
  
  // Validación de URL
  url: z.string().url('URL inválida'),
  
  // Validación de webhook signature
  webhookSignature: z.object({
    signature: z.string(),
    timestamp: z.string(),
    body: z.string(),
  }),
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
  const passwordHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(passwordHash, 'hex'));
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
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('[ERROR] Webhook signature validation failed:', error);
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
    const sanitized = sanitizeInput(email.toLowerCase().trim());
    const validated = SecuritySchemas.email.parse(sanitized);
    return validated;
  } catch (error) {
    console.error('[ERROR] Email validation failed:', error);
    return null;
  }
}

// Función para validar y sanitizar password
export function validateAndSanitizePassword(password: string): string | null {
  try {
    const sanitized = sanitizeInput(password);
    const validated = SecuritySchemas.password.parse(sanitized);
    return validated;
  } catch (error) {
    console.error('[ERROR] Password validation failed:', error);
    return null;
  }
}

// Función para detectar patrones maliciosos
export function detectMaliciousPatterns(input: string): boolean {
  const maliciousPatterns = [
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
  
  return maliciousPatterns.some(pattern => pattern.test(input));
}

// Función para rate limiting (implementación básica)
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutos
    private maxRequests: number = 100
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const current = this.requests.get(identifier);
    
    if (!current || now > current.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (current.count >= this.maxRequests) {
      return false;
    }
    
    current.count++;
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const current = this.requests.get(identifier);
    if (!current) return this.maxRequests;
    return Math.max(0, this.maxRequests - current.count);
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
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    level,
    ...details,
  };
  
  const logMessage = `[SECURITY:${level.toUpperCase()}] ${event}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage, logEntry);
      break;
    case 'warn':
      console.warn(logMessage, logEntry);
      break;
    default:
      console.log(logMessage, logEntry);
  }
}

// Función para validar CORS origin
export function validateCorsOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === '*') return true;
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.substring(2);
      return origin.endsWith(domain);
    }
    return origin === allowedOrigin;
  });
}

// Función para generar nonce para CSP
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Función para validar reCAPTCHA (placeholder)
export function validateRecaptcha(token: string, secret: string): Promise<boolean> {
  // Implementar validación real de reCAPTCHA
  return Promise.resolve(true);
}

// Función para encriptar datos sensibles
export function encryptSensitiveData(data: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// Función para desencriptar datos sensibles
export function decryptSensitiveData(encryptedData: string, key: string): string {
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Función para validar UUID
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Función para generar UUID v4
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Función para validar y sanitizar JSON
export function validateAndSanitizeJSON(jsonString: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Sanitizar valores string en el objeto
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return sanitizeInput(value);
      }
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      if (value && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[sanitizeInput(key)] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };
    
    return sanitizeValue(parsed) as Record<string, unknown>;
  } catch (error) {
    console.error('[ERROR] JSON validation failed:', error);
    return null;
  }
} 