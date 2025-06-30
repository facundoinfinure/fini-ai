import OpenAI from 'openai';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import type { TiendaNubeStore, TiendaNubeProduct } from '@/types/tiendanube';

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
  
  // Sugerencias de AI
  aiSuggestions: {
    marketingFocus: string[];
    competitiveAdvantages: string[];
    growthOpportunities: string[];
    audienceInsights: string[];
  };
  
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
      
      // 1. Extraer datos de Tienda Nube
      const tiendaNubeAPI = new TiendaNubeAPI(accessToken, storeId);
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
      description: aiData.description || store.description || 'Tienda online',
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
      aiSuggestions: {
        marketingFocus: aiData.marketingFocus || [],
        competitiveAdvantages: aiData.competitiveAdvantages || [],
        growthOpportunities: aiData.growthOpportunities || [],
        audienceInsights: aiData.audienceInsights || []
      },
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
    
    // Generar insights básicos
    const insights = this.generateBasicInsights(analysis);

    return {
      businessName: store.name,
      category: mainCategory,
      description: store.description || `Tienda online especializada en ${mainCategory.toLowerCase()}`,
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
      aiSuggestions: insights,
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
DESCRIPCIÓN: ${store.description || 'No disponible'}
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

  private generateBasicInsights(analysis: any) {
    return {
      marketingFocus: [
        'Destacar variedad de productos',
        'Comunicar valor del catálogo',
        'Optimizar para móvil'
      ],
      competitiveAdvantages: [
        'Catálogo organizado',
        'Múltiples opciones'
      ],
      growthOpportunities: [
        'Expandir categorías populares',
        'Optimizar descripción de productos'
      ],
      audienceInsights: [
        'Buscan variedad de opciones',
        'Valoran la organización del catálogo'
      ]
    };
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
      aiSuggestions: {
        marketingFocus: [],
        competitiveAdvantages: [],
        growthOpportunities: [],
        audienceInsights: []
      },
      generatedBy: 'user',
      confidence: 0,
      analysisDate: new Date().toISOString()
    };
  }
}

// Singleton instance
export const storeAnalysisService = new StoreAnalysisService(); 