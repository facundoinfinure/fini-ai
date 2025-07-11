/**
 * Gamification System - Sistema de Gamificación
 * Aumenta el engagement con achievements, badges, streaks y challenges
 */

import { segment, SegmentEvents } from '@/lib/analytics/segment-integration';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'sales' | 'engagement' | 'social' | 'learning' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  criteria: {
    type: 'count' | 'streak' | 'percentage' | 'time_based' | 'custom';
    target: number;
    metric: string;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  };
  rewards?: {
    type: 'discount' | 'feature_unlock' | 'badge' | 'title' | 'credit';
    value: any;
  }[];
  isSecret?: boolean;
  prerequisites?: string[]; // IDs de achievements requeridos
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  userId: string;
  unlockedAt: Date;
  progress: number;
  isCompleted: boolean;
  notificationSent: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  earnedBy: number; // Cantidad de usuarios que lo tienen
}

export interface Streak {
  id: string;
  userId: string;
  type: 'daily_login' | 'daily_chat' | 'weekly_analysis' | 'monthly_goal';
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  isActive: boolean;
  rewards: {
    day: number;
    reward: {
      type: string;
      value: any;
    };
  }[];
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  category: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  participants: number;
  criteria: {
    metric: string;
    target: number;
    operation: 'greater_than' | 'less_than' | 'equals' | 'between';
  };
  rewards: {
    position: 'winner' | 'top_10' | 'top_50' | 'participant';
    reward: {
      type: string;
      value: any;
    };
  }[];
}

export interface UserStats {
  userId: string;
  level: number;
  experience: number;
  totalPoints: number;
  achievementsUnlocked: number;
  badgesEarned: number;
  currentStreaks: Streak[];
  activeChallenges: Challenge[];
  rank: number;
  title?: string;
}

export interface LevelInfo {
  level: number;
  name: string;
  minExperience: number;
  maxExperience: number;
  benefits: string[];
  badge: string;
  color: string;
}

export class GamificationSystem {
  private static instance: GamificationSystem;
  private achievements: Map<string, Achievement> = new Map();
  private levels: LevelInfo[] = [];
  private userStats: Map<string, UserStats> = new Map();

  private constructor() {
    this.initializeAchievements();
    this.initializeLevels();
  }

  static getInstance(): GamificationSystem {
    if (!GamificationSystem.instance) {
      GamificationSystem.instance = new GamificationSystem();
    }
    return GamificationSystem.instance;
  }

  /**
   * Inicializa achievements predefinidos
   */
  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      // Achievements de ventas
      {
        id: 'first_sale',
        name: 'Primera Venta',
        description: 'Realiza tu primera venta',
        icon: '🎉',
        category: 'sales',
        rarity: 'common',
        points: 100,
        criteria: {
          type: 'count',
          target: 1,
          metric: 'total_sales'
        },
        rewards: [
          { type: 'badge', value: 'first_seller' },
          { type: 'credit', value: 10 }
        ]
      },
      {
        id: 'sales_milestone_1k',
        name: 'Mil en Ventas',
        description: 'Alcanza $1,000 en ventas totales',
        icon: '💰',
        category: 'milestone',
        rarity: 'rare',
        points: 500,
        criteria: {
          type: 'count',
          target: 1000,
          metric: 'total_sales_amount'
        },
        rewards: [
          { type: 'discount', value: 15 },
          { type: 'title', value: 'Vendedor Estrella' }
        ]
      },
      {
        id: 'sales_streak_7',
        name: 'Racha de Ventas',
        description: 'Vende durante 7 días consecutivos',
        icon: '🔥',
        category: 'sales',
        rarity: 'epic',
        points: 750,
        criteria: {
          type: 'streak',
          target: 7,
          metric: 'daily_sales'
        },
        rewards: [
          { type: 'feature_unlock', value: 'advanced_analytics' }
        ]
      },

      // Achievements de engagement
      {
        id: 'daily_user',
        name: 'Usuario Diario',
        description: 'Inicia sesión durante 7 días consecutivos',
        icon: '📅',
        category: 'engagement',
        rarity: 'common',
        points: 200,
        criteria: {
          type: 'streak',
          target: 7,
          metric: 'daily_login'
        }
      },
      {
        id: 'chat_enthusiast',
        name: 'Entusiasta del Chat',
        description: 'Envía 100 mensajes al chat de IA',
        icon: '💬',
        category: 'engagement',
        rarity: 'rare',
        points: 300,
        criteria: {
          type: 'count',
          target: 100,
          metric: 'chat_messages_sent'
        }
      },
      {
        id: 'analytics_pro',
        name: 'Pro de Analytics',
        description: 'Consulta analytics 30 días seguidos',
        icon: '📊',
        category: 'engagement',
        rarity: 'epic',
        points: 600,
        criteria: {
          type: 'streak',
          target: 30,
          metric: 'daily_analytics_view'
        }
      },

      // Achievements sociales
      {
        id: 'first_share',
        name: 'Primer Compartir',
        description: 'Comparte tu primer insight en redes sociales',
        icon: '📱',
        category: 'social',
        rarity: 'common',
        points: 150,
        criteria: {
          type: 'count',
          target: 1,
          metric: 'social_shares'
        }
      },
      {
        id: 'viral_sharer',
        name: 'Compartidor Viral',
        description: 'Comparte 50 insights en redes sociales',
        icon: '🌟',
        category: 'social',
        rarity: 'legendary',
        points: 1000,
        criteria: {
          type: 'count',
          target: 50,
          metric: 'social_shares'
        }
      },
      {
        id: 'referral_master',
        name: 'Maestro de Referidos',
        description: 'Refiere 10 usuarios exitosamente',
        icon: '👥',
        category: 'social',
        rarity: 'epic',
        points: 800,
        criteria: {
          type: 'count',
          target: 10,
          metric: 'successful_referrals'
        }
      },

      // Achievements de aprendizaje
      {
        id: 'tutorial_complete',
        name: 'Graduado',
        description: 'Completa todos los tutoriales',
        icon: '🎓',
        category: 'learning',
        rarity: 'common',
        points: 100,
        criteria: {
          type: 'percentage',
          target: 100,
          metric: 'tutorials_completed'
        }
      },
      {
        id: 'feature_explorer',
        name: 'Explorador de Funciones',
        description: 'Usa todas las funciones principales',
        icon: '🔍',
        category: 'learning',
        rarity: 'rare',
        points: 400,
        criteria: {
          type: 'percentage',
          target: 100,
          metric: 'features_used'
        }
      },

      // Achievements especiales
      {
        id: 'early_adopter',
        name: 'Adoptador Temprano',
        description: 'Únete durante el primer mes de lanzamiento',
        icon: '🚀',
        category: 'special',
        rarity: 'legendary',
        points: 1500,
        criteria: {
          type: 'time_based',
          target: 30,
          metric: 'days_since_launch'
        },
        isSecret: false
      },
      {
        id: 'feedback_hero',
        name: 'Héroe del Feedback',
        description: 'Proporciona 20 feedbacks útiles',
        icon: '💡',
        category: 'special',
        rarity: 'epic',
        points: 700,
        criteria: {
          type: 'count',
          target: 20,
          metric: 'feedback_provided'
        }
      }
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  /**
   * Inicializa niveles del sistema
   */
  private initializeLevels(): void {
    this.levels = [
      {
        level: 1,
        name: 'Novato',
        minExperience: 0,
        maxExperience: 500,
        benefits: ['Acceso básico a funciones'],
        badge: '🌱',
        color: '#10b981'
      },
      {
        level: 2,
        name: 'Emprendedor',
        minExperience: 500,
        maxExperience: 1500,
        benefits: ['Análisis avanzados', 'Soporte prioritario'],
        badge: '🚀',
        color: '#3b82f6'
      },
      {
        level: 3,
        name: 'Comerciante',
        minExperience: 1500,
        maxExperience: 3500,
        benefits: ['Funciones premium', 'Insights personalizados'],
        badge: '💼',
        color: '#8b5cf6'
      },
      {
        level: 4,
        name: 'Empresario',
        minExperience: 3500,
        maxExperience: 7500,
        benefits: ['Todas las funciones', 'Consultoría gratuita'],
        badge: '👑',
        color: '#f59e0b'
      },
      {
        level: 5,
        name: 'Magnate',
        minExperience: 7500,
        maxExperience: 15000,
        benefits: ['Acceso VIP', 'Funciones exclusivas', 'Soporte 24/7'],
        badge: '🏆',
        color: '#ef4444'
      },
      {
        level: 6,
        name: 'Leyenda',
        minExperience: 15000,
        maxExperience: Number.MAX_SAFE_INTEGER,
        benefits: ['Todo incluido', 'Influencia en roadmap', 'Reconocimiento especial'],
        badge: '⭐',
        color: '#6366f1'
      }
    ];
  }

  /**
   * Actualiza el progreso de un usuario en una métrica específica
   */
  async updateUserProgress(
    userId: string,
    metric: string,
    value: number,
    operation: 'increment' | 'set' = 'increment'
  ): Promise<void> {
    // Obtener achievements relevantes
    const relevantAchievements = Array.from(this.achievements.values())
      .filter(achievement => achievement.criteria.metric === metric);

    for (const achievement of relevantAchievements) {
      await this.checkAchievementProgress(userId, achievement, value, operation);
    }

    // Actualizar streaks si aplica
    if (metric.includes('daily_')) {
      await this.updateStreak(userId, metric);
    }

    // Trackear progreso
    await segment.track({
      event: 'Gamification Progress Updated',
      userId,
      properties: {
        metric,
        value,
        operation,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Verifica el progreso de un achievement específico
   */
  private async checkAchievementProgress(
    userId: string,
    achievement: Achievement,
    value: number,
    operation: 'increment' | 'set'
  ): Promise<void> {
    let userAchievement = await this.getUserAchievement(userId, achievement.id);
    
    if (!userAchievement) {
      userAchievement = {
        id: `ua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        achievementId: achievement.id,
        userId,
        unlockedAt: new Date(),
        progress: 0,
        isCompleted: false,
        notificationSent: false
      };
    }

    if (userAchievement.isCompleted) return;

    // Actualizar progreso según el tipo de criterio
    switch (achievement.criteria.type) {
      case 'count':
        if (operation === 'increment') {
          userAchievement.progress += value;
        } else {
          userAchievement.progress = value;
        }
        break;
        
      case 'percentage':
        userAchievement.progress = value;
        break;
        
      case 'streak':
        // Los streaks se manejan separadamente
        const streak = await this.getUserStreak(userId, achievement.criteria.metric);
        userAchievement.progress = streak?.currentStreak || 0;
        break;
    }

    // Verificar si se completó el achievement
    if (userAchievement.progress >= achievement.criteria.target) {
      await this.unlockAchievement(userId, achievement, userAchievement);
    }

    await this.saveUserAchievement(userAchievement);
  }

  /**
   * Desbloquea un achievement
   */
  private async unlockAchievement(
    userId: string,
    achievement: Achievement,
    userAchievement: UserAchievement
  ): Promise<void> {
    userAchievement.isCompleted = true;
    userAchievement.unlockedAt = new Date();

    // Otorgar experiencia
    await this.awardExperience(userId, achievement.points);

    // Aplicar recompensas
    if (achievement.rewards) {
      for (const reward of achievement.rewards) {
        await this.applyReward(userId, reward);
      }
    }

    // Trackear achievement desbloqueado
    await segment.track({
      event: 'Achievement Unlocked',
      userId,
      properties: {
        achievementId: achievement.id,
        achievementName: achievement.name,
        category: achievement.category,
        rarity: achievement.rarity,
        points: achievement.points,
        timestamp: new Date().toISOString()
      }
    });

    // Enviar notificación
    await this.sendAchievementNotification(userId, achievement);
  }

  /**
   * Otorga experiencia al usuario
   */
  private async awardExperience(userId: string, points: number): Promise<void> {
    const stats = await this.getUserStats(userId);
    
    const oldLevel = this.getLevelForExperience(stats.experience);
    stats.experience += points;
    stats.totalPoints += points;
    
    const newLevel = this.getLevelForExperience(stats.experience);
    
    // Verificar subida de nivel
    if (newLevel.level > oldLevel.level) {
      await this.levelUp(userId, newLevel);
    }

    await this.saveUserStats(stats);
  }

  /**
   * Maneja subida de nivel
   */
  private async levelUp(userId: string, newLevel: LevelInfo): Promise<void> {
    // Trackear subida de nivel
    await segment.track({
      event: 'Level Up',
      userId,
      properties: {
        newLevel: newLevel.level,
        levelName: newLevel.name,
        badge: newLevel.badge,
        benefits: newLevel.benefits,
        timestamp: new Date().toISOString()
      }
    });

    // Enviar notificación de subida de nivel
    await this.sendLevelUpNotification(userId, newLevel);
  }

  /**
   * Actualiza streak del usuario
   */
  private async updateStreak(userId: string, type: string): Promise<void> {
    let streak = await this.getUserStreak(userId, type);
    
    if (!streak) {
      streak = {
        id: `streak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: type as any,
        currentStreak: 1,
        longestStreak: 1,
        lastActivity: new Date(),
        isActive: true,
        rewards: []
      };
    } else {
      const today = new Date();
      const lastActivity = new Date(streak.lastActivity);
      const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Continúa la racha
        streak.currentStreak++;
        streak.lastActivity = today;
        
        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
        }
      } else if (daysDiff > 1) {
        // Se rompió la racha
        streak.currentStreak = 1;
        streak.lastActivity = today;
      }
      // Si daysDiff === 0, ya se actualizó hoy
    }

    await this.saveUserStreak(streak);

    // Verificar recompensas de streak
    await this.checkStreakRewards(userId, streak);
  }

  /**
   * Verifica recompensas de streak
   */
  private async checkStreakRewards(userId: string, streak: Streak): Promise<void> {
    const milestones = [7, 14, 30, 60, 100];
    
    for (const milestone of milestones) {
      if (streak.currentStreak === milestone) {
        const reward = {
          type: 'credit',
          value: milestone * 2 // 2 créditos por día de streak
        };
        
        await this.applyReward(userId, reward);
        
        await segment.track({
          event: 'Streak Milestone Reached',
          userId,
          properties: {
            streakType: streak.type,
            milestone,
            reward,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * Obtiene estadísticas del usuario
   */
  async getUserStats(userId: string): Promise<UserStats> {
    // Implementar lógica de base de datos
    return {
      userId,
      level: 1,
      experience: 0,
      totalPoints: 0,
      achievementsUnlocked: 0,
      badgesEarned: 0,
      currentStreaks: [],
      activeChallenges: [],
      rank: 1000
    };
  }

  /**
   * Obtiene nivel basado en experiencia
   */
  private getLevelForExperience(experience: number): LevelInfo {
    return this.levels.find(level => 
      experience >= level.minExperience && experience < level.maxExperience
    ) || this.levels[0];
  }

  /**
   * Obtiene achievements desbloqueados por el usuario
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    // Implementar lógica de base de datos
    return [];
  }

  /**
   * Obtiene leaderboard global
   */
  async getLeaderboard(limit: number = 50): Promise<Array<{
    userId: string;
    userName: string;
    level: number;
    experience: number;
    achievementsCount: number;
    rank: number;
  }>> {
    // Implementar lógica de leaderboard
    return [];
  }

  /**
   * Métodos de base de datos (implementar según tu ORM)
   */
  private async getUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
    return null;
  }

  private async saveUserAchievement(userAchievement: UserAchievement): Promise<void> {
    // Implementar guardado
  }

  private async getUserStreak(userId: string, type: string): Promise<Streak | null> {
    return null;
  }

  private async saveUserStreak(streak: Streak): Promise<void> {
    // Implementar guardado
  }

  private async saveUserStats(stats: UserStats): Promise<void> {
    // Implementar guardado
  }

  private async applyReward(userId: string, reward: any): Promise<void> {
    console.log(`Applying reward to user ${userId}:`, reward);
  }

  private async sendAchievementNotification(userId: string, achievement: Achievement): Promise<void> {
    // Implementar notificación
  }

  private async sendLevelUpNotification(userId: string, level: LevelInfo): Promise<void> {
    // Implementar notificación
  }
}

// Instancia singleton
export const gamificationSystem = GamificationSystem.getInstance();

// Hook para React
export const useGamification = () => {
  const updateProgress = async (metric: string, value: number, operation?: 'increment' | 'set') => {
    // Obtener userId del contexto de autenticación
    const userId = 'current-user'; // Implementar según tu sistema de auth
    return await gamificationSystem.updateUserProgress(userId, metric, value, operation);
  };

  const getStats = async () => {
    const userId = 'current-user';
    return await gamificationSystem.getUserStats(userId);
  };

  const getAchievements = async () => {
    const userId = 'current-user';
    return await gamificationSystem.getUserAchievements(userId);
  };

  const getLeaderboard = async (limit?: number) => {
    return await gamificationSystem.getLeaderboard(limit);
  };

  return {
    updateProgress,
    getStats,
    getAchievements,
    getLeaderboard
  };
}; 