-- =====================================================
-- SCRIPT COMPLETO DE MIGRACIÓN A SUPABASE
-- =====================================================
-- Este script crea todas las tablas necesarias y migra los datos
-- desde IndexedDB/localStorage a Supabase

-- 1. TABLA DE RECIBOS
-- =====================================================
CREATE TABLE IF NOT EXISTS recibos (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  legajo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  periodo TEXT NOT NULL,
  archivos JSONB,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para recibos
CREATE INDEX IF NOT EXISTS idx_recibos_legajo ON recibos(legajo);
CREATE INDEX IF NOT EXISTS idx_recibos_periodo ON recibos(periodo);
CREATE INDEX IF NOT EXISTS idx_recibos_key ON recibos(key);

-- 2. TABLA DE DATOS CONSOLIDADOS
-- =====================================================
CREATE TABLE IF NOT EXISTS consolidated (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  legajo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  periodo TEXT NOT NULL,
  cuil TEXT,
  cuil_norm TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para consolidated
CREATE INDEX IF NOT EXISTS idx_consolidated_legajo ON consolidated(legajo);
CREATE INDEX IF NOT EXISTS idx_consolidated_periodo ON consolidated(periodo);
CREATE INDEX IF NOT EXISTS idx_consolidated_key ON consolidated(key);

-- 3. TABLA DE DESCUENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS descuentos (
  id TEXT PRIMARY KEY,
  legajo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto DECIMAL(10,2) NOT NULL,
  cuotas INTEGER NOT NULL,
  cuotas_pagadas INTEGER DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'ACTIVO',
  fecha_inicio DATE,
  fecha_fin DATE,
  tags JSONB,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para descuentos
CREATE INDEX IF NOT EXISTS idx_descuentos_legajo ON descuentos(legajo);
CREATE INDEX IF NOT EXISTS idx_descuentos_estado ON descuentos(estado);

-- 4. TABLA DE CONFIGURACIONES DE COLUMNAS
-- =====================================================
CREATE TABLE IF NOT EXISTS column_configs (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  alias TEXT,
  visible BOOLEAN DEFAULT true,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para column_configs
CREATE INDEX IF NOT EXISTS idx_column_configs_table ON column_configs(table_name);

-- 5. TABLA DE ACTIVIDADES DE USUARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para user_activities
CREATE INDEX IF NOT EXISTS idx_user_activities_email ON user_activities(user_email);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp);

-- 6. TABLA DE CONTROLES GUARDADOS
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_controls (
  id TEXT PRIMARY KEY,
  filterKey TEXT NOT NULL,
  periodo TEXT NOT NULL,
  empresa TEXT NOT NULL,
  summaries JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. TABLA DE DATOS DE CONTROL
-- =====================================================
CREATE TABLE IF NOT EXISTS control_data (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. TABLA DE EMPRESAS
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. TABLA DE CONFIGURACIÓN GENERAL
-- =====================================================
CREATE TABLE IF NOT EXISTS app_config (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. TABLA DE BACKUPS
-- =====================================================
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- HABILITAR RLS (Row Level Security)
-- =====================================================
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidated ENABLE ROW LEVEL SECURITY;
ALTER TABLE descuentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_items ENABLE ROW LEVEL SECURITY;

-- CREAR POLÍTICAS RLS
-- =====================================================
-- Política para permitir todas las operaciones (por ahora)
CREATE POLICY "Allow all operations on recibos" ON recibos FOR ALL USING (true);
CREATE POLICY "Allow all operations on consolidated" ON consolidated FOR ALL USING (true);
CREATE POLICY "Allow all operations on descuentos" ON descuentos FOR ALL USING (true);
CREATE POLICY "Allow all operations on column_configs" ON column_configs FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_activities" ON user_activities FOR ALL USING (true);
CREATE POLICY "Allow all operations on saved_controls" ON saved_controls FOR ALL USING (true);
CREATE POLICY "Allow all operations on control_data" ON control_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on empresas" ON empresas FOR ALL USING (true);
CREATE POLICY "Allow all operations on app_config" ON app_config FOR ALL USING (true);
CREATE POLICY "Allow all operations on backups" ON backups FOR ALL USING (true);
CREATE POLICY "Allow all operations on pending_items" ON pending_items FOR ALL USING (true);

-- FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS PARA ACTUALIZAR updated_at
-- =====================================================
CREATE TRIGGER update_recibos_updated_at BEFORE UPDATE ON recibos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consolidated_updated_at BEFORE UPDATE ON consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_descuentos_updated_at BEFORE UPDATE ON descuentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_column_configs_updated_at BEFORE UPDATE ON column_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_controls_updated_at BEFORE UPDATE ON saved_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_control_data_updated_at BEFORE UPDATE ON control_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pending_items_updated_at BEFORE UPDATE ON pending_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- INSERTAR CONFIGURACIÓN INICIAL
-- =====================================================
INSERT INTO app_config (id, key, value) VALUES 
('storage_type', 'storage_type', '"IndexedDB"'),
('migration_completed', 'migration_completed', 'false')
ON CONFLICT (key) DO NOTHING;

-- COMENTARIOS SOBRE LAS TABLAS
-- =====================================================
COMMENT ON TABLE recibos IS 'Tabla de recibos de sueldo procesados';
COMMENT ON TABLE consolidated IS 'Datos consolidados por empleado';
COMMENT ON TABLE descuentos IS 'Descuentos de empleados';
COMMENT ON TABLE column_configs IS 'Configuraciones de visibilidad y alias de columnas';
COMMENT ON TABLE user_activities IS 'Registro de actividades del usuario';
COMMENT ON TABLE saved_controls IS 'Controles de recibos guardados';
COMMENT ON TABLE control_data IS 'Datos de control oficiales';
COMMENT ON TABLE empresas IS 'Empresas del sistema';
COMMENT ON TABLE app_config IS 'Configuración general de la aplicación';
COMMENT ON TABLE backups IS 'Backups del sistema';
COMMENT ON TABLE pending_items IS 'Items pendientes de desarrollo';
