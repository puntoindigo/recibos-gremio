-- Tabla de tarjetas RFID
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS rfid_cards (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  legajo TEXT NOT NULL,
  empresa TEXT NOT NULL,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_rfid_cards_uid ON rfid_cards(uid);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_legajo ON rfid_cards(legajo);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_empresa ON rfid_cards(empresa);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_activo ON rfid_cards(activo);

-- Índice compuesto para búsquedas por legajo y empresa
CREATE INDEX IF NOT EXISTS idx_rfid_cards_legajo_empresa ON rfid_cards(legajo, empresa);

-- Habilitar RLS (Row Level Security)
ALTER TABLE rfid_cards ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura de tarjetas RFID a usuarios autenticados"
  ON rfid_cards FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para permitir inserción a usuarios autenticados
CREATE POLICY "Permitir inserción de tarjetas RFID a usuarios autenticados"
  ON rfid_cards FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "Permitir actualización de tarjetas RFID a usuarios autenticados"
  ON rfid_cards FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Política para permitir eliminación a usuarios autenticados
CREATE POLICY "Permitir eliminación de tarjetas RFID a usuarios autenticados"
  ON rfid_cards FOR DELETE
  USING (auth.role() = 'authenticated');

