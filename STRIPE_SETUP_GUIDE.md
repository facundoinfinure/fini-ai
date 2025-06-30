# 🎯 Guía Completa: Configuración de Stripe para Fini AI

## PASO 1: Acceder a Stripe Dashboard

1. Ve a https://dashboard.stripe.com/
2. Asegúrate de estar en **Modo Test** (toggle en la esquina superior izquierda)
3. En el menú lateral, ve a **Products** → **Product catalog**

## PASO 2: Crear Plan Basic

### 2.1 Crear Producto Basic
1. Click en **"+ Add product"**
2. Completa los datos:
   - **Name**: `Basic Plan`
   - **Description**: `Perfect for small businesses starting with WhatsApp analytics`
   - **Statement descriptor**: `FINI AI BASIC`
3. Click **"Save product"**

### 2.2 Agregar Precios al Plan Basic
1. En el producto recién creado, click **"+ Add price"**
2. **Precio Mensual**:
   - **Price**: `$19.99`
   - **Billing period**: `Monthly`
   - **Price description**: `Basic Monthly`
3. **Guarda** y toma nota del **Price ID** (empieza con `price_...`)

4. Click **"+ Add price"** otra vez para el anual:
   - **Price**: `$199.99`
   - **Billing period**: `Yearly`
   - **Price description**: `Basic Annual (17% off)`
5. **Guarda** y toma nota del **Price ID**

## PASO 3: Crear Plan Pro

### 3.1 Crear Producto Pro
1. Click en **"+ Add product"**
2. Completa los datos:
   - **Name**: `Pro Plan`
   - **Description**: `Advanced features for growing businesses`
   - **Statement descriptor**: `FINI AI PRO`
3. Click **"Save product"**

### 3.2 Agregar Precios al Plan Pro
1. **Precio Mensual**:
   - **Price**: `$39.99`
   - **Billing period**: `Monthly`
   - **Price description**: `Pro Monthly`
2. **Guarda** y toma nota del **Price ID**

3. **Precio Anual**:
   - **Price**: `$399.99`
   - **Billing period**: `Yearly` 
   - **Price description**: `Pro Annual (17% off)`
4. **Guarda** y toma nota del **Price ID**

## PASO 4: Configurar Webhook

### 4.1 Crear Webhook Endpoint
1. Ve a **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: `https://fini-ai.vercel.app/api/stripe/webhook`
4. **Description**: `Fini AI Subscription Events`

### 4.2 Seleccionar Eventos
Marca los siguientes eventos:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### 4.3 Obtener Webhook Secret
1. Click **"Add endpoint"**
2. En el webhook creado, ve a la pestaña **"Signing secret"**
3. Click **"Reveal"** y copia el secret (empieza con `whsec_...`)

## PASO 5: Crear Pricing Table

### 5.1 Crear Tabla de Precios
1. Ve a **Products** → **Pricing tables**
2. Click **"+ Create pricing table"**
3. **Name**: `Fini AI Plans`

### 5.2 Agregar Productos
1. Click **"+ Add product"**
2. Selecciona **Basic Plan** y agrega ambos precios (mensual y anual)
3. Click **"+ Add product"** 
4. Selecciona **Pro Plan** y agrega ambos precios
5. En Pro Plan, marca **"Highlight this product"** para el badge "Recomendado"

### 5.3 Configurar Tabla
1. **Customer information**: Marca `Email address` y `Name`
2. **Payment methods**: Marca `Card`
3. **Promotional codes**: ✅ Allow promotional codes
4. **Tax collection**: Configura según tu país
5. Click **"Create pricing table"**
6. **Copia el Pricing Table ID** (empieza con `prctbl_...`)

## PASO 6: Obtener Claves de API

### 6.1 Secret Key
1. Ve a **Developers** → **API keys**
2. En **Secret key**, click **"Reveal test key"**
3. Copia la clave (empieza con `sk_test_...`)

### 6.2 Publishable Key
1. En la misma página, copia el **Publishable key** (empieza con `pk_test_...`)

## PASO 7: Variables de Entorno

Actualiza tu `.env.local` con los valores obtenidos:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_TU_SECRET_KEY_AQUI
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_PUBLISHABLE_KEY_AQUI
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_AQUI
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_TU_PRICING_TABLE_ID_AQUI

# Stripe Price IDs
STRIPE_BASIC_MONTHLY_PRICE_ID=price_BASIC_MONTHLY_ID
STRIPE_BASIC_ANNUAL_PRICE_ID=price_BASIC_ANNUAL_ID
STRIPE_PRO_MONTHLY_PRICE_ID=price_PRO_MONTHLY_ID
STRIPE_PRO_ANNUAL_PRICE_ID=price_PRO_ANNUAL_ID
```

## PASO 8: Configurar en Vercel

### 8.1 Actualizar Variables en Vercel
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `fini-ai`
3. Ve a **Settings** → **Environment Variables**
4. Agrega/actualiza las siguientes variables:

```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID
STRIPE_BASIC_MONTHLY_PRICE_ID
STRIPE_BASIC_ANNUAL_PRICE_ID
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_ANNUAL_PRICE_ID
```

### 8.2 Redeploy
1. Ve a la pestaña **Deployments**
2. Click en **"Redeploy"** en el último deployment
3. Espera a que termine el deploy

## PASO 9: Testing

### 9.1 Test de Onboarding
1. Ve a `https://fini-ai.vercel.app/onboarding`
2. Completa los pasos hasta llegar a la selección de plan
3. Activa **"Usar tabla de precios de Stripe"**
4. Verifica que se muestre la tabla correctamente

### 9.2 Test de Checkout
1. Selecciona un plan
2. Usa tarjeta de prueba: `4242 4242 4242 4242`
3. Cualquier fecha futura y CVC
4. Completa el pago

### 9.3 Test de Webhook
1. Ve a Stripe Dashboard → Webhooks
2. Click en tu webhook
3. Ve a la pestaña **"Attempts"**
4. Verifica que los eventos se estén enviando correctamente

## PASO 10: Activar Producción

### 10.1 Cuando esté listo para producción:
1. Cambia Stripe a **Live mode**
2. Repite los pasos 1-8 en modo Live
3. Actualiza las variables de entorno con claves de producción
4. Configura webhook para dominio de producción

## 🚨 Tarjetas de Prueba

Para testing usa estas tarjetas:

- **Éxito**: `4242 4242 4242 4242`
- **Fallo**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

## 📞 Soporte

Si tienes problemas:
1. Revisa logs en Vercel Dashboard
2. Revisa webhook attempts en Stripe
3. Revisa Network tab en Chrome DevTools
4. Contacta si necesitas ayuda específica

## ✅ Checklist Final

- [ ] Productos creados en Stripe
- [ ] Precios configurados (4 price IDs)
- [ ] Webhook endpoint configurado
- [ ] Pricing table creada
- [ ] Variables de entorno actualizadas
- [ ] Deploy realizado en Vercel
- [ ] Testing de checkout completado
- [ ] Webhooks funcionando correctamente 