import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configuración de seguridad
const SECURITY_CONFIG = {
  // Headers de seguridad adicionales
  securityHeaders: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
  
  // Rate limiting básico (en producción usar Redis)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por ventana
  },
  
  // Rutas que requieren autenticación
  protectedRoutes: [
    '/dashboard',
    '/api/dashboard',
    '/api/user',
    '/api/tiendanube',
    '/api/whatsapp',
  ],
  
  // Rutas públicas
  publicRoutes: [
    '/',
    '/auth',
    '/api/auth',
    '/api/webhooks',
    '/api/health',
  ],
  
  // Rutas de API que no requieren autenticación
  publicApiRoutes: [
    '/api/auth/callback',
    '/api/webhooks/tiendanube',
    '/api/webhooks/whatsapp',
  ],
};

// Función para verificar si una ruta está protegida
function isProtectedRoute(pathname: string): boolean {
  return SECURITY_CONFIG.protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
}

// Función para verificar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  return SECURITY_CONFIG.publicRoutes.some(route => 
    pathname.startsWith(route)
  ) || SECURITY_CONFIG.publicApiRoutes.some(route => 
    pathname.startsWith(route)
  );
}

// Función para obtener el token de sesión
function getSessionToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // También verificar cookies de sesión
  const sessionCookie = request.cookies.get('next-auth.session-token')?.value ||
                       request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  return sessionCookie || null;
}

// Función para validar token (implementar según tu sistema de auth)
async function validateToken(token: string): Promise<boolean> {
  try {
    // Aquí implementarías la validación real del token
    // Por ahora, asumimos que cualquier token no vacío es válido
    return token.length > 0;
  } catch (error) {
    console.error('[ERROR] Token validation failed:', error);
    return false;
  }
}

// Función para aplicar headers de seguridad
function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_CONFIG.securityHeaders).forEach(([key, value]: [string, string]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Función para rate limiting básico (en producción usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = SECURITY_CONFIG.rateLimit.windowMs;
  const max = SECURITY_CONFIG.rateLimit.max;
  
  const current = requestCounts.get(ip);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= max) {
    return false;
  }
  
  current.count++;
  return true;
}

// Función para logging de seguridad
function logSecurityEvent(event: string, request: NextRequest, details?: Record<string, unknown>) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const pathname = request.nextUrl.pathname;
  
  console.log(`[SECURITY] ${event}`, {
    ip,
    userAgent,
    pathname,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // 1. Rate Limiting
  if (!checkRateLimit(ip)) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', request, { ip });
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      { 
        status: 429, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
  
  // 2. Verificar rutas protegidas
  if (isProtectedRoute(pathname)) {
    const token = getSessionToken(request);
    
    if (!token) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', request, { pathname });
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    
    const isValidToken = await validateToken(token);
    if (!isValidToken) {
      logSecurityEvent('INVALID_TOKEN', request, { pathname });
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }
  
  // 3. Verificar rutas de API específicas
  if (pathname.startsWith('/api/') && !isPublicRoute(pathname)) {
    const token = getSessionToken(request);
    
    if (!token) {
      logSecurityEvent('API_UNAUTHORIZED', request, { pathname });
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const isValidToken = await validateToken(token);
    if (!isValidToken) {
      logSecurityEvent('API_INVALID_TOKEN', request, { pathname });
      return new NextResponse(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }
  
  // 4. Detectar patrones sospechosos
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /<script/i, // XSS attempts
    /javascript:/i, // JavaScript protocol
    /data:text\/html/i, // Data URLs
    /vbscript:/i, // VBScript
    /on\w+\s*=/i, // Event handlers
  ];
  
  const url = request.nextUrl.toString();
  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(url));
  
  if (hasSuspiciousPattern) {
    logSecurityEvent('SUSPICIOUS_PATTERN_DETECTED', request, { url });
    return new NextResponse(
      JSON.stringify({ error: 'Invalid request' }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
  
  // 5. Continuar con la request normal
  const response = NextResponse.next();
  
  // 6. Aplicar headers de seguridad
  return applySecurityHeaders(response);
}

// Configurar en qué rutas ejecutar el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 