# 🚀 Configuración en Vercel

Esta guía te ayudará a configurar las variables de entorno en Vercel para que la aplicación funcione correctamente en producción.

## 📋 Variables de Entorno Requeridas

### 1. Acceder a la Configuración de Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**

### 2. Agregar Variables de Entorno

Agrega las siguientes variables para **Production**, **Preview** y **Development**:

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL
Valor: https://rlqmsnycvgsiykvbatgo.supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: [Tu clave anon de Supabase]
```

```
SUPABASE_SERVICE_ROLE_KEY
Valor: [Tu service role key de Supabase]
```

#### NextAuth.js
```
NEXTAUTH_URL
Valor: https://tu-dominio.vercel.app
Nota: Reemplaza "tu-dominio" con tu dominio real de Vercel
```

```
NEXTAUTH_SECRET
Valor: tQlpf3Uq7ZYcOOYbuwDzERVQFf4FrrU/sgcVbszT5t8=
Nota: Este es el secreto generado. Puedes generar uno nuevo con: openssl rand -base64 32
```

### 3. Configuración Automática

La aplicación detecta automáticamente el entorno:
- **En Vercel**: Usa `VERCEL_URL` si `NEXTAUTH_URL` no está configurada
- **En desarrollo local**: Usa `http://localhost:3000`

### 4. Después de Configurar

1. **Haz un nuevo deploy** o **Redeploy** desde el dashboard de Vercel
2. Las variables de entorno se aplicarán en el próximo deploy

## 🔒 Seguridad

- ✅ Las variables de entorno **NO** se exponen en el código del cliente
- ✅ `NEXTAUTH_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` son **privadas** (no tienen `NEXT_PUBLIC_`)
- ✅ Solo las variables con `NEXT_PUBLIC_` son accesibles en el navegador

## 🧪 Verificar Configuración

Después del deploy, verifica que:
1. La aplicación carga correctamente
2. El login funciona
3. No hay errores de "Configuration" en la consola
4. Las conexiones a Supabase funcionan

## 📝 Notas

- Si cambias `NEXTAUTH_SECRET`, todos los usuarios deberán iniciar sesión nuevamente
- El `NEXTAUTH_URL` debe coincidir exactamente con tu dominio de Vercel (incluyendo `https://`)
- En Vercel, puedes usar variables diferentes para Production, Preview y Development

