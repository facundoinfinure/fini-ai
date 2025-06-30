# 📊 DOCUMENTACIÓN COMPLETA DE EVENTOS SEGMENT - FINI AI

## 🎯 Resumen Ejecutivo

Implementación completa de Segment CDP para tracking exhaustivo de eventos de usuario y analytics avanzado. El sistema permite enviar datos a múltiples plataformas de marketing para upselling, cross-selling y optimización de conversión.

### 📈 Beneficios Implementados

- **CDP Centralizado**: Todos los eventos van a Segment y se distribuyen automáticamente
- **Marketing Attribution**: Tracking completo del customer journey 
- **Upselling Intelligence**: Detecta cuando usuarios llegan a límites del plan
- **Retention Analytics**: Tracking de engagement y abandono
- **Performance Monitoring**: Métricas de velocidad y errores

---

## 🏗️ ARQUITECTURA DE TRACKING

### Server-Side Tracking
```typescript
// Ubicación: src/lib/analytics/segment-server.ts
// Usado en: APIs, webhooks, procesos de backend
// Beneficio: Datos confiables, no bloqueables por ad-blockers
```

### Client-Side Tracking  
```typescript
// Ubicación: src/lib/analytics/segment-client.ts
// Usado en: Componentes React, interacciones UI
// Beneficio: Eventos en tiempo real, context del navegador
```

### Automatic Provider
```typescript
// Ubicación: src/components/analytics-provider.tsx
// Integrado en: src/components/providers.tsx
// Beneficio: Page views automáticos, error tracking global
```

---

## 📋 **LISTADO DETALLADO DE EVENTOS POR PANTALLA/ACCIÓN**

### 🏠 **PÁGINA PRINCIPAL (`/`)**

#### Page Views
- **Event**: `Page Viewed`
- **Properties**: `page`, `url`, `referrer`, `section: 'home'`, `userAgent`, `loadTime`
- **Trigger**: Automático al cargar la página
- **Implementation**: AnalyticsProvider (client-side)

#### CTA Interactions
- **Event**: `Button Clicked`
- **Properties**: `buttonName`, `page: '/'`, `userId` (si logueado)
- **Trigger**: Click en CTAs principales
- **Uso Marketing**: Optimización de conversion funnel

### 🔐 **AUTENTICACIÓN (`/auth/signin`, `/auth/signup`)**

#### Page Views
- **Event**: `Page Viewed`  
- **Properties**: `page`, `url`, `section: 'auth'`, `referrer`
- **Trigger**: Automático al cargar páginas auth
- **Implementation**: AnalyticsProvider

#### Sign Up Flow
- **Event**: `Sign Up Started`
- **Properties**: `source`, `referrer`, `method: 'email'`
- **Trigger**: Client-side al iniciar proceso
- **Implementation**: useAnalytics hook

- **Event**: `User Signed Up`
- **Properties**: `email`, `method`, `source`, `referrer`
- **Trigger**: Server-side en API callback de auth
- **Implementation**: segmentServerAnalytics
- **Uso Marketing**: Nurturing sequences para nuevos usuarios

#### Sign In Flow
- **Event**: `Sign In Started`
- **Properties**: `method: 'email'`
- **Trigger**: Client-side al iniciar sesión

- **Event**: `User Signed In`
- **Properties**: `method`, `source`, `sessionDuration`
- **Trigger**: Server-side al completar auth
- **Uso Marketing**: Re-engagement campaigns

### 🎯 **ONBOARDING (`/onboarding`)**

#### Onboarding Steps
- **Event**: `Onboarding Step Viewed`
- **Properties**: `step`, `stepName`, `userId`, `hasStores`, `onboardingCompleted`
- **Trigger**: useAnalytics al cambiar de step
- **Implementation**: src/app/onboarding/page.tsx línea 147

- **Event**: `Onboarding Step Completed`
- **Properties**: `step`, `stepName`, `nextStep`, `hasStores`, `onboardingCompleted`
- **Trigger**: handleNextStep() en onboarding
- **Uso Marketing**: Identificar puntos de abandono

#### Store Connection
- **Event**: `Feature Used`
- **Properties**: `featureName: 'store-connection'`, `method: 'oauth'`, `storeUrl`, `storeName`, `step`
- **Trigger**: handleStoreConnection() antes de OAuth
- **Implementation**: src/app/onboarding/page.tsx línea 224

- **Event**: `Store Connected`
- **Properties**: `storeId`, `storeName`, `platform: 'tiendanube'`, `domain`
- **Trigger**: Server-side en OAuth callback exitoso
- **Implementation**: src/app/api/user/complete-onboarding/route.ts
- **Uso Marketing**: Activación exitosa, upselling a plan Pro

#### Onboarding Completion
- **Event**: `Onboarding Completed`
- **Properties**: `totalSteps: 6`, `timeSpent`, `planSelected: 'free'`, `storeConnected`, `whatsappConnected`
- **Trigger**: Server-side al completar onboarding
- **Implementation**: src/app/api/user/complete-onboarding/route.ts línea 49
- **Uso Marketing**: Welcome series, feature education

#### Error Tracking
- **Event**: `Client Error`
- **Properties**: `feature: 'store-connection'`, `step`, `storeUrl`, `storeName`, `errorMessage`
- **Trigger**: catch blocks en onboarding
- **Uso Marketing**: Soporte proactivo, mejora UX

### 💬 **CHAT DASHBOARD (`/dashboard`)**

#### Page Views
- **Event**: `Page Viewed`
- **Properties**: `page: 'Dashboard'`, `section: 'dashboard'`, `userId`
- **Trigger**: Automático al cargar dashboard
- **Implementation**: AnalyticsProvider

#### Chat Interactions
- **Event**: `Conversation Started`
- **Properties**: `conversationId`, `storeId`, `source: 'dashboard'`
- **Trigger**: Server-side al crear nueva conversación
- **Implementation**: src/app/api/chat/send/route.ts línea 79
- **Uso Marketing**: Engagement scoring, feature usage

- **Event**: `Chat Message Sent`
- **Properties**: `conversationId`, `storeId`, `messageType: 'user'`, `messageLength`, `query`, `success: true`
- **Trigger**: Server-side después de guardar mensaje
- **Implementation**: src/app/api/chat/send/route.ts línea 160

- **Event**: `AI Agent Used`
- **Properties**: `agentType`, `query`, `responseTime`, `confidence`, `success`, `conversationId`
- **Trigger**: Server-side después de respuesta de agente
- **Implementation**: src/app/api/chat/send/route.ts línea 167
- **Uso Marketing**: Feature value demonstration, upgrade prompts

#### Dashboard Navigation
- **Event**: `Dashboard Tab Clicked`
- **Properties**: `tabName`, `section: 'dashboard'`
- **Trigger**: Client-side al cambiar tabs
- **Implementation**: useAnalytics.trackButtonClick

### 🏪 **TIENDA NUBE INTEGRATION**

#### Store Analysis
- **Event**: `Store Analyzed`
- **Properties**: `storeId`, `analysisType: 'ai'`, `productCount`, `categories`, `timeSpent`, `success`
- **Trigger**: Server-side después de análisis con AI
- **Implementation**: Automático en análisis de tienda

#### Store Sync
- **Event**: `Store Sync Completed`
- **Properties**: `storeId`, `dataTypes: ['products', 'orders']`, `recordsProcessed`, `timeSpent`
- **Trigger**: Server-side al completar sincronización
- **Uso Marketing**: Health monitoring, re-engagement si sync falla

### 📱 **WHATSAPP INTEGRATION**

#### WhatsApp Setup
- **Event**: `WhatsApp Setup Started`
- **Properties**: `page: '/onboarding'`
- **Trigger**: Client-side al iniciar configuración
- **Implementation**: useAnalytics hook

- **Event**: `WhatsApp OTP Requested`
- **Properties**: `phoneNumber` (masked)
- **Trigger**: Client-side al solicitar OTP
- **Implementation**: segmentClientAnalytics.trackOTPRequested

- **Event**: `WhatsApp Connected`
- **Properties**: `phoneNumber`, `verificationMethod: 'otp'`, `timeSpent`, `attempts`
- **Trigger**: Server-side al verificar exitosamente
- **Uso Marketing**: Feature activation, success onboarding

### 💳 **SUBSCRIPTION MANAGEMENT**

#### Plan Limits
- **Event**: `Plan Limit Reached`
- **Properties**: `feature`, `currentPlan: 'free'`, `limitType`, `upgradePrompted: true`
- **Trigger**: Server-side cuando se alcanza límite
- **Uso Marketing**: **CRÍTICO** para upselling automático

#### Upgrade Flow
- **Event**: `Upgrade Prompt Shown`
- **Properties**: `trigger: 'limit_reached'`, `currentPlan`, `page`
- **Trigger**: Client-side al mostrar prompt
- **Implementation**: useAnalytics.trackUpgradePromptShown

- **Event**: `Upgrade Prompt Clicked`
- **Properties**: `currentPlan`, `targetPlan`, `page`
- **Trigger**: Client-side al hacer click
- **Uso Marketing**: Conversion tracking de upsells

- **Event**: `Subscription Upgraded`
- **Properties**: `previousPlan`, `newPlan`, `amount`, `currency`, `trigger`
- **Trigger**: Server-side al completar upgrade
- **Uso Marketing**: Revenue attribution, churn prediction

### ⚡ **FEATURE USAGE**

#### General Feature Tracking
- **Event**: `Feature Used`
- **Properties**: `featureName`, `success`, `page`, `planRequired`, `planLimit`
- **Trigger**: useAnalytics.trackFeature en componentes
- **Uso Marketing**: Feature adoption, upgrade prompts

#### Feature Discovery
- **Event**: `Feature Discovered`
- **Properties**: `featureName`, `page`
- **Trigger**: Client-side al ver feature primera vez
- **Uso Marketing**: Feature education sequences

### 🔧 **ERROR & PERFORMANCE TRACKING**

#### Client Errors
- **Event**: `Client Error`
- **Properties**: `errorMessage`, `errorStack`, `page`, `userAgent`, `url`
- **Trigger**: Automático via AnalyticsProvider error handlers
- **Implementation**: Global error boundary
- **Uso Marketing**: Support tickets proactivos

#### API Errors  
- **Event**: `API Error`
- **Properties**: `endpoint`, `method`, `statusCode`, `errorMessage`, `responseTime`
- **Trigger**: Server-side en catch blocks de APIs
- **Uso Marketing**: Service health monitoring

#### Performance Metrics
- **Event**: `Page Load Time`
- **Properties**: `loadTime`, `page`, `connection`
- **Trigger**: Client-side después de window.load
- **Implementation**: AnalyticsProvider
- **Uso Marketing**: UX optimization data

---

## 🔧 **CONFIGURACIÓN TÉCNICA**

### Variables de Entorno Requeridas
```bash
# Server-side tracking
SEGMENT_WRITE_KEY=your_segment_server_key

# Client-side tracking  
NEXT_PUBLIC_SEGMENT_WRITE_KEY=your_segment_client_key
```

### Archivos de Implementación
```
src/lib/analytics/
├── segment-server.ts       # Server-side tracking
├── segment-client.ts       # Client-side tracking
├── use-analytics.ts        # React hook
├── events.ts              # Event constants
├── types.ts               # TypeScript types
└── index.ts               # Main exports

src/components/
├── analytics-provider.tsx  # Auto-tracking provider
└── providers.tsx          # Integration point

APIs con tracking integrado:
├── src/app/api/chat/send/route.ts
├── src/app/api/user/complete-onboarding/route.ts
└── src/app/onboarding/page.tsx
```

### Uso en Componentes
```typescript
import { useAnalytics } from '@/lib/analytics/use-analytics';

export function MyComponent() {
  const { trackButtonClick, trackFeature, trackError } = useAnalytics();
  
  const handleClick = () => {
    trackButtonClick('upgrade-to-pro', { currentPlan: 'free' });
  };
  
  const handleFeatureUse = () => {
    trackFeature('advanced-analytics', true, { planRequired: 'pro' });
  };
}
```

---

## 📊 **CASOS DE USO PARA MARKETING**

### 1. Upselling Inteligente
- **Trigger**: `Plan Limit Reached` + `Feature Used` con `planRequired: 'pro'`
- **Acción**: Email sequence explicando beneficios del plan Pro
- **Conversión**: Track `Upgrade Prompt Clicked` → `Subscription Upgraded`

### 2. Onboarding Abandonment Recovery
- **Trigger**: `Onboarding Step Viewed` pero no `Onboarding Step Completed` en 24h
- **Acción**: Email con tips para completar el paso específico
- **Personalización**: Diferente mensaje según step (tienda, WhatsApp, etc)

### 3. Feature Adoption Campaigns
- **Trigger**: `User Signed Up` + no `Feature Used` en 7 días
- **Acción**: Tutorial personalizado de la feature más popular
- **Segmentación**: Por industry/store type usando store analysis data

### 4. Churn Prevention
- **Trigger**: Ausencia de `Chat Message Sent` en 14 días
- **Acción**: "Miss you" email con tips de valor
- **Incentivo**: Free month o descuento en upgrade

### 5. Success-Based Upselling
- **Trigger**: `AI Agent Used` con `confidence > 0.8` + `Chat Message Sent` > 50 veces
- **Acción**: "You're a power user!" email con upgrade offer
- **Timing**: Mejor conversión cuando users ven valor

### 6. Error Recovery & Support
- **Trigger**: `Client Error` o `API Error` para mismo usuario múltiples veces
- **Acción**: Support proactivo con solución específica
- **Follow-up**: `Feature Used` exitoso después de soporte

---

## 🎯 **MÉTRICAS CLAVE A MONITOREAR**

### Conversion Funnel
```
Page Viewed (home) 
→ Sign Up Started 
→ User Signed Up 
→ Onboarding Started 
→ Store Connected 
→ Onboarding Completed 
→ Feature Used (first chat)
→ Plan Limit Reached 
→ Subscription Upgraded
```

### Engagement Scoring
```
High Value Events (10 points):
- Onboarding Completed
- Store Connected  
- AI Agent Used (confidence > 0.7)

Medium Value Events (5 points):
- Chat Message Sent
- Feature Used
- WhatsApp Connected

Low Value Events (1 point):
- Page Viewed
- Button Clicked
```

### Churn Predictors
```
Risk Indicators:
- No Chat Message Sent in 7 days
- Multiple Client Errors in session
- Onboarding abandoned at store connection
- Plan Limit Reached but no Upgrade Prompt Clicked
```

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

### ✅ Completado
- [x] Segment SDK instalado y configurado
- [x] Server-side tracking en APIs críticas
- [x] Client-side tracking con React hooks
- [x] Automatic page view tracking
- [x] Error tracking global
- [x] Onboarding flow tracking completo
- [x] Chat y AI agent usage tracking
- [x] User identification automática
- [x] TypeScript types para todos los eventos
- [x] Build exitoso sin errores críticos

### 🔄 Próximos Pasos Recomendados
- [ ] Configurar Segment Destinations (Facebook, Google, Email tools)
- [ ] Crear dashboards en Segment para monitoring
- [ ] Implementar A/B testing con Segment flags
- [ ] Agregar custom traits para user segmentation
- [ ] Configurar real-time triggers para marketing automation
- [ ] Implementar cohort analysis con retention tracking

---

## 📞 **SOPORTE Y MANTENIMIENTO**

### Debugging Events
```javascript
// Client-side debug
localStorage.setItem('debug', 'segment:*');

// Server-side logs
console.log('[SEGMENT] Event tracked:', event, properties);
```

### Health Monitoring
- All events incluyen `timestamp` automático
- Server errors no rompen main request flow (try/catch)
- Client errors se reportan automáticamente
- Performance tracking incluido por defecto

### Privacy Compliance
- Phone numbers se enmascaran automáticamente
- User IDs son internos (no datos personales)
- Email tracking es opt-in via user consent
- GDPR compatible con user identification control

---

**🎉 IMPLEMENTACIÓN COMPLETA - SISTEMA PRODUCTION-READY**

Fini AI ahora tiene tracking completo de analytics que permite:
- Marketing attribution detallado
- Upselling inteligente basado en usage
- Churn prevention proactivo  
- Feature adoption optimization
- Revenue attribution preciso
- Customer journey mapping completo

El sistema está optimizado para no afectar performance y es completamente compatible con la funcionalidad existente de la aplicación.
