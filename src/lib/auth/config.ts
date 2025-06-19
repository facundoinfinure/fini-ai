import { NextAuthOptions } from "next-auth";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { createClient } from "@supabase/supabase-js";
import TiendaNubeProvider from "./tiendanube-provider";

// Debug: Verificar variables de entorno
console.log("[AUTH CONFIG] Environment variables check:", {
  TIENDANUBE_CLIENT_ID: process.env.TIENDANUBE_CLIENT_ID ? "SET" : "NOT SET",
  TIENDANUBE_CLIENT_SECRET: process.env.TIENDANUBE_CLIENT_SECRET ? "SET" : "NOT SET",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
  NODE_ENV: process.env.NODE_ENV
});

// Supabase client for NextAuth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseServiceKey,
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
    // Email provider comentado temporalmente - requiere configuración SMTP
    // EmailProvider({
    //   server: {
    //     host: process.env.EMAIL_SERVER_HOST,
    //     port: process.env.EMAIL_SERVER_PORT,
    //     auth: {
    //       user: process.env.EMAIL_SERVER_USER,
    //       pass: process.env.EMAIL_SERVER_PASSWORD,
    //     },
    //   },
    //   from: process.env.EMAIL_FROM,
    // }),
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
        console.log("[AUTH] Sign in attempt:", { 
          provider: account?.provider, 
          email: user.email,
          userId: user.id,
          profile: profile
        });

        // Si el usuario no tiene email, generamos uno temporal
        if (!user.email && account?.provider === "tiendanube") {
          user.email = `${account.providerAccountId}@tiendanube.temp`;
        }

        // Asegurarnos que el usuario exista en Supabase
        const { data: existingUser, error: queryError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          // Crear usuario en Supabase si no existe
          const { data: newUser, error: insertError } = await supabase
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
            console.error("[AUTH] Error creating Supabase user:", insertError);
            return false;
          }

          console.log("[AUTH] New user created:", newUser);
        }

        // Si es Tienda Nube, guardar la información de la tienda
        if (account?.provider === "tiendanube" && profile) {
          try {
            const tiendaNubeProfile = profile as any;
            
            // Buscar si ya existe una tienda para este usuario
            const { data: existingStore } = await supabase
              .from('stores')
              .select('id')
              .eq('user_id', existingUser?.id || user.id)
              .eq('provider', 'tiendanube')
              .single();

            if (!existingStore) {
              // Crear la tienda
              const { data: newStore, error: storeError } = await supabase
                .from('stores')
                .insert([
                  {
                    user_id: existingUser?.id || user.id,
                    name: tiendaNubeProfile.store?.name || 'Mi Tienda',
                    url: tiendaNubeProfile.store?.url || tiendaNubeProfile.store?.domain,
                    provider: 'tiendanube',
                    provider_id: account.providerAccountId,
                    access_token: account.access_token,
                    plan_type: tiendaNubeProfile.store?.plan_name || 'basic',
                    is_active: true
                  }
                ])
                .select()
                .single();

              if (storeError) {
                console.error("[AUTH] Error creating store:", storeError);
              } else {
                console.log("[AUTH] Store created:", newStore);
              }
            } else {
              // Actualizar la tienda existente
              const { error: updateError } = await supabase
                .from('stores')
                .update({
                  access_token: account.access_token,
                  plan_type: tiendaNubeProfile.store?.plan_name || 'basic',
                  is_active: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingStore.id);

              if (updateError) {
                console.error("[AUTH] Error updating store:", updateError);
              } else {
                console.log("[AUTH] Store updated");
              }
            }
          } catch (error) {
            console.error("[AUTH] Error handling Tienda Nube store:", error);
          }
        }

        console.log("[AUTH] Sign in successful for:", user.email);
        return true;
      } catch (error) {
        console.error("[AUTH] Sign in error:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Buscar o crear el usuario en Supabase
        let supabaseId;
        
        const { data: existingUser } = await supabase
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
        session.user.id = token.sub!;
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
      console.log("[AUTH] New user created:", user.email);
    },
    async signIn({ user, account, profile, isNewUser }) {
      console.log("[AUTH] User signed in:", { 
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