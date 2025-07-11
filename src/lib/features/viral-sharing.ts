/**
 * Viral Sharing System
 * Sistema para compartir insights, métricas y logros de manera viral
 */

import { logger } from '@/lib/logger';

export interface ShareableInsight {
  id: string;
  type: 'metric' | 'achievement' | 'insight' | 'milestone';
  title: string;
  description: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  storeName: string;
  storeId: string;
  userId: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ShareTemplate {
  id: string;
  name: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'general';
  template: string;
  imageTemplate?: string;
  hashtags?: string[];
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface ShareResult {
  success: boolean;
  url?: string;
  error?: string;
  platform: string;
  analytics: {
    shareId: string;
    timestamp: Date;
    referralCode?: string;
  };
}

export class ViralSharingSystem {
  private static instance: ViralSharingSystem;
  private templates: Map<string, ShareTemplate> = new Map();
  private shareHistory: Map<string, ShareResult[]> = new Map();

  private constructor() {
    this.initializeTemplates();
  }

  static getInstance(): ViralSharingSystem {
    if (!ViralSharingSystem.instance) {
      ViralSharingSystem.instance = new ViralSharingSystem();
    }
    return ViralSharingSystem.instance;
  }

  /**
   * Inicializa templates predefinidos para diferentes plataformas
   */
  private initializeTemplates(): void {
    // Template para Instagram Stories
    this.templates.set('instagram-story', {
      id: 'instagram-story',
      name: 'Instagram Story',
      platform: 'instagram',
      template: '🚀 ¡Increíble! Mi tienda {{storeName}} ha logrado {{value}} en {{metric}}! 📈\n\n{{description}}\n\n#entrepreneur #ecommerce #tiendanube #finiAI',
      imageTemplate: 'story-template-1',
      hashtags: ['entrepreneur', 'ecommerce', 'tiendanube', 'finiAI', 'exito'],
      dimensions: { width: 1080, height: 1920 }
    });

    // Template para Facebook
    this.templates.set('facebook-post', {
      id: 'facebook-post',
      name: 'Facebook Post',
      platform: 'facebook',
      template: '🎉 ¡Excelentes noticias! Mi tienda {{storeName}} ha alcanzado {{value}} en {{metric}}!\n\n{{description}}\n\nGracias a las insights de IA de Fini AI, estoy tomando decisiones más inteligentes para mi negocio. 🧠💡\n\n¿Quieres saber cómo? Te dejo mi código de referido para que pruebes Fini AI: {{referralCode}}\n\n#emprendimiento #ecommerce #ia #negocio',
      hashtags: ['emprendimiento', 'ecommerce', 'ia', 'negocio', 'finiAI']
    });

    // Template para Twitter
    this.templates.set('twitter-post', {
      id: 'twitter-post',
      name: 'Twitter Post',
      platform: 'twitter',
      template: '🚀 {{storeName}} logró {{value}} en {{metric}}! \n\n{{description}}\n\nPowered by @FiniAI 🤖\n\n#ecommerce #AI #emprendimiento',
      hashtags: ['ecommerce', 'AI', 'emprendimiento', 'finiAI']
    });

    // Template para LinkedIn
    this.templates.set('linkedin-post', {
      id: 'linkedin-post',
      name: 'LinkedIn Post',
      platform: 'linkedin',
      template: '📊 Análisis de resultados: Mi tienda {{storeName}} ha logrado {{value}} en {{metric}}.\n\n{{description}}\n\nEsto ha sido posible gracias a las insights basadas en IA de Fini AI, que me permite:\n• Tomar decisiones basadas en datos\n• Identificar oportunidades de crecimiento\n• Optimizar la experiencia del cliente\n\n¿Cómo está transformando la IA tu negocio?\n\n#BusinessIntelligence #Ecommerce #AI #DataDriven #Emprendimiento',
      hashtags: ['BusinessIntelligence', 'Ecommerce', 'AI', 'DataDriven', 'Emprendimiento']
    });

    // Template para WhatsApp
    this.templates.set('whatsapp-message', {
      id: 'whatsapp-message',
      name: 'WhatsApp Message',
      platform: 'whatsapp',
      template: '🎉 ¡Tengo que contarte! Mi tienda {{storeName}} ha logrado {{value}} en {{metric}}!\n\n{{description}}\n\nEstoy usando Fini AI para analizar mi negocio y los resultados son increíbles. Si tienes un ecommerce, te super recomiendo probarlo.\n\nTe dejo mi código de referido: {{referralCode}}\n\n¡Saludos! 👋'
    });

    // Template general
    this.templates.set('general-share', {
      id: 'general-share',
      name: 'General Share',
      platform: 'general',
      template: '🚀 {{storeName}} - {{value}} en {{metric}}\n\n{{description}}\n\nPowered by Fini AI 🤖'
    });
  }

  /**
   * Crea un insight compartible desde métricas
   */
  createShareableInsight(data: {
    type: ShareableInsight['type'];
    title: string;
    description: string;
    value: string | number;
    change?: number;
    changeType?: 'positive' | 'negative' | 'neutral';
    storeName: string;
    storeId: string;
    userId: string;
    metadata?: Record<string, any>;
  }): ShareableInsight {
    return {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      ...data
    };
  }

  /**
   * Genera contenido para compartir basado en template
   */
  generateShareContent(
    insight: ShareableInsight,
    templateId: string,
    referralCode?: string
  ): {
    content: string;
    hashtags: string[];
    imageTemplate?: string;
    dimensions?: { width: number; height: number };
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Reemplazar variables en el template
    let content = template.template
      .replace(/\{\{storeName\}\}/g, insight.storeName)
      .replace(/\{\{value\}\}/g, insight.value.toString())
      .replace(/\{\{metric\}\}/g, insight.title)
      .replace(/\{\{description\}\}/g, insight.description)
      .replace(/\{\{referralCode\}\}/g, referralCode || 'FINI2024');

    // Agregar emoji de tendencia si hay cambio
    if (insight.change !== undefined) {
      const trendEmoji = insight.changeType === 'positive' ? '📈' : 
                        insight.changeType === 'negative' ? '📉' : '➡️';
      content = content.replace(/\{\{trendEmoji\}\}/g, trendEmoji);
    }

    return {
      content,
      hashtags: template.hashtags || [],
      imageTemplate: template.imageTemplate,
      dimensions: template.dimensions
    };
  }

  /**
   * Comparte en plataforma específica
   */
  async shareToplatform(
    insight: ShareableInsight,
    platform: ShareTemplate['platform'],
    referralCode?: string
  ): Promise<ShareResult> {
    try {
      const templateId = this.getTemplateIdForPlatform(platform);
      const shareContent = this.generateShareContent(insight, templateId, referralCode);
      
      const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generar URL de compartir según la plataforma
      const shareUrl = this.generateShareUrl(platform, shareContent);
      
      const result: ShareResult = {
        success: true,
        url: shareUrl,
        platform,
        analytics: {
          shareId,
          timestamp: new Date(),
          referralCode
        }
      };

      // Guardar en historial
      const userHistory = this.shareHistory.get(insight.userId) || [];
      userHistory.push(result);
      this.shareHistory.set(insight.userId, userHistory);

      // Log event
      logger.info('[VIRAL-SHARING] Content shared', {
        event: 'Content Shared',
        userId: insight.userId,
        properties: {
          shareId,
          platform,
          insightType: insight.type,
          insightTitle: insight.title,
          storeName: insight.storeName,
          storeId: insight.storeId,
          referralCode,
          hasReferralCode: !!referralCode,
          timestamp: new Date().toISOString()
        }
      });

      return result;

    } catch (error) {
      const result: ShareResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform,
        analytics: {
          shareId: `error_${Date.now()}`,
          timestamp: new Date()
        }
      };

      // Log error
      logger.error('[VIRAL-SHARING] Content share failed', {
        event: 'Content Share Failed',
        userId: insight.userId,
        properties: {
          platform,
          error: result.error,
          insightType: insight.type,
          timestamp: new Date().toISOString()
        }
      });

      return result;
    }
  }

  /**
   * Obtiene template ID para plataforma
   */
  private getTemplateIdForPlatform(platform: ShareTemplate['platform']): string {
    const templateMap: Record<ShareTemplate['platform'], string> = {
      instagram: 'instagram-story',
      facebook: 'facebook-post',
      twitter: 'twitter-post',
      linkedin: 'linkedin-post',
      whatsapp: 'whatsapp-message',
      general: 'general-share'
    };

    return templateMap[platform];
  }

  /**
   * Genera URL de compartir para cada plataforma
   */
  private generateShareUrl(
    platform: ShareTemplate['platform'],
    content: { content: string; hashtags: string[] }
  ): string {
    const encodedContent = encodeURIComponent(content.content);
    const hashtags = content.hashtags.map(tag => `%23${tag}`).join(' ');
    
    const baseUrls = {
      instagram: `https://www.instagram.com/`, // Instagram no tiene URL directa
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodedContent}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedContent}&hashtags=${content.hashtags.join(',')}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodedContent}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodedContent}`,
      general: `${window.location.href}?share=${encodedContent}`
    };

    return baseUrls[platform];
  }

  /**
   * Genera imagen para compartir
   */
  async generateShareImage(
    insight: ShareableInsight,
    templateId: string
  ): Promise<string> {
    // Aquí implementarías la generación de imagen usando Canvas API o similar
    // Por ahora retornamos una URL placeholder
    return `https://api.fini.ai/share-image/${insight.id}?template=${templateId}`;
  }

  /**
   * Obtiene estadísticas de compartir para un usuario
   */
  getShareStats(userId: string): {
    totalShares: number;
    sharesByPlatform: Record<string, number>;
    recentShares: ShareResult[];
    viralScore: number;
  } {
    const userHistory = this.shareHistory.get(userId) || [];
    
    const sharesByPlatform = userHistory.reduce((acc, share) => {
      acc[share.platform] = (acc[share.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcular score viral basado en frecuencia y diversidad de plataformas
    const platformDiversity = Object.keys(sharesByPlatform).length;
    const totalShares = userHistory.length;
    const viralScore = Math.min(100, (totalShares * 10) + (platformDiversity * 15));

    return {
      totalShares,
      sharesByPlatform,
      recentShares: userHistory.slice(-10),
      viralScore
    };
  }

  /**
   * Obtiene templates disponibles
   */
  getAvailableTemplates(): ShareTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Crea insights automáticos para compartir
   */
  async createAutomaticInsights(
    storeId: string,
    userId: string,
    storeName: string,
    metrics: Record<string, any>
  ): Promise<ShareableInsight[]> {
    const insights: ShareableInsight[] = [];

    // Milestone de ventas
    if (metrics.totalSales && metrics.totalSales > 0) {
      const salesMilestones = [1000, 5000, 10000, 25000, 50000, 100000];
      const currentMilestone = salesMilestones.find(milestone => 
        metrics.totalSales >= milestone && metrics.totalSales < milestone * 2
      );

      if (currentMilestone) {
        insights.push(this.createShareableInsight({
          type: 'milestone',
          title: 'Milestone de Ventas',
          description: `¡Hemos superado los $${currentMilestone.toLocaleString()} en ventas! 🎉`,
          value: `$${metrics.totalSales.toLocaleString()}`,
          change: metrics.salesGrowth,
          changeType: metrics.salesGrowth > 0 ? 'positive' : 'neutral',
          storeName,
          storeId,
          userId,
          metadata: { milestone: currentMilestone }
        }));
      }
    }

    // Logro de crecimiento
    if (metrics.growth && metrics.growth > 20) {
      insights.push(this.createShareableInsight({
        type: 'achievement',
        title: 'Crecimiento Excepcional',
        description: `¡Crecimiento del ${metrics.growth}% este mes! El esfuerzo está dando frutos. 📈`,
        value: `+${metrics.growth}%`,
        change: metrics.growth,
        changeType: 'positive',
        storeName,
        storeId,
        userId,
        metadata: { growthRate: metrics.growth }
      }));
    }

    // Insight de productos top
    if (metrics.topProduct) {
      insights.push(this.createShareableInsight({
        type: 'insight',
        title: 'Producto Estrella',
        description: `${metrics.topProduct.name} es nuestro producto más vendido con ${metrics.topProduct.sales} ventas. 🌟`,
        value: metrics.topProduct.sales,
        storeName,
        storeId,
        userId,
        metadata: { productName: metrics.topProduct.name }
      }));
    }

    return insights;
  }
}

// Instancia singleton
export const viralSharing = ViralSharingSystem.getInstance();

// Utilidades para componentes React
export const useViralSharing = () => {
  const shareInsight = async (
    insight: ShareableInsight,
    platform: ShareTemplate['platform'],
    referralCode?: string
  ) => {
    return await viralSharing.shareToplatform(insight, platform, referralCode);
  };

  const getShareStats = (userId: string) => {
    return viralSharing.getShareStats(userId);
  };

  const getTemplates = () => {
    return viralSharing.getAvailableTemplates();
  };

  return {
    shareInsight,
    getShareStats,
    getTemplates,
    createInsight: viralSharing.createShareableInsight.bind(viralSharing),
    generateContent: viralSharing.generateShareContent.bind(viralSharing)
  };
}; 