# 🔧 INSTRUCCIONES PARA ARREGLAR SUPABASE

## Problema
La tabla `saved_controls` en Supabase no tiene la estructura correcta. Le faltan las columnas:
- `filterKey`
- `periodo` 
- `empresa`
- `summaries`

## Solución

### 1. Ve a tu panel de Supabase
- Abre tu proyecto en [supabase.com](https://supabase.com)
- Ve a la sección **SQL Editor**

### 2. Ejecuta este SQL:

```sql
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
```

### 3. Verificar que funcionó
Después de ejecutar el SQL, puedes probar con:

```bash
node scripts/test-saved-controls-structure.mjs
```

Si funciona, deberías ver:
```
✅ Test record inserted successfully
```

### 4. Probar el switch
Una vez arreglada la tabla, el switch debería funcionar completamente:
1. Ve a `http://localhost:3000`
2. Inicia sesión
3. Ve a **Configuración → Storage Supabase**
4. Activa el switch → Debería mostrar 0 items
5. Desactiva el switch → Debería mostrar todos tus datos

## Estado actual
- ✅ Servidor funcionando sin errores
- ✅ Switch parcialmente funcional
- ⚠️ Necesita ejecutar SQL en Supabase para funcionar completamente
