import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";

export async function POST(request: NextRequest) {
  try {
    console.log("[API] Starting onboarding completion...");
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log("[API] Unauthorized onboarding attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log("[API] Processing onboarding for user:", userId);
    
    // TODO: In the future, we can add database operations here
    // For now, we simulate a successful onboarding completion
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log("[API] Onboarding completed successfully for user:", userId);

    return NextResponse.json({ 
      success: true,
      message: "Onboarding completed successfully",
      user: {
        id: userId,
        email: session.user.email,
        name: session.user.name,
        onboarding_completed: true
      }
    });

  } catch (error: any) {
    console.error("[API] Complete onboarding error:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: "Error completing onboarding",
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
} 