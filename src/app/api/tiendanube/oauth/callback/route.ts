import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth/config";
import { saveTiendaNubeStore } from "@/lib/integrations/supabase";
import { exchangeCodeForToken } from "@/lib/integrations/tiendanube";

/**
 * Tienda Nube OAuth Callback Handler
 * Este endpoint maneja la respuesta después de que el usuario autoriza la aplicación en Tienda Nube
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.warn("[OAUTH] Tienda Nube callback received");
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const _state = searchParams.get("state");
    const error = searchParams.get("error");

    if (!code || !_state) {
      console.error("[TN-CALLBACK] Missing code or state from Tienda Nube.");
      const errorUrl = new URL("/auth/error", request.url);
      errorUrl.searchParams.set("error", "OAuthCallback");
      return NextResponse.redirect(errorUrl);
    }

    // Handle OAuth errors
    if (error) {
      console.error("[OAUTH] OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Verify state to prevent CSRF
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("[TN-CALLBACK] Auth error: No session or user ID found.");
      const signinUrl = new URL("/auth/signin", request.url);
      signinUrl.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(signinUrl);
    }

    const stateData = JSON.parse(Buffer.from(_state, 'base64').toString('ascii'));
    if (stateData.userId !== session.user.id) {
      console.error("[TN-CALLBACK] CSRF error: State user ID does not match session user ID.");
      const errorUrl = new URL("/auth/signin", request.url);
      errorUrl.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(errorUrl);
    }

    try {
      // Exchange code for access token
      console.warn("[OAUTH] Exchanging code for token...");
      const tokenResponse = await exchangeCodeForToken(code);

      console.warn("[OAUTH] Token exchange successful:", {
        storeId: tokenResponse.user_id,
        storeName: `Tienda #${tokenResponse.user_id}`
      });

      // Save store information to database
      const saveResult = await saveTiendaNubeStore({
        userId: session.user.id,
        storeId: tokenResponse.user_id.toString(),
        storeName: `Tienda #${tokenResponse.user_id}`,
        accessToken: tokenResponse.access_token,
        storeData: {
          scope: tokenResponse.scope,
          tokenType: tokenResponse.token_type,
          connectedAt: new Date().toISOString()
        }
      });

      if (!saveResult.success) {
        const errorMsg = 'error' in saveResult ? saveResult.error : 'Unknown error';
        console.error("[OAUTH] Failed to save store to database:", errorMsg);
        return NextResponse.redirect(
          new URL("/auth/error?error=database_save_failed", request.url)
        );
      }

      console.warn("[OAUTH] Store saved to database successfully:", {
        storeId: saveResult.store.store_id,
        storeName: saveResult.store.store_name,
        dbId: saveResult.store.id
      });

      // Redirect to dashboard with success message
      const redirectUrl = new URL("/dashboard", request.url);
      redirectUrl.searchParams.set("success", "tiendanube_connected");
      redirectUrl.searchParams.set("store", saveResult.store.store_name);
      redirectUrl.searchParams.set("store_id", saveResult.store.store_id);

      console.warn("[OAUTH] Redirecting to dashboard with success");
      return NextResponse.redirect(redirectUrl);

    } catch (tokenError) {
      console.error("[OAUTH] Token exchange failed:", tokenError);
      return NextResponse.redirect(
        new URL("/auth/error?error=token_exchange_failed", request.url)
      );
    }

  } catch (e) {
    console.error("[TN-CALLBACK] Final error:", e);
    // Redirect to error page
    const finalErrorUrl = new URL("/auth/error", request.url);
    finalErrorUrl.searchParams.set("error", "Configuration");
    return NextResponse.redirect(finalErrorUrl);
  }
} 