-- =====================================================
-- SCRIPT PARA ARREGLAR LA TABLA saved_controls
-- =====================================================
-- Este script agrega las columnas faltantes a la tabla saved_controls

-- Agregar columnas faltantes si no existen
DO $$ 
BEGIN
    -- Agregar columna filterKey si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_controls' AND column_name = 'filterKey') THEN
        ALTER TABLE saved_controls ADD COLUMN filterKey TEXT;
    END IF;
    
    -- Agregar columna periodo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_controls' AND column_name = 'periodo') THEN
        ALTER TABLE saved_controls ADD COLUMN periodo TEXT;
    END IF;
    
    -- Agregar columna empresa si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_controls' AND column_name = 'empresa') THEN
        ALTER TABLE saved_controls ADD COLUMN empresa TEXT;
    END IF;
    
    -- Agregar columna summaries si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_controls' AND column_name = 'summaries') THEN
        ALTER TABLE saved_controls ADD COLUMN summaries JSONB;
    END IF;
END $$;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_saved_controls_filterKey ON saved_controls(filterKey);
CREATE INDEX IF NOT EXISTS idx_saved_controls_periodo ON saved_controls(periodo);
CREATE INDEX IF NOT EXISTS idx_saved_controls_empresa ON saved_controls(empresa);
