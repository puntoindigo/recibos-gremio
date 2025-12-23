# Sistema de Gestión de Recibos - Módulo Base

## 🚀 Descripción del Proyecto

Sistema modular de gestión empresarial desarrollado con Next.js 15, diseñado como base para integrar múltiples módulos especializados. Actualmente implementa un sistema completo de gestión de recibos con funcionalidades avanzadas de procesamiento de documentos, análisis de datos y gestión de items pendientes.

## ✨ Características Principales

### 🎨 Interfaz Moderna
- **Sidebar colapsable** con navegación intuitiva
- **Header con login** y barra de búsqueda
- **Layout responsive** que se adapta a diferentes dispositivos
- **Cards compactas** optimizadas para visualización eficiente
- **Estructura de columnas** para mejor organización del contenido

### 📄 Gestión de Recibos
- **Procesamiento automático** de documentos PDF
- **Extracción de datos** mediante OCR avanzado
- **Validación inteligente** de información
- **Gestión de empresas** y empleados
- **Sistema de categorización** automática

### 📊 Items Pendientes
- **Gestión de tareas** con estados personalizables
- **Vistas múltiples**: Lista, Cards y Tablero
- **Drag & Drop** para reorganización
- **Filtros avanzados** y búsqueda
- **Seguimiento de progreso** con estadísticas

### 🔧 Funcionalidades Técnicas
- **Base de datos Supabase** para persistencia
- **Autenticación NextAuth** integrada
- **Procesamiento de archivos** en tiempo real
- **Sistema de notificaciones** con toast
- **Backup automático** de datos

## 🏗️ Arquitectura Modular

El sistema está diseñado como una base sólida para integrar módulos especializados:

### 📦 Módulos Planificados
- **Gestión de Clientes** - CRM completo
- **Catálogo de Productos** - Inventario y stock
- **Sistema de Pagos** - Procesamiento de transacciones
- **Catálogo Online** - E-commerce integrado
- **Reportes Avanzados** - Analytics y BI

### 🔌 Arquitectura de Integración
- **API REST** para comunicación entre módulos
- **Sistema de eventos** para sincronización
- **Base de datos compartida** con esquemas modulares
- **Autenticación centralizada** para todos los módulos

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 15** con App Router
- **React 18** con hooks modernos
- **TypeScript** para tipado estático
- **Tailwind CSS** para estilos
- **Lucide React** para iconografía

### Backend
- **Next.js API Routes** para endpoints
- **Supabase** como base de datos
- **NextAuth.js** para autenticación
- **PDF-lib** para procesamiento de PDFs
- **Tesseract.js** para OCR

### Herramientas de Desarrollo
- **ESLint** para linting
- **Prettier** para formateo
- **TypeScript** para verificación de tipos
- **Git** para control de versiones

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- Variables de entorno configuradas

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd recibos-gremio

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales
# IMPORTANTE: Genera un NEXTAUTH_SECRET seguro con: openssl rand -base64 32

# Para importar variables a Vercel:
# 1. Edita .env.vercel y actualiza NEXTAUTH_URL con tu dominio de Vercel
# 2. En Vercel Dashboard → Settings → Environment Variables → Import
# 3. O usa el script: ./scripts/update-vercel-env.sh

# Ejecutar en desarrollo
npm run dev
```

### Variables de Entorno

Copia `.env.example` a `.env.local` y completa con tus valores:

```bash
cp .env.example .env.local
```

**Importante**: 
- `.env.local` está en `.gitignore` y **NO** se subirá al repositorio
- Genera un `NEXTAUTH_SECRET` seguro con: `openssl rand -base64 32`
- Para configuración en Vercel, consulta [docs/VERCEL_SETUP.md](docs/VERCEL_SETUP.md)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000  # En Vercel se detecta automáticamente
NEXTAUTH_SECRET=your_secret_key      # Genera con: openssl rand -base64 32

# Base de datos (opcional)
DATABASE_URL=your_database_url
```

## 📁 Estructura del Proyecto

```
recibos-gremio/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   ├── auth/              # Páginas de autenticación
│   └── page.tsx           # Página principal
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── MainLayout.tsx    # Layout principal
│   └── PendingItems*/    # Componentes de items pendientes
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y configuraciones
├── types/                # Definiciones de TypeScript
└── public/               # Archivos estáticos
```

## 🎯 Funcionalidades por Módulo

### Módulo de Recibos
- ✅ Procesamiento de PDFs
- ✅ Extracción de datos OCR
- ✅ Gestión de empresas
- ✅ Validación de información
- ✅ Exportación de datos

### Módulo de Items Pendientes
- ✅ Gestión de tareas
- ✅ Estados personalizables
- ✅ Vistas múltiples
- ✅ Drag & Drop
- ✅ Filtros y búsqueda

### Módulos Futuros
- 🔄 Gestión de Clientes (CRM)
- 🔄 Catálogo de Productos
- 🔄 Sistema de Pagos
- 🔄 Catálogo Online
- 🔄 Reportes Avanzados

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción

# Calidad de código
npm run lint         # Ejecutar ESLint
npm run type-check   # Verificar tipos TypeScript

# Base de datos
npm run db:setup     # Configurar base de datos
npm run db:migrate   # Ejecutar migraciones
```

## 📊 Estado del Desarrollo

### ✅ Completado
- Sistema base de gestión de recibos
- Interfaz moderna con sidebar colapsable
- Gestión de items pendientes
- Autenticación y autorización
- Base de datos Supabase
- Procesamiento de documentos

### 🔄 En Desarrollo
- Optimización de rendimiento
- Mejoras en la interfaz de usuario
- Integración de módulos adicionales

### 📋 Próximos Pasos
- Integración del módulo de clientes
- Desarrollo del catálogo de productos
- Implementación del sistema de pagos
- Creación del catálogo online

## 🤝 Contribución

### Flujo de Trabajo
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de Código
- Usar TypeScript para todo el código
- Seguir las convenciones de ESLint
- Escribir tests para nuevas funcionalidades
- Documentar APIs y componentes

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas sobre el proyecto:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación técnica

## 🔗 Enlaces Útiles

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Versión**: 2.0.0  
**Última actualización**: Enero 2025  
**Estado**: En desarrollo activo
