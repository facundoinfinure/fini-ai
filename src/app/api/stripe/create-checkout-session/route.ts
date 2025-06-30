import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getOrCreateStripeCustomer, 
  createCheckoutSession, 
  getPriceIdForPlan 
} from '@/lib/integrations/stripe';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Creating Stripe checkout session');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('[ERROR] No authenticated user found:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;

    // Parse request body
    const { plan, billing, successUrl, cancelUrl } = await request.json();

    // Validate plan and billing
    if (!plan || !['basic', 'pro'].includes(plan)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid plan specified. Must be "basic" or "pro"'
      }, { status: 400 });
    }

    if (!billing || !['monthly', 'annual'].includes(billing)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid billing cycle specified. Must be "monthly" or "annual"'
      }, { status: 400 });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer({
      email: userEmail || '',
      name: userName,
      userId,
    });

    // Get price ID for the selected plan and billing cycle
    const priceId = getPriceIdForPlan(plan as 'basic' | 'pro', billing as 'monthly' | 'annual');

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      userId,
      plan: plan as 'basic' | 'pro',
      billing: billing as 'monthly' | 'annual',
    });

    console.log('[INFO] Stripe checkout session created:', checkoutSession.id);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
        customerId: customer.id,
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to create checkout session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 