# 🗄️ Configuración de Storage - IndexedDB vs Supabase

## 📋 Resumen

El sistema ahora soporta **dos tipos de storage**:
- **IndexedDB** (local, por defecto)
- **Supabase** (nube, requiere configuración)

## 🚀 Cómo Acceder al Toggle

1. **Abrir Dev Tools**: Haz clic en el botón amarillo "Dev Tools" en la esquina inferior derecha
2. **Buscar "Storage"**: En la lista de categorías, busca "Storage"
3. **Hacer clic en "Configuración de Storage"**: Se abrirá el panel de configuración

## ⚙️ Configuración Actual

### IndexedDB (Por Defecto)
- ✅ **Ya configurado** - No requiere configuración adicional
- 📊 **Datos locales** - Se almacenan en el navegador
- 🔄 **Sincronización** - No hay sincronización entre dispositivos

### Supabase (Opcional)
- 🔧 **Requiere configuración** - Necesita credenciales de Supabase
- ☁️ **Datos en la nube** - Se almacenan en Supabase
- 🔄 **Sincronización** - Datos disponibles en cualquier dispositivo

## 🔧 Configurar Supabase (Opcional)

### Paso 1: Crear Proyecto en Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Haz clic en "New Project"
3. Completa la información del proyecto
4. Espera a que se cree la base de datos

### Paso 2: Ejecutar Script SQL
1. En el dashboard de Supabase, ve a **SQL Editor**
2. Copia y pega el contenido de `sql/migrate_to_supabase.sql`
3. Ejecuta el script

### Paso 3: Configurar Variables (Ya hecho)
Las credenciales ya están configuradas en `lib/supabase.ts`:
```typescript
const supabaseUrl = 'https://rlqmsnycvgsiykvbatgo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 🎛️ Usar el Toggle

### Cambiar a Supabase
1. **Abrir Dev Tools** → **Storage** → **Configuración de Storage**
2. **Activar el toggle** "Usar Supabase"
3. **Esperar** a que se complete la migración
4. **Verificar** las estadísticas mostradas

### Volver a IndexedDB
1. **Desactivar el toggle** "Usar Supabase"
2. **Confirmar** la reversión
3. **Verificar** que los datos locales están disponibles

## 📊 Estadísticas Disponibles

El panel muestra:
- **Recibos**: Cantidad de recibos migrados
- **Consolidados**: Datos consolidados por empleado
- **Descuentos**: Descuentos de empleados
- **Empresas**: Empresas del sistema
- **Backups**: Backups guardados

## 🔄 Funcionalidades

### Migración
- **Automática**: Migra todos los datos de IndexedDB a Supabase
- **Con manejo de errores**: Muestra errores específicos si algo falla
- **Estadísticas**: Muestra cuántos registros se migraron

### Rollback
- **Eliminar datos**: Borra todos los datos de Supabase
- **Reversión**: Vuelve a usar IndexedDB
- **Confirmación**: Pide confirmación antes de eliminar

### Sincronización
- **Tiempo real**: Los cambios se reflejan inmediatamente
- **Bidireccional**: Puedes cambiar entre storage en cualquier momento
- **Persistencia**: La configuración se guarda automáticamente

## 🚨 Consideraciones Importantes

### Antes de Migrar
- **Hacer backup** de los datos actuales
- **Verificar** que Supabase esté configurado correctamente
- **Probar** con datos de prueba primero

### Durante la Migración
- **No interrumpir** el proceso
- **Monitorear** los logs de consola
- **Verificar** que no hay errores

### Después de Migrar
- **Probar** todas las funcionalidades
- **Verificar** que los datos se muestran correctamente
- **Confirmar** que las operaciones CRUD funcionan

## 🔍 Troubleshooting

### Si no ves el toggle:
1. **Verificar** que las Dev Tools estén abiertas
2. **Buscar** la categoría "Storage"
3. **Revisar** la consola del navegador para errores

### Si hay errores de conexión:
1. **Verificar** que las credenciales sean correctas
2. **Asegurarse** de que el proyecto de Supabase esté activo
3. **Comprobar** que el script SQL se haya ejecutado

### Si no aparecen las categorías:
1. **Verificar** que no haya errores de TypeScript
2. **Revisar** que todos los imports estén correctos
3. **Reiniciar** el servidor de desarrollo

## 📞 Soporte

Para problemas o preguntas:
1. **Revisar** logs de consola
2. **Verificar** configuración de Supabase
3. **Comprobar** que todos los archivos están presentes
4. **Contactar** al equipo de desarrollo

---

**Nota**: Este sistema es completamente reversible. Puedes cambiar entre IndexedDB y Supabase en cualquier momento sin perder datos.
