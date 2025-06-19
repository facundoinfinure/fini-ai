import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In production, this would fetch real data from your database
    // For now, return mock data that simulates a connected store
    const mockStats = {
      totalMessages: 127,
      activeUsers: 8,
      storeConnected: true, // This should be checked against user's actual store connection
      storeName: "Mi Tienda Demo",
      storeInfo: {
        name: "Mi Tienda Demo",
        id: "demo_store_123",
        url: "https://mi-tienda.mitiendanube.com"
      },
      recentActivity: {
        lastMessage: "2024-01-15T10:30:00Z",
        messagesToday: 12,
        conversationsActive: 3
      },
      performance: {
        responseRate: 85,
        averageResponseTime: "2.3s",
        satisfactionScore: 4.8
      }
    };

    return NextResponse.json(mockStats);

  } catch (error) {
    console.error("[ERROR] Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 