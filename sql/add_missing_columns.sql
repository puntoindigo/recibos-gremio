-- =====================================================
-- AGREGAR COLUMNAS FALTANTES A LAS TABLAS
-- =====================================================
-- Ejecutar estos comandos en el SQL Editor de Supabase
-- para agregar las columnas que faltan

-- =====================================================
-- TABLA: consolidated
-- =====================================================

-- Agregar columna archivos (JSONB array) para almacenar los archivos asociados
ALTER TABLE consolidated 
ADD COLUMN IF NOT EXISTS archivos JSONB DEFAULT '[]'::jsonb;

-- Comentario para documentar la columna
COMMENT ON COLUMN consolidated.archivos IS 'Array JSONB de archivos asociados al registro consolidado';

-- =====================================================
-- TABLA: recibos
-- =====================================================
-- La tabla recibos ya tiene la columna archivos según el schema,
-- pero si falta, se puede agregar así:
ALTER TABLE recibos 
ADD COLUMN IF NOT EXISTS archivos JSONB DEFAULT '[]'::jsonb;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que las columnas se agregaron correctamente:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'consolidated' AND column_name = 'archivos';

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'recibos' AND column_name = 'archivos';

