import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, mapStripePlanToAppPlan, verifyWebhookSignature } from '@/lib/integrations/stripe';
import { headers } from 'next/headers';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Send welcome message to user after successful subscription
 */
async function sendWelcomeMessageToUser(userId: string) {
  try {
    console.log('[INFO] Sending welcome message to user:', userId);
    
    const supabase = createClient();

    // Get user's stores and WhatsApp numbers
    const [storesResult, numbersResult] = await Promise.all([
      supabase
        .from('stores')
        .select('id, name')
        .eq('user_id', userId)
        .limit(1),
      supabase
        .from('whatsapp_numbers')
        .select('phone_number, verified')
        .eq('user_id', userId)
        .eq('verified', true)
        .limit(1)
    ]);

    if (storesResult.error) {
      console.error('[ERROR] Failed to fetch user stores:', storesResult.error);
      return;
    }

    if (numbersResult.error) {
      console.error('[ERROR] Failed to fetch WhatsApp numbers:', numbersResult.error);
      return;
    }

    const stores = storesResult.data;
    const numbers = numbersResult.data;

    if (!stores || stores.length === 0) {
      console.log('[INFO] No stores found for user, skipping welcome message');
      return;
    }

    if (!numbers || numbers.length === 0) {
      console.log('[INFO] No verified WhatsApp numbers found for user, skipping welcome message');
      return;
    }

    const firstStore = stores[0];
    const verifiedNumber = numbers[0];

    // Send welcome message
    const welcomeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: verifiedNumber.phone_number,
        storeId: firstStore.id,
        userId: userId
      })
    });

    if (welcomeResponse.ok) {
      const result = await welcomeResponse.json();
      console.log('[INFO] Welcome message sent successfully:', {
        userId,
        phone: verifiedNumber.phone_number,
        storeId: firstStore.id,
        messageId: result.data?.messageId
      });
    } else {
      const errorData = await welcomeResponse.json();
      console.error('[ERROR] Welcome message API failed:', errorData);
    }

  } catch (error) {
    console.error('[ERROR] Error in sendWelcomeMessageToUser:', error);
    throw error;
  }
}

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
      event = verifyWebhookSignature(body, signature, webhookSecret);
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

          if (userId && subscription) {
            // Map Stripe subscription to our plan structure
            const mappedPlan = mapStripePlanToAppPlan(subscription);
            
            // Update user subscription in database
            const { error } = await supabase
              .from('users')
              .update({
                subscription_plan: mappedPlan.plan,
                subscription_status: mappedPlan.status === 'active' ? 'active' : 'inactive',
                subscription_billing: mappedPlan.billing,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (error) {
              console.error('[ERROR] Failed to update user subscription:', error);
            } else {
              console.log('[INFO] User subscription updated successfully:', {
                userId,
                plan: mappedPlan.plan,
                billing: mappedPlan.billing,
                status: mappedPlan.status
              });

              // Send welcome message for new active subscriptions
              if (mappedPlan.status === 'active') {
                try {
                  await sendWelcomeMessageToUser(userId);
                } catch (welcomeError) {
                  console.error('[ERROR] Failed to send welcome message:', welcomeError);
                  // Don't fail the webhook for welcome message errors
                }
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[INFO] Subscription updated:', subscription.id);
        
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Map Stripe subscription to our plan structure
          const mappedPlan = mapStripePlanToAppPlan(subscription);
          
          const { error } = await supabase
            .from('users')
            .update({
              subscription_plan: mappedPlan.plan,
              subscription_status: mappedPlan.status === 'active' ? 'active' : 'inactive',
              subscription_billing: mappedPlan.billing,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            console.error('[ERROR] Failed to update subscription status:', error);
          } else {
            console.log('[INFO] Subscription status updated successfully:', {
              userId,
              plan: mappedPlan.plan,
              billing: mappedPlan.billing,
              status: mappedPlan.status
            });
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
              subscription_plan: 'basic',
              subscription_status: 'cancelled',
              subscription_billing: null,
              stripe_subscription_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            console.error('[ERROR] Failed to update subscription status:', error);
          } else {
            console.log('[INFO] Subscription cancelled successfully - reverted to basic plan');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('[INFO] Payment failed for invoice:', invoice.id);
        
        // Get subscription from invoice metadata or line items
        const subscriptionId = (invoice as any).subscription || 
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

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('[INFO] Processing invoice.payment_succeeded:', invoice.id);
        
        const subscriptionId = (invoice as any).subscription ||
                              (invoice.lines.data[0]?.subscription as string) ||
                              null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            const { error } = await supabase
              .from('users')
              .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (error) {
              console.error('[ERROR] Failed to update subscription status:', error);
            } else {
              console.log('[INFO] Subscription marked as active due to payment success');
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