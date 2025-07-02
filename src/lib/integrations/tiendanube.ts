import type { 
  TiendaNubeStore, 
  TiendaNubeProduct, 
  TiendaNubeOrder, 
  TiendaNubeAuthResponse,
  TiendaNubeCustomer,
  TiendaNubeOrderProduct
} from '@/types/tiendanube';

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
   * Make API request to TiendaNube
   * 🔥 FIXED: Simplified to avoid circular dependency issues
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      console.warn(`[TIENDANUBE] No access token available for store ${this.storeId}`);
      throw new Error('No access token available');
    }

    const url = `${TIENDA_NUBE_API_BASE}/${this.storeId}${endpoint}`;
    
    const defaultHeaders = {
      'Authentication': `bearer ${this.accessToken}`,
      'User-Agent': 'Fini-AI/1.0',
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    console.log(`[DEBUG] TiendaNube API request: ${config.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          console.warn(`[TIENDANUBE] Authentication failed for store ${this.storeId}`);
          throw new Error('Authentication failed - token may be invalid');
        }
        if (response.status === 404) {
          console.warn(`[TIENDANUBE] Resource not found: ${endpoint}`);
          throw new Error('Resource not found');
        }
        if (response.status === 429) {
          console.warn(`[TIENDANUBE] Rate limit exceeded for store ${this.storeId}`);
          throw new Error('Rate limit exceeded');
        }
        
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`[TIENDANUBE] API Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[DEBUG] TiendaNube API response: ${JSON.stringify(data).substring(0, 200)}...`);
      
      return data;
    } catch (error) {
      console.error(`[ERROR] TiendaNube API request failed:`, error);
      throw error;
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

      // 🔥 FIX: Ensure orders is always an array
      const validOrders = Array.isArray(orders) ? orders : [];
      
      if (validOrders.length === 0) {
        console.warn(`[AGENT:analytics] No orders found for top products analysis`);
        return [];
      }

      const productStats = new Map<number, { product: TiendaNubeOrderProduct; quantity: number; revenue: number }>();

      validOrders.forEach(order => {
        // 🔥 FIX: Ensure products is always an array
        const products = Array.isArray(order.products) ? order.products : [];
        
        products.forEach(orderProduct => {
          const productId = orderProduct.product_id;
          const existing = productStats.get(productId);
          const price = typeof orderProduct.price === 'string' ? parseFloat(orderProduct.price) : (orderProduct.price || 0);
          const quantity = orderProduct.quantity || 0;
          
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
      // 🔥 FIX: Return empty array instead of throwing
      return [];
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

      // 🔥 FIX: Ensure orders is always an array
      const validOrders = Array.isArray(orders) ? orders : [];
      
      if (validOrders.length === 0) {
        console.warn(`[AGENT:analytics] No orders found for period: ${period}`);
        return {
          period,
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          orders: []
        };
      }

      const totalRevenue = validOrders.reduce((sum, order) => {
        const orderTotal = typeof order.total === 'string' ? parseFloat(order.total) : (order.total || 0);
        return sum + orderTotal;
      }, 0);
      const totalOrders = validOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        period,
        totalRevenue,
        totalOrders,
        averageOrderValue,
        orders: validOrders
      };
    } catch (error) {
      console.error(`[AGENT:analytics] Error getting revenue:`, error);
      // 🔥 FIX: Return safe fallback instead of throwing
      return {
        period,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        orders: []
      };
    }
  }

  /**
   * Get pending orders count
   */
  async getPendingOrders(): Promise<TiendaNubeOrder[]> {
    try {
      console.warn(`[AGENT:analytics] Getting pending orders`);
      
      const orders = await this.getOrders({
        status: 'pending',
        limit: 50
      });

      // 🔥 FIX: Ensure orders is always an array
      const validOrders = Array.isArray(orders) ? orders : [];
      return validOrders;
    } catch (error) {
      console.error(`[AGENT:analytics] Error getting pending orders:`, error);
      // 🔥 FIX: Return empty array instead of throwing
      return [];
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
          pending: Array.isArray(pendingOrders) ? pendingOrders.length : 0,
        },
        topProducts: Array.isArray(topProducts) ? topProducts : [],
        averageOrderValue: weekRevenue.averageOrderValue,
      };
    } catch (error) {
      console.error(`[AGENT:analytics] Error getting store analytics:`, error);
      // 🔥 FIX: Return safe fallback instead of throwing
      return {
        revenue: { today: 0, week: 0, month: 0 },
        orders: { today: 0, week: 0, month: 0, pending: 0 },
        topProducts: [],
        averageOrderValue: 0,
      };
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