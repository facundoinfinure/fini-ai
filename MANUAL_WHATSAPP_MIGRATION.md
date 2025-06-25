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