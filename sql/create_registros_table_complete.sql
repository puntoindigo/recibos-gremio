-- Script completo para crear tabla de registros con RLS y políticas
-- Ejecutar en el SQL Editor de Supabase

-- 1. Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.registros (
  id TEXT PRIMARY KEY,
  legajo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  empresa TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('entrada', 'salida')),
  sede TEXT NOT NULL DEFAULT 'CENTRAL',
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_registros_legajo ON public.registros(legajo);
CREATE INDEX IF NOT EXISTS idx_registros_fecha_hora ON public.registros(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_empresa ON public.registros(empresa);
CREATE INDEX IF NOT EXISTS idx_registros_accion ON public.registros(accion);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS básicas (permitir todo por ahora)
-- Política para SELECT (lectura)
CREATE POLICY "Allow all SELECT on registros"
ON public.registros
FOR SELECT
USING (true);

-- Política para INSERT (inserción)
CREATE POLICY "Allow all INSERT on registros"
ON public.registros
FOR INSERT
WITH CHECK (true);

-- Política para UPDATE (actualización)
CREATE POLICY "Allow all UPDATE on registros"
ON public.registros
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Política para DELETE (eliminación)
CREATE POLICY "Allow all DELETE on registros"
ON public.registros
FOR DELETE
USING (true);

-- 5. Verificar que la tabla existe
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename = 'registros';

-- 6. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registros';

