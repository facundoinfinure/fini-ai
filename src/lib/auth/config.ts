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
    async signIn({ user, account }) {
      // DEBUG: Simplificando el callback para aislar el problema.
      // Se aprueban todos los inicios de sesión temporalmente.
      console.warn(`[AUTH] Approving sign-in for provider: ${account?.provider} | email: ${user.email}`);
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Buscar o crear el usuario en Supabase
        let supabaseId;
        
        const { data: existingUser } = await _supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          supabaseId = existingUser.id;
        }

        // Actualizar el token con la información necesaria
        token.supabaseId = supabaseId;
        token.planType = "basic";
        token.subscriptionStatus = "active";
        token.onboardingCompleted = false;

        // Si es un login de Tienda Nube, marcar para redirección posterior
        if (account?.provider === "tiendanube") {
          token.needsTiendaNubeSetup = true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub;
        session.user.planType = token.planType as string;
        session.user.subscriptionStatus = token.subscriptionStatus as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.supabaseId = token.supabaseId as string;
        session.user.needsTiendaNubeSetup = token.needsTiendaNubeSetup as boolean;
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
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      planType: string;
      subscriptionStatus: string;
      onboardingCompleted: boolean;
      supabaseId: string;
      needsTiendaNubeSetup?: boolean;
    };
  }

  interface User {
    planType?: string;
    subscriptionStatus?: string;
    onboardingCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    planType?: string;
    subscriptionStatus?: string;
    onboardingCompleted?: boolean;
    supabaseId?: string;
    needsTiendaNubeSetup?: boolean;
  }
} 