import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { PlanType, PlanFeatures, getPlanFeatures, hasFeature, canAddStore, getUpgradeMessage } from '@/lib/plan-restrictions';

interface UsePlanRestrictionsReturn {
  plan: PlanType | null;
  features: PlanFeatures | null;
  loading: boolean;
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  canAddStore: (currentStoreCount: number) => boolean;
  getUpgradeMessage: (feature: string) => string;
  requiresUpgrade: (feature: keyof PlanFeatures) => boolean;
}

/**
 * Hook to check plan restrictions for the current user
 */
export function usePlanRestrictions(): UsePlanRestrictionsReturn {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserPlan() {
      if (!user || authLoading) {
        setLoading(authLoading);
        return;
      }

      try {
        // Fetch user subscription/plan from API
        const response = await fetch('/api/user/subscription');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Default to basic plan if no subscription found
            setPlan(data.plan || 'basic');
          } else {
            // Default to basic plan on error
            setPlan('basic');
          }
        } else {
          // Default to basic plan if API fails
          setPlan('basic');
        }
      } catch (error) {
        console.error('[ERROR] Failed to fetch user plan:', error);
        // Default to basic plan on error
        setPlan('basic');
      } finally {
        setLoading(false);
      }
    }

    fetchUserPlan();
  }, [user, authLoading]);

  const features = plan ? getPlanFeatures(plan) : null;

  return {
    plan,
    features,
    loading,
    hasFeature: (feature: keyof PlanFeatures) => plan ? hasFeature(plan, feature) : false,
    canAddStore: (currentStoreCount: number) => plan ? canAddStore(plan, currentStoreCount) : false,
    getUpgradeMessage,
    requiresUpgrade: (feature: keyof PlanFeatures) => plan ? !hasFeature(plan, feature) : true,
  };
}

/**
 * Hook for plan-restricted features with upgrade prompts
 */
export function useFeatureAccess(feature: keyof PlanFeatures) {
  const { hasFeature, requiresUpgrade, getUpgradeMessage } = usePlanRestrictions();
  
  const checkAccess = () => {
    const allowed = hasFeature(feature);
    
    if (!allowed) {
      const message = getUpgradeMessage(feature as string);
      throw new Error(message);
    }
    
    return true;
  };

  return {
    allowed: hasFeature(feature),
    requiresUpgrade: requiresUpgrade(feature),
    upgradeMessage: getUpgradeMessage(feature as string),
    checkAccess,
  };
} 