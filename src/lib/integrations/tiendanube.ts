import type { 
  TiendaNubeStore, 
  TiendaNubeProduct, 
  TiendaNubeOrder, 
  TiendaNubeAuthResponse,
  TiendaNubeCustomer,
  TiendaNubeOrderProduct
} from '@/types/tiendanube';

const TIENDA_NUBE_API_BASE = 'https://api.tiendanube.com/v1';
const CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID!;
const CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.TIENDANUBE_REDIRECT_URI!;

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
      console.log(`[INFO] TiendaNube API request: ${url}`);
      
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
        console.error(`[ERROR] TiendaNube API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`TiendaNube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[DEBUG] TiendaNube API response received for ${endpoint}`);
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
      console.log(`[AGENT:analytics] Getting top products for period: ${period}, limit: ${limit}`);
      
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
        status: 'closed',
        payment_status: 'paid',
        limit: 250,
      });

      console.log(`[DEBUG] Found ${orders.length} orders for period`);

      // Process orders to get top products
      const productSales = new Map<number, { product: TiendaNubeOrderProduct; quantity: number; revenue: number }>();
      
      orders.forEach(order => {
        order.products.forEach(product => {
          const existing = productSales.get(product.product_id);
          const revenue = parseFloat(product.price) * product.quantity;
          
          if (existing) {
            existing.quantity += product.quantity;
            existing.revenue += revenue;
          } else {
            productSales.set(product.product_id, {
              product: product,
              quantity: product.quantity,
              revenue: revenue,
            });
          }
        });
      });

      const result = Array.from(productSales.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);

      console.log(`[AGENT:analytics] Top products analysis complete. Found ${result.length} products`);
      return result;
    } catch (error) {
      console.error('[ERROR] Failed to get top products:', error);
      throw error;
    }
  }

  /**
   * Get revenue data for a specific period
   */
  async getRevenue(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    period: string;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    orders: TiendaNubeOrder[];
  }> {
    try {
      console.log(`[AGENT:analytics] Getting revenue for period: ${period}`);
      
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
        status: 'closed',
        payment_status: 'paid',
        limit: 250,
      });

      const totalRevenue = orders.reduce((sum, order) => {
        return sum + parseFloat(order.total);
      }, 0);

      const result = {
        period,
        totalRevenue,
        totalOrders: orders.length,
        averageOrderValue: totalRevenue / (orders.length || 1),
        orders: orders.slice(0, 10), // Return latest 10 orders
      };

      console.log(`[AGENT:analytics] Revenue analysis complete. Total: $${totalRevenue}, Orders: ${orders.length}`);
      return result;
    } catch (error) {
      console.error('[ERROR] Failed to get revenue:', error);
      throw error;
    }
  }

  /**
   * Get pending orders
   */
  async getPendingOrders(): Promise<TiendaNubeOrder[]> {
    try {
      console.log(`[AGENT:analytics] Getting pending orders`);
      
      const orders = await this.getOrders({
        status: 'open',
        limit: 50,
      });

      console.log(`[AGENT:analytics] Found ${orders.length} pending orders`);
      return orders;
    } catch (error) {
      console.error('[ERROR] Failed to get pending orders:', error);
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
      console.log(`[AGENT:analytics] Getting comprehensive store analytics`);
      
      const [
        revenueToday,
        revenueWeek,
        revenueMonth,
        topProducts,
        pendingOrders
      ] = await Promise.all([
        this.getRevenue('day'),
        this.getRevenue('week'),
        this.getRevenue('month'),
        this.getTopProducts('week', 5),
        this.getPendingOrders(),
      ]);

      const result = {
        revenue: {
          today: revenueToday.totalRevenue,
          week: revenueWeek.totalRevenue,
          month: revenueMonth.totalRevenue,
        },
        orders: {
          today: revenueToday.totalOrders,
          week: revenueWeek.totalOrders,
          month: revenueMonth.totalOrders,
          pending: pendingOrders.length,
        },
        topProducts,
        averageOrderValue: revenueWeek.averageOrderValue,
      };

      console.log(`[AGENT:analytics] Comprehensive analytics complete`);
      return result;
    } catch (error) {
      console.error('[ERROR] Failed to get store analytics:', error);
      throw error;
    }
  }
}

// ================================================
// OAUTH FLOW UTILITIES
// ================================================

/**
 * Generate Tienda Nube OAuth authorization URL
 */
export const getTiendaNubeAuthUrl = (state?: string): string => {
  if (!CLIENT_ID || !REDIRECT_URI) {
    console.warn('[WARN] TiendaNube CLIENT_ID or REDIRECT_URI not configured');
    return '#';
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'read_products read_orders read_customers read_shipping',
    ...(state && { state }),
  });

  return `https://www.tiendanube.com/apps/${CLIENT_ID}/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (code: string): Promise<TiendaNubeAuthResponse> => {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('TiendaNube CLIENT_ID, CLIENT_SECRET or REDIRECT_URI not configured');
  }

  try {
    console.log('[INFO] Exchanging authorization code for access token');
    
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
        code,
        redirect_uri: REDIRECT_URI, // Este es el campo que faltaba!
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] Failed to exchange code for token:', response.status, errorText);
      throw new Error(`Failed to exchange code for token: ${response.status}`);
    }

    const tokenData = await response.json();
    console.log('[INFO] Successfully obtained access token');
    return tokenData;
  } catch (error) {
    console.error('[ERROR] Token exchange failed:', error);
    throw error;
  }
};

/**
 * Validate if TiendaNube API is properly configured
 */
export const isTiendaNubeConfigured = (): boolean => {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}; 