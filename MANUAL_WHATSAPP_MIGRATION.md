# Manual WhatsApp Migration

## Problema
Los errores de RLS (Row Level Security) en Supabase se deben a que las tablas `whatsapp_numbers` y `whatsapp_store_connections` no existen en la base de datos. La aplicación está intentando insertar datos en tablas que no han sido creadas.

## Solución
Ejecutar el siguiente SQL en el dashboard de Supabase (SQL Editor):

```sql
-- 1. Crear tabla whatsapp_numbers
CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla whatsapp_store_connections
CREATE TABLE IF NOT EXISTS public.whatsapp_store_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(whatsapp_number_id, store_id)
);

-- 3. Habilitar Row Level Security
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_store_connections ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para whatsapp_numbers
CREATE POLICY "Users can view own whatsapp numbers" ON public.whatsapp_numbers 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp numbers" ON public.whatsapp_numbers 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp numbers" ON public.whatsapp_numbers 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own whatsapp numbers" ON public.whatsapp_numbers 
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Crear políticas RLS para whatsapp_store_connections
CREATE POLICY "Users can view own whatsapp store connections" ON public.whatsapp_store_connections 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_numbers 
      WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
      AND public.whatsapp_numbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own whatsapp store connections" ON public.whatsapp_store_connections 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.whatsapp_numbers 
      WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
      AND public.whatsapp_numbers.user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.stores 
      WHERE public.stores.id = public.whatsapp_store_connections.store_id 
      AND public.stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own whatsapp store connections" ON public.whatsapp_store_connections 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_numbers 
      WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
      AND public.whatsapp_numbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own whatsapp store connections" ON public.whatsapp_store_connections 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_numbers 
      WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
      AND public.whatsapp_numbers.user_id = auth.uid()
    )
  );

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_user_id ON public.whatsapp_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_phone ON public.whatsapp_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_number_id ON public.whatsapp_store_connections(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_store_id ON public.whatsapp_store_connections(store_id);

-- 7. Crear trigger para updated_at automático
CREATE TRIGGER update_whatsapp_numbers_updated_at 
  BEFORE UPDATE ON public.whatsapp_numbers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_store_connections_updated_at 
  BEFORE UPDATE ON public.whatsapp_store_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Pasos para ejecutar:

1. Ve al dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto (probablemente "fini-ai" o similar)
3. En el menú lateral, ve a "SQL Editor"
4. Crea una nueva query
5. Copia y pega todo el SQL de arriba
6. Ejecuta la query (botón "Run")

## Verificación:

Después de ejecutar la migración, puedes verificar que funcionó ejecutando:

```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whatsapp_numbers', 'whatsapp_store_connections');

-- Verificar que las políticas RLS están activas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('whatsapp_numbers', 'whatsapp_store_connections');
```

## Una vez completado:

Después de ejecutar esta migración, el error de RLS debería desaparecer y podrás agregar números de WhatsApp sin problemas desde el dashboard.

## Nota importante:

Asegúrate de que la función `update_updated_at_column()` ya existe en tu base de datos. Si no existe, también ejecuta:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
``` 