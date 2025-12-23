-- Crear tabla para items pendientes
CREATE TABLE IF NOT EXISTS pending_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'open', 'in-progress', 'verifying', 'completed')),
  "order" INTEGER NOT NULL,
  color TEXT,
  proposed_solution TEXT,
  feedback JSONB,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pending_items_category ON pending_items(category);
CREATE INDEX IF NOT EXISTS idx_pending_items_status ON pending_items(status);
CREATE INDEX IF NOT EXISTS idx_pending_items_priority ON pending_items(priority);
CREATE INDEX IF NOT EXISTS idx_pending_items_order ON pending_items("order");

-- Habilitar RLS (Row Level Security)
ALTER TABLE pending_items ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones (por ahora)
CREATE POLICY "Allow all operations on pending_items" ON pending_items
  FOR ALL USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_pending_items_updated_at 
  BEFORE UPDATE ON pending_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
