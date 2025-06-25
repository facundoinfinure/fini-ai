# Manual WhatsApp Migration - SOLO LO NECESARIO

## Ejecuta SOLO este SQL en Supabase SQL Editor:

```sql
-- 1. Crear tabla whatsapp_verifications (la que falta para OTP)
CREATE TABLE IF NOT EXISTS public.whatsapp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Agregar campo verified_at a whatsapp_numbers si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_numbers' 
    AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE public.whatsapp_numbers 
    ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 3. Habilitar RLS en nueva tabla
ALTER TABLE public.whatsapp_verifications ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas SOLO para whatsapp_verifications (evitar duplicados)
DROP POLICY IF EXISTS "Users can view own whatsapp verifications" ON public.whatsapp_verifications;
DROP POLICY IF EXISTS "Users can insert own whatsapp verifications" ON public.whatsapp_verifications;
DROP POLICY IF EXISTS "Users can update own whatsapp verifications" ON public.whatsapp_verifications;

CREATE POLICY "Users can view own whatsapp verifications" ON public.whatsapp_verifications 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_numbers 
      WHERE public.whatsapp_numbers.id = public.whatsapp_verifications.whatsapp_number_id 
      AND public.whatsapp_numbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own whatsapp verifications" ON public.whatsapp_verifications 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.whatsapp_numbers 
      WHERE public.whatsapp_numbers.id = public.whatsapp_verifications.whatsapp_number_id 
      AND public.whatsapp_numbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own whatsapp verifications" ON public.whatsapp_verifications 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_numbers 
      WHERE public.whatsapp_numbers.id = public.whatsapp_verifications.whatsapp_number_id 
      AND public.whatsapp_numbers.user_id = auth.uid()
    )
  );

-- 5. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_number_id ON public.whatsapp_verifications(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_otp ON public.whatsapp_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_expires ON public.whatsapp_verifications(expires_at);

-- 6. Crear trigger para updated_at automático
DROP TRIGGER IF EXISTS update_whatsapp_verifications_updated_at ON public.whatsapp_verifications;

CREATE TRIGGER update_whatsapp_verifications_updated_at 
  BEFORE UPDATE ON public.whatsapp_verifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Crear función update_updated_at_column si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## ✅ VERIFICAR QUE FUNCIONÓ:

```sql
-- Verificar que la tabla existe
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'whatsapp_verifications';

-- Verificar que el campo verified_at existe
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'whatsapp_numbers' 
AND column_name = 'verified_at';
```

## 🎯 LISTO PARA USAR

Después de ejecutar este SQL:
1. Ve a http://localhost:3000/dashboard
2. Pestaña "WhatsApp" 
3. Click "Agregar Número"
4. ¡El sistema OTP ya funcionará! 🚀 

## Error 63016: Message Templates Configuration

### Problema
El error **63016** ocurre cuando intentas enviar mensajes freeform de WhatsApp fuera de la ventana de 24 horas. WhatsApp Business API requiere el uso de **Message Templates** para mensajes iniciados por el negocio.

### Solución Implementada

Hemos actualizado el sistema para usar **Smart Messaging** que automáticamente:

1. **Intenta enviar mensaje freeform** (funciona dentro de 24h)
2. **Si falla (error 63016), usa template automáticamente**
3. **Analiza el contenido** para elegir el template apropiado

### Configuración de Templates en Twilio

#### 1. Accede a Twilio Console
- Ve a: https://console.twilio.com/
- Navega a: **Programmable Messaging > Content Editor**

#### 2. Crear Templates Requeridos

**Template 1: OTP Verification**
```
Name: fini_otp_verification
Language: es (Spanish)
Category: AUTHENTICATION

Content:
🔐 *Código de Verificación Fini AI*

Tu código es: {{1}}

⏰ Expira en {{2}} minutos.

⚠️ No compartas este código.
```

**Template 2: Welcome Message**
```
Name: fini_welcome
Language: es (Spanish) 
Category: MARKETING

Content:
¡Hola {{1}}! 👋

🎉 ¡Bienvenido a Fini AI para {{2}}!

🤖 Tu asistente está listo. Pregúntame:
• 📊 "¿Cuáles fueron mis ventas?"
• 🚀 "Dame ideas de marketing"
• ❓ "¿Qué puedes hacer?"

¡Escríbeme ahora! 📈
```

**Template 3: Analytics Report**
```
Name: fini_analytics
Language: es (Spanish)
Category: UTILITY

Content:
📊 *Analytics - {{3}}*

💰 Ventas: {{1}}
📦 Pedidos: {{2}}

¿Te gustaría ver más detalles?
```

**Template 4: Marketing Ideas**
```
Name: fini_marketing
Language: es (Spanish)
Category: MARKETING

Content:
🎯 *Ideas para {{1}}*

💡 {{2}}
💡 {{3}}

¿Cuál implementamos?
```

**Template 5: Error Support**
```
Name: fini_error
Language: es (Spanish)
Category: UTILITY

Content:
😅 Problema {{1}} detectado.

🔧 Nuestro equipo lo está resolviendo.

Intenta en unos minutos o contacta soporte.
```

#### 3. Obtener Content SIDs

Una vez aprobados los templates:
1. Copia cada **Content SID** (formato: HXxxxxxxxxxxxxx)
2. Actualiza tu `.env.local`:

```bash
# WhatsApp Templates
TWILIO_OTP_CONTENTSID=HXc00fd0971da921a1e4ca16cf99903a31
TWILIO_WELCOME_CONTENTSID=HX1b0e60fe233c0cb5eb35e84fcfc330d4
TWILIO_ANALYTICS_CONTENTSID=HX01234567890abcdef123456
TWILIO_MARKETING_CONTENTSID=HX11234567890abcdef123456
TWILIO_ERROR_CONTENTSID=HX21234567890abcdef123456
```

### Cómo Funciona el Smart Messaging

```typescript
// El sistema automáticamente:
await twilioService.sendSmartMessage(
  phoneNumber,
  "Tu mensaje aquí",
  "analytics", // o "marketing", "welcome", "error"
  {
    sales: "$1,500",
    orders: "25",
    storeName: "Mi Tienda"
  }
);
```

**Flujo:**
1. 🔄 Intenta freeform (funciona si < 24h desde último mensaje del usuario)
2. ❌ Si falla con 63016 → usa template automáticamente
3. ✅ Mensaje enviado exitosamente

### Testing

#### Desarrollo
```bash
# Simula mensajes sin Twilio
NODE_ENV=development npm run dev
```

#### Producción
```bash
# Usa templates reales
NODE_ENV=production npm run start
```

### Troubleshooting

**Error: "Template not found"**
- ✅ Verifica que Content SID existe en Twilio
- ✅ Confirma que template está **APPROVED**
- ✅ Revisa variables de entorno

**Error: "Template variables mismatch"**
- ✅ Cuenta de variables: {{1}}, {{2}}, {{3}}
- ✅ Verifica orden de variables en template
- ✅ Confirma que `contentVariables` JSON es válido

**Error: "Rate limit exceeded"**
- ✅ WhatsApp Business tiene límites estrictos
- ✅ Usa rate limiting en tu app
- ✅ Considera business verification para límites más altos

### Best Practices

1. **24h Window Rule**
   - Mensajes freeform: Solo dentro de 24h
   - Templates: Siempre permitidos

2. **Template Design**
   - Máximo 3 variables por template
   - Texto claro y conciso
   - Evita emojis excesivos

3. **Fallback Strategy**
   - Siempre tener template fallback
   - Log de qué método se usó
   - Monitor de tasa de éxito

### Logs para Debugging

```bash
# Ver qué método se usa:
[WEBHOOK] Response sent using template (analytics): MSG123456789
[WEBHOOK] Response sent as freeform message: MSG987654321

# Errores de template:
[ERROR] Template send failed: Content SID not found
[WHATSAPP] Freeform failed (63016), attempting template fallback...
```

### Estados de Template

- **DRAFT**: En edición
- **SUBMITTED**: Enviado para revisión
- **APPROVED**: ✅ Listo para usar
- **REJECTED**: ❌ Necesita modificaciones
- **PAUSED**: Temporalmente pausado

Solo templates **APPROVED** funcionan en producción.

---

## Migración de WhatsApp (Resto del documento...)

// ... existing code ... 