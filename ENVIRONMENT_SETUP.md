# Configuración de Variables de Entorno - Fini AI

## Variables de Entorno Requeridas

### 1. Base de Datos (Supabase)

```bash
# URL de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Clave anónima (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Clave de servicio (privada - solo server-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Autenticación (NextAuth)

```bash
# URL de tu aplicación (cambiar en producción)
NEXTAUTH_URL=https://your-domain.vercel.app

# Secreto para NextAuth (generar con: openssl rand -base64 32)
NEXTAUTH_SECRET=your-nextauth-secret
```

### 3. Proveedores OAuth

#### Tienda Nube (Principal)
```bash
# Obtener desde: https://www.tiendanube.com/apps/developers
TIENDANUBE_CLIENT_ID=your-tiendanube-client-id
TIENDANUBE_CLIENT_SECRET=your-tiendanube-client-secret
```

#### Google (Secundario)
```bash
# Obtener desde: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. WhatsApp/Twilio

```bash
# Obtener desde: https://console.twilio.com/
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Token de verificación para webhooks (opcional)
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

## Configuración por Plataforma

### Desarrollo Local (.env.local)

```bash
# Copiar este archivo a .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-secret

TIENDANUBE_CLIENT_ID=your-tiendanube-client-id
TIENDANUBE_CLIENT_SECRET=your-tiendanube-client-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

### Vercel (Producción)

1. **Ir a tu proyecto en Vercel**
2. **Settings → Environment Variables**
3. **Agregar cada variable:**

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-production-secret

# OAuth Providers
TIENDANUBE_CLIENT_ID=your-tiendanube-client-id
TIENDANUBE_CLIENT_SECRET=your-tiendanube-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# WhatsApp/Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

### Netlify

1. **Site settings → Environment variables**
2. **Agregar las mismas variables que en Vercel**

### Railway

1. **Variables → Add Variable**
2. **Agregar cada variable individualmente**

## Configuración de OAuth

### Tienda Nube

1. **Ir a**: https://www.tiendanube.com/apps/developers
2. **Crear nueva aplicación**
3. **Configurar URLs de redirección**:
   - Desarrollo: `http://localhost:3000/api/auth/callback/tiendanube`
   - Producción: `https://your-domain.vercel.app/api/auth/callback/tiendanube`

### Google

1. **Ir a**: https://console.cloud.google.com/apis/credentials
2. **Crear credenciales OAuth 2.0**
3. **Configurar URLs autorizadas**:
   - Desarrollo: `http://localhost:3000`
   - Producción: `https://your-domain.vercel.app`

## Configuración de WhatsApp/Twilio

### Twilio Console

1. **Ir a**: https://console.twilio.com/
2. **Crear cuenta y obtener credenciales**
3. **Configurar webhook URL**:
   - Producción: `https://your-domain.vercel.app/api/whatsapp/webhook`

## Verificación de Configuración

### Script de Verificación

```bash
# Ejecutar para verificar variables
npm run verify-env
```

### Verificación Manual

1. **Verificar que la aplicación se inicie sin errores**
2. **Probar login con Tienda Nube**
3. **Probar login con Google**
4. **Verificar que se creen usuarios en Supabase**
5. **Probar conexión de tienda**

## Troubleshooting

### Error: "Missing environment variable"

- Verificar que todas las variables estén configuradas
- Reiniciar el servidor después de agregar variables
- Verificar que las variables estén en el entorno correcto (dev/prod)

### Error: "OAuth configuration failed"

- Verificar URLs de redirección en proveedores OAuth
- Verificar que las credenciales sean correctas
- Verificar que el dominio esté autorizado

### Error: "Database connection failed"

- Verificar credenciales de Supabase
- Verificar que la base de datos esté activa
- Verificar que las tablas existan

## Seguridad

### Variables Sensibles

- **NUNCA** committear `.env.local` al repositorio
- **NUNCA** exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente
- **NUNCA** exponer `NEXTAUTH_SECRET` en el cliente
- **Siempre** usar variables de entorno para credenciales

### Rotación de Secretos

- Cambiar `NEXTAUTH_SECRET` regularmente
- Rotar credenciales de OAuth cuando sea necesario
- Monitorear logs de acceso

## Comandos Útiles

```bash
# Generar secreto para NextAuth
openssl rand -base64 32

# Verificar variables de entorno
node -e "console.log(process.env.NEXTAUTH_URL)"

# Build de producción
npm run build

# Deploy en Vercel
vercel --prod
``` 