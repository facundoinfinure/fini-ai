# 🚨 SOLUCIONES VERCEL ERRORS

## Resumen de Errores Identificados

Basado en el análisis de logs de Vercel del 30 de junio de 2025, se identificaron **3 errores críticos** que afectan la funcionalidad del sistema:

### 🔴 1. **Stripe Webhook Signature Error** (CRÍTICO)
- **Error**: `StripeSignatureVerificationError: No signatures found matching the expected signature`
- **Frecuencia**: Múltiples ocurrencias
- **Impacto**: Suscripciones no se procesan automáticamente

### 🔴 2. **TiendaNube API 401 Unauthorized** (CRÍTICO)
- **Error**: `"Invalid access token"` - múltiples errores 401
- **Frecuencia**: Constante en todas las llamadas API
- **Impacto**: Agentes AI no pueden obtener datos, RAG system falla

### 🔴 3. **RAG System Failures** (CONSECUENCIA)
- **Error**: Falla al indexar productos, órdenes, customers
- **Causa**: Dependiente de errores TiendaNube
- **Impacto**: Sistema de IA degradado

---

## 🛠️ HERRAMIENTAS DE DIAGNÓSTICO

### Comando Principal
```bash
node scripts/diagnose-vercel-errors.js
```
**Función**: Diagnóstico completo de todos los errores identificados

### Scripts Específicos
```bash
# Fix Stripe Webhook
node scripts/fix-stripe-webhook.js

# Fix TiendaNube Tokens
node scripts/fix-tiendanube-tokens.js

# Verificar salud después de fixes
node scripts/verify-production-health.js
```

---

## 🎯 PLAN DE ACCIÓN PRIORITIZADO

### ⚡ **PRIORIDAD ALTA** (Resolver HOY)

#### 1. Fix Stripe Webhook Secret
**Pasos**:
1. Ve a [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Busca webhook: `https://fini-tn.vercel.app/api/stripe/webhook`
3. Copia el "Signing secret" (formato: `whsec_xxxx...`)
4. En [Vercel Dashboard](https://vercel.com/dashboard) → Settings → Environment Variables
5. Actualiza `STRIPE_WEBHOOK_SECRET` con el nuevo valor
6. Redeploy la aplicación

**Verificación**: Webhook de prueba debe aparecer como "succeeded"

#### 2. Fix TiendaNube Tokens Expirados
**Opciones**:

**Opción A**: **Reconexión Manual** (Inmediato)
- Contactar usuarios afectados
- Guiarlos para desconectar/reconectar TiendaNube en dashboard
- Mensaje sugerido incluido en script

**Opción B**: **Implementar Refresh Automático** (Desarrollo)
- Requiere implementar lógica de refresh token
- Previene futuras expiraciones
- Solución a largo plazo

### 🟡 **PRIORIDAD MEDIA** (24-48h)

#### 3. Verificar RAG System
- Una vez resuelto TiendaNube, verificar que RAG vuelve a funcionar
- Re-sincronizar datos automáticamente
- Monitorear indexación de productos/órdenes

---

## 📊 MONITOREO POST-FIX

### Métricas a Observar
1. **Vercel Logs**: Reducción de errores 401/400
2. **Stripe Dashboard**: Webhooks con status "succeeded"
3. **User Experience**: Suscripciones procesándose automáticamente
4. **Chat Functionality**: Agentes respondiendo con datos reales

### Comandos de Verificación
```bash
# Diagnóstico general
node scripts/diagnose-vercel-errors.js

# Test específico Stripe
node scripts/test-stripe-integration.js

# Verificar salud completa
node scripts/verify-production-health.js
```

---

## 🚨 IMPACTO ACTUAL

### ❌ **Funcionalidades Afectadas**
- ✅ **Funcionando**: Autenticación, onboarding básico, UI
- ❌ **Fallando**: Suscripciones Stripe, analytics de tienda, agentes AI con datos reales
- ⚠️ **Degradado**: Chat (responde pero sin datos de tienda), RAG system

### 👥 **Impacto en Usuarios**
- Nuevas suscripciones no se activan automáticamente
- Chat funciona pero con información limitada
- Analytics muestran datos desactualizados
- Agentes AI no pueden acceder a catálogo real

---

## 🔧 TROUBLESHOOTING

### Si Stripe sigue fallando:
- Verificar que el secret no tiene espacios extra
- El secret debe empezar con `whsec_`
- URL del webhook debe ser exacta: `https://fini-tn.vercel.app/api/stripe/webhook`

### Si TiendaNube sigue con 401:
- Verificar que usuario completó reconexión
- Confirmar que nuevos tokens se guardaron en DB
- Testear API call manualmente

### Para verificar estado:
```bash
# Check stores con tokens válidos
curl https://fini-tn.vercel.app/api/stores

# Test específico de una store
curl -X POST https://fini-tn.vercel.app/api/stores/[STORE_ID]/analyze
```

---

## 📞 COMUNICACIÓN CON USUARIOS

### Template de Mensaje
```
Hola! Tu conexión con TiendaNube necesita renovarse.

Para seguir disfrutando de analytics completos:
1. Ve a tu dashboard: https://fini-tn.vercel.app/dashboard
2. En Configuración → Desconectar TiendaNube
3. Luego Conectar TiendaNube nuevamente

¡Esto toma menos de 1 minuto y ya podrás chatear con tu tienda!
```

---

## ✅ RESULTADO ESPERADO

Una vez aplicadas todas las soluciones:

✅ **Stripe**: Webhooks procesan sin errores  
✅ **TiendaNube**: APIs responden con datos frescos  
✅ **RAG**: Sistema indexa productos/órdenes automáticamente  
✅ **Agentes**: Chat responde con datos reales de tienda  
✅ **Suscripciones**: Se activan automáticamente  
✅ **Logs**: Sin errores 401/400 críticos  

---

*Documento generado: 30 de junio 2025*  
*Última actualización: Post-análisis logs Vercel* 