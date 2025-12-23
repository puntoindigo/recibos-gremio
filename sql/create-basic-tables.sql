-- Tablas básicas para probar Supabase
-- Ejecutar una por una en el SQL Editor de Supabase

-- 1. Tabla de recibos
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

-- 2. Tabla de datos consolidados
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

-- 3. Tabla de descuentos
CREATE TABLE IF NOT EXISTS descuentos (
  id TEXT PRIMARY KEY,
  legajo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  concepto TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  cuotas INTEGER NOT NULL,
  cuotas_pagadas INTEGER DEFAULT 0,
  cuotas_restantes INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Tabla de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Tabla de configuración de columnas
CREATE TABLE IF NOT EXISTS column_configs (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  alias TEXT,
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Tabla de actividades de usuario
CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Tabla de datos de control
CREATE TABLE IF NOT EXISTS control_data (
  id TEXT PRIMARY KEY,
  control_name TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Tabla de backups
CREATE TABLE IF NOT EXISTS backup_data (
  id TEXT PRIMARY KEY,
  backup_name TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Tabla de configuración de la app
CREATE TABLE IF NOT EXISTS app_config (
  id TEXT PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
