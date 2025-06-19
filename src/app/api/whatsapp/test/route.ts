import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { TwilioWhatsAppService } from "@/lib/integrations/twilio";

const twilioService = new TwilioWhatsAppService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { to, message, type = "text" } = body;

    if (!to || !message) {
      return NextResponse.json({ 
        error: "Missing required fields", 
        required: ["to", "message"] 
      }, { status: 400 });
    }

    console.log("[WHATSAPP-TEST] Sending test message:", { to, type, messageLength: message.length });

    let result;

    if (type === "text") {
      result = await twilioService.sendMessage(to, message);
    } else {
      return NextResponse.json({ 
        error: "Unsupported message type", 
        supportedTypes: ["text"] 
      }, { status: 400 });
    }

    if (result.success) {
      console.log("[WHATSAPP-TEST] Message sent successfully:", result.messageId);
      return NextResponse.json({
        success: true,
        data: {
          messageId: result.messageId,
          to,
          message,
          type,
          timestamp: new Date().toISOString(),
          userId: session.user.id
        }
      });
    } else {
      console.error("[WHATSAPP-TEST] Failed to send message:", result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error("[WHATSAPP-TEST] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[WHATSAPP-TEST] Getting WhatsApp service status");

    // Check Twilio service health
    const healthCheck = await twilioService.checkServiceHealth();

    // Get service configuration status
    const configured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_NUMBER
    );

    return NextResponse.json({
      success: true,
      data: {
        configured,
        serviceHealth: healthCheck,
        configuration: {
          hasAccountSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
          hasAuthToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
          hasWhatsAppNumber: Boolean(process.env.TWILIO_WHATSAPP_NUMBER),
          hasVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN)
        },
        capabilities: {
          sendText: true,
          sendMedia: true,
          sendTemplate: true,
          receiveWebhooks: Boolean(process.env.WHATSAPP_VERIFY_TOKEN)
        },
        testExamples: {
          testMessage: "¡Hola! Este es un mensaje de prueba desde Fini AI 🤖",
          phoneFormat: "+5491123456789",
          sampleMessages: [
            "¿Cuáles son mis productos más vendidos?",
            "Muéstrame el resumen de ventas de hoy",
            "¿Tengo órdenes pendientes?",
            "Ayúdame con mi estrategia de marketing"
          ]
        }
      }
    });

  } catch (error) {
    console.error("[WHATSAPP-TEST] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 