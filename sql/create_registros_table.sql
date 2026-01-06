-- Tabla de registros de entrada/salida
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS registros (
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

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_registros_legajo ON registros(legajo);
CREATE INDEX IF NOT EXISTS idx_registros_fecha_hora ON registros(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_empresa ON registros(empresa);
CREATE INDEX IF NOT EXISTS idx_registros_accion ON registros(accion);

