/**
 * Anomaly Detection System
 * Detects suspicious access patterns and potential security threats
 */

interface AccessEvent {
  userId: string;
  storeId: string;
  operation: string;
  timestamp: number;
  ip?: string;
  userAgent?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

interface AnomalyResult {
  isAnomalous: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  confidence: number;
  suggestedAction: string;
}

interface UserPattern {
  userId: string;
  averageRequestsPerHour: number;
  commonOperations: string[];
  usualHours: number[];
  typicalStores: string[];
  lastSeen: number;
  suspiciousEvents: number;
}

/**
 * In-memory anomaly detection system
 * TODO: Integrate with ML models and persistent storage
 */
class AnomalyDetector {
  private userPatterns: Map<string, UserPattern> = new Map();
  private recentEvents: AccessEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events

  /**
   * Analyze an access event for anomalies
   */
  async analyzeEvent(event: AccessEvent): Promise<AnomalyResult> {
    // Update user pattern
    this.updateUserPattern(event);
    
    // Store recent event
    this.addEvent(event);
    
    // Run anomaly checks
    const checks = await Promise.all([
      this.checkRapidRequests(event),
      this.checkUnusualHours(event),
      this.checkNewStoreAccess(event),
      this.checkFailurePatterns(event),
      this.checkSuspiciousOperations(event),
      this.checkMassiveDataAccess(event)
    ]);
    
    // Aggregate results
    const anomalies = checks.filter(check => check.isAnomalous);
    
    if (anomalies.length === 0) {
      return {
        isAnomalous: false,
        severity: 'low',
        reason: 'Normal access pattern',
        confidence: 0.1,
        suggestedAction: 'None'
      };
    }
    
    // Calculate severity based on anomalies
    const maxSeverity = this.getMaxSeverity(anomalies.map(a => a.severity));
    const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
    
    return {
      isAnomalous: true,
      severity: maxSeverity,
      reason: anomalies.map(a => a.reason).join('; '),
      confidence: avgConfidence,
      suggestedAction: this.getSuggestedAction(maxSeverity, anomalies)
    };
  }
  
  /**
   * Check for rapid successive requests (potential automation/bot)
   */
  private async checkRapidRequests(event: AccessEvent): Promise<AnomalyResult> {
    const recentUserEvents = this.recentEvents
      .filter(e => e.userId === event.userId && e.timestamp > event.timestamp - 60000) // Last minute
      .length;
    
    if (recentUserEvents > 20) {
      return {
        isAnomalous: true,
        severity: 'high',
        reason: `${recentUserEvents} requests in last minute (possible bot activity)`,
        confidence: 0.9,
        suggestedAction: 'Temporary rate limiting'
      };
    }
    
    if (recentUserEvents > 10) {
      return {
        isAnomalous: true,
        severity: 'medium',
        reason: `${recentUserEvents} requests in last minute (elevated activity)`,
        confidence: 0.7,
        suggestedAction: 'Enhanced monitoring'
      };
    }
    
    return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
  }
  
  /**
   * Check for unusual access hours
   */
  private async checkUnusualHours(event: AccessEvent): Promise<AnomalyResult> {
    const userPattern = this.userPatterns.get(event.userId);
    if (!userPattern) return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
    
    const hour = new Date(event.timestamp).getHours();
    const isUsualHour = userPattern.usualHours.includes(hour);
    
    if (!isUsualHour && userPattern.usualHours.length > 5) {
      return {
        isAnomalous: true,
        severity: 'medium',
        reason: `Access at unusual hour ${hour}:00 (usual: ${userPattern.usualHours.join(', ')})`,
        confidence: 0.6,
        suggestedAction: 'Log and monitor'
      };
    }
    
    return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
  }
  
  /**
   * Check for access to new/unusual stores
   */
  private async checkNewStoreAccess(event: AccessEvent): Promise<AnomalyResult> {
    const userPattern = this.userPatterns.get(event.userId);
    if (!userPattern) return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
    
    const isNewStore = !userPattern.typicalStores.includes(event.storeId);
    
    if (isNewStore && userPattern.typicalStores.length > 0) {
      return {
        isAnomalous: true,
        severity: 'medium',
        reason: `Access to new store ${event.storeId} (usual stores: ${userPattern.typicalStores.length})`,
        confidence: 0.5,
        suggestedAction: 'Verify store ownership'
      };
    }
    
    return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
  }
  
  /**
   * Check for patterns of failed requests
   */
  private async checkFailurePatterns(event: AccessEvent): Promise<AnomalyResult> {
    const recentFailures = this.recentEvents
      .filter(e => 
        e.userId === event.userId && 
        !e.success && 
        e.timestamp > event.timestamp - 300000 // Last 5 minutes
      ).length;
    
    if (recentFailures > 5) {
      return {
        isAnomalous: true,
        severity: 'high',
        reason: `${recentFailures} failed requests in 5 minutes (possible attack)`,
        confidence: 0.8,
        suggestedAction: 'Account verification required'
      };
    }
    
    return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
  }
  
  /**
   * Check for suspicious operations
   */
  private async checkSuspiciousOperations(event: AccessEvent): Promise<AnomalyResult> {
    const suspiciousOps = ['data_indexing', 'bulk_export', 'admin_access'];
    
    if (suspiciousOps.includes(event.operation)) {
      const userPattern = this.userPatterns.get(event.userId);
      const isCommonOp = userPattern?.commonOperations.includes(event.operation);
      
      if (!isCommonOp) {
        return {
          isAnomalous: true,
          severity: 'high',
          reason: `Unusual privileged operation: ${event.operation}`,
          confidence: 0.7,
          suggestedAction: 'Admin verification required'
        };
      }
    }
    
    return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
  }
  
  // No geographic anomaly detection implemented - return clean result
  private async checkMassiveDataAccess(event: AccessEvent): Promise<AnomalyResult> {
    // TODO: Implement IP geolocation checks
    // For now, just check for rapid location changes
    
    return { isAnomalous: false, severity: 'low', reason: '', confidence: 0, suggestedAction: '' };
  }
  
  /**
   * Update user behavior pattern
   */
  private updateUserPattern(event: AccessEvent): void {
    const existing = this.userPatterns.get(event.userId);
    const hour = new Date(event.timestamp).getHours();
    
    if (!existing) {
      this.userPatterns.set(event.userId, {
        userId: event.userId,
        averageRequestsPerHour: 1,
        commonOperations: [event.operation],
        usualHours: [hour],
        typicalStores: [event.storeId],
        lastSeen: event.timestamp,
        suspiciousEvents: 0
      });
      return;
    }
    
    // Update pattern
    existing.lastSeen = event.timestamp;
    
    // Update operations
    if (!existing.commonOperations.includes(event.operation)) {
      existing.commonOperations.push(event.operation);
      if (existing.commonOperations.length > 10) {
        existing.commonOperations = existing.commonOperations.slice(-10);
      }
    }
    
    // Update hours
    if (!existing.usualHours.includes(hour)) {
      existing.usualHours.push(hour);
      if (existing.usualHours.length > 12) {
        existing.usualHours = existing.usualHours.slice(-12);
      }
    }
    
    // Update stores
    if (!existing.typicalStores.includes(event.storeId)) {
      existing.typicalStores.push(event.storeId);
      if (existing.typicalStores.length > 5) {
        existing.typicalStores = existing.typicalStores.slice(-5);
      }
    }
  }
  
  /**
   * Add event to recent events
   */
  private addEvent(event: AccessEvent): void {
    this.recentEvents.push(event);
    
    // Keep only recent events
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents = this.recentEvents.slice(-this.maxEvents);
    }
  }
  
  /**
   * Get maximum severity from list
   */
  private getMaxSeverity(severities: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }
  
  /**
   * Get suggested action based on anomalies
   */
  private getSuggestedAction(severity: string, anomalies: AnomalyResult[]): string {
    switch (severity) {
      case 'critical':
        return 'Immediate account suspension and investigation';
      case 'high':
        return 'Enhanced verification and temporary restrictions';
      case 'medium':
        return 'Additional monitoring and user notification';
      default:
        return 'Log for pattern analysis';
    }
  }
  
  /**
   * Get user pattern statistics
   */
  getUserPattern(userId: string): UserPattern | undefined {
    return this.userPatterns.get(userId);
  }
  
  /**
   * Get global anomaly statistics
   */
  getAnomalyStats(): {
    totalUsers: number;
    totalEvents: number;
    suspiciousUsers: number;
    recentAnomalies: number;
  } {
    const suspiciousUsers = Array.from(this.userPatterns.values())
      .filter(pattern => pattern.suspiciousEvents > 0).length;
    
    const recentAnomalies = this.recentEvents
      .filter(event => event.timestamp > Date.now() - 3600000) // Last hour
      .length;
    
    return {
      totalUsers: this.userPatterns.size,
      totalEvents: this.recentEvents.length,
      suspiciousUsers,
      recentAnomalies
    };
  }
}

// Singleton instance
const anomalyDetector = new AnomalyDetector();

/**
 * Analyze access event for anomalies
 */
export async function detectAnomalies(event: AccessEvent): Promise<AnomalyResult> {
  return anomalyDetector.analyzeEvent(event);
}

/**
 * Get user behavioral pattern
 */
export function getUserBehaviorPattern(userId: string): UserPattern | undefined {
  return anomalyDetector.getUserPattern(userId);
}

/**
 * Get system-wide anomaly statistics
 */
export function getAnomalyStatistics(): {
  totalUsers: number;
  totalEvents: number;
  suspiciousUsers: number;
  recentAnomalies: number;
} {
  return anomalyDetector.getAnomalyStats();
}

/**
 * Log security event with anomaly detection
 */
export async function logSecurityEventWithDetection(event: Omit<AccessEvent, 'timestamp'>): Promise<void> {
  const fullEvent: AccessEvent = {
    ...event,
    timestamp: Date.now()
  };
  
  const anomalyResult = await detectAnomalies(fullEvent);
  
  if (anomalyResult.isAnomalous) {
    console.warn(`[SECURITY:ANOMALY] ${anomalyResult.severity.toUpperCase()} - ${anomalyResult.reason}`, {
      event: fullEvent,
      confidence: anomalyResult.confidence,
      action: anomalyResult.suggestedAction
    });
    
    // TODO: Send alerts for high/critical anomalies
    if (anomalyResult.severity === 'high' || anomalyResult.severity === 'critical') {
      // await sendSecurityAlert(anomalyResult, fullEvent);
    }
  }
}

export { anomalyDetector }; 