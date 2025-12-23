# 🚀 PROMPT INICIAL - Sistema de Usuarios y Descuentos

## 📋 **OBJETIVO**
Implementar un sistema completo de gestión de usuarios con roles jerárquicos y un módulo de descuentos (ABM) para el sistema de recibos existente.

## 🎯 **FUNCIONALIDADES PRINCIPALES**

### **1. SISTEMA DE USUARIOS Y PERMISOS**
- **Jerarquía de roles:** SuperAdmin → Admin de Empresa → Usuario
- **SuperAdmin:** Crear empresas, asignar administradores, acceso total
- **Admin de Empresa:** Gestionar usuarios de su empresa, configurar permisos
- **Usuario:** Acceso limitado según permisos asignados
- **Invitaciones por email** con tokens de activación
- **Permisos granulares** por módulo (recibos, controles, descuentos, reportes)
- **Auditoría completa** de actividades de usuarios

### **2. MÓDULO DE DESCUENTOS (ABM)**
- **Crear/Editar/Eliminar** descuentos con validaciones
- **Modal amigable** para creación/edición
- **Búsqueda de legajo** por nombre o CUIL
- **Sistema de tags/palabras clave** para categorizar
- **Estados:** Activo, Suspendido, Finalizado, Cancelado
- **Tipos:** Préstamo, Adelanto, Descuento Varios, Judicial
- **Filtros avanzados** por usuario, empresa, puesto, período
- **Cálculos automáticos** de totales y cuotas pendientes

### **3. FICHA ÚNICA DEL EMPLEADO**
- **Vista consolidada** con todos los datos del empleado
- **Recibos de sueldo** procesados
- **Diferencias en controles** detectadas
- **Descuentos pendientes** y activos
- **Cruce con descuentos pagados** y cálculo de diferencias
- **Historial completo** de transacciones

### **4. INTERFAZ MODERNA**
- **Diseño responsive** inspirado en v0-postulador
- **Navegación por pestañas** (Recibos, Controles, Descuentos, Usuarios)
- **Filtros inline** y búsqueda en tiempo real
- **Componentes reutilizables** con Shadcn/ui
- **Paleta de colores** personalizable por empresa

## 🔧 **STACK TECNOLÓGICO**
- **Frontend:** Next.js 14 + React + TypeScript
- **UI:** Shadcn/ui + Tailwind CSS
- **Base de Datos:** Dexie.js (IndexedDB) - expandir esquemas existentes
- **Autenticación:** NextAuth.js + JWT
- **Validación:** Zod
- **Notificaciones:** Sonner

## 📊 **ESTRUCTURA DE DATOS**

### **Nuevas Tablas a Agregar:**
- **users:** Usuarios del sistema
- **empresas:** Configuración de empresas
- **invitations:** Invitaciones pendientes
- **descuentos:** Gestión de descuentos
- **user_activities:** Auditoría de actividades

### **Campos Principales:**
- **Descuento:** legajo, monto, cuotas, tipo, estado, tags, motivo
- **Usuario:** email, nombre, rol, empresa, permisos, activo
- **Empresa:** nombre, logo, colores, admin

## 🚀 **PLAN DE IMPLEMENTACIÓN**

### **Fase 1 - Base de Datos (1-2 días):**
- Expandir esquemas Dexie existentes
- Crear nuevas tablas para usuarios y descuentos
- Migrar datos existentes si es necesario

### **Fase 2 - Autenticación (2-3 días):**
- Implementar NextAuth.js
- Sistema de login/logout
- Gestión de sesiones y permisos

### **Fase 3 - Módulo Descuentos (3-4 días):**
- ABM completo de descuentos
- Búsqueda y filtros avanzados
- Cálculos automáticos

### **Fase 4 - Sistema Usuarios (2-3 días):**
- Gestión de usuarios y roles
- Invitaciones por email
- Permisos granulares

### **Fase 5 - Ficha Empleado (2-3 días):**
- Vista consolidada del empleado
- Cruce de datos entre módulos
- Reportes integrados

### **Fase 6 - UI/UX (2-3 días):**
- Diseño moderno y responsive
- Componentes reutilizables
- Navegación mejorada

## 📋 **REQUERIMIENTOS TÉCNICOS**

### **Base de Datos:**
- Expandir el esquema Dexie existente
- Mantener compatibilidad con datos actuales
- Agregar índices para búsquedas eficientes

### **Autenticación:**
- NextAuth.js con providers personalizados
- JWT para sesiones
- Middleware para protección de rutas

### **Validaciones:**
- Zod schemas para todos los formularios
- Validaciones del lado cliente y servidor
- Mensajes de error en español

### **UI/UX:**
- Componentes consistentes con el diseño actual
- Responsive design
- Accesibilidad básica

## 🎨 **DISEÑO**
- Mantener el diseño actual como base
- Agregar nuevas pestañas para usuarios y descuentos
- Paleta de colores personalizable por empresa
- Iconos de Lucide React

## 📱 **RESPONSIVE**
- Mobile-first approach
- Tablas con scroll horizontal en móviles
- Modales adaptativos
- Navegación colapsable

## 🔒 **SEGURIDAD**
- Validación de permisos en cada acción
- Sanitización de inputs
- Protección CSRF
- Auditoría de cambios críticos

## 📈 **PERFORMANCE**
- Lazy loading de componentes
- Paginación en listas grandes
- Memoización de cálculos pesados
- Optimización de queries

---

## 🚀 **INSTRUCCIONES DE IMPLEMENTACIÓN**

1. **Expandir base de datos existente** con nuevas tablas
2. **Implementar autenticación** con NextAuth.js
3. **Crear módulo de descuentos** con ABM completo
4. **Desarrollar sistema de usuarios** con roles y permisos
5. **Integrar ficha única** del empleado
6. **Mejorar UI/UX** con diseño moderno
7. **Testing y optimización** final

**¿Listo para implementar? 🚀**
