import { NextRequest, NextResponse } from 'next/server';

import { getStoreAccessStats } from '@/lib/security/store-access';
import { getRateLimitStatus } from '@/lib/security/rate-limiter';
import { getAnomalyStatistics, getUserBehaviorPattern } from '@/lib/security/anomaly-detector';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

/**
 * GET /api/security/dashboard
 * Returns comprehensive security dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`[SECURITY:DASHBOARD] Generating security dashboard for user ${userId}`);

    // Get parallel security data
    const [
      anomalyStats,
      userPattern,
      storeStats,
      rateLimitStatus
    ] = await Promise.all([
      getAnomalyStatistics(),
      getUserBehaviorPattern(userId),
      storeId ? getStoreAccessStats(userId) : null,
      storeId ? getRateLimitStatus(storeId, userId) : null
    ]);

    // Calculate security score
    const securityScore = calculateSecurityScore({
      anomalyStats,
      userPattern,
      rateLimitStatus
    });

    // Prepare dashboard data
    const dashboardData = {
      overview: {
        securityScore,
        status: getSecurityStatus(securityScore),
        lastUpdated: new Date().toISOString()
      },
      
      userActivity: {
        pattern: userPattern ? {
          userId: userPattern.userId,
          averageRequestsPerHour: userPattern.averageRequestsPerHour,
          commonOperations: userPattern.commonOperations,
          usualHours: userPattern.usualHours,
          typicalStores: userPattern.typicalStores.length,
          lastSeen: new Date(userPattern.lastSeen).toISOString(),
          suspiciousEvents: userPattern.suspiciousEvents
        } : null,
        
        stores: storeStats ? {
          totalStores: storeStats.totalStores,
          activeStores: storeStats.activeStores,
          lastAccessed: storeStats.lastAccessed,
          recentActivity: storeStats.recentActivity
        } : null
      },
      
      rateLimits: rateLimitStatus ? Object.entries(rateLimitStatus).map(([operation, status]) => ({
        operation,
        storeRemaining: status.store.remaining,
        userRemaining: status.user.remaining,
        healthy: status.healthy,
        storeResetTime: new Date(status.store.resetTime).toISOString(),
        userResetTime: new Date(status.user.resetTime).toISOString()
      })) : [],
      
      anomalies: {
        totalUsers: anomalyStats.totalUsers,
        totalEvents: anomalyStats.totalEvents,
        suspiciousUsers: anomalyStats.suspiciousUsers,
        recentAnomalies: anomalyStats.recentAnomalies,
        threatLevel: getThreatLevel(anomalyStats)
      },
      
      recommendations: generateSecurityRecommendations({
        securityScore,
        userPattern,
        anomalyStats,
        rateLimitStatus
      }),
      
      alerts: generateSecurityAlerts({
        userPattern,
        anomalyStats,
        rateLimitStatus
      })
    };

    console.log(`[SECURITY:DASHBOARD] Dashboard generated - Security Score: ${securityScore}`);

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('[SECURITY:DASHBOARD] Failed to generate dashboard:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate overall security score (0-100)
 */
function calculateSecurityScore(data: {
  anomalyStats: any;
  userPattern: any;
  rateLimitStatus: any;
}): number {
  let score = 100;
  
  // Deduct for anomalies
  if (data.anomalyStats.suspiciousUsers > 0) {
    score -= Math.min(data.anomalyStats.suspiciousUsers * 10, 30);
  }
  
  // Deduct for recent anomalies
  if (data.anomalyStats.recentAnomalies > 10) {
    score -= Math.min(data.anomalyStats.recentAnomalies * 2, 20);
  }
  
  // Deduct for suspicious user behavior
  if (data.userPattern?.suspiciousEvents > 0) {
    score -= Math.min(data.userPattern.suspiciousEvents * 5, 25);
  }
  
  // Deduct for rate limit issues
  if (data.rateLimitStatus) {
    const unhealthyLimits = Object.values(data.rateLimitStatus)
      .filter((status: any) => !status.healthy).length;
    score -= unhealthyLimits * 5;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Get security status based on score
 */
function getSecurityStatus(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}

/**
 * Get threat level
 */
function getThreatLevel(anomalyStats: any): string {
  const suspiciousRatio = anomalyStats.totalUsers > 0 
    ? anomalyStats.suspiciousUsers / anomalyStats.totalUsers 
    : 0;
  
  if (suspiciousRatio > 0.1) return 'high';
  if (suspiciousRatio > 0.05) return 'medium';
  if (anomalyStats.recentAnomalies > 5) return 'medium';
  return 'low';
}

/**
 * Generate security recommendations
 */
function generateSecurityRecommendations(data: any): string[] {
  const recommendations: string[] = [];
  
  if (data.securityScore < 60) {
    recommendations.push('Consider enabling two-factor authentication');
    recommendations.push('Review recent access patterns for unusual activity');
  }
  
  if (data.userPattern?.suspiciousEvents > 0) {
    recommendations.push('Investigate recent suspicious activities');
    recommendations.push('Consider temporary enhanced monitoring');
  }
  
  if (data.anomalyStats.recentAnomalies > 10) {
    recommendations.push('System-wide security review recommended');
    recommendations.push('Consider implementing stricter rate limits');
  }
  
  if (data.rateLimitStatus) {
    const unhealthyLimits = Object.values(data.rateLimitStatus)
      .filter((status: any) => !status.healthy);
    
    if (unhealthyLimits.length > 0) {
      recommendations.push(`Monitor usage - ${unhealthyLimits.length} rate limits approaching thresholds`);
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Security posture is good - continue monitoring');
  }
  
  return recommendations;
}

/**
 * Generate security alerts
 */
function generateSecurityAlerts(data: any): Array<{
  severity: string;
  message: string;
  timestamp: string;
}> {
  const alerts: Array<{
    severity: string;
    message: string;
    timestamp: string;
  }> = [];
  
  const now = new Date().toISOString();
  
  if (data.userPattern?.suspiciousEvents > 3) {
    alerts.push({
      severity: 'high',
      message: `User has ${data.userPattern.suspiciousEvents} suspicious events`,
      timestamp: now
    });
  }
  
  if (data.anomalyStats.recentAnomalies > 15) {
    alerts.push({
      severity: 'medium',
      message: `${data.anomalyStats.recentAnomalies} anomalies detected in the last hour`,
      timestamp: now
    });
  }
  
  if (data.rateLimitStatus) {
    const criticalLimits = Object.entries(data.rateLimitStatus)
      .filter(([_, status]: [string, any]) => 
        status.store.remaining < 5 || status.user.remaining < 5
      );
    
    criticalLimits.forEach(([operation, _]) => {
      alerts.push({
        severity: 'medium',
        message: `Rate limit for ${operation} nearly exceeded`,
        timestamp: now
      });
    });
  }
  
  return alerts;
} 