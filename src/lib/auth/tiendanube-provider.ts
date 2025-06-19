import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

export interface TiendaNubeProfile {
  id: string;
  name: string;
  email: string;
  store: {
    id: string;
    name: string;
    url: string;
    domain: string;
    plan_name: string;
  };
  access_token: string;
  user_id: string;
}

export default function TiendaNubeProvider(
  options: OAuthUserConfig<TiendaNubeProfile>
): OAuthConfig<TiendaNubeProfile> {
  const isDevelopment = process.env.NODE_ENV === "development";
  const baseUrl = isDevelopment ? "https://partners.tiendanube.com" : "https://www.tiendanube.com";
  const apiUrl = isDevelopment ? "https://api.tiendanube.com/v1/partner" : "https://api.tiendanube.com/v1";
  
  return {
    id: "tiendanube",
    name: "Tienda Nube",
    type: "oauth",
    authorization: {
      url: `${baseUrl}/apps/authorize`,
      params: {
        scope: "read_products read_orders read_customers read_store",
        response_type: "code",
      },
    },
    token: {
      url: `${baseUrl}/apps/authorize/token`,
      params: {}
    },
    userinfo: {
      url: apiUrl,
      async request({ tokens, provider }) {
        console.log("[TIENDANUBE] Userinfo request with tokens:", {
          hasAccessToken: !!tokens?.access_token,
          hasUserId: !!tokens?.user_id,
          state: tokens?.state,
          isDevelopment,
          baseUrl,
          apiUrl
        });

        if (!tokens?.access_token || !tokens?.user_id) {
          console.error("[TIENDANUBE] Missing tokens:", tokens);
          throw new Error("No access token or user_id available");
        }

        // Obtener la URL de la tienda del state
        let storeUrl = "";
        try {
          if (tokens.state) {
            const state = JSON.parse(tokens.state as string);
            storeUrl = state.storeUrl;
            console.log("[TIENDANUBE] Parsed state:", state);
          }
        } catch (e) {
          console.error("[TIENDANUBE] Error parsing state:", e);
        }

        // En desarrollo, usar la URL de la tienda de prueba
        if (!storeUrl && isDevelopment) {
          storeUrl = `${tokens.user_id}.mitiendanube.com`;
          console.log("[TIENDANUBE] Using development store URL:", storeUrl);
        }

        // Validar y limpiar la URL
        if (!storeUrl) {
          console.error("[TIENDANUBE] No store URL available");
          storeUrl = `${tokens.user_id}.mitiendanube.com`;
        }

        storeUrl = storeUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
        if (!storeUrl.includes(".mitiendanube.com") && !storeUrl.includes(".myshopify.com")) {
          storeUrl = `${storeUrl}.mitiendanube.com`;
        }

        console.log("[TIENDANUBE] Using store URL:", storeUrl);

        const userinfoUrl = typeof provider.userinfo === "string" 
          ? provider.userinfo 
          : provider.userinfo?.url;

        if (!userinfoUrl) {
          throw new Error("No userinfo URL available");
        }

        try {
          // Headers especiales para desarrollo
          const headers: Record<string, string> = {
            "User-Agent": "Fini AI (facundo@fini.ai)",
            "Authentication": `bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          };

          if (isDevelopment) {
            headers["X-Tiendanube-Dev"] = "true";
            headers["X-Tiendanube-Partner"] = "true";
          }

          const response = await fetch(`${userinfoUrl}/${tokens.user_id}/store`, {
            headers
          });

          console.log("[TIENDANUBE] API response status:", response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[TIENDANUBE] API error:", errorText);
            
            // En desarrollo, permitir continuar con un perfil básico
            if (isDevelopment) {
              return {
                id: tokens.user_id,
                name: storeUrl,
                email: `store-${tokens.user_id}@tiendanube.local`,
                store: {
                  id: tokens.user_id,
                  name: storeUrl,
                  url: storeUrl,
                  domain: storeUrl,
                  plan_name: "development"
                },
                access_token: tokens.access_token,
                user_id: tokens.user_id
              };
            }
            
            throw new Error(`Failed to get user info: ${response.status}`);
          }

          const profile = await response.json();
          console.log("[TIENDANUBE] Profile received:", profile);

          return {
            id: tokens.user_id,
            name: profile.name || storeUrl,
            email: profile.email || `store-${tokens.user_id}@tiendanube.local`,
            store: {
              id: tokens.user_id,
              name: profile.name || storeUrl,
              url: storeUrl,
              domain: storeUrl,
              plan_name: profile.plan_name || (isDevelopment ? "development" : "basic")
            },
            access_token: tokens.access_token,
            user_id: tokens.user_id
          };
        } catch (error) {
          console.error("[TIENDANUBE] Error fetching profile:", error);
          
          // En desarrollo, permitir continuar con un perfil básico
          if (isDevelopment) {
            return {
              id: tokens.user_id,
              name: storeUrl,
              email: `store-${tokens.user_id}@tiendanube.local`,
              store: {
                id: tokens.user_id,
                name: storeUrl,
                url: storeUrl,
                domain: storeUrl,
                plan_name: "development"
              },
              access_token: tokens.access_token,
              user_id: tokens.user_id
            };
          }
          
          throw error;
        }
      },
    },
    profile(profile: TiendaNubeProfile) {
      console.log("[TIENDANUBE] Processing profile:", profile);
      return {
        id: profile.id,
        name: profile.name || profile.store.name,
        email: profile.email,
        image: null,
      };
    },
    style: {
      logo: "https://tiendanube.com/favicon.ico",
      bg: "#fff",
      text: "#000",
      bgDark: "#000",
      textDark: "#fff",
    },
    ...options,
  };
} 