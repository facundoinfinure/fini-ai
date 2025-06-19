import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";
import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import TiendaNubeProvider from "./tiendanube-provider";

// Debug: Verificar variables de entorno
console.warn("[AUTH CONFIG] Environment variables check:", {
  TIENDANUBE_CLIENT_ID: process.env.TIENDANUBE_CLIENT_ID ? "SET" : "NOT SET",
  TIENDANUBE_CLIENT_SECRET: process.env.TIENDANUBE_CLIENT_SECRET ? "SET" : "NOT SET",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET"
});

// Supabase client for NextAuth
const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const _supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const _supabase = createClient(_supabaseUrl, _supabaseServiceKey);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: _supabaseUrl,
    secret: _supabaseServiceKey
  }),
  providers: [
    // Tienda Nube provider (principal)
    ...(process.env.TIENDANUBE_CLIENT_ID && process.env.TIENDANUBE_CLIENT_SECRET 
      ? [TiendaNubeProvider({
          clientId: process.env.TIENDANUBE_CLIENT_ID,
          clientSecret: process.env.TIENDANUBE_CLIENT_SECRET,
        })]
      : []
    ),
    // Google provider (secundario)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET 
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []
    ),
    // Email provider para desarrollo (sin configuración SMTP)
    EmailProvider({
      server: {
        host: "localhost",
        port: 1025,
        auth: {
          user: "test",
          pass: "test",
        },
      },
      from: "noreply@fini-ai.com",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log(`[AUTH] signIn callback triggered for provider: ${account?.provider}`);
      
      // Para Google y Email, el adapter se encarga de todo. Solo permitimos el acceso.
      if (account?.provider === "google" || account?.provider === "email") {
        console.log(`[AUTH] Allowing sign-in for ${user.email} with ${account.provider}.`);
        return true;
      }

      // Lógica personalizada para Tienda Nube para crear/actualizar la tienda.
      if (account?.provider === "tiendanube") {
        console.log(`[AUTH] Handling Tienda Nube sign-in for user ID: ${user.id}`);
        if (!user.id || !profile) {
            console.error('[AUTH] Tienda Nube sign-in failed: Missing user ID or profile.');
            return false; // Información crítica ausente
        }

        try {
          const tiendaNubeProfile = profile as any;
          
          // Usamos `upsert` para simplificar la lógica de creación/actualización.
          // Busca una tienda con el mismo `provider_id` y la actualiza, o crea una nueva.
          const { error } = await _supabase
            .from('stores')
            .upsert(
              {
                user_id: user.id,
                name: tiendaNubeProfile.store?.name || 'Mi Tienda',
                url: tiendaNubeProfile.store?.url || tiendaNubeProfile.store?.domain,
                provider: 'tiendanube',
                provider_id: account.providerAccountId,
                access_token: account.access_token,
                plan_type: tiendaNubeProfile.store?.plan_name || 'basic',
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'provider_id' }
            );

          if (error) {
            console.error('[AUTH] Error upserting Tienda Nube store:', error);
            throw error; // Lanza el error para que sea capturado por el catch
          }
          
          console.log(`[AUTH] Tienda Nube sign-in successful for user ID: ${user.id}`);
          return true;

        } catch (error) {
          console.error('[AUTH] Unhandled error during Tienda Nube sign-in logic:', error);
          return false; // Bloquea el inicio de sesión en caso de error
        }
      }

      // Por defecto, denegar el acceso si el proveedor no es manejado.
      console.warn(`[AUTH] Denying sign-in for unhandled provider: ${account?.provider}`);
      return false;
    },

    async jwt({ token, user, account }) {
      console.log(`[AUTH] jwt callback. User present: ${!!user}, Provider: ${account?.provider}`);
      if (user) { // `user` solo está presente en el inicio de sesión inicial
        token.id = user.id;
        token.onboardingCompleted = false;
        token.planType = 'basic';
      }
      // Guardamos el access_token de Tienda Nube en el token por si se necesita después
      if (account?.provider === "tiendanube" && account?.access_token) {
        token.tiendaNubeAccessToken = account.access_token;
      }
      return token;
    },

    async session({ session, token }) {
      console.log(`[AUTH] session callback for token subject: ${token.sub}`);
      // El `sub` es el ID de usuario en la base de datos
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.planType = token.planType as string;
      } else {
        console.error('[AUTH] Critical session failure: session.user or token.id is missing.');
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      console.warn("[AUTH] New user created:", user.email);
    },
    async signIn({ user, account, profile, isNewUser }) {
      console.warn("[AUTH] User signed in:", { 
        email: user.email, 
        provider: account?.provider,
        isNewUser 
      });
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Types augmentation for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string; // ID de usuario de la base de datos
      email: string;
      name?: string | null;
      image?: string | null;
      planType: string;
      onboardingCompleted: boolean;
    };
  }

  interface JWT {
    id?: string;
    planType?: string;
    onboardingCompleted?: boolean;
    tiendaNubeAccessToken?: string;
  }
} 