# Migración a Supabase - Guía Completa

## 📋 Resumen

Este documento describe la implementación completa de migración de datos desde IndexedDB/localStorage a Supabase, incluyendo:

- **4,208 registros totales** a migrar
- **1,199 recibos** de sueldo procesados
- **1,153 datos consolidados** por empleado
- **922 descuentos** de empleados
- **12 configuraciones** de columnas
- **922 actividades** de usuario
- **0 controles** guardados
- **0 datos** de control

## 🗄️ Estructura de Base de Datos

### Tablas Creadas

1. **`recibos`** - Recibos de sueldo procesados
2. **`consolidated`** - Datos consolidados por empleado
3. **`descuentos`** - Descuentos de empleados
4. **`column_configs`** - Configuraciones de visibilidad y alias de columnas
5. **`user_activities`** - Registro de actividades del usuario
6. **`saved_controls`** - Controles de recibos guardados
7. **`control_data`** - Datos de control oficiales
8. **`empresas`** - Empresas del sistema
9. **`app_config`** - Configuración general de la aplicación
10. **`backups`** - Backups del sistema
11. **`pending_items`** - Items pendientes de desarrollo

### Características

- **Row Level Security (RLS)** habilitado
- **Triggers automáticos** para `updated_at`
- **Índices optimizados** para consultas rápidas
- **Políticas de seguridad** configuradas

## 🚀 Cómo Usar

### 1. Configurar Supabase

```bash
# Ejecutar el script SQL en Supabase
psql -h your-supabase-host -U postgres -d postgres -f sql/migrate_to_supabase.sql
```

### 2. Configurar Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Usar el Toggle de Storage

1. **Abrir Dev Tools** (botón amarillo en la esquina inferior derecha)
2. **Hacer clic en "Configuración de Storage"** en la categoría "Storage"
3. **Activar el toggle** para migrar a Supabase
4. **Esperar** a que se complete la migración
5. **Verificar** las estadísticas mostradas

### 4. Funcionalidades Disponibles

#### Toggle de Storage
- **IndexedDB** → **Supabase**: Migra todos los datos
- **Supabase** → **IndexedDB**: Revierte a almacenamiento local
- **Rollback**: Elimina todos los datos de Supabase

#### Estadísticas en Tiempo Real
- Contador de recibos migrados
- Contador de datos consolidados
- Contador de descuentos
- Contador de empresas
- Contador de backups

## 🔧 Archivos Creados

### Scripts SQL
- `sql/migrate_to_supabase.sql` - Script completo de creación de tablas

### Managers
- `lib/supabase-manager.ts` - Manager para operaciones CRUD en Supabase
- `lib/storage-config.ts` - Configuración de tipo de storage

### Scripts de Migración
- `scripts/migrate-to-supabase.ts` - Script básico de migración
- `scripts/complete-migration.ts` - Script completo con manejo de errores

### Componentes
- `components/StorageToggle.tsx` - Interfaz para cambiar entre storage
- `hooks/useStorage.ts` - Hook para manejar storage dinámicamente

### Integración
- `components/DevToolbar.tsx` - Integrado en las dev tools

## 📊 Proceso de Migración

### Paso 1: Verificación
- Verificar conexión a Supabase
- Comprobar que las tablas existen
- Validar permisos de usuario

### Paso 2: Migración de Datos
1. **Recibos** (1,199 registros)
2. **Consolidated** (1,153 registros)
3. **Descuentos** (922 registros)
4. **Configuraciones** (12 registros)
5. **Actividades** (922 registros)
6. **Empresas** (N registros)
7. **Backups** (N registros)

### Paso 3: Configuración
- Establecer `storage_type` a `SUPABASE`
- Marcar `migration_completed` como `true`
- Actualizar configuración local

### Paso 4: Verificación
- Mostrar estadísticas de migración
- Confirmar que todos los datos están disponibles
- Probar operaciones CRUD

## 🛡️ Seguridad

### Row Level Security (RLS)
- Todas las tablas tienen RLS habilitado
- Políticas configuradas para permitir todas las operaciones (por ahora)
- Fácil de personalizar según necesidades

### Validación de Datos
- Verificación de tipos de datos
- Validación de campos requeridos
- Manejo de errores robusto

## 🔄 Rollback y Reversión

### Rollback Completo
```typescript
import { rollbackSupabase } from '@/scripts/complete-migration';

// Eliminar todos los datos de Supabase
await rollbackSupabase();
```

### Reversión a IndexedDB
```typescript
import { revertToIndexedDB } from '@/scripts/complete-migration';

// Cambiar configuración a IndexedDB
await revertToIndexedDB();
```

## 📈 Monitoreo

### Estadísticas Disponibles
- Total de registros por tabla
- Tiempo de migración
- Errores durante la migración
- Estado de sincronización

### Logs de Debug
- Console logs detallados
- Información de progreso
- Errores específicos por tabla

## 🚨 Consideraciones Importantes

### Antes de Migrar
- **Hacer backup** de los datos actuales
- **Verificar** que Supabase esté configurado correctamente
- **Probar** la conexión con datos de prueba

### Durante la Migración
- **No interrumpir** el proceso
- **Monitorear** los logs de consola
- **Verificar** que no hay errores

### Después de Migrar
- **Probar** todas las funcionalidades
- **Verificar** que los datos se muestran correctamente
- **Confirmar** que las operaciones CRUD funcionan

## 🔧 Troubleshooting

### Error de Conexión
```bash
# Verificar variables de entorno
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Error de Permisos
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'recibos';
```

### Error de Migración
- Revisar logs de consola
- Verificar que las tablas existen
- Comprobar que los datos de origen están disponibles

## 📞 Soporte

Para problemas o preguntas:
1. Revisar logs de consola
2. Verificar configuración de Supabase
3. Comprobar que todos los archivos están presentes
4. Contactar al equipo de desarrollo

---

**Nota**: Esta migración es reversible. Puedes cambiar entre IndexedDB y Supabase en cualquier momento usando el toggle en las Dev Tools.
