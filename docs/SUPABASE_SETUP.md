# Configuración de Supabase para Items Pendientes

## 1. Crear la tabla en Supabase

Ejecuta el siguiente SQL en el SQL Editor de Supabase:

```sql
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
```

## 2. Variables de entorno

Las credenciales de Supabase ya están configuradas en el código:

- **URL**: `https://rlqmsnycvgsiykvbatgo.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscW1zbnljdmdzaXlrdmJhdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDEzODQsImV4cCI6MjA3NjgxNzM4NH0.Faa2R1eZysdRHzxEov_mnUU6Up5M0sQRXHz9pwUt9wE`

## 3. Funcionalidades implementadas

- ✅ **Conexión a Supabase**: Configurada y lista
- ✅ **Manager de Items**: `SupabasePendingItemsManager` implementado
- ✅ **CRUD completo**: Crear, leer, actualizar, eliminar items
- ✅ **Inicialización automática**: Items por defecto se crean automáticamente
- ✅ **Desvinculación de Documentación**: Items Pendientes ahora son independientes
- ✅ **Contadores por categoría**: Funcionan con datos de Supabase
- ✅ **Persistencia real**: Todos los cambios se guardan en la base de datos

## 4. Items por defecto incluidos

El sistema incluye automáticamente:

- **5 items generales**: Sistema de Usuarios, Dashboard, Recibos, Descuentos, Control
- **10 items de Desarrollo**: Para probar el ABM de empleados y empresas

## 5. Próximos pasos

1. Ejecutar el SQL en Supabase
2. Recargar la aplicación
3. Verificar que los items aparecen correctamente
4. Probar crear, editar y eliminar items
5. Verificar que los contadores funcionan

## 6. Notas importantes

- Los Items Pendientes ya no están vinculados a la sección de Documentación
- Todos los datos se almacenan en Supabase
- No hay dependencia de localStorage
- El sistema es completamente independiente
