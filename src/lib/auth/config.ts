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
      try {
        console.warn("[AUTH] Sign in attempt:", { 
          provider: account?.provider, 
          email: user.email,
          userId: user.id,
          profile
        });

        // Si el usuario no tiene email, generamos uno temporal
        if (!user.email && account?.provider === "tiendanube") {
          user.email = `${account.providerAccountId}@tiendanube.temp`;
        }

        // Asegurarnos que el usuario exista en Supabase
        const { data: existingUser, error: _queryError } = await _supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          // Crear usuario en Supabase si no existe
          const { data: newUser, error: insertError } = await _supabase
            .from('users')
            .insert([
              { 
                email: user.email,
                name: user.name || 'Usuario',
                provider: account?.provider,
                provider_id: account?.providerAccountId
              }
            ])
            .select()
            .single();

          if (insertError) {
            console.warn("[AUTH] Error creating Supabase user:", insertError);
            return false;
          }

          console.warn("[AUTH] New user created:", newUser);
        }

        // Si es Tienda Nube, guardar la información de la tienda
        if (account?.provider === "tiendanube" && profile) {
          try {
            const _tiendaNubeProfile = profile as any;
            
            // Buscar si ya existe una tienda para este usuario
            const { data: existingStore } = await _supabase
              .from('stores')
              .select('id')
              .eq('user_id', existingUser?.id || user.id)
              .eq('provider', 'tiendanube')
              .single();

            if (!existingStore) {
              // Crear la tienda
              const { data: newStore, error: storeError } = await _supabase
                .from('stores')
                .insert([
                  {
                    user_id: existingUser?.id || user.id,
                    name: _tiendaNubeProfile.store?.name || 'Mi Tienda',
                    url: _tiendaNubeProfile.store?.url || _tiendaNubeProfile.store?.domain,
                    provider: 'tiendanube',
                    provider_id: account.providerAccountId,
                    access_token: account.access_token,
                    plan_type: _tiendaNubeProfile.store?.plan_name || 'basic',
                    is_active: true
                  }
                ])
                .select()
                .single();

              if (storeError) {
                console.warn("[AUTH] Error creating store:", storeError);
              } else {
                console.warn("[AUTH] Store created:", newStore);
              }
            } else {
              // Actualizar la tienda existente
              const { error: updateError } = await _supabase
                .from('stores')
                .update({
                  access_token: account.access_token,
                  plan_type: _tiendaNubeProfile.store?.plan_name || 'basic',
                  is_active: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingStore.id);

              if (updateError) {
                console.warn("[AUTH] Error updating store:", updateError);
              } else {
                console.warn("[AUTH] Store updated");
              }
            }
          } catch (error) {
            console.warn("[AUTH] Error handling Tienda Nube store:", error);
          }
        }

        console.warn("[AUTH] Sign in successful for:", user.email);
        return true;
      } catch (error) {
        console.warn("[AUTH] Sign in error:", error);
        return false;
      }
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