import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth/config";

export async function POST(_request: NextRequest) {
  try {
    console.warn("[API] Starting onboarding completion...");
    
    const _session = await getServerSession(authOptions);
    
    if (!_session?.user?.id) {
      console.warn("[API] Unauthorized onboarding attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const _userId = _session.user.id;
    console.warn("[API] Processing onboarding for user:", _userId);
    
    // TODO: In the future, we can add database operations here
    // For now, we simulate a successful onboarding completion
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.warn("[API] Onboarding completed successfully for user:", _userId);

    return NextResponse.json({ 
      success: true,
      message: "Onboarding completed successfully",
      user: {
        id: _userId,
        email: _session.user.email,
        name: _session.user.name,
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