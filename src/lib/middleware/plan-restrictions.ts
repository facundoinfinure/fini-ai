import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlanType, PlanRestrictions, hasFeature, canAddStore, PlanFeatures } from '@/lib/plan-restrictions';

interface PlanCheckResult {
  success: boolean;
  plan?: PlanType;
  error?: string;
  restrictions?: PlanRestrictions;
}

/**
 * Middleware to check user plan and restrictions
 */
export async function checkUserPlan(request: NextRequest): Promise<PlanCheckResult> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Get user plan from database
    let userPlan: PlanType = 'basic'; // Default
    
    try {
      const { data: userData, error: planError } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', user.id)
        .single();
      
      if (!planError && userData?.subscription_plan) {
        // Map old plan names to new ones if needed
        const planMapping: Record<string, PlanType> = {
          'free': 'basic',
          'basic': 'basic',
          'pro': 'pro',
          'enterprise': 'pro' // Map enterprise to pro
        };
        
        userPlan = planMapping[userData.subscription_plan] || 'basic';
      }
    } catch (error) {
      console.log('[INFO] Using default plan (basic) - user profile may not exist yet');
    }

    return {
      success: true,
      plan: userPlan,
      restrictions: new PlanRestrictions(userPlan)
    };
    
  } catch (error) {
    console.error('[ERROR] Failed to check user plan:', error);
    return {
      success: false,
      error: 'Failed to check user plan'
    };
  }
}

/**
 * Require specific feature access
 */
export async function requireFeature(
  request: NextRequest, 
  feature: keyof PlanFeatures
): Promise<{ success: boolean; plan?: PlanType; error?: string }> {
  const planCheck = await checkUserPlan(request);
  
  if (!planCheck.success) {
    return planCheck;
  }
  
  const { plan, restrictions } = planCheck;
  
  try {
    restrictions!.requireFeature(feature);
    return { success: true, plan };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Feature not available'
    };
  }
}

/**
 * Check store limit before adding new store
 */
export async function checkStoreLimit(
  request: NextRequest,
  currentStoreCount: number
): Promise<{ success: boolean; plan?: PlanType; error?: string }> {
  const planCheck = await checkUserPlan(request);
  
  if (!planCheck.success) {
    return planCheck;
  }
  
  const { plan, restrictions } = planCheck;
  
  try {
    restrictions!.checkStoreLimit(currentStoreCount);
    return { success: true, plan };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Store limit exceeded'
    };
  }
}

/**
 * Helper to create error responses for plan restrictions
 */
export function createPlanErrorResponse(error: string, statusCode: number = 403) {
  return NextResponse.json({
    success: false,
    error,
    upgrade_required: true,
    upgrade_url: '/dashboard?tab=subscription'
  }, { status: statusCode });
}

/**
 * Decorator function for API routes to check feature access
 */
export function withFeatureAccess(feature: keyof PlanFeatures) {
  return function(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
    return async function(req: NextRequest, context?: any): Promise<NextResponse> {
      const featureCheck = await requireFeature(req, feature);
      
      if (!featureCheck.success) {
        return createPlanErrorResponse(
          featureCheck.error || 'Feature not available',
          featureCheck.error === 'User not authenticated' ? 401 : 403
        );
      }
      
      // Add plan info to request headers for use in handler
      req.headers.set('x-user-plan', featureCheck.plan!);
      
      return handler(req, context);
    };
  };
}

/**
 * Decorator function for API routes to check store limits
 */
export function withStoreLimit() {
  return function(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
    return async function(req: NextRequest, context?: any): Promise<NextResponse> {
      const planCheck = await checkUserPlan(req);
      
      if (!planCheck.success) {
        return createPlanErrorResponse(
          planCheck.error || 'Authentication required',
          401
        );
      }
      
      // Get current store count
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return createPlanErrorResponse('User not authenticated', 401);
      }
      
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (storesError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to check store count'
        }, { status: 500 });
      }
      
      const currentStoreCount = stores?.length || 0;
      
      const storeCheck = await checkStoreLimit(req, currentStoreCount);
      
      if (!storeCheck.success) {
        return createPlanErrorResponse(storeCheck.error!);
      }
      
      // Add plan and store info to request headers
      req.headers.set('x-user-plan', storeCheck.plan!);
      req.headers.set('x-current-store-count', currentStoreCount.toString());
      
      return handler(req, context);
    };
  };
}

/**
 * Utility to get plan from request headers (set by middleware)
 */
export function getPlanFromRequest(request: NextRequest): PlanType {
  return (request.headers.get('x-user-plan') as PlanType) || 'basic';
} 