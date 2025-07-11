/**
 * Referral System - Sistema de Referidos para Crecimiento Viral
 * Incentiva el crecimiento orgánico con recompensas y gamificación
 */

import { segment, SegmentEvents } from '@/lib/analytics/segment-integration';
import { createServiceClient } from '@/lib/supabase/server';

export interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  userName: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  totalUses: number;
  maxUses?: number;
  metadata?: Record<string, any>;
}

export interface ReferralReward {
  id: string;
  type: 'discount' | 'credit' | 'feature_unlock' | 'plan_upgrade' | 'cash';
  value: number;
  description: string;
  currency?: string;
  duration?: number; // En días
  conditions?: {
    minReferrals?: number;
    planRequired?: string;
    firstTimeOnly?: boolean;
  };
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  level: ReferralLevel;
  nextLevelProgress: number;
  rewards: ReferralReward[];
  leaderboardPosition?: number;
}

export interface ReferralLevel {
  id: string;
  name: string;
  minReferrals: number;
  rewards: ReferralReward[];
  badge: string;
  color: string;
  perks: string[];
}

export interface ReferralActivity {
  id: string;
  referralCodeId: string;
  referredUserId: string;
  referredUserEmail: string;
  status: 'pending' | 'completed' | 'cancelled';
  signupDate: Date;
  completionDate?: Date;
  rewardEarned?: ReferralReward;
  metadata?: Record<string, any>;
}

export class ReferralSystem {
  private static instance: ReferralSystem;
  private levels: ReferralLevel[] = [];
  private baseRewards: ReferralReward[] = [];

  private constructor() {
    this.initializeLevels();
    this.initializeRewards();
  }

  static getInstance(): ReferralSystem {
    if (!ReferralSystem.instance) {
      ReferralSystem.instance = new ReferralSystem();
    }
    return ReferralSystem.instance;
  }

  /**
   * Inicializa los niveles de referidos
   */
  private initializeLevels(): void {
    this.levels = [
      {
        id: 'starter',
        name: 'Starter',
        minReferrals: 0,
        badge: '🌱',
        color: '#10b981',
        rewards: [
          {
            id: 'starter_discount',
            type: 'discount',
            value: 10,
            description: '10% descuento por cada referido exitoso'
          }
        ],
        perks: ['Descuentos básicos', 'Acceso a comunidad']
      },
      {
        id: 'advocate',
        name: 'Advocate',
        minReferrals: 5,
        badge: '🚀',
        color: '#3b82f6',
        rewards: [
          {
            id: 'advocate_discount',
            type: 'discount',
            value: 15,
            description: '15% descuento por cada referido exitoso'
          },
          {
            id: 'advocate_credit',
            type: 'credit',
            value: 50,
            description: '$50 créditos por 5 referidos'
          }
        ],
        perks: ['Descuentos mejorados', 'Créditos bonus', 'Soporte prioritario']
      },
      {
        id: 'ambassador',
        name: 'Ambassador',
        minReferrals: 15,
        badge: '👑',
        color: '#f59e0b',
        rewards: [
          {
            id: 'ambassador_discount',
            type: 'discount',
            value: 20,
            description: '20% descuento por cada referido exitoso'
          },
          {
            id: 'ambassador_credit',
            type: 'credit',
            value: 150,
            description: '$150 créditos por 15 referidos'
          },
          {
            id: 'ambassador_feature',
            type: 'feature_unlock',
            value: 1,
            description: 'Acceso a funcionalidades exclusivas'
          }
        ],
        perks: ['Descuentos premium', 'Créditos grandes', 'Funcionalidades exclusivas', 'Acceso beta']
      },
      {
        id: 'legend',
        name: 'Legend',
        minReferrals: 50,
        badge: '🏆',
        color: '#8b5cf6',
        rewards: [
          {
            id: 'legend_discount',
            type: 'discount',
            value: 25,
            description: '25% descuento por cada referido exitoso'
          },
          {
            id: 'legend_cash',
            type: 'cash',
            value: 500,
            description: '$500 pago en efectivo por 50 referidos',
            currency: 'USD'
          },
          {
            id: 'legend_plan',
            type: 'plan_upgrade',
            value: 12,
            description: 'Plan Pro gratis por 12 meses'
          }
        ],
        perks: ['Descuentos máximos', 'Pagos en efectivo', 'Plan Pro gratuito', 'Consultoría 1-on-1']
      }
    ];
  }

  /**
   * Inicializa las recompensas base
   */
  private initializeRewards(): void {
    this.baseRewards = [
      {
        id: 'signup_bonus',
        type: 'credit',
        value: 10,
        description: '$10 créditos por cada usuario que se registre con tu código'
      },
      {
        id: 'first_purchase_bonus',
        type: 'credit',
        value: 25,
        description: '$25 créditos cuando tu referido hace su primera compra'
      },
      {
        id: 'monthly_active_bonus',
        type: 'credit',
        value: 5,
        description: '$5 créditos mensuales por cada referido activo'
      }
    ];
  }

  /**
   * Genera un código de referido único
   */
  async generateReferralCode(userId: string, userName: string): Promise<ReferralCode> {
    const code = this.generateUniqueCode(userName);
    
    const referralCode: ReferralCode = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code,
      userId,
      userName,
      createdAt: new Date(),
      isActive: true,
      totalUses: 0,
      metadata: {}
    };

    // Guardar en base de datos
    await this.saveReferralCode(referralCode);

    // Trackear evento
    await segment.track({
      event: 'Referral Code Generated',
      userId,
      properties: {
        referralCode: code,
        timestamp: new Date().toISOString()
      }
    });

    return referralCode;
  }

  /**
   * Genera código único basado en el nombre del usuario
   */
  private generateUniqueCode(userName: string): string {
    const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    
    return `${cleanName.slice(0, 4)}${timestamp}${random}`;
  }

  /**
   * Procesa un nuevo referido
   */
  async processReferral(
    referralCode: string,
    referredUserEmail: string,
    referredUserId: string
  ): Promise<ReferralActivity> {
    const code = await this.getReferralCode(referralCode);
    if (!code) {
      throw new Error('Código de referido no válido');
    }

    if (!code.isActive) {
      throw new Error('Código de referido inactivo');
    }

    if (code.maxUses && code.totalUses >= code.maxUses) {
      throw new Error('Código de referido ha alcanzado el límite de usos');
    }

    if (code.expiresAt && new Date() > code.expiresAt) {
      throw new Error('Código de referido expirado');
    }

    // Crear actividad de referido
    const activity: ReferralActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      referralCodeId: code.id,
      referredUserId,
      referredUserEmail,
      status: 'pending',
      signupDate: new Date(),
      metadata: {}
    };

    // Guardar actividad
    await this.saveReferralActivity(activity);

    // Actualizar contador del código
    await this.updateReferralCodeUsage(code.id);

    // Aplicar recompensa inicial (signup bonus)
    const signupReward = this.baseRewards.find(r => r.id === 'signup_bonus');
    if (signupReward) {
      await this.applyReward(code.userId, signupReward, activity.id);
    }

    // Trackear evento
    await segment.track({
      event: 'Referral Processed',
      userId: code.userId,
      properties: {
        referralCode: code.code,
        referredUserId,
        referredUserEmail,
        activityId: activity.id,
        timestamp: new Date().toISOString()
      }
    });

    return activity;
  }

  /**
   * Completa un referido cuando el usuario referido hace una acción específica
   */
  async completeReferral(
    activityId: string,
    completionType: 'first_purchase' | 'monthly_active' | 'custom'
  ): Promise<void> {
    const activity = await this.getReferralActivity(activityId);
    if (!activity) {
      throw new Error('Actividad de referido no encontrada');
    }

    if (activity.status !== 'pending') {
      throw new Error('Actividad de referido ya procesada');
    }

    // Marcar como completada
    activity.status = 'completed';
    activity.completionDate = new Date();

    // Aplicar recompensa correspondiente
    const reward = this.baseRewards.find(r => r.id === `${completionType}_bonus`);
    if (reward) {
      const code = await this.getReferralCode(activity.referralCodeId);
      if (code) {
        await this.applyReward(code.userId, reward, activityId);
        activity.rewardEarned = reward;
      }
    }

    // Actualizar actividad
    await this.updateReferralActivity(activity);

    // Verificar si el usuario subió de nivel
    await this.checkLevelUp(activity.referralCodeId);

    // Trackear evento
    await segment.track({
      event: 'Referral Completed',
      properties: {
        activityId,
        completionType,
        rewardValue: reward?.value || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Obtiene estadísticas de referidos para un usuario
   */
  async getReferralStats(userId: string): Promise<ReferralStats> {
    const activities = await this.getUserReferralActivities(userId);
    const totalReferrals = activities.length;
    const successfulReferrals = activities.filter(a => a.status === 'completed').length;
    const pendingReferrals = activities.filter(a => a.status === 'pending').length;
    
    // Calcular ganancias totales
    const totalEarnings = activities
      .filter(a => a.rewardEarned)
      .reduce((sum, a) => sum + (a.rewardEarned?.value || 0), 0);

    const conversionRate = totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;

    // Determinar nivel actual
    const currentLevel = this.getLevelForReferrals(successfulReferrals);
    const nextLevel = this.getNextLevel(currentLevel);
    const nextLevelProgress = nextLevel ? 
      ((successfulReferrals - currentLevel.minReferrals) / (nextLevel.minReferrals - currentLevel.minReferrals)) * 100 : 100;

    return {
      totalReferrals,
      successfulReferrals,
      pendingReferrals,
      totalEarnings,
      conversionRate,
      level: currentLevel,
      nextLevelProgress: Math.min(100, nextLevelProgress),
      rewards: currentLevel.rewards,
      leaderboardPosition: await this.getLeaderboardPosition(userId)
    };
  }

  /**
   * Obtiene el nivel correspondiente al número de referidos
   */
  private getLevelForReferrals(referrals: number): ReferralLevel {
    return this.levels
      .sort((a, b) => b.minReferrals - a.minReferrals)
      .find(level => referrals >= level.minReferrals) || this.levels[0];
  }

  /**
   * Obtiene el siguiente nivel
   */
  private getNextLevel(currentLevel: ReferralLevel): ReferralLevel | null {
    const currentIndex = this.levels.findIndex(l => l.id === currentLevel.id);
    return currentIndex < this.levels.length - 1 ? this.levels[currentIndex + 1] : null;
  }

  /**
   * Verifica si el usuario subió de nivel
   */
  private async checkLevelUp(referralCodeId: string): Promise<void> {
    const code = await this.getReferralCode(referralCodeId);
    if (!code) return;

    const stats = await this.getReferralStats(code.userId);
    const activities = await this.getUserReferralActivities(code.userId);
    const completedReferrals = activities.filter(a => a.status === 'completed').length;

    // Verificar si alcanzó un nuevo nivel
    const newLevel = this.getLevelForReferrals(completedReferrals);
    const previousLevel = this.getLevelForReferrals(completedReferrals - 1);

    if (newLevel.id !== previousLevel.id) {
      // ¡Subió de nivel!
      await this.processLevelUp(code.userId, newLevel);
    }
  }

  /**
   * Procesa subida de nivel
   */
  private async processLevelUp(userId: string, newLevel: ReferralLevel): Promise<void> {
    // Aplicar recompensas del nuevo nivel
    for (const reward of newLevel.rewards) {
      await this.applyReward(userId, reward, `levelup_${newLevel.id}`);
    }

    // Trackear evento
    await segment.track({
      event: 'Referral Level Up',
      userId,
      properties: {
        newLevel: newLevel.id,
        levelName: newLevel.name,
        badge: newLevel.badge,
        rewards: newLevel.rewards,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Obtiene posición en el leaderboard
   */
  private async getLeaderboardPosition(userId: string): Promise<number> {
    // Implementar lógica de leaderboard
    // Por ahora retornamos un valor simulado
    return Math.floor(Math.random() * 100) + 1;
  }

  /**
   * Obtiene el leaderboard de referidos
   */
  async getLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    userName: string;
    totalReferrals: number;
    level: ReferralLevel;
    position: number;
  }>> {
    // Implementar lógica de leaderboard real
    // Por ahora retornamos datos simulados
    return [];
  }

  /**
   * Genera URL de referido
   */
  generateReferralUrl(referralCode: string, baseUrl: string = 'https://app.fini.ai'): string {
    return `${baseUrl}/signup?ref=${referralCode}`;
  }

  /**
   * Métodos de base de datos (implementar según tu ORM)
   */
  private async saveReferralCode(code: ReferralCode): Promise<void> {
    // Implementar guardado en base de datos
  }

  private async getReferralCode(codeOrId: string): Promise<ReferralCode | null> {
    // Implementar búsqueda en base de datos
    return null;
  }

  private async saveReferralActivity(activity: ReferralActivity): Promise<void> {
    // Implementar guardado en base de datos
  }

  private async getReferralActivity(activityId: string): Promise<ReferralActivity | null> {
    // Implementar búsqueda en base de datos
    return null;
  }

  private async updateReferralActivity(activity: ReferralActivity): Promise<void> {
    // Implementar actualización en base de datos
  }

  private async updateReferralCodeUsage(codeId: string): Promise<void> {
    // Implementar actualización del contador
  }

  private async getUserReferralActivities(userId: string): Promise<ReferralActivity[]> {
    // Implementar búsqueda de actividades del usuario
    return [];
  }

  private async applyReward(userId: string, reward: ReferralReward, activityId: string): Promise<void> {
    // Implementar aplicación de recompensa
    console.log(`Applying reward ${reward.id} to user ${userId}: ${reward.description}`);
  }
}

// Instancia singleton
export const referralSystem = ReferralSystem.getInstance();

// Hook para React
export const useReferralSystem = () => {
  const generateCode = async (userId: string, userName: string) => {
    return await referralSystem.generateReferralCode(userId, userName);
  };

  const processReferral = async (code: string, email: string, userId: string) => {
    return await referralSystem.processReferral(code, email, userId);
  };

  const getStats = async (userId: string) => {
    return await referralSystem.getReferralStats(userId);
  };

  const getLeaderboard = async (limit?: number) => {
    return await referralSystem.getLeaderboard(limit);
  };

  const generateUrl = (code: string) => {
    return referralSystem.generateReferralUrl(code);
  };

  return {
    generateCode,
    processReferral,
    getStats,
    getLeaderboard,
    generateUrl
  };
}; 