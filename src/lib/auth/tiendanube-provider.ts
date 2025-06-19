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
  const _isDevelopment = process.env.NODE_ENV === "development";
  const _baseUrl = _isDevelopment ? "https://partners.tiendanube.com" : "https://www.tiendanube.com";
  const _apiUrl = _isDevelopment ? "https://api.tiendanube.com/v1/partner" : "https://api.tiendanube.com/v1";
  
  return {
    id: "tiendanube",
    name: "Tienda Nube",
    type: "oauth",
    authorization: {
      url: `${_baseUrl}/apps/authorize`,
      params: {
        scope: "read_products read_orders read_customers read_store",
        response_type: "code",
      },
    },
    token: {
      url: `${_baseUrl}/apps/authorize/token`,
      params: {}
    },
    userinfo: {
      url: _apiUrl,
      async request({ tokens, provider }) {
        console.warn("[TIENDANUBE] Userinfo request with tokens:", {
          hasAccessToken: !!tokens?.access_token,
          hasUserId: !!tokens?.user_id,
          state: tokens?.state,
          isDevelopment: _isDevelopment,
          baseUrl: _baseUrl,
          apiUrl: _apiUrl
        });

        if (!tokens?.access_token || !tokens?.user_id) {
          console.warn("[TIENDANUBE] Missing tokens:", tokens);
          throw new Error("No access token or user_id available");
        }

        // Obtener la URL de la tienda del state
        let storeUrl = "";
        try {
          if (tokens.state) {
            const _state = JSON.parse(tokens.state as string);
            storeUrl = _state.storeUrl;
            console.warn("[TIENDANUBE] Parsed state:", _state);
          }
        } catch (e) {
          console.warn("[TIENDANUBE] Error parsing state:", e);
        }

        // En desarrollo, usar la URL de la tienda de prueba
        if (!storeUrl && _isDevelopment) {
          storeUrl = `${tokens.user_id}.mitiendanube.com`;
          console.warn("[TIENDANUBE] Using development store URL:", storeUrl);
        }

        // Validar y limpiar la URL
        if (!storeUrl) {
          console.warn("[TIENDANUBE] No store URL available");
          storeUrl = `${tokens.user_id}.mitiendanube.com`;
        }

        storeUrl = storeUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
        if (!storeUrl.includes(".mitiendanube.com") && !storeUrl.includes(".myshopify.com")) {
          storeUrl = `${storeUrl}.mitiendanube.com`;
        }

        console.warn("[TIENDANUBE] Using store URL:", storeUrl);

        const _userinfoUrl = typeof provider.userinfo === "string" 
          ? provider.userinfo 
          : provider.userinfo?.url;

        if (!_userinfoUrl) {
          throw new Error("No userinfo URL available");
        }

        try {
          // Headers especiales para desarrollo
          const headers: Record<string, string> = {
            "User-Agent": "Fini AI (facundo@fini.ai)",
            "Authentication": `bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          };

          if (_isDevelopment) {
            headers["X-Tiendanube-Dev"] = "true";
            headers["X-Tiendanube-Partner"] = "true";
          }

          const _response = await fetch(`${_userinfoUrl}/${tokens.user_id}/store`, {
            headers
          });

          console.warn("[TIENDANUBE] API response status:", _response.status);

          if (!_response.ok) {
            const _errorText = await _response.text();
            console.warn("[TIENDANUBE] API error:", _errorText);
            
            // En desarrollo, permitir continuar con un perfil básico
            if (_isDevelopment) {
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
            
            throw new Error(`Failed to get user info: ${_response.status}`);
          }

          const _profile = await _response.json();
          console.warn("[TIENDANUBE] Profile received:", _profile);

          return {
            id: tokens.user_id,
            name: _profile.name || storeUrl,
            email: _profile.email || `store-${tokens.user_id}@tiendanube.local`,
            store: {
              id: tokens.user_id,
              name: _profile.name || storeUrl,
              url: storeUrl,
              domain: storeUrl,
              plan_name: _profile.plan_name || (_isDevelopment ? "development" : "basic")
            },
            access_token: tokens.access_token,
            user_id: tokens.user_id
          };
        } catch (error) {
          console.warn("[TIENDANUBE] Error fetching profile:", error);
          
          // En desarrollo, permitir continuar con un perfil básico
          if (_isDevelopment) {
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
      console.warn("[TIENDANUBE] Processing profile:", profile);
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