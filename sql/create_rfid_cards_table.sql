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

-- Política para permitir todas las operaciones (similar a otras tablas)
CREATE POLICY "Allow all operations on rfid_cards"
  ON rfid_cards FOR ALL
  USING (true)
  WITH CHECK (true);

