# Configuración de Variables de Entorno

## 📋 Variables Requeridas

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Configuración de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🔧 Cómo Obtener las Credenciales

### Paso 1: Crear Proyecto en Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Haz clic en "New Project"
3. Completa la información del proyecto
4. Espera a que se cree la base de datos

### Paso 2: Obtener Credenciales
1. En el dashboard de tu proyecto
2. Ve a **Settings** → **API**
3. Copia los siguientes valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **IMPORTANTE**: Esta clave tiene permisos completos, mantenla segura

### Paso 3: Configurar Variables
1. Crea el archivo `.env.local` en la raíz del proyecto
2. Agrega las variables con tus valores reales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role key
```

### 🔑 Obtener SUPABASE_SERVICE_ROLE_KEY

La **Service Role Key** es una clave especial que tiene permisos completos en tu base de datos. Se usa para operaciones administrativas y scripts.

**⚠️ ADVERTENCIA DE SEGURIDAD:**
- Esta clave **NO** debe exponerse en el código del cliente
- **NO** debe estar en variables con `NEXT_PUBLIC_`
- Solo úsala en el servidor (API routes, scripts, etc.)
- Si se compromete, revócala inmediatamente desde Supabase

**Cómo obtenerla:**
1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. En la sección **Project API keys**, busca **service_role** (no "anon")
5. Haz clic en el ícono de **ojo** 👁️ para revelar la clave
6. Copia la clave completa (es muy larga, empieza con `eyJ...`)
7. Pégalo en tu `.env.local` como `SUPABASE_SERVICE_ROLE_KEY=...`

## 🚀 Ejecutar Script SQL

Una vez configuradas las variables, ejecuta el script SQL en Supabase:

```bash
# Opción 1: Desde la consola de Supabase
# Ve a SQL Editor en el dashboard y ejecuta el contenido de sql/migrate_to_supabase.sql

# Opción 2: Desde línea de comandos (si tienes psql instalado)
psql -h your-supabase-host -U postgres -d postgres -f sql/migrate_to_supabase.sql
```

## ✅ Verificar Configuración

1. **Reinicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

2. **Abre las Dev Tools** (botón amarillo en la esquina inferior derecha)

3. **Busca "Configuración de Storage"** en la categoría "Storage"

4. **Haz clic en el botón** para abrir la configuración

## 🔍 Troubleshooting

### Si no ves el toggle:
- Verifica que las variables de entorno estén configuradas
- Reinicia el servidor de desarrollo
- Revisa la consola del navegador para errores

### Si hay errores de conexión:
- Verifica que las credenciales sean correctas
- Asegúrate de que el proyecto de Supabase esté activo
- Comprueba que el script SQL se haya ejecutado correctamente

### Si no aparecen las categorías:
- Verifica que no haya errores de TypeScript
- Revisa que todos los imports estén correctos
- Reinicia el servidor
