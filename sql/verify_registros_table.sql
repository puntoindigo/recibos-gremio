-- Script para verificar que la tabla registros existe y está configurada correctamente
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar que la tabla existe
SELECT 
  'Tabla existe' as status,
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename = 'registros';

-- 2. Verificar estructura de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'registros'
ORDER BY ordinal_position;

-- 3. Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'registros';

-- 4. Verificar RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'registros';

-- 5. Verificar políticas RLS
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registros';

-- 6. Contar registros (si hay)
SELECT COUNT(*) as total_registros FROM public.registros;

