import OpenAI from 'openai';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import type { TiendaNubeStore, TiendaNubeProduct } from '@/types/tiendanube';

/**
 * 🛡️ Safe description utility
 * Converts any description value to a safe string, handling objects, undefined, null, etc.
 */
function safeDescription(desc: any, fallback = 'Tienda online'): string {
  if (!desc) return fallback;
  
  if (typeof desc === 'string') {
    return desc.trim() || fallback;
  }
  
  if (typeof desc === 'object') {
    // Try to extract a string from the object
    if (desc.es) return String(desc.es).trim() || fallback;
    if (desc.en) return String(desc.en).trim() || fallback;
    if (desc.short) return String(desc.short).trim() || fallback;
    if (desc.long) return String(desc.long).trim() || fallback;
    if (desc.description) return String(desc.description).trim() || fallback;
    if (desc.text) return String(desc.text).trim() || fallback;
    
    // If object has a single property, try to use its value
    const keys = Object.keys(desc);
    if (keys.length === 1 && typeof desc[keys[0]] === 'string') {
      return String(desc[keys[0]]).trim() || fallback;
    }
    
    // If no extractable string found, use fallback
    return fallback;
  }
  
  // Convert any other type to string safely
  return String(desc).trim() || fallback;
}

/**
 * 🏪 Interfaces for Store Analysis
 */
export interface BusinessProfile {
  // Información básica del negocio
  businessName: string;
  category: string;
  description: string;
  
  // Audiencia y mercado
  targetAudience: string;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  
  // Propuesta de valor
  valueProposition: string;
  keyFeatures: string[];
  
  // Análisis automático
  productAnalysis: {
    totalProducts: number;
    topCategories: string[];
    averagePrice: number;
    hasVariants: boolean;
    brandCount: number;
  };
  
  // Competidores
  competitors?: Array<{
    name?: string;
    website?: string;
    instagram?: string;
  }>;
  
  // Metadata
  generatedBy: 'ai' | 'user' | 'hybrid';
  confidence: number;
  analysisDate: string;
}

export interface StoreAnalysisResult {
  profile: BusinessProfile;
  success: boolean;
  error?: string;
  debugInfo?: {
    productsAnalyzed: number;
    categoriesFound: string[];
    aiUsed: boolean;
    processingTime: number;
  };
}

/**
 * 📊 Interface for order analysis results
 */
export interface OrderAnalysis {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  trend: 'growing' | 'declining' | 'neutral';
  insights: string[];
}

/**
 * 👥 Interface for customer analysis results
 */
export interface CustomerAnalysis {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  insights: string[];
}

/**
 * 🤖 Store Analysis Service
 * Analiza automáticamente una tienda de Tienda Nube y genera perfil de negocio con AI
 */
export class StoreAnalysisService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * 🎯 Análisis completo de tienda con AI
   */
  async analyzeStore(accessToken: string, storeId: string): Promise<StoreAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[STORE-ANALYSIS] Starting analysis for store: ${storeId}`);
      
      // 🔥 FIX: Get valid token AND platform_store_id using Token Manager to fix ID mismatch bug
      let validToken: string | null = null;
      let platformStoreId: string | null = null;
      
      try {
        const { UniversalTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
                  const storeData = await UniversalTokenManager.getValidStoreData(storeId);
        
        if (storeData) {
          validToken = storeData.access_token;
          platformStoreId = storeData.platform_store_id;
          console.log(`[STORE-ANALYSIS] Using validated token for store: ${storeId} (platform_store_id: ${platformStoreId})`);
        } else {
          console.warn(`[STORE-ANALYSIS] No valid token for store ${storeId}, using provided token as fallback`);
          validToken = accessToken; // Fallback to provided token
          
          // Need to get platform_store_id from database for fallback
          try {
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = createClient();
            
            const { data: store, error } = await supabase
              .from('stores')
              .select('platform_store_id')
              .eq('id', storeId)
              .single();

            if (!error && store?.platform_store_id) {
              platformStoreId = store.platform_store_id;
              console.log(`[STORE-ANALYSIS] Retrieved platform_store_id for fallback: ${platformStoreId}`);
            }
          } catch (dbError) {
            console.warn(`[STORE-ANALYSIS] Failed to get platform_store_id for fallback:`, dbError);
          }
        }
      } catch (tokenError) {
        console.warn(`[STORE-ANALYSIS] Token validation failed, using provided token:`, tokenError);
        validToken = accessToken; // Fallback to provided token
      }
      
      if (!validToken || !platformStoreId) {
        throw new Error(`Missing credentials for store analysis: ${storeId}`);
      }
      
      // 1. Extraer datos de Tienda Nube - FIXED: Use platform_store_id instead of storeId
      const tiendaNubeAPI = new TiendaNubeAPI(validToken, platformStoreId);
      const [storeInfo, products] = await Promise.all([
        tiendaNubeAPI.getStore(),
        tiendaNubeAPI.getProducts({ limit: 100 }) // Suficiente para análisis
      ]);

      console.log(`[STORE-ANALYSIS] Extracted ${products.length} products from store`);

      // 2. Analizar datos extraídos
      const productAnalysis = this.analyzeProducts(products);
      
      // 3. Generar perfil con AI (con fallback)
      let profile: BusinessProfile;
      let aiUsed = false;
      
      if (this.openai) {
        try {
          profile = await this.generateAIProfile(storeInfo, products, productAnalysis);
          aiUsed = true;
          console.log(`[STORE-ANALYSIS] AI profile generated successfully`);
        } catch (error) {
          console.warn(`[STORE-ANALYSIS] AI failed, using fallback:`, error);
          profile = this.generateFallbackProfile(storeInfo, products, productAnalysis);
        }
      } else {
        console.log(`[STORE-ANALYSIS] OpenAI not configured, using rule-based analysis`);
        profile = this.generateFallbackProfile(storeInfo, products, productAnalysis);
      }

      const processingTime = Date.now() - startTime;
      
      return {
        profile,
        success: true,
        debugInfo: {
          productsAnalyzed: products.length,
          categoriesFound: productAnalysis.topCategories,
          aiUsed,
          processingTime
        }
      };

    } catch (error) {
      console.error('[STORE-ANALYSIS] Error analyzing store:', error);
      return {
        profile: this.getEmptyProfile(),
        success: false,
        error: error instanceof Error ? error.message : 'Error analyzing store'
      };
    }
  }

  /**
   * 📊 Analiza productos para extraer insights
   */
  private analyzeProducts(products: TiendaNubeProduct[]) {
    const categories = new Map<string, number>();
    const brands = new Set<string>();
    let totalPrice = 0;
    let priceCount = 0;
    let minPrice = Infinity;
    let maxPrice = 0;
    let hasVariants = false;

    products.forEach(product => {
      // Contar categorías
      product.categories?.forEach(cat => {
        categories.set(cat.name, (categories.get(cat.name) || 0) + 1);
      });

      // Marcas
      if (product.brand?.trim()) {
        brands.add(product.brand.trim());
      }

      // Precios (de variantes)
      if (product.variants?.length > 0) {
        hasVariants = true;
        product.variants.forEach(variant => {
          const price = parseFloat(variant.price);
          if (!isNaN(price) && price > 0) {
            totalPrice += price;
            priceCount++;
            minPrice = Math.min(minPrice, price);
            maxPrice = Math.max(maxPrice, price);
          }
        });
      }
    });

    // Top categorías
    const topCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      totalProducts: products.length,
      topCategories,
      averagePrice: priceCount > 0 ? totalPrice / priceCount : 0,
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice,
      hasVariants,
      brandCount: brands.size,
      brands: Array.from(brands)
    };
  }

  /**
   * 🤖 Genera perfil usando OpenAI
   */
  private async generateAIProfile(
    store: TiendaNubeStore, 
    products: TiendaNubeProduct[], 
    analysis: any
  ): Promise<BusinessProfile> {
    
    if (!this.openai) {
      throw new Error('OpenAI not available');
    }

    // Preparar contexto para AI
    const context = this.prepareStoreContext(store, products, analysis);
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Eres un experto analista de e-commerce. Analiza la tienda y responde en JSON:
{
  "category": "categoria principal",
  "description": "descripción en 1-2 oraciones",
  "targetAudience": "audiencia específica",
  "valueProposition": "propuesta de valor",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "marketingFocus": ["focus1", "focus2", "focus3"],
  "competitiveAdvantages": ["advantage1", "advantage2"],
  "growthOpportunities": ["opportunity1", "opportunity2"],
  "audienceInsights": ["insight1", "insight2"]
}`
        },
        {
          role: 'user',
          content: context
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('Empty AI response');
    }

    // Parse JSON response
    const aiData = JSON.parse(aiResponse);
    
    // Construir perfil final
    return {
      businessName: store.name,
      category: aiData.category || 'E-commerce General',
      description: safeDescription(aiData.description) || safeDescription(store.description, 'Tienda online especializada en e-commerce'),
      targetAudience: aiData.targetAudience || 'Público general',
      priceRange: {
        min: analysis.minPrice,
        max: analysis.maxPrice,
        currency: store.currency || 'ARS'
      },
      valueProposition: aiData.valueProposition || 'Productos de calidad',
      keyFeatures: aiData.keyFeatures || [],
      productAnalysis: {
        totalProducts: analysis.totalProducts,
        topCategories: analysis.topCategories,
        averagePrice: analysis.averagePrice,
        hasVariants: analysis.hasVariants,
        brandCount: analysis.brandCount
      },
      competitors: [],
      generatedBy: 'ai',
      confidence: 0.9,
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * 🔄 Genera perfil fallback sin AI
   */
  private generateFallbackProfile(
    store: TiendaNubeStore, 
    products: TiendaNubeProduct[], 
    analysis: any
  ): BusinessProfile {
    
    // Inferir categoría principal
    const mainCategory = this.inferCategory(analysis.topCategories);
    
    // Inferir audiencia
    const audience = this.inferAudience(mainCategory);
    
    // No longer generating AI insights - focusing on competitors

    return {
      businessName: store.name,
      category: mainCategory,
      description: safeDescription(store.description, `Tienda online especializada en ${mainCategory.toLowerCase()}`),
      targetAudience: audience,
      priceRange: {
        min: analysis.minPrice,
        max: analysis.maxPrice,
        currency: store.currency || 'ARS'
      },
      valueProposition: `Productos de ${mainCategory.toLowerCase()} de calidad`,
      keyFeatures: this.generateBasicFeatures(analysis),
      productAnalysis: {
        totalProducts: analysis.totalProducts,
        topCategories: analysis.topCategories,
        averagePrice: analysis.averagePrice,
        hasVariants: analysis.hasVariants,
        brandCount: analysis.brandCount
      },
      competitors: [],
      generatedBy: 'user',
      confidence: 0.7,
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * 📝 Prepara contexto para OpenAI
   */
  private prepareStoreContext(store: TiendaNubeStore, products: TiendaNubeProduct[], analysis: any): string {
    // Productos sample para contexto
    const sampleProducts = products.slice(0, 10).map(p => ({
      name: p.name,
      description: p.description?.substring(0, 100),
      brand: p.brand,
      categories: p.categories?.map(c => c.name),
      price: p.variants?.[0]?.price
    }));

    return `TIENDA: ${store.name}
DESCRIPCIÓN: ${safeDescription(store.description, 'No disponible')}
PRODUCTOS: ${analysis.totalProducts}
CATEGORÍAS: ${analysis.topCategories.join(', ')}
PRECIOS: ${analysis.minPrice} - ${analysis.maxPrice} ${store.currency}
PROMEDIO: ${analysis.averagePrice.toFixed(2)} ${store.currency}
MARCAS: ${analysis.brandCount}

PRODUCTOS EJEMPLO:
${sampleProducts.map(p => `- ${p.name} (${p.price} ${store.currency})`).join('\n')}`;
  }

  /**
   * 🔍 Métodos auxiliares para fallback
   */
  private inferCategory(categories: string[]): string {
    if (categories.length === 0) return 'E-commerce General';
    
    const categoryMap: Record<string, string> = {
      'ropa': 'Moda y Vestimenta',
      'calzado': 'Moda y Vestimenta', 
      'accesorios': 'Moda y Accesorios',
      'hogar': 'Hogar y Decoración',
      'tecnología': 'Tecnología',
      'belleza': 'Belleza y Cuidado Personal',
      'deportes': 'Deportes y Fitness',
      'infantil': 'Productos Infantiles',
      'mascotas': 'Mascotas',
      'alimentación': 'Alimentación'
    };

    for (const [key, value] of Object.entries(categoryMap)) {
      if (categories.some(cat => cat.toLowerCase().includes(key))) {
        return value;
      }
    }

    return categories[0] || 'E-commerce General';
  }

  private inferAudience(category: string): string {
    const audienceMap: Record<string, string> = {
      'Moda y Vestimenta': 'Jóvenes y adultos interesados en moda',
      'Hogar y Decoración': 'Propietarios que buscan decorar su hogar',
      'Tecnología': 'Entusiastas de la tecnología',
      'Belleza y Cuidado Personal': 'Personas que cuidan su apariencia',
      'Deportes y Fitness': 'Personas activas y deportistas',
      'Productos Infantiles': 'Padres y familiares de niños',
      'Mascotas': 'Dueños de mascotas',
      'Alimentación': 'Personas que buscan productos alimenticios',
    };

    return audienceMap[category] || 'Público general interesado en compras online';
  }

  private generateBasicFeatures(analysis: any): string[] {
    const features = [];
    
    if (analysis.totalProducts > 50) features.push('Amplio catálogo de productos');
    if (analysis.brandCount > 5) features.push('Múltiples marcas disponibles');
    if (analysis.hasVariants) features.push('Variedad de opciones por producto');
    if (analysis.averagePrice < 5000) features.push('Precios accesibles');
    
    return features.length > 0 ? features : ['Productos de calidad', 'Fácil navegación'];
  }

  private getEmptyProfile(): BusinessProfile {
    return {
      businessName: 'Mi Tienda',
      category: 'E-commerce General',
      description: 'Tienda online',
      targetAudience: 'Público general',
      priceRange: { min: 0, max: 0, currency: 'ARS' },
      valueProposition: 'Productos de calidad',
      keyFeatures: [],
      productAnalysis: {
        totalProducts: 0,
        topCategories: [],
        averagePrice: 0,
        hasVariants: false,
        brandCount: 0
      },
      competitors: [],
      generatedBy: 'user',
      confidence: 0,
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * 📊 Análisis de órdenes con manejo graceful de endpoints vacíos
   */
  private async analyzeOrders(api: TiendaNubeAPI): Promise<OrderAnalysis> {
    try {
      console.log('[STORE-ANALYSIS] 📊 Analyzing orders...');
      
      // Fetch recent orders (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const orders = await api.getOrders({ 
        limit: 100,
        created_at_min: thirtyDaysAgo.toISOString(),
      });

      // If no orders, return empty analysis (normal for new stores)
      if (!orders || orders.length === 0) {
        console.log('[STORE-ANALYSIS] ℹ️ No orders found (normal for new stores)');
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          trend: 'neutral' as const,
          insights: ['Esta tienda es nueva y aún no tiene órdenes registradas.'],
        };
      }

      console.log(`[STORE-ANALYSIS] Found ${orders.length} orders for analysis`);

      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
      const averageOrderValue = totalRevenue / orders.length;

      // Analyze order statuses
      const statusCounts = orders.reduce((acc, order) => {
        const status = order.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const insights: string[] = [];
      
      if (orders.length > 0) {
        insights.push(`Tienes ${orders.length} órdenes en los últimos 30 días.`);
        insights.push(`Ingresos totales: $${totalRevenue.toFixed(2)}.`);
        insights.push(`Valor promedio por orden: $${averageOrderValue.toFixed(2)}.`);
      }

      // Analyze trends (basic implementation)
      const recentOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        return orderDate >= fifteenDaysAgo;
      });

      const trend = recentOrders.length > orders.length / 2 ? 'growing' : 'declining';

      return {
        totalOrders: orders.length,
        totalRevenue,
        averageOrderValue,
        conversionRate: 0, // Would need traffic data
        trend,
        insights,
      };
    } catch (error: any) {
      // 🔥 ENHANCED: Graceful handling of TiendaNube endpoint limitations
      if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
        console.log('[STORE-ANALYSIS] ℹ️ Orders endpoint not available (normal for some stores)');
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          trend: 'neutral' as const,
          insights: ['No se pudo acceder a los datos de órdenes. Esto es normal en algunos planes de TiendaNube.'],
        };
      } else if (error.message?.includes('Forbidden') || error.message?.includes('403')) {
        console.log('[STORE-ANALYSIS] ℹ️ Orders endpoint restricted by plan');
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          trend: 'neutral' as const,
          insights: ['Los datos de órdenes están restringidos en tu plan actual de TiendaNube.'],
        };
      } else {
        console.error('[STORE-ANALYSIS] ❌ Error analyzing orders:', error);
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          trend: 'neutral' as const,
          insights: ['Error al analizar las órdenes. Se reintentará automáticamente.'],
        };
      }
    }
  }

  /**
   * 👥 Análisis de clientes con manejo graceful
   */
  private async analyzeCustomers(api: TiendaNubeAPI): Promise<CustomerAnalysis> {
    try {
      console.log('[STORE-ANALYSIS] 👥 Analyzing customers...');
      
      const customers = await api.getCustomers({ limit: 100 });

      // If no customers, return empty analysis (normal for new stores)
      if (!customers || customers.length === 0) {
        console.log('[STORE-ANALYSIS] ℹ️ No customers found (normal for new stores)');
        return {
          totalCustomers: 0,
          newCustomers: 0,
          returningCustomers: 0,
          insights: ['Esta tienda es nueva y aún no tiene clientes registrados.'],
        };
      }

      console.log(`[STORE-ANALYSIS] Found ${customers.length} customers for analysis`);

      const insights: string[] = [];
      insights.push(`Tienes ${customers.length} clientes registrados.`);

      // Basic customer analysis
      const customersWithOrders = customers.filter(c => c.last_order_id !== null && parseFloat(c.total_spent || '0') > 0);
      const returningCustomers = customers.filter(c => parseFloat(c.total_spent || '0') > 0); // Assume customers with spending are returning

      insights.push(`${customersWithOrders.length} clientes han realizado al menos una compra.`);
      
      if (returningCustomers.length > 0) {
        insights.push(`${returningCustomers.length} son clientes con historial de compras.`);
      }

      return {
        totalCustomers: customers.length,
        newCustomers: customers.length - returningCustomers.length,
        returningCustomers: returningCustomers.length,
        insights,
      };
    } catch (error: any) {
      // 🔥 ENHANCED: Graceful handling of TiendaNube endpoint limitations
      if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
        console.log('[STORE-ANALYSIS] ℹ️ Customers endpoint not available (normal for some stores)');
        return {
          totalCustomers: 0,
          newCustomers: 0,
          returningCustomers: 0,
          insights: ['No se pudo acceder a los datos de clientes. Esto es normal en algunos planes de TiendaNube.'],
        };
      } else if (error.message?.includes('Forbidden') || error.message?.includes('403')) {
        console.log('[STORE-ANALYSIS] ℹ️ Customers endpoint restricted by plan');
        return {
          totalCustomers: 0,
          newCustomers: 0,
          returningCustomers: 0,
          insights: ['Los datos de clientes están restringidos en tu plan actual de TiendaNube.'],
        };
      } else {
        console.error('[STORE-ANALYSIS] ❌ Error analyzing customers:', error);
        return {
          totalCustomers: 0,
          newCustomers: 0,
          returningCustomers: 0,
          insights: ['Error al analizar los clientes. Se reintentará automáticamente.'],
        };
      }
    }
  }
}

// Singleton instance
export const storeAnalysisService = new StoreAnalysisService(); 