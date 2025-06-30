import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/integrations/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * 🔧 STRIPE WEBHOOK DIAGNOSTICS ENDPOINT
 * =====================================
 * 
 * Endpoint específico para diagnosticar problemas de webhook de Stripe
 * Proporciona información detallada sobre la verificación de firmas
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    method: 'POST',
    url: request.url,
    step: 'starting',
    error: null
  };

  try {
    console.log('[INFO] Starting Stripe webhook diagnostics');
    diagnostics.step = 'reading_headers';

    // Get headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    const contentType = headersList.get('content-type');
    const contentLength = headersList.get('content-length');
    const userAgent = headersList.get('user-agent');

    diagnostics.headers = {
      hasSignature: !!signature,
      signatureValue: signature ? signature.substring(0, 20) + '...' : null,
      contentType,
      contentLength,
      userAgent,
      signatureLength: signature?.length
    };

    console.log('[DEBUG] Headers analysis:', diagnostics.headers);

    if (!signature) {
      diagnostics.error = 'No Stripe signature found in headers';
      return NextResponse.json({
        success: false,
        error: 'No signature found',
        diagnostics
      }, { status: 400 });
    }

    diagnostics.step = 'reading_body';

    // Read body in different ways to test
    const bodyBuffer = await request.arrayBuffer();
    const bodyString = new TextDecoder().decode(bodyBuffer);
    
    diagnostics.body = {
      bufferLength: bodyBuffer.byteLength,
      stringLength: bodyString.length,
      startsWithBrace: bodyString.startsWith('{'),
      endsWithBrace: bodyString.endsWith('}'),
      firstChars: bodyString.substring(0, 50),
      lastChars: bodyString.substring(Math.max(0, bodyString.length - 50))
    };

    console.log('[DEBUG] Body analysis:', diagnostics.body);

    // Check webhook secret configuration
    diagnostics.webhookSecret = {
      exists: !!webhookSecret,
      length: webhookSecret?.length,
      startsWithWhSec: webhookSecret?.startsWith('whsec_')
    };

    console.log('[DEBUG] Webhook secret analysis:', diagnostics.webhookSecret);

    if (!webhookSecret) {
      diagnostics.error = 'STRIPE_WEBHOOK_SECRET not configured';
      return NextResponse.json({
        success: false,
        error: 'Webhook secret not configured',
        diagnostics
      }, { status: 500 });
    }

    diagnostics.step = 'verifying_signature';

    // Test signature verification
    let event: Stripe.Event;
    try {
      // Try with string body first
      event = verifyWebhookSignature(bodyString, signature, webhookSecret);
      diagnostics.verification = {
        method: 'string_body',
        success: true,
        eventType: event.type,
        eventId: event.id
      };
    } catch (stringError) {
      console.log('[DEBUG] String body verification failed, trying buffer:', stringError);
      
             try {
         // Try with buffer - convert ArrayBuffer to Buffer
         const buffer = Buffer.from(bodyBuffer);
         event = verifyWebhookSignature(buffer, signature, webhookSecret);
         diagnostics.verification = {
           method: 'buffer_body',
           success: true,
           eventType: event.type,
           eventId: event.id
         };
       } catch (bufferError) {
        console.log('[DEBUG] Buffer verification also failed:', bufferError);
        
        diagnostics.verification = {
          stringError: stringError instanceof Error ? stringError.message : String(stringError),
          bufferError: bufferError instanceof Error ? bufferError.message : String(bufferError),
          success: false
        };

        // Try manual stripe webhook construction for more details
        try {
          const manualEvent = stripe.webhooks.constructEvent(bodyString, signature, webhookSecret);
          diagnostics.verification.manualConstruct = {
            success: true,
            eventType: manualEvent.type
          };
        } catch (manualError) {
          diagnostics.verification.manualError = manualError instanceof Error ? manualError.message : String(manualError);
        }

        diagnostics.error = 'Signature verification failed with both methods';
        return NextResponse.json({
          success: false,
          error: 'Invalid signature',
          diagnostics
        }, { status: 400 });
      }
    }

    diagnostics.step = 'signature_verified';
    
    // Test parsing the event data
    try {
      const eventData = event.data.object;
      diagnostics.eventAnalysis = {
        type: event.type,
        id: event.id,
        created: event.created,
        hasData: !!eventData,
        dataType: typeof eventData,
        objectType: (eventData as any)?.object
      };
    } catch (parseError) {
      diagnostics.eventAnalysis = {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      };
    }

    console.log('[INFO] Stripe webhook diagnostics completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Webhook signature verification successful',
      eventType: event.type,
      eventId: event.id,
      diagnostics
    });

  } catch (error) {
    console.error('[ERROR] Webhook diagnostics failed:', error);
    
    diagnostics.error = error instanceof Error ? error.message : String(error);
    diagnostics.stack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      success: false,
      error: 'Diagnostics failed',
      diagnostics
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // GET endpoint to check webhook configuration
  const config = {
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    stripeSecretConfigured: !!process.env.STRIPE_SECRET_KEY,
    webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length,
    webhookSecretFormat: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') ? 'correct' : 'incorrect',
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    publicAppUrl: process.env.NEXT_PUBLIC_APP_URL
  };

  return NextResponse.json({
    success: true,
    message: 'Stripe webhook configuration check',
    config,
    recommendedWebhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app'}/api/stripe/webhook`,
    timestamp: new Date().toISOString()
  });
} 