import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { exchangeCodeForToken } from "@/lib/integrations/tiendanube";
import { saveTiendaNubeStore } from "@/lib/integrations/supabase";

/**
 * Tienda Nube OAuth Callback Handler
 * Este endpoint maneja la respuesta después de que el usuario autoriza la aplicación en Tienda Nube
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log("[OAUTH] Tienda Nube callback received");
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("[OAUTH] OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      console.error("[OAUTH] Missing authorization code");
      return NextResponse.redirect(
        new URL("/auth/error?error=missing_code", request.url)
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    
    // Si no hay sesión, redirigir al login
    if (!session) {
      console.log("[OAUTH] No session found, redirecting to login");
      // Guardar el código de autorización en la URL para usarlo después del login
      const loginUrl = new URL("/auth/signin", request.url);
      loginUrl.searchParams.set("callbackCode", code);
      loginUrl.searchParams.set("from", "tiendanube");
      return NextResponse.redirect(loginUrl);
    }

    // Verificar que tengamos el UUID de Supabase
    if (!session.user?.supabaseId) {
      console.error("[OAUTH] Missing Supabase UUID in session");
      return NextResponse.redirect(
        new URL("/auth/error?error=missing_supabase_id", request.url)
      );
    }

    try {
      // Exchange code for access token
      console.log("[OAUTH] Exchanging code for token...");
      const tokenResponse = await exchangeCodeForToken(code);

      console.log("[OAUTH] Token exchange successful:", {
        storeId: tokenResponse.user_id,
        storeName: `Tienda #${tokenResponse.user_id}`
      });

      // Save store information to database
      const saveResult = await saveTiendaNubeStore({
        userId: session.user.supabaseId,
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
        console.error("[OAUTH] Failed to save store to database:", saveResult.error);
        return NextResponse.redirect(
          new URL("/auth/error?error=database_save_failed", request.url)
        );
      }

      console.log("[OAUTH] Store saved to database successfully:", {
        storeId: saveResult.store.store_id,
        storeName: saveResult.store.store_name,
        dbId: saveResult.store.id
      });

      // Redirect to dashboard with success message
      const redirectUrl = new URL("/dashboard", request.url);
      redirectUrl.searchParams.set("success", "tiendanube_connected");
      redirectUrl.searchParams.set("store", saveResult.store.store_name);
      redirectUrl.searchParams.set("store_id", saveResult.store.store_id);

      console.log("[OAUTH] Redirecting to dashboard with success");
      return NextResponse.redirect(redirectUrl);

    } catch (tokenError) {
      console.error("[OAUTH] Token exchange failed:", tokenError);
      return NextResponse.redirect(
        new URL("/auth/error?error=token_exchange_failed", request.url)
      );
    }

  } catch (error) {
    console.error("[OAUTH] Callback processing error:", error);
    return NextResponse.redirect(
      new URL("/auth/error?error=callback_processing_failed", request.url)
    );
  }
} 