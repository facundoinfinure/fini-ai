# 🤖 Fini AI - Tienda Nube + WhatsApp Analytics

Sistema multi-agente con IA que conecta tu tienda de Tienda Nube con WhatsApp para proporcionar analytics en tiempo real y asistencia automática a tus clientes.

## ✨ Características

- 🔐 **Autenticación OAuth** con Tienda Nube (principal) y Google
- 🤖 **Sistema Multi-Agente** con 4 agentes especializados
- 📊 **Analytics en Tiempo Real** de tu tienda
- 💬 **Integración WhatsApp** completa con Twilio
- 🔍 **RAG Engine** para búsqueda semántica
- 📱 **Dashboard Moderno** con UI/UX optimizada
- 🚀 **Setup en 30 segundos** con conexión automática

## 🏗️ Arquitectura

```
ORCHESTRATOR AGENT (Coordinador Principal)
├── Analytics Agent (Especialista en Datos)
├── Customer Service Agent (Atención al Cliente)
├── Marketing Agent (Especialista en Marketing)
└── RAG Engine (Vector DB + Semantic Search)
```

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + tRPC
- **Base de Datos**: Supabase (PostgreSQL)
- **WhatsApp API**: Twilio
- **Auth**: NextAuth.js + Supabase Auth
- **Deploy**: Vercel
- **State Management**: Zustand
- **Vector Database**: Pinecone/Weaviate para RAG
- **LLM**: OpenAI GPT-4 + embeddings

## 🚀 Deploy Rápido

### 1. Clonar y Configurar

```bash
git clone https://github.com/tu-usuario/fini-ai.git
cd fini-ai
npm install
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp env.example .env.local

# Editar con tus credenciales
nano .env.local
```

### 3. Verificar Configuración

```bash
npm run verify-env
```

### 4. Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 📋 Variables de Entorno Requeridas

### Base de Datos (Supabase)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Autenticación (NextAuth)
```bash
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
```

### OAuth Providers
```bash
TIENDANUBE_CLIENT_ID=your-tiendanube-client-id
TIENDANUBE_CLIENT_SECRET=your-tiendanube-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### WhatsApp/Twilio
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

## 🔧 Configuración de Servicios

### 1. Supabase
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar migraciones SQL
3. Copiar credenciales

### 2. Tienda Nube OAuth
1. Ir a [tiendanube.com/apps/developers](https://www.tiendanube.com/apps/developers)
2. Crear nueva aplicación
3. Configurar redirect URI: `https://your-domain.vercel.app/api/auth/callback/tiendanube`

### 3. Twilio WhatsApp
1. Crear cuenta en [twilio.com](https://twilio.com)
2. Configurar WhatsApp Business API
3. Configurar webhook: `https://your-domain.vercel.app/api/whatsapp/webhook`

## 📱 Uso

### Para Usuarios

1. **Registrarse** con credenciales de Tienda Nube
2. **Conectar tienda** automáticamente
3. **Configurar WhatsApp** en el dashboard
4. **Recibir analytics** y asistencia automática

### Para Desarrolladores

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Verificar variables de entorno
npm run verify-env

# Linting
npm run lint
```

## 🏗️ Estructura del Proyecto

```
src/
├── app/                 # App Router de Next.js
│   ├── api/            # API routes
│   ├── dashboard/      # Dashboard UI
│   └── onboarding/     # Onboarding flow
├── components/          # Componentes React reutilizables
│   ├── ui/             # shadcn/ui components
│   ├── dashboard/      # Dashboard specific
│   ├── chat/           # Chat components
│   └── analytics/      # Analytics visualizations
├── lib/                # Configuraciones y servicios
│   ├── agents/         # Sistema de agentes
│   ├── rag/            # RAG engine
│   └── integrations/   # APIs externas
├── types/              # Definiciones TypeScript
├── hooks/              # Custom hooks
├── stores/             # Zustand stores
└── utils/              # Funciones utilitarias
```

## 🤖 Sistema de Agentes

### Orchestrator Agent
- Coordina todos los agentes
- Decide qué agente maneja cada query
- Mantiene contexto de conversación

### Analytics Agent
- Procesa datos de Tienda Nube
- Genera reportes automáticos
- Proporciona insights de ventas

### Customer Service Agent
- Maneja consultas de clientes
- Proporciona información de productos
- Asiste con pedidos

### Marketing Agent
- Sugiere estrategias de marketing
- Analiza competencia
- Genera ideas de promociones

## 🔍 RAG Engine

- **Vector Database**: Pinecone/Weaviate
- **Embeddings**: OpenAI text-embedding-3-small
- **Búsqueda Semántica**: Para queries complejas
- **Contexto Relevante**: Para respuestas precisas

## 📊 Dashboard

- **Estado del Sistema**: Tienda y WhatsApp
- **Analytics en Tiempo Real**: Ventas, productos, clientes
- **Configuración**: OAuth y webhooks
- **Logs**: Monitoreo de actividad

## 🔐 Seguridad

- **OAuth 2.0** con Tienda Nube y Google
- **Row Level Security** en Supabase
- **Validación de Inputs** con Zod
- **Rate Limiting** en APIs críticas
- **Webhook Verification** para Twilio

## 🚀 Performance

- **Edge Functions** para operaciones rápidas
- **Database Indexing** para queries optimizadas
- **Caching** para reducir llamadas a APIs
- **Lazy Loading** para componentes pesados

## 📈 Monitoreo

- **Logs Detallados** para debugging
- **Métricas de Performance** en Vercel
- **Health Checks** para servicios externos
- **Error Tracking** para fallos

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

- **Documentación**: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- **Deploy**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/fini-ai/issues)

## 🎯 Roadmap

- [ ] Más agentes especializados
- [ ] Integración con más plataformas
- [ ] Dashboard analytics avanzado
- [ ] API pública para desarrolladores
- [ ] Mobile app nativa

---

**Fini AI** - Revolucionando el e-commerce con IA 🤖✨ 