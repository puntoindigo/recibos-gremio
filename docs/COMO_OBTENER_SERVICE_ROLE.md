# 🔑 Cómo Obtener SUPABASE_SERVICE_ROLE_KEY

La **Service Role Key** es una clave especial de Supabase que tiene permisos completos en tu base de datos. Se usa para operaciones administrativas, scripts y operaciones que requieren bypass de Row Level Security (RLS).

## 📍 Ubicación en Supabase Dashboard

1. **Accede a tu proyecto en Supabase**
   - Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Inicia sesión con tu cuenta
   - Selecciona tu proyecto

2. **Navega a la configuración de API**
   - En el menú lateral izquierdo, haz clic en **Settings** (⚙️)
   - Luego haz clic en **API**

3. **Encuentra la Service Role Key**
   - En la sección **Project API keys**, verás dos claves:
     - **anon public** → Esta es la clave pública (ya la tienes como `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
     - **service_role** → Esta es la clave que necesitas (es la `SUPABASE_SERVICE_ROLE_KEY`)

4. **Revelar y copiar la clave**
   - Haz clic en el ícono de **ojo** 👁️ junto a "service_role"
   - La clave se revelará (es muy larga, empieza con `eyJ...`)
   - Haz clic en el ícono de **copiar** 📋 para copiarla
   - O selecciona todo el texto y cópialo manualmente

## 🔒 Seguridad

### ⚠️ ADVERTENCIAS IMPORTANTES:

1. **NUNCA** expongas esta clave en el código del cliente
2. **NUNCA** la pongas en variables con `NEXT_PUBLIC_`
3. **NUNCA** la subas a Git (ya está en `.gitignore`)
4. **Solo** úsala en:
   - Scripts de servidor
   - API Routes de Next.js
   - Operaciones administrativas
   - Migraciones de base de datos

### Si la clave se compromete:

1. Ve a **Settings** → **API** en Supabase
2. Haz clic en **Reset** junto a "service_role"
3. Esto generará una nueva clave
4. Actualiza todas las variables de entorno donde la uses

## 📝 Configuración

Una vez que tengas la clave, agrégalo a tu `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscW1zbnljdmdzaXlrdmJhdGdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0MTM4NCwiZXhwIjoyMDc2ODE3Mzg0fQ...
```

Y también en tu `.env.vercel` para importar a Vercel:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🎯 ¿Cuándo se usa?

La Service Role Key se usa en:
- Scripts de migración (`scripts/add-missing-fields-supabase.js`)
- Operaciones administrativas que requieren bypass de RLS
- Operaciones masivas de datos
- Operaciones que requieren permisos completos

## 🔍 Verificar que funciona

Puedes verificar que la clave funciona ejecutando:

```bash
# Asegúrate de tener la variable en .env.local
node scripts/add-missing-fields-supabase.js
```

Si la clave es correcta, el script se ejecutará sin errores.

