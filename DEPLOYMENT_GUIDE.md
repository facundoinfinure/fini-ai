# 🚀 Guía de Deploy - Fini AI

## Deploy en Vercel (Recomendado)

### 1. Preparación

1. **Asegúrate de tener todas las variables de entorno configuradas**
   ```bash
   npm run verify-env
   ```

2. **Verifica que el build funcione localmente**
   ```bash
   npm run build
   ```

### 2. Deploy en Vercel

#### Opción A: Deploy desde GitHub

1. **Conecta tu repositorio a Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu cuenta de GitHub
   - Importa el repositorio `fini-ai`

2. **Configura las variables de entorno**
   - En el dashboard de Vercel, ve a **Settings → Environment Variables**
   - Agrega cada variable de la lista siguiente

#### Opción B: Deploy con CLI

1. **Instala Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login y deploy**
   ```bash
   vercel login
   vercel --prod
   ```

### 3. Variables de Entorno en Vercel

Agrega estas variables en **Settings → Environment Variables**:

#### Variables Requeridas

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
```

#### Variables Opcionales

```bash
# WhatsApp Webhook
WHATSAPP_VERIFY_TOKEN=your-verify-token

# IA y RAG
OPENAI_API_KEY=your-openai-api-key
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=fini-ai-rag

# Configuración
MAX_CONTEXT_LENGTH=8000
AGENT_TIMEOUT_MS=30000
MAX_PARALLEL_AGENTS=3
```

### 4. Configuración de Dominios

1. **Configura tu dominio personalizado** (opcional)
   - En Vercel: **Settings → Domains**
   - Agrega tu dominio personalizado

2. **Actualiza NEXTAUTH_URL**
   - Cambia `NEXTAUTH_URL` a tu dominio final

### 5. Configuración de OAuth

#### Tienda Nube

1. **Ve a**: https://www.tiendanube.com/apps/developers
2. **Edita tu aplicación**
3. **Actualiza URLs de redirección**:
   ```
   https://your-domain.vercel.app/api/auth/callback/tiendanube
   ```

#### Google

1. **Ve a**: https://console.cloud.google.com/apis/credentials
2. **Edita tus credenciales OAuth**
3. **Agrega URLs autorizadas**:
   ```
   https://your-domain.vercel.app
   ```

### 6. Configuración de WhatsApp/Twilio

1. **Ve a**: https://console.twilio.com/
2. **Configura webhook URL**:
   ```
   https://your-domain.vercel.app/api/whatsapp/webhook
   ```

### 7. Verificación Post-Deploy

1. **Verifica que la aplicación funcione**
   - Visita tu dominio
   - Prueba el login con Tienda Nube
   - Prueba el login con Google

2. **Verifica las APIs**
   - Dashboard: `https://your-domain.vercel.app/dashboard`
   - Webhook WhatsApp: `https://your-domain.vercel.app/api/whatsapp/webhook`

3. **Verifica logs**
   - En Vercel: **Functions → View Function Logs**

## Deploy en Otras Plataformas

### Netlify

1. **Conecta tu repositorio**
2. **Configura variables de entorno** en **Site settings → Environment variables**
3. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`

### Railway

1. **Conecta tu repositorio**
2. **Agrega variables de entorno** en **Variables**
3. **Deploy automático**

### DigitalOcean App Platform

1. **Conecta tu repositorio**
2. **Configura variables de entorno**
3. **Build command**: `npm run build`
4. **Run command**: `npm start`

## Troubleshooting

### Error: "Build failed"

- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs de build en Vercel
- Asegúrate de que el código compile localmente

### Error: "OAuth configuration failed"

- Verifica URLs de redirección en proveedores OAuth
- Asegúrate de que el dominio esté autorizado
- Verifica que las credenciales sean correctas

### Error: "Database connection failed"

- Verifica credenciales de Supabase
- Asegúrate de que la base de datos esté activa
- Verifica que las tablas existan

### Error: "Function timeout"

- Aumenta el timeout en `vercel.json`
- Optimiza las consultas de base de datos
- Implementa caching donde sea posible

## Monitoreo y Mantenimiento

### Logs y Monitoreo

1. **Vercel Analytics** (opcional)
   - Habilita en **Settings → Analytics**

2. **Logs de funciones**
   - Monitorea en **Functions → View Function Logs**

3. **Métricas de rendimiento**
   - Revisa en **Analytics → Performance**

### Actualizaciones

1. **Deploy automático**
   - Configura GitHub Actions para deploy automático
   - O usa el deploy automático de Vercel

2. **Rollback**
   - En Vercel: **Deployments → Revert**

### Seguridad

1. **Rotación de secretos**
   - Cambia `NEXTAUTH_SECRET` regularmente
   - Rota credenciales de OAuth

2. **Monitoreo de acceso**
   - Revisa logs de autenticación
   - Monitorea intentos de acceso fallidos

## Comandos Útiles

```bash
# Deploy a producción
vercel --prod

# Deploy a preview
vercel

# Ver logs
vercel logs

# Listar deployments
vercel ls

# Rollback
vercel rollback [deployment-id]
```

## Soporte

Si tienes problemas:

1. **Revisa los logs** en Vercel
2. **Verifica variables de entorno** con `npm run verify-env`
3. **Consulta la documentación** de cada servicio
4. **Contacta soporte** de Vercel si es necesario

---

¡Tu aplicación Fini AI debería estar funcionando en producción! 🎉 