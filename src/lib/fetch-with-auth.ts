/**
 * 🔐 AUTHENTICATED FETCH WRAPPER
 * ============================
 * 
 * Esta función wrapper asegura que todas las llamadas a la API incluyan
 * las cookies de autenticación necesarias para Supabase SSR.
 * 
 * PROBLEMA RESUELTO: Las llamadas fetch del cliente al servidor en Next.js
 * no incluyen cookies automáticamente, causando errores 401 incluso cuando
 * el usuario está autenticado en el frontend.
 * 
 * USO:
 * - Reemplaza `fetch()` con `fetchWithAuth()` en componentes React
 * - Mantiene la misma API que fetch nativo
 * - Agrega automáticamente `credentials: 'include'`
 */

interface FetchWithAuthOptions extends RequestInit {
  skipAuth?: boolean; // Para endpoints públicos que no requieren auth
}

/**
 * Wrapper de fetch que incluye automáticamente credenciales de autenticación
 */
export async function fetchWithAuth(
  url: string | URL, 
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  // Para endpoints públicos, usar fetch normal
  if (skipAuth) {
    return fetch(url, fetchOptions);
  }
  
  // Para endpoints que requieren auth, incluir credenciales
  const authOptions: RequestInit = {
    ...fetchOptions,
    credentials: 'include', // 🔥 CRITICAL: Include auth cookies
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers, // Permite override de headers
    },
  };
  
  try {
    const response = await fetch(url, authOptions);
    
    // Log de debugging para errores 401
    if (response.status === 401) {
      console.warn('[FETCH-AUTH] 401 Unauthorized:', {
        url: url.toString(),
        method: authOptions.method || 'GET',
        hasCredentials: true,
        timestamp: new Date().toISOString()
      });
    }
    
    return response;
  } catch (error) {
    console.error('[FETCH-AUTH] Network error:', {
      url: url.toString(),
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Wrapper para GET requests autenticados
 */
export async function fetchGetWithAuth(url: string | URL): Promise<Response> {
  return fetchWithAuth(url, { method: 'GET' });
}

/**
 * Wrapper para POST requests autenticados
 */
export async function fetchPostWithAuth(
  url: string | URL, 
  data: any
): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Wrapper para PUT requests autenticados
 */
export async function fetchPutWithAuth(
  url: string | URL, 
  data: any
): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'PUT', 
    body: JSON.stringify(data),
  });
}

/**
 * Wrapper para DELETE requests autenticados
 */
export async function fetchDeleteWithAuth(url: string | URL): Promise<Response> {
  return fetchWithAuth(url, { method: 'DELETE' });
}

/**
 * Tipos para respuestas API comunes
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Helper para parsear respuestas JSON con manejo de errores
 */
export async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 