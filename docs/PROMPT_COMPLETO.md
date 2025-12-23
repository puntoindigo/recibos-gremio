# 🚀 PROMPT COMPLETO - Sistema de Procesamiento de PDFs Multi-página

## 📋 **REQUERIMIENTOS PRINCIPALES**

### 1. **DETECCIÓN DE EMPRESA**
Se detecta la empresa buscando primero por el nombre del archivo, después si hay logo o nombre de la empresa en la zona de logo de los recibos y si no directamente da error en detección de la empresa, lo informa y se termina ahí.

### 2. **PROCESAMIENTO DE PÁGINAS**
Si el PDF tiene más de una página simplemente se procesa cada una de las páginas como si fuesen PDFs únicos. Por ahora no es necesario almacenar el PDF para el link y siempre tener en cuenta que los recibos tienen la ubicación de los datos igual a la detectada en la página 1. Por página hay dos copias así que se trabaja solo con los datos de la primera.

### 3. **EXTRACCIÓN DE DATOS**
Para cada página, extraer únicamente los datos de la primera copia del recibo (ignorar la segunda copia). Los campos a extraer son: LEGAJO, NOMBRE, PERIODO, CUIL, y todos los conceptos monetarios según el parser específico de la empresa detectada. Si algún campo no se encuentra, marcarlo como "NO_ENCONTRADO" en lugar de fallar. Permitir 

### 4. **ALMACENAMIENTO**
Cada página procesada se guarda como un registro independiente en la base de datos con un identificador único que incluya el nombre del archivo original y el número de página. No se requiere consolidación entre páginas del mismo legajo, cada página es un registro separado.

### 5. **MANEJO DE ERRORES**
Si una página específica falla en el procesamiento, continuar con las páginas restantes y reportar al final cuántas páginas se procesaron exitosamente y cuáles fallaron. Los errores no deben detener el procesamiento del resto del PDF. Las que fallaron se dejan en memoria para que se pueda reintentar

### 6. **INTERFAZ DE USUARIO**
Implementar una interfaz moderna inspirada en el diseño de v0-postulador.vercel.app con una paleta de colores personalizable por empresa. Cada empresa podrá configurar su esquema de colores corporativo y subir su logo desde la sección de edición de empresa. La interfaz debe ser limpia, intuitiva y responsive, con navegación por pestañas y filtros inline.

### 7. **GESTIÓN DE EMPRESAS**
Crear un módulo de administración de empresas donde se puedan configurar: nombre, logo, paleta de colores (primario, secundario, acentos), y parámetros específicos de parsing. Cada empresa tendrá su configuración guardada y aplicada automáticamente al procesar sus PDFs. Los logos se almacenarán localmente y se mostrarán en la interfaz.

### 8. **VISUALIZACIÓN DE DATOS**
Implementar tablas con diseño moderno que muestren los recibos procesados con columnas para: LEGAJO, NOMBRE, PERIODO, EMPRESA, CONCEPTOS MONETARIOS, y ESTADO. Incluir filtros rápidos por empresa, período y nombre, con búsqueda en tiempo real. Cada fila debe tener un indicador visual del estado (procesado, error, pendiente).

### 9. **REPORTES Y ESTADÍSTICAS**
Agregar un dashboard con métricas clave: total de recibos procesados por empresa, período y estado. Incluir gráficos de barras y estadísticas de procesamiento exitoso vs errores. Permitir visualizacion en el tablero de control y exportación de reportes en formato Excel con los datos filtrados según los criterios seleccionados.

### 10. **CONFIGURACIÓN AVANZADA**
Implementar un panel de configuración donde se puedan ajustar parámetros de parsing por empresa, como patrones de regex personalizados, ubicaciones específicas de campos en el PDF, y tolerancias de detección. Incluir un modo de prueba donde se pueda subir un PDF de muestra y ver en tiempo real cómo se extraen los datos antes de procesar lotes grandes.

### 11. **SISTEMA DE CONTROLES AVANZADOS**
Crear un módulo de controles avanzados que permita configurar queries personalizadas. El usuario podrá seleccionar cualquier concepto detectado (contribución solidaria, seguro de sepelio, cuota mutual, etc.) y aplicar operadores matemáticos (igual, mayor, menor, porcentaje, suma, resta, multiplicación, división) contra valores específicos o contra otros conceptos. Ejemplo: "Contribución solidaria = 3% del sueldo bruto" o "Seguro de sepelio > $50,000".

### 12. **DETECCIÓN AUTOMÁTICA DE CONCEPTOS**
Implementar un sistema que detecte automáticamente todos los conceptos monetarios presentes en los PDFs procesados, creando un catálogo dinámico de conceptos disponibles para usar en los controles avanzados. Cada concepto tendrá su código, descripción, y tipo (haberes, descuentos, aportes).

### 13. **CONSTRUCTOR DE QUERIES VISUAL**
Desarrollar una interfaz drag-and-drop o wizard que permita construir queries complejas de forma visual: seleccionar concepto → elegir operador → ingresar valor o seleccionar otro concepto → aplicar lógica booleana (AND, OR, NOT) para queries múltiples.

### 14. **CÁLCULO DE DIFERENCIAS Y ALERTAS**
Implementar un sistema que calcule automáticamente las diferencias entre valores esperados vs reales según las queries configuradas. Generar alertas automáticas cuando se detecten discrepancias y mostrar en el dashboard las diferencias totales por empresa, período y concepto.

### 15. **REPORTES DE CONTROLES PERSONALIZADOS**
Crear un sistema de reportes que permita exportar los resultados de los controles avanzados en formato Excel, incluyendo: lista de recibos que cumplen/no cumplen cada query, diferencias calculadas, estadísticas de cumplimiento por empresa y período, y gráficos de tendencias.

---

## 🎯 **OBJETIVO FINAL**
Crear un sistema que permita subir PDFs grandes (500+ páginas) y que automáticamente:
- ✅ Detecte la empresa
- ✅ Procese cada página como un recibo individual
- ✅ Extraiga todos los datos correctamente
- ✅ Guarde cada recibo como un registro único
- ✅ Proporcione una interfaz moderna y personalizable
- ✅ Genere reportes y estadísticas
- ✅ Permita configurar controles avanzados con queries personalizadas
- ✅ Calcule diferencias automáticamente y genere alertas
- ✅ Detecte conceptos dinámicamente para controles flexibles

---

## 🔧 **IMPLEMENTACIÓN TÉCNICA**

### **Stack Tecnológico:**
- **Frontend:** Next.js 14 + React + TypeScript
- **UI:** Shadcn/ui + Tailwind CSS
- **Base de Datos:** Dexie.js (IndexedDB)
- **PDF Processing:** PDF.js
- **Parsing:** Regex patterns por empresa
- **Email:** Nodemailer + Gmail SMTP
- **Autenticación:** NextAuth.js + JWT
- **Validación:** Zod
- **Notificaciones:** Sonner

### **Arquitectura:**
```
📁 app/
├── 📄 page.tsx (Main interface)
├── 📁 components/
│   ├── 📄 EmpresaConfig.tsx
│   ├── 📄 ReceiptsTable.tsx
│   ├── 📄 Dashboard.tsx
│   ├── 📄 UploadArea.tsx
│   ├── 📄 ControlesAvanzados.tsx
│   ├── 📄 QueryBuilder.tsx
│   ├── 📄 ConceptosDetector.tsx
│   ├── 📄 AlertasPanel.tsx
│   ├── 📄 DescuentosPanel.tsx
│   ├── 📄 DescuentosABM.tsx
│   ├── 📄 UserManagement.tsx
│   ├── 📄 InvitationSystem.tsx
│   ├── 📄 RolePermissions.tsx
│   └── 📄 AuthSystem.tsx
├── 📁 lib/
│   ├── 📄 pdf-parser.ts
│   ├── 📄 empresa-config.ts
│   ├── 📄 repo-dexie.ts
│   ├── 📄 controles-avanzados.ts
│   ├── 📄 query-engine.ts
│   ├── 📄 conceptos-detector.ts
│   ├── 📄 descuentos-manager.ts
│   ├── 📄 user-management.ts
│   ├── 📄 auth-system.ts
│   ├── 📄 permissions.ts
│   └── 📄 email-service.ts
├── 📁 api/
│   ├── 📄 auth/
│   ├── 📄 users/
│   ├── 📄 invitations/
│   └── 📄 descuentos/
└── 📁 public/
    └── 📄 logos/ (empresa logos)
```

---

## 🎨 **DISEÑO INSPIRADO EN V0-POSTULADOR**

### **Características del Diseño:**
- **Layout:** Sidebar navigation + main content area
- **Colores:** Paleta personalizable por empresa
- **Componentes:** Cards, tables, filters, progress bars
- **UX:** Drag & drop, real-time search, responsive design
- **Branding:** Logo de empresa en header, colores corporativos

### **Paleta de Colores Base:**
```css
:root {
  --primary: #3b82f6;      /* Azul principal */
  --secondary: #64748b;    /* Gris secundario */
  --accent: #f59e0b;       /* Amarillo acento */
  --success: #10b981;      /* Verde éxito */
  --error: #ef4444;        /* Rojo error */
  --background: #f8fafc;   /* Fondo claro */
  --surface: #ffffff;      /* Superficie */
}
```

---

## 🔍 **SISTEMA DE CONTROLES AVANZADOS - EJEMPLOS**

### **Tipos de Queries Soportadas:**

#### **1. Queries de Porcentaje:**
```
Contribución Solidaria = 3% del Sueldo Bruto
Seguro de Sepelio = 1.5% del Sueldo Bruto
Cuota Mutual = 2% del Sueldo Bruto
```

#### **2. Queries de Comparación:**
```
Seguro de Sepelio > $50,000
Contribución Solidaria < $100,000
Cuota Mutual = $25,000
```

#### **3. Queries de Relación entre Conceptos:**
```
Contribución Solidaria = Seguro de Sepelio × 2
Cuota Mutual = (Sueldo Bruto - Descuentos) × 0.02
```

#### **4. Queries Compuestas (AND/OR):**
```
(Contribución Solidaria = 3% del Sueldo) AND (Seguro de Sepelio > $30,000)
(Cuota Mutual < $50,000) OR (Sueldo Bruto > $500,000)
```

#### **5. Queries de Rango:**
```
Sueldo Bruto entre $200,000 y $800,000
Contribución Solidaria entre 2.5% y 3.5% del Sueldo
```

### **Operadores Disponibles:**
- **Aritméticos:** `+`, `-`, `×`, `÷`, `%`
- **Comparación:** `=`, `>`, `<`, `>=`, `<=`, `!=`
- **Lógicos:** `AND`, `OR`, `NOT`
- **Especiales:** `ENTRE`, `CONTIENE`, `ES_VACIO`

### **Conceptos Detectados Automáticamente:**
- **Haberes:** Sueldo Bruto, Sueldo Neto, Horas Extras, Bonificaciones
- **Descuentos:** Contribución Solidaria, Seguro de Sepelio, Cuota Mutual, Resguardo Mutual
- **Aportes:** Jubilación, Obra Social, Ley 19032
- **Otros:** ITEM 5.3.10, Descuentos Varios, Adelantos

---

## 💰 **MÓDULO DE DESCUENTOS - ESPECIFICACIONES DETALLADAS**

### **Estructura de Datos:**
```typescript
interface Descuento {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  fechaInicio: Date;
  fechaFin?: Date;
  monto: number;
  cantidadCuotas: number;
  cuotaActual: number;
  montoCuota: number;
  descripcion: string;
  tipoDescuento: 'PRESTAMO' | 'ADELANTO' | 'DESCUENTO_VARIO' | 'JUDICIAL';
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO' | 'CANCELADO';
  observaciones?: string;
  creadoPor: string;
  fechaCreacion: Date;
  modificadoPor?: string;
  fechaModificacion?: Date;
}
```

### **Funcionalidades del ABM:**
- **Crear descuento:** Formulario con validaciones (legajo existe, monto > 0, cuotas > 0)
- **Editar descuento:** Modificar monto, cuotas, estado, observaciones
- **Suspender/Reactivar:** Cambiar estado sin perder historial
- **Cancelar descuento:** Marcar como cancelado con motivo
- **Historial de cambios:** Auditoría completa de modificaciones

### **Filtros Avanzados:**
- **Por Usuario:** Legajo, nombre, empresa, puesto
- **Por Período:** Fecha inicio, fecha fin, período de liquidación
- **Por Estado:** Activo, suspendido, finalizado, cancelado
- **Por Tipo:** Préstamo, adelanto, descuento varios, judicial
- **Por Monto:** Rango de montos, cuotas pendientes

### **Cálculos y Totales:**
- **Total a descontar por usuario:** Suma de descuentos activos
- **Total por empresa:** Agregación por empresa y período
- **Total por puesto:** Agrupación por categoría/cargo
- **Cuotas pendientes:** Cálculo automático de cuotas restantes
- **Proyección de finalización:** Fecha estimada de finalización

### **Reportes de Descuentos:**
- **Listado detallado:** Con filtros aplicados y exportación Excel
- **Resumen por empresa:** Totales y estadísticas por empresa
- **Análisis de tendencias:** Gráficos de descuentos por período
- **Alertas de vencimiento:** Notificaciones de descuentos próximos a finalizar

---

## 👥 **SISTEMA DE USUARIOS - ARQUITECTURA DETALLADA**

### **Jerarquía de Roles:**
```
SuperAdmin
├── Crear/Eliminar empresas
├── Asignar administradores de empresa
├── Acceso total al sistema
└── Gestión de configuración global

Admin de Empresa
├── Gestionar usuarios de su empresa
├── Configurar permisos y roles
├── Acceso a todos los módulos de su empresa
└── Invitar nuevos usuarios

Usuario
├── Acceso según permisos asignados
├── Ver/editar según rol
└── Funcionalidades limitadas
```

### **Flujo de Invitaciones:**
1. **SuperAdmin/Admin** crea invitación con email y rol
2. **Sistema** envía email con token de activación
3. **Usuario** hace clic en link y completa registro
4. **Sistema** valida token y activa cuenta
5. **Usuario** puede acceder con permisos asignados

### **Permisos Granulares por Módulo:**
- **Recibos:** Ver, Crear, Editar, Eliminar, Exportar
- **Controles:** Ver, Crear, Editar, Ejecutar, Exportar
- **Descuentos:** Ver, Crear, Editar, Eliminar, Aprobar
- **Reportes:** Ver, Crear, Exportar, Programar
- **Configuración:** Ver, Editar (solo admin)

---

## 📊 **FLUJO DE PROCESAMIENTO**

```mermaid
graph TD
    A[📁 Subir PDF] --> B[🔍 Detectar Empresa]
    B --> C{¿Empresa Detectada?}
    C -->|No| D[❌ Error + Fin]
    C -->|Sí| E[📄 Contar Páginas]
    E --> F[🔄 Procesar Página 1]
    F --> G[📊 Extraer Datos]
    G --> H[💾 Guardar Registro]
    H --> I{¿Más Páginas?}
    I -->|Sí| J[➡️ Siguiente Página]
    J --> F
    I -->|No| K[✅ Completado]
    K --> L[📈 Mostrar Estadísticas]
```

---

## 🚀 **FUNCIONALIDADES ADICIONALES**

### **16. HISTORIAL DE CAMBIOS Y AUDITORÍA**
Implementar un sistema de auditoría que registre todos los cambios realizados en los datos: quién modificó qué, cuándo, y por qué. Incluir rollback de cambios y comparación de versiones.

### **17. NOTIFICACIONES Y ALERTAS EN TIEMPO REAL**
Sistema de notificaciones push que alerte cuando se detecten discrepancias en los controles, cuando fallen procesamientos, o cuando se alcancen umbrales configurados.

### **18. INTEGRACIÓN CON SISTEMAS EXTERNOS**
API REST para integrar con sistemas de nómina, contabilidad o ERP. Endpoints para exportar/importar datos, sincronizar información, y recibir notificaciones de cambios.

### **19. BACKUP Y SINCRONIZACIÓN**
Sistema de backup automático de la base de datos local, con opción de sincronización en la nube. Restauración de datos desde backups y migración entre dispositivos.

### **20. MODO OFFLINE Y SINCRONIZACIÓN**
Funcionalidad completa offline con sincronización automática cuando se recupere la conexión. Cola de operaciones pendientes y resolución de conflictos.

### **21. TEMPLATES DE CONTROLES PREDEFINIDOS**
Biblioteca de templates de controles comunes por industria (gremios, sindicatos, empresas privadas) que los usuarios puedan importar y personalizar.

### **22. ANÁLISIS PREDICTIVO Y TENDENCIAS**
Algoritmos de machine learning para detectar patrones anómalos, predecir tendencias en los datos, y sugerir controles adicionales basados en el comportamiento histórico.

### **23. SISTEMA DE USUARIOS Y PERMISOS**
Implementar un sistema completo de gestión de usuarios con roles jerárquicos: SuperAdmin (crea empresas y administradores), Admin de Empresa (gestiona usuarios de su empresa), Usuario (acceso limitado según permisos). Incluir invitaciones por email, activación de cuentas, y gestión de permisos granular por módulo y funcionalidad.

### **24. MÓDULO DE DESCUENTOS (ABM)**
Crear un sistema completo de gestión de descuentos con campos: fecha, legajo, monto, cantidad de cuotas, descripción, estado (activo/inactivo), tipo de descuento. Que el modal de creacion/edicion sea amigable, que se pueda buscar el legajo por nombre o cuil, que se puedan poner palabras clave, como tags que faciliten agrupar categorias o eventos. Incluir filtros avanzados para calcular totales por usuario, empresa, puesto, período, y exportación de reportes de descuentos. poder ver ficha unica de un empleado con sus recibos de sueldo, sus diferencias en controles y sus descuentos pendientes. Cruzar con los descuentos pagados y sacar diferencias

### **25. GESTIÓN DE INVITACIONES Y ACTIVACIÓN**
Sistema de invitaciones por email con tokens de activación, formularios de registro con validación, y asignación automática de permisos según el rol asignado. Incluir reenvío de invitaciones y gestión de usuarios pendientes de activación.

### **26. PERMISOS GRANULARES Y ROLES PERSONALIZADOS**
Sistema de permisos detallado que permita a los administradores de empresa crear roles personalizados con acceso específico a módulos (recibos, controles, descuentos, reportes) y acciones (ver, crear, editar, eliminar, exportar).

### **27. AUDITORÍA DE USUARIOS Y ACTIVIDADES**
Registro completo de actividades de usuarios: login/logout, cambios de datos, exportaciones, configuraciones modificadas. Incluir trazabilidad de quién hizo qué y cuándo, con posibilidad de rollback de cambios críticos.

### **28. INTEGRACIÓN CON SISTEMAS DE AUTENTICACIÓN**
Soporte para SSO (Single Sign-On), integración con Active Directory, LDAP, o proveedores de identidad como Google Workspace, Microsoft 365. Opción de autenticación de dos factores (2FA) para mayor seguridad. 

### **29. GESTIÓN DE SESIONES Y SEGURIDAD**
Control de sesiones concurrentes, expiración automática de sesiones inactivas, bloqueo de cuentas por intentos fallidos, y políticas de contraseñas configurables por empresa.

### **30. REPORTES DE USUARIOS Y ACTIVIDAD**
Dashboard para superadministradores con métricas de uso por empresa, usuarios activos, actividades más frecuentes, y reportes de seguridad. Para administradores de empresa: gestión de su equipo, permisos asignados, y actividad de usuarios.


### **33. GESTIÓN DE DOCUMENTOS Y ARCHIVOS** MAS ADELANTE
Sistema de gestión documental que permita adjuntar documentos a descuentos (contratos, autorizaciones, comprobantes), con versionado y control de acceso. Integración con almacenamiento en la nube.

### **34. MÓDULO DE COMUNICACIONES INTERNAS** MAS ADELANTE
Sistema de mensajería interna entre usuarios de la misma empresa, notificaciones automáticas sobre cambios en descuentos, y centro de comunicaciones para anuncios importantes.

### **35. ANÁLISIS FINANCIERO Y PROYECCIONES**MAS ADELANTE
Herramientas de análisis financiero que permitan proyectar el impacto de descuentos en futuras liquidaciones, análisis de capacidad de pago por empleado, y simuladores de escenarios.

### **36. INTEGRACIÓN CON BANCOS Y PAGOS**MAS ADELANTE
Conectores con sistemas bancarios para automatizar el procesamiento de descuentos, transferencias automáticas, y reconciliación de pagos. Soporte para múltiples bancos y monedas.

### **37. MÓDULO DE CAPACITACIÓN Y AYUDA**
Sistema de ayuda integrado con tutoriales interactivos, documentación contextual, videos explicativos, y centro de soporte. Chat en vivo para usuarios premium.

### **38. GESTIÓN DE MÚLTIPLES EMPRESAS (HOLDING)**MAS ADELANTE
Para grupos empresariales, permitir gestión centralizada de múltiples empresas con consolidación de reportes, transferencia de empleados entre empresas, y administración unificada.

### **39. MÓDULO DE COMPLIANCE Y AUDITORÍA**MAS ADELANTE
Herramientas de cumplimiento normativo, generación automática de reportes regulatorios, auditoría de procesos, y trazabilidad completa de todas las operaciones para cumplir con normativas laborales.

### **40. INTELIGENCIA ARTIFICIAL Y AUTOMATIZACIÓN**MAS ADELANTE
IA para detectar patrones anómalos en descuentos, sugerir optimizaciones, automatizar procesos repetitivos, y proporcionar insights predictivos sobre tendencias de nómina y descuentos.

---

## 🚀 **PRÓXIMOS PASOS**

1. **Implementar detección de empresa mejorada**
2. **Crear procesamiento página por página**
3. **Desarrollar interfaz moderna**
4. **Agregar gestión de empresas**
5. **Implementar sistema de controles avanzados**
6. **Crear constructor de queries visual**
7. **Desarrollar módulo de descuentos (ABM)**
8. **Implementar sistema de usuarios y permisos**
9. **Crear sistema de invitaciones por email**
10. **Desarrollar dashboard y reportes**
11. **Testing con PDFs grandes**

---

## 📋 **PRIORIDADES DE DESARROLLO**

### **Fase 1 - Core (Semana 1-2):**
- ✅ Procesamiento página por página
- ✅ Detección de empresa mejorada
- ✅ Interfaz básica moderna

### **Fase 2 - Controles (Semana 3-4):**
- 🔄 Sistema de controles avanzados
- 🔄 Constructor de queries
- 🔄 Detección automática de conceptos

### **Fase 3 - Descuentos (Semana 5-6):**
- ⏳ Módulo de descuentos (ABM)
- ⏳ Filtros avanzados y cálculos
- ⏳ Reportes de descuentos

### **Fase 4 - Usuarios (Semana 7-8):**
- ⏳ Sistema de usuarios y roles
- ⏳ Invitaciones por email
- ⏳ Permisos granulares

### **Fase 5 - Avanzado (Semana 9-10):**
- ⏳ Dashboard completo
- ⏳ Reportes personalizados
- ⏳ Alertas y notificaciones

### **Fase 6 - Enterprise (Semana 11-12):**
- ⏳ Integración con APIs
- ⏳ Backup y sincronización
- ⏳ Análisis predictivo

---

## 🔧 **CONFIGURACIÓN INICIAL REQUERIDA**

### **Variables de Entorno (.env.local):**
```bash
# Email Configuration (Gmail SMTP)
GMAIL_USER=tu-email@gmail.com
GMAIL_APP_PASSWORD=tu-app-password-de-gmail

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-super-seguro-aqui

# Database Configuration (si se migra a PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/recibos_db

# Optional: Google OAuth (para SSO)
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

### **Dependencias a Instalar:**
```bash
npm install nodemailer @types/nodemailer
npm install next-auth
npm install zod
npm install @hookform/resolvers
npm install react-hook-form
npm install date-fns
npm install @radix-ui/react-select
npm install @radix-ui/react-dialog
npm install @radix-ui/react-tabs
npm install @radix-ui/react-toast
npm install lucide-react
```

### **Configuración de Gmail App Password:**
1. Ir a Google Account Settings
2. Security → 2-Step Verification (activar)
3. App passwords → Generate app password
4. Seleccionar "Mail" y "Other (custom name)"
5. Usar la contraseña generada en GMAIL_APP_PASSWORD

### **Estructura de Base de Datos (Dexie):**
```typescript
// lib/db.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  empresaId?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Empresa {
  id: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  adminUserId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Descuento {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  fechaInicio: Date;
  fechaFin?: Date;
  monto: number;
  cantidadCuotas: number;
  cuotaActual: number;
  montoCuota: number;
  descripcion: string;
  tipoDescuento: 'PRESTAMO' | 'ADELANTO' | 'DESCUENTO_VARIO' | 'JUDICIAL';
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO' | 'CANCELADO';
  tags: string[];
  motivo: string;
  autorizadoPor: string;
  fechaAutorizacion: Date;
  observaciones?: string;
  creadoPor: string;
  fechaCreacion: Date;
  modificadoPor?: string;
  fechaModificacion?: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  empresaId: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdBy: string;
  createdAt: Date;
}
```

### **Configuración de NextAuth (app/api/auth/[...nextauth]/route.ts):**
```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Lógica de autenticación personalizada
        // Verificar contra base de datos local
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.empresaId = user.empresaId
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      session.user.empresaId = token.empresaId
      return session
    }
  }
}

export default NextAuth(authOptions)
```

### **Configuración de Email (lib/email.ts):**
```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

export async function sendInvitationEmail(email: string, token: string, empresa: string) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `Invitación a ${empresa} - Sistema de Recibos`,
    html: `
      <h2>Has sido invitado a ${empresa}</h2>
      <p>Haz clic en el siguiente enlace para activar tu cuenta:</p>
      <a href="${process.env.NEXTAUTH_URL}/auth/activate?token=${token}">
        Activar Cuenta
      </a>
      <p>Este enlace expira en 7 días.</p>
    `
  }
  
  return await transporter.sendMail(mailOptions)
}
```

### **Validaciones con Zod:**
```typescript
// lib/validations.ts
import { z } from 'zod'

export const descuentoSchema = z.object({
  legajo: z.string().min(1, 'Legajo es requerido'),
  monto: z.number().positive('Monto debe ser positivo'),
  cantidadCuotas: z.number().int().positive('Cuotas debe ser un número positivo'),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  tipoDescuento: z.enum(['PRESTAMO', 'ADELANTO', 'DESCUENTO_VARIO', 'JUDICIAL']),
  tags: z.array(z.string()).optional(),
  motivo: z.string().min(1, 'Motivo es requerido')
})

export const invitationSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['ADMIN', 'USER']),
  empresaId: z.string().min(1, 'Empresa es requerida')
})
```

### **Permisos del Sistema:**
```typescript
// lib/permissions.ts
export const PERMISSIONS = {
  RECIBOS: {
    VIEW: 'recibos:view',
    CREATE: 'recibos:create',
    EDIT: 'recibos:edit',
    DELETE: 'recibos:delete',
    EXPORT: 'recibos:export'
  },
  CONTROLES: {
    VIEW: 'controles:view',
    CREATE: 'controles:create',
    EDIT: 'controles:edit',
    EXECUTE: 'controles:execute',
    EXPORT: 'controles:export'
  },
  DESCUENTOS: {
    VIEW: 'descuentos:view',
    CREATE: 'descuentos:create',
    EDIT: 'descuentos:edit',
    DELETE: 'descuentos:delete',
    APPROVE: 'descuentos:approve'
  },
  USUARIOS: {
    VIEW: 'usuarios:view',
    CREATE: 'usuarios:create',
    EDIT: 'usuarios:edit',
    DELETE: 'usuarios:delete',
    INVITE: 'usuarios:invite'
  }
} as const

export const ROLE_PERMISSIONS = {
  SUPERADMIN: Object.values(PERMISSIONS).flat(),
  ADMIN: [
    ...Object.values(PERMISSIONS.RECIBOS),
    ...Object.values(PERMISSIONS.CONTROLES),
    ...Object.values(PERMISSIONS.DESCUENTOS),
    PERMISSIONS.USUARIOS.VIEW,
    PERMISSIONS.USUARIOS.CREATE,
    PERMISSIONS.USUARIOS.EDIT,
    PERMISSIONS.USUARIOS.INVITE
  ],
  USER: [
    PERMISSIONS.RECIBOS.VIEW,
    PERMISSIONS.CONTROLES.VIEW,
    PERMISSIONS.DESCUENTOS.VIEW
  ]
} as const
```

---

## 📋 **CHECKLIST DE IMPLEMENTACIÓN**

### **Fase 1 - Setup Inicial:**
- [ ] Configurar variables de entorno
- [ ] Instalar dependencias
- [ ] Configurar NextAuth
- [ ] Configurar email con Gmail
- [ ] Crear esquemas de base de datos
- [ ] Implementar validaciones Zod

### **Fase 2 - Autenticación:**
- [ ] Sistema de login/logout
- [ ] Registro de usuarios
- [ ] Invitaciones por email
- [ ] Activación de cuentas
- [ ] Gestión de permisos

### **Fase 3 - Módulo Descuentos:**
- [ ] ABM de descuentos
- [ ] Búsqueda por legajo/nombre/CUIL
- [ ] Sistema de tags
- [ ] Ficha única del empleado
- [ ] Cálculo de diferencias

### **Fase 4 - UI/UX:**
- [ ] Diseño responsive
- [ ] Componentes reutilizables
- [ ] Navegación por pestañas
- [ ] Filtros avanzados
- [ ] Reportes y exportación

---

*¿Listo para implementar? 🚀*
