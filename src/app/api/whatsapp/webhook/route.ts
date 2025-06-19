/**
 * WhatsApp Webhook API
 * Handles incoming WhatsApp messages from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwilioWhatsAppService } from '@/lib/integrations/twilio';
import { FiniMultiAgentSystem } from '@/lib/agents/multi-agent-system';
import type { AgentContext } from '@/lib/agents/types';

const twilioService = new TwilioWhatsAppService();
const agentSystem = new FiniMultiAgentSystem();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[WEBHOOK] Received WhatsApp webhook');
    
    // Get request body - Twilio sends form data, not JSON
    const formData = await request.formData();
    const body: any = {};
    
    // Convert FormData to object
    formData.forEach((value, key) => {
      body[key] = value;
    });

    console.log('[WEBHOOK] WhatsApp message received:', JSON.stringify(body, null, 2));

    // Validate webhook signature (Twilio) - Skip in development
    const twilioSignature = request.headers.get("x-twilio-signature");
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!twilioSignature && !isDevelopment) {
      console.error("[WEBHOOK] Missing Twilio signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (isDevelopment && !twilioSignature) {
      console.log("[WEBHOOK] Development mode: skipping signature validation");
    }

    // Process incoming WhatsApp message
    if (body.MessageSid && body.From && body.Body) {
      const messageData = {
        messageId: body.MessageSid,
        from: body.From,
        to: body.To,
        body: body.Body,
        timestamp: new Date(),
        mediaUrl: body.MediaUrl0 || null,
        mediaContentType: body.MediaContentType0 || null,
      };

      console.log("[WEBHOOK] Processing message:", messageData);

      // Extract phone number and store info (this would come from database lookup)
      const phoneNumber = messageData.from.replace("whatsapp:", "");
      
      // TODO: Lookup user/store by phone number in database
      // For now, using default/demo values
      const agentContext: AgentContext = {
        userId: "demo-user-id",
        storeId: "demo-store-id", 
        conversationId: `conv_${phoneNumber}_${Date.now()}`,
        userMessage: messageData.body,
        metadata: {
          phoneNumber: phoneNumber,
          storeName: "Demo Store",
          platform: "whatsapp",
          timestamp: messageData.timestamp
        }
      };

      // Process message with multi-agent system
      try {
        const agentResponse = await agentSystem.processMessage(agentContext);

        console.log("[WEBHOOK] Agent response:", agentResponse);

        // Send response back via WhatsApp
        if (agentResponse.success && agentResponse.response) {
          await twilioService.sendMessage(
            phoneNumber,
            agentResponse.response
          );
          
          console.log("[WEBHOOK] Response sent successfully");
        } else {
          // Send fallback message
          await twilioService.sendMessage(
            phoneNumber,
            "Lo siento, no pude procesar tu mensaje en este momento. Por favor intenta nuevamente."
          );
          
          console.log("[WEBHOOK] Fallback message sent");
        }

      } catch (agentError) {
        console.error("[WEBHOOK] Agent processing error:", agentError);
        
        // Send error fallback message
        await twilioService.sendMessage(
          phoneNumber,
          "Hay un problema técnico temporal. Nuestro equipo está trabajando para resolverlo. Por favor intenta más tarde."
        );
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[WEBHOOK] Message processed in ${processingTime}ms:`, {
      success: true,
      message: "Message processed"
    });

    return NextResponse.json({
      status: 'success',
      message: "Message processed",
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[ERROR] Webhook processing failed:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("[WEBHOOK] WhatsApp webhook verification attempt");

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("[WEBHOOK] WhatsApp webhook verified successfully");
      return new NextResponse(challenge, { status: 200 });
    }

    console.error("[WEBHOOK] WhatsApp webhook verification failed");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("[WEBHOOK] WhatsApp verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 