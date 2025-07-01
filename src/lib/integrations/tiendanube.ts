import type { 
  TiendaNubeStore, 
  TiendaNubeProduct, 
  TiendaNubeOrder, 
  TiendaNubeAuthResponse,
  TiendaNubeCustomer,
  TiendaNubeOrderProduct
} from '@/types/tiendanube';
import { TiendaNubeTokenManager } from './tiendanube-token-manager';

const TIENDA_NUBE_API_BASE = 'https://api.tiendanube.com/v1';
const CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.TIENDANUBE_REDIRECT_URI || "";

/**
 * Tienda Nube API Client
 * Implements all necessary methods for store analytics and data retrieval
 */
export class TiendaNubeAPI {
  private accessToken: string;
  private storeId: string;

  constructor(accessToken: string, storeId: string) {
    this.accessToken = accessToken;
    this.storeId = storeId;
  }

  /**
   * 🔥 FIXED: Improved API request method with better token management and error handling
   */
  async makeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      // 🔥 CRITICAL: Use new token manager for automatic refresh
      const accessToken = await TiendaNubeTokenManager.getValidToken(this.storeId);
      
      if (!accessToken) {
        // 🛡️ NON-BLOCKING: If no token, return empty result instead of throwing
        console.warn(`[TIENDANUBE] No valid token available for store ${this.storeId}, returning empty result`);
        return { data: [], empty: true, reason: 'no_token' } as T;
      }

      const url = `${TIENDA_NUBE_API_BASE}/${this.storeId}/${endpoint}`;
      
      console.log(`[INFO] TiendaNube API request: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authentication': `bearer ${accessToken}`,
          'User-Agent': 'Fini-AI/1.0',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // 🔥 CRITICAL: Handle 401 errors gracefully without throwing
      if (response.status === 401) {
        console.warn(`[WARNING] TiendaNube API 401 for store ${this.storeId} - token may be expired`);
        
        // Log the specific error for debugging
        const errorText = await response.text();
        console.warn(`[ERROR] TiendaNube API error: 401 Unauthorized - ${errorText}`);
        
        // Try token refresh one more time
        console.log(`[INFO] Attempting one-time token refresh for store ${this.storeId}`);
        const freshToken = await TiendaNubeTokenManager.getValidToken(this.storeId);
        
        if (freshToken && freshToken !== accessToken) {
          console.log(`[INFO] Got fresh token, retrying request for store ${this.storeId}`);
          
          // Retry with fresh token
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              'Authentication': `bearer ${freshToken}`,
              'User-Agent': 'Fini-AI/1.0',
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });
          
          if (retryResponse.ok) {
            console.log(`[INFO] ✅ Retry successful for store ${this.storeId}`);
            return retryResponse.json();
          } else {
            console.warn(`[WARNING] Retry also failed for store ${this.storeId}: ${retryResponse.status}`);
          }
        }
        
        // 🛡️ GRACEFUL DEGRADATION: Return empty result instead of throwing
                 return { 
           data: [], 
           empty: true, 
           reason: 'auth_failed',
           httpStatus: 401,
           message: 'Token authentication failed - store may need reconnection'
         } as T;
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ERROR] TiendaNube API request failed: ${response.status} - ${errorText}`);
        
        // For non-auth errors, also return empty result instead of throwing
                 return {
           data: [],
           empty: true,
           reason: 'api_error',
           httpStatus: response.status,
           message: `API error: ${response.status} ${response.statusText}`
         } as T;
      }

      const data = await response.json();
      console.log(`[INFO] ✅ TiendaNube API request successful for store ${this.storeId}`);
      
      return data;

    } catch (error) {
      console.error(`[ERROR] TiendaNube API request failed: ${error}`);
      
      // 🛡️ GRACEFUL DEGRADATION: Return empty result instead of throwing
             return {
         data: [],
         empty: true,
         reason: 'network_error',
         message: error instanceof Error ? error.message : 'Unknown network error'
       } as T;
    }
  }

  // ================================================
  // STORE INFORMATION
  // ================================================

  /**
   * Get store information
   */
  async getStore(): Promise<TiendaNubeStore> {
    return this.makeRequest<TiendaNubeStore>('/store');
  }

  // ================================================
  // PRODUCTS
  // ================================================

  /**
   * Get all products with optional filters
   * 🔧 FIXED: Include draft products by default to show actual catalog
   */
  async getProducts(params?: {
    since_id?: number;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    published?: boolean;
    fields?: string;
    limit?: number;
    page?: number;
  }): Promise<TiendaNubeProduct[]> {
    const searchParams = new URLSearchParams();
    
    // Set default parameters to include ALL products (published + draft)
    const defaultParams = {
      limit: 250, // Higher limit to get more products
      ...params // Allow override of defaults
    };
    
    // If published is not explicitly set, try to get ALL products
    if (defaultParams.published === undefined) {
      delete defaultParams.published; // Don't filter by published status
    }
    
    Object.entries(defaultParams).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/products${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    console.warn(`[DEBUG] Getting products with endpoint: ${endpoint}`);
    
    const products = await this.makeRequest<TiendaNubeProduct[]>(endpoint);
    console.warn(`[DEBUG] Retrieved ${products.length} products from API`);
    
    return products;
  }

  /**
   * Get specific product by ID
   */
  async getProduct(productId: number): Promise<TiendaNubeProduct> {
    return this.makeRequest<TiendaNubeProduct>(`/products/${productId}`);
  }

  // ================================================
  // ORDERS
  // ================================================

  /**
   * Get orders with optional filters
   */
  async getOrders(params?: {
    since_id?: number;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    status?: string;
    payment_status?: string;
    shipping_status?: string;
    fields?: string;
    limit?: number;
    page?: number;
  }): Promise<TiendaNubeOrder[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/orders${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.makeRequest<TiendaNubeOrder[]>(endpoint);
  }

  /**
   * Get specific order by ID
   */
  async getOrder(orderId: number): Promise<TiendaNubeOrder> {
    return this.makeRequest<TiendaNubeOrder>(`/orders/${orderId}`);
  }

  // ================================================
  // CUSTOMERS
  // ================================================

  /**
   * Get customers
   */
  async getCustomers(params?: {
    since_id?: number;
    created_at_min?: string;
    created_at_max?: string;
    limit?: number;
    page?: number;
  }): Promise<TiendaNubeCustomer[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/customers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.makeRequest<TiendaNubeCustomer[]>(endpoint);
  }

  // ================================================
  // ANALYTICS METHODS
  // ================================================

  /**
   * Get top selling products for a specific period
   */
  async getTopProducts(period: 'day' | 'week' | 'month' = 'week', limit: number = 5): Promise<Array<{
    product: TiendaNubeOrderProduct;
    quantity: number;
    revenue: number;
  }>> {
    try {
      console.warn(`[AGENT:analytics] Getting top products for period: ${period}, limit: ${limit}`);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
      }

      const orders = await this.getOrders({
        created_at_min: startDate.toISOString(),
        created_at_max: endDate.toISOString(),
        status: 'paid',
        limit: 100
      });

      const productStats = new Map<number, { product: TiendaNubeOrderProduct; quantity: number; revenue: number }>();

      orders.forEach(order => {
        order.products?.forEach(orderProduct => {
          const productId = orderProduct.product_id;
          const existing = productStats.get(productId);
          const price = typeof orderProduct.price === 'string' ? parseFloat(orderProduct.price) : orderProduct.price;
          const quantity = orderProduct.quantity;
          
          if (existing) {
            existing.quantity += quantity;
            existing.revenue += price * quantity;
          } else {
            productStats.set(productId, {
              product: orderProduct,
              quantity,
              revenue: price * quantity
            });
          }
        });
      });

      return Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error) {
      console.error(`[AGENT:analytics] Error getting top products:`, error);
      throw error;
    }
  }

  /**
   * Get revenue analytics for a specific period
   */
  async getRevenue(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    period: string;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    orders: TiendaNubeOrder[];
  }> {
    try {
      console.warn(`[AGENT:analytics] Getting revenue for period: ${period}`);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
      }

      const orders = await this.getOrders({
        created_at_min: startDate.toISOString(),
        created_at_max: endDate.toISOString(),
        status: 'paid',
        limit: 100
      });

      const totalRevenue = orders.reduce((sum, order) => {
        const orderTotal = typeof order.total === 'string' ? parseFloat(order.total) : (order.total || 0);
        return sum + orderTotal;
      }, 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        period,
        totalRevenue,
        totalOrders,
        averageOrderValue,
        orders
      };
    } catch (error) {
      console.error(`[AGENT:analytics] Error getting revenue:`, error);
      throw error;
    }
  }

  /**
   * Get pending orders
   */
  async getPendingOrders(): Promise<TiendaNubeOrder[]> {
    try {
      console.warn(`[AGENT:analytics] Getting pending orders`);
      
      return await this.getOrders({
        status: 'pending',
        limit: 50
      });
    } catch (error) {
      console.error(`[AGENT:analytics] Error getting pending orders:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive store analytics
   */
  async getStoreAnalytics(): Promise<{
    revenue: {
      today: number;
      week: number;
      month: number;
    };
    orders: {
      today: number;
      week: number;
      month: number;
      pending: number;
    };
    topProducts: Array<{
      product: TiendaNubeOrderProduct;
      quantity: number;
      revenue: number;
    }>;
    averageOrderValue: number;
  }> {
    try {
      console.warn(`[AGENT:analytics] Getting comprehensive store analytics`);
      
      const [todayRevenue, weekRevenue, monthRevenue, pendingOrders, topProducts] = await Promise.all([
        this.getRevenue('day'),
        this.getRevenue('week'),
        this.getRevenue('month'),
        this.getPendingOrders(),
        this.getTopProducts('week', 5)
      ]);

      return {
        revenue: {
          today: todayRevenue.totalRevenue,
          week: weekRevenue.totalRevenue,
          month: monthRevenue.totalRevenue,
        },
        orders: {
          today: todayRevenue.totalOrders,
          week: weekRevenue.totalOrders,
          month: monthRevenue.totalOrders,
          pending: pendingOrders.length,
        },
        topProducts,
        averageOrderValue: weekRevenue.averageOrderValue,
      };
    } catch (error) {
      console.error(`[AGENT:analytics] Error getting store analytics:`, error);
      throw error;
    }
  }
}

// ================================================
// OAUTH FUNCTIONS
// ================================================

/**
 * Generate Tienda Nube OAuth URL
 */
export const getTiendaNubeAuthUrl = (state?: string): string => {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error('TiendaNube CLIENT_ID or REDIRECT_URI not configured');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'read_products read_orders read_customers',
    response_type: 'code',
  });

  if (state) {
    params.append('state', state);
  }

  return `https://www.tiendanube.com/apps/${CLIENT_ID}/authorize/prompt?${params.toString()}`;
};

/**
 * Exchange authorization code for an access token
 */
export const exchangeCodeForToken = async (code: string): Promise<TiendaNubeAuthResponse> => {
  try {
    console.log('[INFO] Exchanging Tienda Nube authorization code for token');
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('[ERROR] Tienda Nube Client ID or Secret is not configured');
      console.error('[DEBUG] CLIENT_ID exists:', !!CLIENT_ID);
      console.error('[DEBUG] CLIENT_SECRET exists:', !!CLIENT_SECRET);
      throw new Error('Server configuration error: Tienda Nube credentials are missing. Please configure TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET in your environment variables.');
    }

    const requestBody = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
    };

    console.log('[DEBUG] Token exchange request body:', {
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code ? 'provided' : 'missing',
      client_secret: CLIENT_SECRET ? 'provided' : 'missing'
    });

    const response = await fetch(`https://www.tiendanube.com/apps/authorize/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FiniAI/1.0 (WhatsApp Analytics for TiendaNube)',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('[DEBUG] Token exchange response status:', response.status);
    console.log('[DEBUG] Token exchange response:', responseText);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(responseText);
        console.error('[ERROR] Failed to exchange code for token:', errorData);
        
        // Provide more specific error messages based on common issues
        if (response.status === 401) {
          errorMessage = 'Invalid credentials. Please check your TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET.';
        } else if (response.status === 400) {
          if (errorData.error === 'invalid_grant') {
            errorMessage = 'Authorization code is invalid or expired. Please try the connection process again.';
          } else if (errorData.error === 'invalid_client') {
            errorMessage = 'Invalid client credentials. Please verify your TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET.';
          } else {
            errorMessage = errorData.error_description || errorData.error || 'Bad request to Tienda Nube API.';
          }
        }
        
        throw new Error(errorMessage);
      } catch (parseError) {
        // If response is not JSON, use the raw response
        console.error('[ERROR] Failed to parse error response:', parseError);
        throw new Error(`Failed to get access token from Tienda Nube: ${errorMessage}`);
      }
    }

    let authData: TiendaNubeAuthResponse;
    try {
      authData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[ERROR] Failed to parse success response:', parseError);
      throw new Error('Invalid response format from Tienda Nube API');
    }

    if (!authData.access_token || !authData.user_id) {
      console.error('[ERROR] Invalid response structure:', authData);
      throw new Error('Invalid response from Tienda Nube: missing access_token or user_id');
    }

    console.log('[INFO] Successfully exchanged code for access token. User ID:', authData.user_id);
    return authData;

  } catch (error) {
    console.error('[ERROR] Exception during token exchange:', error);
    throw error;
  }
};

/**
 * Check if Tienda Nube is properly configured
 */
export const isTiendaNubeConfigured = (): boolean => {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}; 