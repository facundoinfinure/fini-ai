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
   * Make authenticated request to Tienda Nube API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${TIENDA_NUBE_API_BASE}/${this.storeId}${endpoint}`;
    
    try {
      console.warn(`[INFO] TiendaNube API request: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authentication': `bearer ${this.accessToken}`,
          'User-Agent': 'FiniAI/1.0 (WhatsApp Analytics for TiendaNube)',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[ERROR] TiendaNube API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`TiendaNube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.warn(`[DEBUG] TiendaNube API response received for ${endpoint}`);
      return data;
    } catch (error) {
      console.warn(`[ERROR] TiendaNube API request failed:`, error);
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
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/products${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.makeRequest<TiendaNubeProduct[]>(endpoint);
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
              quantity: quantity,
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

  return `https://www.tiendanube.com/apps/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (code: string): Promise<TiendaNubeAuthResponse> => {
  try {
    console.warn("[OAUTH] Exchanging authorization code for token");
    
    const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FiniAI/1.0 (WhatsApp Analytics for TiendaNube)',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OAUTH] Token exchange failed:", response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.warn("[OAUTH] Token exchange successful");
    return data;
  } catch (error) {
    console.error("[OAUTH] Token exchange error:", error);
    throw error;
  }
};

/**
 * Check if Tienda Nube is properly configured
 */
export const isTiendaNubeConfigured = (): boolean => {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}; 