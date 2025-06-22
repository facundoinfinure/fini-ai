import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const PLANS = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: 'Plan Pro',
    price: 39
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    name: 'Plan Enterprise', 
    price: 99
  }
};

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

    // Parse request body
    const { plan, successUrl, cancelUrl } = await request.json();

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid plan specified'
      }, { status: 400 });
    }

    const selectedPlan = PLANS[plan as keyof typeof PLANS];

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    console.log('[INFO] Stripe checkout session created:', checkoutSession.id);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
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