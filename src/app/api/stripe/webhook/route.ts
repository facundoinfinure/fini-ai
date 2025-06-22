import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Processing Stripe webhook');
    
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[ERROR] No Stripe signature found');
      return NextResponse.json({
        success: false,
        error: 'No signature found'
      }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[ERROR] Webhook signature verification failed:', err);
      return NextResponse.json({
        success: false,
        error: 'Invalid signature'
      }, { status: 400 });
    }

    const supabase = createClient();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[INFO] Checkout session completed:', session.id);
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;

          if (userId && plan) {
            // Update user subscription in database
            const { error } = await supabase
              .from('users')
              .update({
                subscription_plan: plan,
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (error) {
              console.error('[ERROR] Failed to update user subscription:', error);
            } else {
              console.log('[INFO] User subscription updated successfully');
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[INFO] Subscription updated:', subscription.id);
        
        const userId = subscription.metadata?.userId;
        const plan = subscription.metadata?.plan;

        if (userId) {
          const status = subscription.status === 'active' ? 'active' : 'inactive';
          
          const { error } = await supabase
            .from('users')
            .update({
              subscription_plan: plan || 'free',
              subscription_status: status,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            console.error('[ERROR] Failed to update subscription status:', error);
          } else {
            console.log('[INFO] Subscription status updated successfully');
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[INFO] Subscription deleted:', subscription.id);
        
        const userId = subscription.metadata?.userId;

        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({
              subscription_plan: 'free',
              subscription_status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            console.error('[ERROR] Failed to update subscription status:', error);
          } else {
            console.log('[INFO] Subscription cancelled successfully');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('[INFO] Payment failed for invoice:', invoice.id);
        
        // Get subscription from invoice metadata or line items
        const subscriptionId = invoice.subscription || 
                             (invoice.lines.data[0]?.subscription as string);
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            const { error } = await supabase
              .from('users')
              .update({
                subscription_status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (error) {
              console.error('[ERROR] Failed to update subscription status:', error);
            } else {
              console.log('[INFO] Subscription marked as inactive due to payment failure');
            }
          }
        }
        break;
      }

      default:
        console.log(`[INFO] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[ERROR] Webhook processing failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 