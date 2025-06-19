# 🧪 Guía de Desarrollo - Tienda Nube

## Endpoints Disponibles para Desarrollo

### 1. **Endpoint de Desarrollo Flexible**
```
POST /api/tiendanube/dev-connect
```

**Características:**
- ✅ Solo disponible en modo desarrollo
- ✅ Validación flexible de URLs
- ✅ Soporte para múltiples entornos
- ✅ Conexión directa con credenciales
- ✅ Generación de URLs OAuth

**URLs Válidas:**
- `mitienda.mitiendanube.com`
- `mitienda.tiendanube.com`
- `localhost:3000`
- `tu-tunnel.ngrok.io`
- `tu-preview.vercel.app`

**Ejemplo de uso:**
```bash
curl -X POST http://localhost:3000/api/tiendanube/dev-connect \
  -H "Content-Type: application/json" \
  -d '{
    "storeUrl": "mitienda.mitiendanube.com",
    "environment": "development"
  }'
```

### 2. **Endpoint de Testing de Conexión**
```
POST /api/tiendanube/test-connection
```

**Características:**
- ✅ Prueba conexión directa a la API
- ✅ Mide tiempos de respuesta
- ✅ Verifica rate limits
- ✅ Soporte para diferentes endpoints
- ✅ Headers de respuesta detallados

**Endpoints disponibles:**
- `store` - Información de la tienda
- `products` - Lista de productos
- `orders` - Lista de órdenes
- `customers` - Lista de clientes

**Ejemplo de uso:**
```bash
curl -X POST http://localhost:3000/api/tiendanube/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "12345",
    "accessToken": "tn_abc123...",
    "environment": "development",
    "endpoint": "store"
  }'
```

### 3. **Endpoint OAuth Original**
```
POST /api/tiendanube/oauth/connect
```

**Características:**
- ✅ Flujo OAuth estándar
- ✅ Validación estricta de URLs
- ✅ Seguridad con state parameter
- ✅ Integración con NextAuth

### 4. **Endpoint de Sincronización**
```
GET /api/tiendanube/sync
```

**Características:**
- ✅ Health check de la API
- ✅ Verificación de configuración
- ✅ Estado de la base de datos
- ✅ Información de endpoints

## 🎯 Página de Testing

### URL: `/dev-test`

**Funcionalidades:**
- 🔗 **Conexión OAuth**: Genera URLs de autorización
- ⚡ **Test API**: Prueba conexión directa
- 🔧 **Test Connection**: Usa endpoint especializado
- 📊 **Respuesta en tiempo real**: Muestra resultados JSON
- 🎛️ **Configuración flexible**: Múltiples entornos y endpoints

## 🚀 Cómo Usar

### 1. **Para Desarrollo con OAuth:**
1. Ve a `http://localhost:3000/dev-test`
2. Ingresa la URL de tu tienda: `mitienda.mitiendanube.com`
3. Selecciona entorno: `development`
4. Haz click en "Probar Conexión"
5. Se abrirá la ventana de autorización
6. Autoriza la aplicación en Tienda Nube

### 2. **Para Testing con Credenciales:**
1. Ve a `http://localhost:3000/dev-test`
2. Ingresa Store ID y Access Token
3. Selecciona endpoint a probar
4. Haz click en "Test Connection"
5. Revisa la respuesta en tiempo real

### 3. **Para Testing Rápido:**
1. Ve a `http://localhost:3000/dev-test`
2. Haz click en "Cargar Valores de Prueba"
3. Haz click en "Probar Conexión"

## 🔧 Configuración de Variables de Entorno

### Desarrollo Local (.env.local)
```bash
# Tienda Nube OAuth
TIENDANUBE_CLIENT_ID=your-client-id
TIENDANUBE_CLIENT_SECRET=your-client-secret
TIENDANUBE_REDIRECT_URI=http://localhost:3000/api/tiendanube/oauth/callback

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🌐 Entornos de API

### Development
- **API Base**: `https://api.tiendanube.com/v1`
- **Auth URL**: `https://www.tiendanube.com/apps/authorize`
- **Token URL**: `https://www.tiendanube.com/apps/authorize/token`

### Staging
- **API Base**: `https://api-staging.tiendanube.com/v1`
- **Auth URL**: `https://staging.tiendanube.com/apps/authorize`
- **Token URL**: `https://staging.tiendanube.com/apps/authorize/token`

### Production
- **API Base**: `https://api.tiendanube.com/v1`
- **Auth URL**: `https://www.tiendanube.com/apps/authorize`
- **Token URL**: `https://www.tiendanube.com/apps/authorize/token`

## 🔍 Debugging

### Logs Importantes
```bash
# OAuth Flow
[TIENDANUBE-OAUTH] Processing OAuth connection request
[TIENDANUBE-OAUTH] OAuth URL generated

# Development Testing
[TIENDANUBE-DEV] Processing development connection request
[TIENDANUBE-DEV] Testing direct connection with provided credentials

# Connection Testing
[TIENDANUBE-TEST] Processing connection test request
[TIENDANUBE-TEST] Testing connection
[TIENDANUBE-TEST] Connection successful
```

### Errores Comunes
1. **"OAuth not configured"**: Falta `TIENDANUBE_CLIENT_ID` o `TIENDANUBE_CLIENT_SECRET`
2. **"Invalid store URL format"**: URL no cumple con el patrón esperado
3. **"Direct connection failed"**: Store ID o Access Token incorrectos
4. **"User not authenticated"**: No hay sesión activa

## 📱 Testing con WhatsApp

### Endpoint de Testing WhatsApp
```
GET /api/whatsapp/test
```

**Para probar la integración completa:**
1. Conecta tu tienda con OAuth
2. Configura WhatsApp en `/api/whatsapp/configure`
3. Prueba el envío en `/api/whatsapp/test`

## 🎯 Próximos Pasos

1. **Configura las variables de entorno**
2. **Prueba la conexión OAuth** en `/dev-test`
3. **Verifica la API** con credenciales reales
4. **Configura WhatsApp** para testing completo
5. **Prueba el flujo completo** de analytics

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en la consola del navegador
2. Verifica las variables de entorno
3. Usa el endpoint `/api/tiendanube/sync` para health check
4. Revisa la documentación de Tienda Nube API

---

**¡Listo para desarrollar! 🚀** 