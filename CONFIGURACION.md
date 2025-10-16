# 🔧 Configuración del Sistema

## Variables de Entorno Requeridas

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production

# Base de datos (Dexie.js - IndexedDB)
# No se requieren variables de entorno para IndexedDB

# Email (opcional - para invitaciones)
# EMAIL_SERVER_HOST=smtp.gmail.com
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=your-email@gmail.com
# EMAIL_SERVER_PASSWORD=your-app-password
# EMAIL_FROM=noreply@recibos.com
```

## Credenciales por Defecto

El sistema crea automáticamente un SuperAdmin inicial:

- **Email:** admin@recibos.com
- **Contraseña:** admin123

⚠️ **IMPORTANTE:** Cambia estas credenciales en producción.

## Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env.local
   # Editar .env.local con tus valores
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Acceder al sistema:**
   - URL: http://localhost:3000
   - Login: admin@recibos.com / admin123

## Estructura de la Base de Datos

El sistema utiliza IndexedDB (Dexie.js) con las siguientes tablas:

- **users:** Usuarios del sistema
- **empresas:** Configuración de empresas
- **invitations:** Invitaciones pendientes
- **descuentos:** Gestión de descuentos
- **userActivities:** Auditoría de actividades
- **receipts:** Recibos procesados (existente)
- **consolidated:** Datos consolidados (existente)
- **control:** Datos de control (existente)
- **savedControls:** Controles guardados (existente)
- **settings:** Configuraciones (existente)

## Roles y Permisos

### SuperAdmin
- Acceso total al sistema
- Crear y gestionar empresas
- Gestionar todos los usuarios
- Acceso a todos los módulos

### Admin de Empresa
- Gestionar usuarios de su empresa
- Acceso completo a recibos y controles
- Gestionar descuentos
- Invitar usuarios

### Usuario
- Ver recibos y controles
- Ver descuentos
- Acceso limitado según permisos

## Módulos Implementados

### ✅ Completados
- [x] Sistema de autenticación
- [x] Base de datos expandida
- [x] Módulo de descuentos (ABM)
- [x] Ficha única del empleado
- [x] Navegación moderna
- [x] Gestión de permisos

### 🚧 En Desarrollo
- [ ] Gestión completa de usuarios
- [ ] Sistema de invitaciones por email
- [ ] Reportes avanzados
- [ ] Configuración de empresas

### 📋 Pendientes
- [ ] Integración con sistemas externos
- [ ] Notificaciones push
- [ ] Backup automático
- [ ] Auditoría avanzada
