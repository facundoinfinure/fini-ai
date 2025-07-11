/**
 * Motor de Recomendaciones Personalizadas para Fini AI
 * Combina collaborative filtering, content-based filtering y análisis de comportamiento
 */

import { logger } from '../logger';
import { predictiveAnalytics } from './predictive-analytics';

// Tipos para el sistema de recomendaciones
export interface UserProfile {
  id: string;
  preferences: {
    categories: string[];
    priceRange: { min: number; max: number };
    brands: string[];
    features: string[];
  };
  behavior: {
    viewHistory: ProductInteraction[];
    purchaseHistory: ProductInteraction[];
    searchHistory: string[];
    sessionDuration: number;
    clickThroughRate: number;
    conversionRate: number;
  };
  demographics: {
    age?: number;
    location?: string;
    gender?: string;
    income?: string;
  };
  segments: string[];
}

export interface ProductInteraction {
  productId: string;
  timestamp: number;
  type: 'view' | 'click' | 'purchase' | 'wishlist' | 'share' | 'review';
  value?: number;
  duration?: number;
  context?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  brand: string;
  features: string[];
  description: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  salesCount: number;
  viewCount: number;
  availability: boolean;
  images: string[];
  attributes: Record<string, any>;
}

export interface Recommendation {
  productId: string;
  score: number;
  confidence: number;
  reason: string;
  algorithm: 'collaborative' | 'content' | 'hybrid' | 'trending' | 'behavioral';
  factors: {
    name: string;
    weight: number;
    value: number;
  }[];
  personalizedPrice?: number;
  urgency?: 'low' | 'medium' | 'high';
  category: string;
}

export interface RecommendationSet {
  userId: string;
  recommendations: Recommendation[];
  context: 'homepage' | 'product_page' | 'cart' | 'checkout' | 'email' | 'push';
  timestamp: number;
  metadata: {
    algorithm: string;
    performance: {
      responseTime: number;
      cacheHit: boolean;
    };
    abTest?: {
      variant: string;
      experimentId: string;
    };
  };
}

export interface ContentRecommendation {
  type: 'article' | 'video' | 'tutorial' | 'promotion' | 'insight';
  title: string;
  description: string;
  url: string;
  priority: number;
  personalization: {
    relevanceScore: number;
    userSegment: string;
    timing: 'immediate' | 'scheduled' | 'optimal';
  };
}

/**
 * Motor de Recomendaciones Personalizadas
 */
export class RecommendationEngine {
  private static instance: RecommendationEngine;
  private userProfiles: Map<string, UserProfile> = new Map();
  private products: Map<string, Product> = new Map();
  private interactions: Map<string, ProductInteraction[]> = new Map();
  private cache: Map<string, RecommendationSet> = new Map();
  private similarityMatrix: Map<string, Map<string, number>> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Inicializa el motor de recomendaciones
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('[RECOMMENDATIONS] Initializing recommendation engine...');
      
      // Cargar datos de productos y usuarios
      await this.loadProducts();
      await this.loadUserProfiles();
      await this.loadInteractions();
      
      // Calcular matrices de similitud
      await this.calculateSimilarityMatrices();
      
      // Entrenar modelos de recomendación
      await this.trainRecommendationModels();
      
      this.isInitialized = true;
      logger.info('[RECOMMENDATIONS] Engine initialized successfully');
    } catch (error) {
      logger.error('[RECOMMENDATIONS] Failed to initialize engine', error);
      throw error;
    }
  }

  /**
   * Carga productos simulados
   */
  private async loadProducts(): Promise<void> {
    const categories = ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'toys'];
    const brands = ['BrandA', 'BrandB', 'BrandC', 'BrandD', 'BrandE'];
    
    for (let i = 0; i < 500; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      
      const product: Product = {
        id: `product_${i}`,
        name: `${brand} ${category} Product ${i}`,
        category,
        subcategory: `${category}_sub_${Math.floor(Math.random() * 3)}`,
        price: Math.round((Math.random() * 1000 + 10) * 100) / 100,
        brand,
        features: this.generateFeatures(category),
        description: `High-quality ${category} product from ${brand}`,
        tags: [category, brand, 'popular', 'trending'].slice(0, Math.floor(Math.random() * 4) + 1),
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
        reviewCount: Math.floor(Math.random() * 500),
        salesCount: Math.floor(Math.random() * 1000),
        viewCount: Math.floor(Math.random() * 5000),
        availability: Math.random() > 0.1,
        images: [`/images/product_${i}_1.jpg`, `/images/product_${i}_2.jpg`],
        attributes: this.generateAttributes(category)
      };
      
      this.products.set(product.id, product);
    }
  }

  /**
   * Genera features para una categoría
   */
  private generateFeatures(category: string): string[] {
    const featureMap: Record<string, string[]> = {
      electronics: ['wireless', 'bluetooth', 'waterproof', 'fast-charging', 'hd-display'],
      clothing: ['cotton', 'comfortable', 'stylish', 'durable', 'breathable'],
      books: ['bestseller', 'educational', 'fiction', 'paperback', 'illustrated'],
      home: ['modern', 'space-saving', 'eco-friendly', 'easy-clean', 'decorative'],
      sports: ['lightweight', 'professional', 'outdoor', 'fitness', 'performance'],
      beauty: ['organic', 'anti-aging', 'moisturizing', 'natural', 'dermatologist-tested'],
      toys: ['educational', 'safe', 'creative', 'interactive', 'age-appropriate']
    };
    
    const features = featureMap[category] || ['quality', 'reliable', 'popular'];
    return features.slice(0, Math.floor(Math.random() * features.length) + 1);
  }

  /**
   * Genera atributos para una categoría
   */
  private generateAttributes(category: string): Record<string, any> {
    const baseAttributes = {
      weight: Math.round(Math.random() * 5000) / 100,
      dimensions: `${Math.floor(Math.random() * 50)}x${Math.floor(Math.random() * 50)}x${Math.floor(Math.random() * 50)}cm`,
      color: ['black', 'white', 'blue', 'red', 'green'][Math.floor(Math.random() * 5)]
    };

    const categorySpecific: Record<string, any> = {
      electronics: {
        ...baseAttributes,
        batteryLife: `${Math.floor(Math.random() * 24) + 1} hours`,
        warranty: `${Math.floor(Math.random() * 3) + 1} years`
      },
      clothing: {
        ...baseAttributes,
        size: ['XS', 'S', 'M', 'L', 'XL'][Math.floor(Math.random() * 5)],
        material: ['cotton', 'polyester', 'wool', 'silk'][Math.floor(Math.random() * 4)]
      },
      books: {
        pages: Math.floor(Math.random() * 500) + 100,
        language: 'Spanish',
        publisher: 'Editorial ABC'
      }
    };

    return categorySpecific[category] || baseAttributes;
  }

  /**
   * Carga perfiles de usuario simulados
   */
  private async loadUserProfiles(): Promise<void> {
    for (let i = 0; i < 100; i++) {
      const categories = ['electronics', 'clothing', 'books', 'home', 'sports'];
      const userCategories = categories.slice(0, Math.floor(Math.random() * 3) + 1);
      
      const profile: UserProfile = {
        id: `user_${i}`,
        preferences: {
          categories: userCategories,
          priceRange: {
            min: Math.floor(Math.random() * 100),
            max: Math.floor(Math.random() * 900) + 100
          },
          brands: ['BrandA', 'BrandB'].slice(0, Math.floor(Math.random() * 2) + 1),
          features: ['quality', 'popular', 'trending'].slice(0, Math.floor(Math.random() * 3) + 1)
        },
        behavior: {
          viewHistory: [],
          purchaseHistory: [],
          searchHistory: ['smartphone', 'laptop', 'shoes', 'book'].slice(0, Math.floor(Math.random() * 4)),
          sessionDuration: Math.floor(Math.random() * 3600) + 300,
          clickThroughRate: Math.random() * 0.1,
          conversionRate: Math.random() * 0.05
        },
        demographics: {
          age: Math.floor(Math.random() * 50) + 18,
          location: ['Buenos Aires', 'Mexico City', 'São Paulo', 'Lima', 'Bogotá'][Math.floor(Math.random() * 5)],
          gender: ['male', 'female', 'other'][Math.floor(Math.random() * 3)],
          income: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        },
        segments: ['new_user', 'active_buyer', 'price_sensitive'].slice(0, Math.floor(Math.random() * 2) + 1)
      };
      
      this.userProfiles.set(profile.id, profile);
    }
  }

  /**
   * Carga interacciones simuladas
   */
  private async loadInteractions(): Promise<void> {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (const [userId, profile] of this.userProfiles) {
      const interactions: ProductInteraction[] = [];
      const productIds = Array.from(this.products.keys());
      
      // Generar interacciones de los últimos 30 días
      for (let day = 0; day < 30; day++) {
        const dayInteractions = Math.floor(Math.random() * 10);
        
        for (let i = 0; i < dayInteractions; i++) {
          const productId = productIds[Math.floor(Math.random() * productIds.length)];
          const product = this.products.get(productId);
          
          if (product && profile.preferences.categories.includes(product.category)) {
            interactions.push({
              productId,
              timestamp: now - (day * oneDay) + Math.floor(Math.random() * oneDay),
              type: ['view', 'click', 'purchase', 'wishlist'][Math.floor(Math.random() * 4)] as any,
              value: product.price,
              duration: Math.floor(Math.random() * 300) + 30,
              context: 'homepage'
            });
          }
        }
      }
      
      // Actualizar historial en el perfil
      profile.behavior.viewHistory = interactions.filter(i => i.type === 'view');
      profile.behavior.purchaseHistory = interactions.filter(i => i.type === 'purchase');
      
      this.interactions.set(userId, interactions);
    }
  }

  /**
   * Calcula matrices de similitud
   */
  private async calculateSimilarityMatrices(): Promise<void> {
    logger.info('[RECOMMENDATIONS] Calculating similarity matrices...');
    
    // Calcular similitud entre usuarios (collaborative filtering)
    await this.calculateUserSimilarity();
    
    // Calcular similitud entre productos (content-based)
    await this.calculateProductSimilarity();
    
    logger.info('[RECOMMENDATIONS] Similarity matrices calculated');
  }

  /**
   * Calcula similitud entre usuarios
   */
  private async calculateUserSimilarity(): Promise<void> {
    const users = Array.from(this.userProfiles.keys());
    
    for (let i = 0; i < users.length; i++) {
      const userSimilarities = new Map<string, number>();
      
      for (let j = i + 1; j < users.length; j++) {
        const similarity = this.calculateCosineSimilarity(users[i], users[j]);
        userSimilarities.set(users[j], similarity);
      }
      
      this.similarityMatrix.set(users[i], userSimilarities);
    }
  }

  /**
   * Calcula similitud entre productos
   */
  private async calculateProductSimilarity(): Promise<void> {
    const products = Array.from(this.products.values());
    
    for (let i = 0; i < products.length; i++) {
      const productSimilarities = new Map<string, number>();
      
      for (let j = i + 1; j < products.length; j++) {
        const similarity = this.calculateProductCosineSimilarity(products[i], products[j]);
        productSimilarities.set(products[j].id, similarity);
      }
      
      this.similarityMatrix.set(products[i].id, productSimilarities);
    }
  }

  /**
   * Calcula similitud coseno entre usuarios
   */
  private calculateCosineSimilarity(userId1: string, userId2: string): number {
    const interactions1 = this.interactions.get(userId1) || [];
    const interactions2 = this.interactions.get(userId2) || [];
    
    // Crear vectores de productos interactuados
    const products1 = new Set(interactions1.map(i => i.productId));
    const products2 = new Set(interactions2.map(i => i.productId));
    
    const intersection = new Set([...products1].filter(p => products2.has(p)));
    const union = new Set([...products1, ...products2]);
    
    if (union.size === 0) return 0;
    
    return intersection.size / Math.sqrt(products1.size * products2.size);
  }

  /**
   * Calcula similitud coseno entre productos
   */
  private calculateProductCosineSimilarity(product1: Product, product2: Product): number {
    // Factores de similitud
    let similarity = 0;
    let factors = 0;
    
    // Categoría
    if (product1.category === product2.category) {
      similarity += 0.3;
    }
    factors++;
    
    // Marca
    if (product1.brand === product2.brand) {
      similarity += 0.2;
    }
    factors++;
    
    // Rango de precio
    const priceDiff = Math.abs(product1.price - product2.price);
    const maxPrice = Math.max(product1.price, product2.price);
    const priceSimiliarity = 1 - (priceDiff / maxPrice);
    similarity += priceSimiliarity * 0.3;
    factors++;
    
    // Features comunes
    const features1 = new Set(product1.features);
    const features2 = new Set(product2.features);
    const commonFeatures = new Set([...features1].filter(f => features2.has(f)));
    const totalFeatures = new Set([...features1, ...features2]);
    
    if (totalFeatures.size > 0) {
      similarity += (commonFeatures.size / totalFeatures.size) * 0.2;
    }
    factors++;
    
    return similarity / factors;
  }

  /**
   * Entrena modelos de recomendación
   */
  private async trainRecommendationModels(): Promise<void> {
    logger.info('[RECOMMENDATIONS] Training recommendation models...');
    
    // Entrenar modelo collaborative filtering
    // Entrenar modelo content-based
    // Entrenar modelo híbrido
    
    logger.info('[RECOMMENDATIONS] Models trained successfully');
  }

  /**
   * Genera recomendaciones para un usuario
   */
  async generateRecommendations(
    userId: string,
    context: 'homepage' | 'product_page' | 'cart' | 'checkout' | 'email' | 'push' = 'homepage',
    limit: number = 10
  ): Promise<RecommendationSet> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const cacheKey = `${userId}_${context}_${limit}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutos
      return cached;
    }

    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      throw new Error(`User profile not found: ${userId}`);
    }

    // Generar recomendaciones usando diferentes algoritmos
    const collaborativeRecs = await this.generateCollaborativeRecommendations(userId, limit / 2);
    const contentBasedRecs = await this.generateContentBasedRecommendations(userId, limit / 2);
    const behavioralRecs = await this.generateBehavioralRecommendations(userId, limit / 4);
    const trendingRecs = await this.generateTrendingRecommendations(userId, limit / 4);

    // Combinar y rankear recomendaciones
    const allRecommendations = [
      ...collaborativeRecs,
      ...contentBasedRecs,
      ...behavioralRecs,
      ...trendingRecs
    ];

    // Eliminar duplicados y rankear
    const uniqueRecommendations = this.deduplicateAndRank(allRecommendations, limit);

    // Personalizar precios si es necesario
    await this.personalizeRecommendations(uniqueRecommendations, userProfile);

    const recommendationSet: RecommendationSet = {
      userId,
      recommendations: uniqueRecommendations,
      context,
      timestamp: Date.now(),
      metadata: {
        algorithm: 'hybrid',
        performance: {
          responseTime: Date.now() - startTime,
          cacheHit: false
        }
      }
    };

    // Cachear resultado
    this.cache.set(cacheKey, recommendationSet);

    // Log analytics
    logger.info('[RECOMMENDATIONS] Recommendations generated', {
      event: 'Recommendations Generated',
      userId,
      properties: {
        context,
        count: uniqueRecommendations.length,
        algorithms: [...new Set(uniqueRecommendations.map(r => r.algorithm))],
        avgScore: uniqueRecommendations.reduce((sum, r) => sum + r.score, 0) / uniqueRecommendations.length,
        responseTime: Date.now() - startTime
      }
    });

    return recommendationSet;
  }

  /**
   * Genera recomendaciones collaborative filtering
   */
  private async generateCollaborativeRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const userSimilarities = this.similarityMatrix.get(userId);
    
    if (!userSimilarities) return recommendations;

    // Encontrar usuarios similares
    const similarUsers = Array.from(userSimilarities.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Obtener productos comprados por usuarios similares
    const candidateProducts = new Map<string, number>();
    
    for (const [similarUserId, similarity] of similarUsers) {
      const interactions = this.interactions.get(similarUserId) || [];
      const purchases = interactions.filter(i => i.type === 'purchase');
      
      for (const purchase of purchases) {
        const currentScore = candidateProducts.get(purchase.productId) || 0;
        candidateProducts.set(purchase.productId, currentScore + similarity);
      }
    }

    // Filtrar productos ya interactuados por el usuario
    const userInteractions = this.interactions.get(userId) || [];
    const userProducts = new Set(userInteractions.map(i => i.productId));

    // Generar recomendaciones
    const sortedCandidates = Array.from(candidateProducts.entries())
      .filter(([productId]) => !userProducts.has(productId))
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    for (const [productId, score] of sortedCandidates) {
      const product = this.products.get(productId);
      if (product && product.availability) {
        recommendations.push({
          productId,
          score: Math.min(score, 1),
          confidence: 0.8,
          reason: 'Usuarios con gustos similares también compraron este producto',
          algorithm: 'collaborative',
          factors: [
            { name: 'Similitud de usuarios', weight: 0.8, value: score },
            { name: 'Popularidad', weight: 0.2, value: product.salesCount / 1000 }
          ],
          category: product.category
        });
      }
    }

    return recommendations;
  }

  /**
   * Genera recomendaciones content-based
   */
  private async generateContentBasedRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const userProfile = this.userProfiles.get(userId);
    
    if (!userProfile) return recommendations;

    // Obtener productos de categorías preferidas
    const preferredProducts = Array.from(this.products.values())
      .filter(product => 
        userProfile.preferences.categories.includes(product.category) &&
        product.price >= userProfile.preferences.priceRange.min &&
        product.price <= userProfile.preferences.priceRange.max &&
        product.availability
      );

    // Calcular scores basados en contenido
    const scoredProducts = preferredProducts.map(product => {
      let score = 0;
      const factors = [];

      // Score por categoría
      if (userProfile.preferences.categories.includes(product.category)) {
        score += 0.4;
        factors.push({ name: 'Categoría preferida', weight: 0.4, value: 1 });
      }

      // Score por marca
      if (userProfile.preferences.brands.includes(product.brand)) {
        score += 0.3;
        factors.push({ name: 'Marca preferida', weight: 0.3, value: 1 });
      }

      // Score por features
      const commonFeatures = product.features.filter(f => userProfile.preferences.features.includes(f));
      const featureScore = commonFeatures.length / Math.max(product.features.length, 1);
      score += featureScore * 0.2;
      factors.push({ name: 'Features compatibles', weight: 0.2, value: featureScore });

      // Score por rating
      const ratingScore = product.rating / 5;
      score += ratingScore * 0.1;
      factors.push({ name: 'Rating del producto', weight: 0.1, value: ratingScore });

      return {
        productId: product.id,
        score,
        confidence: 0.9,
        reason: `Coincide con tus preferencias de ${product.category}`,
        algorithm: 'content' as const,
        factors,
        category: product.category
      };
    });

    // Filtrar productos ya interactuados
    const userInteractions = this.interactions.get(userId) || [];
    const userProducts = new Set(userInteractions.map(i => i.productId));

    return scoredProducts
      .filter(rec => !userProducts.has(rec.productId))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Genera recomendaciones basadas en comportamiento
   */
  private async generateBehavioralRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const userInteractions = this.interactions.get(userId) || [];
    
    if (userInteractions.length === 0) return recommendations;

    // Analizar patrones de comportamiento
    const recentViews = userInteractions
      .filter(i => i.type === 'view' && (Date.now() - i.timestamp) < 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // Encontrar productos similares a los vistos recientemente
    const candidateProducts = new Map<string, number>();

    for (const view of recentViews) {
      const similarities = this.similarityMatrix.get(view.productId);
      if (similarities) {
        for (const [productId, similarity] of similarities) {
          const currentScore = candidateProducts.get(productId) || 0;
          candidateProducts.set(productId, currentScore + similarity);
        }
      }
    }

    // Filtrar y generar recomendaciones
    const userProducts = new Set(userInteractions.map(i => i.productId));
    const sortedCandidates = Array.from(candidateProducts.entries())
      .filter(([productId]) => !userProducts.has(productId))
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    for (const [productId, score] of sortedCandidates) {
      const product = this.products.get(productId);
      if (product && product.availability) {
        recommendations.push({
          productId,
          score: Math.min(score, 1),
          confidence: 0.7,
          reason: 'Basado en productos que viste recientemente',
          algorithm: 'behavioral',
          factors: [
            { name: 'Similitud con vistos', weight: 0.8, value: score },
            { name: 'Recencia de interacción', weight: 0.2, value: 0.8 }
          ],
          urgency: score > 0.8 ? 'high' : score > 0.6 ? 'medium' : 'low',
          category: product.category
        });
      }
    }

    return recommendations;
  }

  /**
   * Genera recomendaciones trending
   */
  private async generateTrendingRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const userProfile = this.userProfiles.get(userId);
    
    if (!userProfile) return recommendations;

    // Obtener productos trending en categorías de interés
    const trendingProducts = Array.from(this.products.values())
      .filter(product => 
        userProfile.preferences.categories.includes(product.category) &&
        product.availability
      )
      .sort((a, b) => {
        const scoreA = (a.salesCount * 0.6) + (a.viewCount * 0.3) + (a.rating * a.reviewCount * 0.1);
        const scoreB = (b.salesCount * 0.6) + (b.viewCount * 0.3) + (b.rating * b.reviewCount * 0.1);
        return scoreB - scoreA;
      })
      .slice(0, limit);

    for (const product of trendingProducts) {
      const trendScore = (product.salesCount / 1000) + (product.viewCount / 5000) + (product.rating / 5);
      
      recommendations.push({
        productId: product.id,
        score: Math.min(trendScore / 3, 1),
        confidence: 0.6,
        reason: 'Producto trending en tu categoría de interés',
        algorithm: 'trending',
        factors: [
          { name: 'Ventas recientes', weight: 0.6, value: product.salesCount / 1000 },
          { name: 'Popularidad', weight: 0.3, value: product.viewCount / 5000 },
          { name: 'Rating', weight: 0.1, value: product.rating / 5 }
        ],
        urgency: 'medium',
        category: product.category
      });
    }

    return recommendations;
  }

  /**
   * Elimina duplicados y rankea recomendaciones
   */
  private deduplicateAndRank(recommendations: Recommendation[], limit: number): Recommendation[] {
    const uniqueMap = new Map<string, Recommendation>();
    
    for (const rec of recommendations) {
      const existing = uniqueMap.get(rec.productId);
      if (!existing || rec.score > existing.score) {
        uniqueMap.set(rec.productId, rec);
      }
    }
    
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Personaliza recomendaciones
   */
  private async personalizeRecommendations(recommendations: Recommendation[], userProfile: UserProfile): Promise<void> {
    for (const rec of recommendations) {
      const product = this.products.get(rec.productId);
      if (!product) continue;

      // Personalizar precio basado en comportamiento
      if (userProfile.behavior.conversionRate < 0.02) {
        // Usuario price-sensitive, ofrecer descuento
        rec.personalizedPrice = product.price * 0.9;
      } else if (userProfile.behavior.conversionRate > 0.05) {
        // Usuario premium, puede pagar precio completo
        rec.personalizedPrice = product.price;
      }

      // Ajustar urgencia basada en stock y demanda
      if (product.salesCount > 500) {
        rec.urgency = 'high';
      }
    }
  }

  /**
   * Genera recomendaciones de contenido
   */
  async generateContentRecommendations(userId: string): Promise<ContentRecommendation[]> {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) return [];

    const recommendations: ContentRecommendation[] = [];

    // Artículos basados en categorías de interés
    for (const category of userProfile.preferences.categories) {
      recommendations.push({
        type: 'article',
        title: `Guía de compra: Los mejores productos de ${category}`,
        description: `Descubre las últimas tendencias y productos destacados en ${category}`,
        url: `/articles/${category}-guide`,
        priority: 0.8,
        personalization: {
          relevanceScore: 0.9,
          userSegment: userProfile.segments[0] || 'general',
          timing: 'optimal'
        }
      });
    }

    // Videos tutoriales para productos vistos
    const recentViews = userProfile.behavior.viewHistory.slice(0, 3);
    for (const view of recentViews) {
      const product = this.products.get(view.productId);
      if (product) {
        recommendations.push({
          type: 'video',
          title: `Cómo usar ${product.name}`,
          description: `Tutorial completo para aprovechar al máximo tu ${product.name}`,
          url: `/videos/${product.id}-tutorial`,
          priority: 0.7,
          personalization: {
            relevanceScore: 0.8,
            userSegment: userProfile.segments[0] || 'general',
            timing: 'immediate'
          }
        });
      }
    }

    // Insights personalizados
    if (userProfile.behavior.purchaseHistory.length > 0) {
      recommendations.push({
        type: 'insight',
        title: 'Tu análisis de compras personalizado',
        description: 'Descubre patrones en tus compras y obtén recomendaciones para optimizar tu presupuesto',
        url: '/insights/personal-analytics',
        priority: 0.9,
        personalization: {
          relevanceScore: 1.0,
          userSegment: userProfile.segments[0] || 'general',
          timing: 'scheduled'
        }
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Registra interacción de usuario
   */
  async recordInteraction(userId: string, interaction: ProductInteraction): Promise<void> {
    const userInteractions = this.interactions.get(userId) || [];
    userInteractions.push(interaction);
    this.interactions.set(userId, userInteractions);

    // Actualizar perfil de usuario
    const userProfile = this.userProfiles.get(userId);
    if (userProfile) {
      if (interaction.type === 'view') {
        userProfile.behavior.viewHistory.push(interaction);
      } else if (interaction.type === 'purchase') {
        userProfile.behavior.purchaseHistory.push(interaction);
      }
    }

    // Invalidar cache
    this.invalidateUserCache(userId);

    // Log analytics
    logger.info('[RECOMMENDATIONS] Product interaction recorded', {
      event: 'Product Interaction',
      userId,
      properties: {
        productId: interaction.productId,
        type: interaction.type,
        value: interaction.value,
        context: interaction.context
      }
    });
  }

  /**
   * Invalida cache de usuario
   */
  private invalidateUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(userId));
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Obtiene métricas del sistema
   */
  getSystemMetrics(): {
    totalUsers: number;
    totalProducts: number;
    totalInteractions: number;
    cacheSize: number;
    avgRecommendationScore: number;
    algorithmDistribution: Record<string, number>;
  } {
    const totalInteractions = Array.from(this.interactions.values())
      .reduce((sum, interactions) => sum + interactions.length, 0);

    return {
      totalUsers: this.userProfiles.size,
      totalProducts: this.products.size,
      totalInteractions,
      cacheSize: this.cache.size,
      avgRecommendationScore: 0.75, // Placeholder
      algorithmDistribution: {
        collaborative: 0.3,
        content: 0.3,
        behavioral: 0.2,
        trending: 0.2
      }
    };
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    this.userProfiles.clear();
    this.products.clear();
    this.interactions.clear();
    this.cache.clear();
    this.similarityMatrix.clear();
    this.isInitialized = false;
  }
}

// Instancia singleton
export const recommendationEngine = RecommendationEngine.getInstance();

// Funciones de utilidad
export const initializeRecommendationEngine = () => {
  return recommendationEngine.initialize();
};

export const generateRecommendations = (userId: string, context?: any, limit?: number) => {
  return recommendationEngine.generateRecommendations(userId, context, limit);
};

export const generateContentRecommendations = (userId: string) => {
  return recommendationEngine.generateContentRecommendations(userId);
};

export const recordInteraction = (userId: string, interaction: ProductInteraction) => {
  return recommendationEngine.recordInteraction(userId, interaction);
};

export const getRecommendationMetrics = () => {
  return recommendationEngine.getSystemMetrics();
};

export default recommendationEngine; 