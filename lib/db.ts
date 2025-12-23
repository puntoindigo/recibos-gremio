// lib/db.ts
import Dexie, { Table } from "dexie";

// 🛡️ GUARDIA DE SEGURIDAD: Interceptar consultas directas a IndexedDB
const DATABASE_GUARD_ACTIVE = true;

if (DATABASE_GUARD_ACTIVE) {
  console.warn('🛡️ GUARDIA DE SEGURIDAD ACTIVA');
  console.warn('🛡️ Las consultas directas a IndexedDB están bloqueadas');
  console.warn('🛡️ Usa useCentralizedDataManager() en lugar de db.consolidated');
}

// 🚨 ROMPER INDEXEDDB: Interceptar todas las consultas y lanzar errores
const BREAK_INDEXEDDB = true;

if (BREAK_INDEXEDDB) {
  console.error('🚨 INDEXEDDB ROTO - Todas las consultas fallarán');
  console.error('🚨 Usa el sistema centralizado en su lugar');
}

/** Valor JSON serializable (sin `any`). */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JSONValue }
  | JSONValue[];

/** Registro crudo por PDF subido. */
export type ReceiptRowDB = {
  id?: number;
  key: string;                  // `${legajo}||${periodo}`
  legajo: string;
  periodo: string;              // mm/yyyy
  nombre?: string;              // NOMBRE (tal cual)
  cuil?: string;                // con guiones
  cuilNorm?: string;            // solo dígitos
  filename: string;
  createdAt: number;
  data: Record<string, string>; // base + códigos
  hashes: string[];             // SHA-256 de archivos fuente
};

/** Fila consolidada por LEGAJO+PERIODO. */
export type ConsolidatedEntity = {
  key: string;
  legajo: string;
  periodo: string;
  nombre?: string;
  cuil?: string;
  cuilNorm?: string;
  archivos: string[];               // nombres de archivos mergeados
  data: Record<string, string>;     // base + sumatoria de códigos
};

/** Dataset oficial importado desde Excel. */
export type ControlRow = {
  key: string;                        // `${legajo}||${periodo}`
  valores: Record<string, string>;    // códigos normalizados (punto decimal)
  meta?: Record<string, JSONValue>;   // metadatos opcionales (serializables)
};

/** Control guardado con filtros específicos. */
export type SavedControlDB = {
  id?: number;
  filterKey: string;                  // `${periodo}||${empresa}`
  periodo: string;
  empresa: string;
  summaries: Array<{
    key: string;
    legajo: string;
    periodo: string;
    difs: Array<{
      codigo: string;
      label: string;
      oficial: string;
      calculado: string;
      delta: string;
      dir: string;
    }>;
  }>;
  oks: Array<{ key: string; legajo: string; periodo: string }>;
  missing: Array<{ key: string; legajo: string; periodo: string }>;
  stats: {
    comps: number;
    compOk: number;
    compDif: number;
    okReceipts: number;
    difReceipts: number;
  };
  officialKeys: string[];
  officialNameByKey: Record<string, string>;
  nameByKey: Record<string, string>;  // Nombres de los recibos
  createdAt: number;
};

/** Usuario del sistema. */
export type User = {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  empresaId?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: number;
  lastLogin?: number;
  passwordHash?: string; // Solo para autenticación local
};

/** Empresa del sistema. */
export type Empresa = {
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
  createdAt: number;
};

/** Invitación pendiente. */
export type Invitation = {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  empresaId: string;
  token: string;
  expiresAt: number;
  isUsed: boolean;
  createdBy: string;
  createdAt: number;
};

/** Descuento de empleado. */
export type Descuento = {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  fechaInicio: number;
  fechaFin?: number;
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
  fechaAutorizacion: number;
  observaciones?: string;
  creadoPor: string;
  fechaCreacion: number;
  modificadoPor?: string;
  fechaModificacion?: number;
};

/** Actividad de usuario para auditoría. */
export type UserActivity = {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, JSONValue>;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
};

/** Configuración de columnas por usuario. */
export type ColumnConfigDB = {
  id?: number;
  userId: string;
  tableType: string;                    // 'recibos', 'control', etc.
  visibleColumns: string[];             // columnas visibles
  columnAliases: Record<string, string>; // alias de columnas
  createdAt: number;
  updatedAt: number;
};

/** Estado de subida de archivos. */
export type UploadSessionDB = {
  id?: number;
  sessionId: string;                    // ID único de la sesión de subida
  userId: string;                       // Usuario que inició la subida
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  totalFiles: number;                   // Total de archivos a procesar
  completedFiles: number;               // Archivos completados
  failedFiles: number;                  // Archivos con error
  skippedFiles: number;                 // Archivos omitidos
  pendingFiles: number;                 // Archivos pendientes
  currentFileIndex: number;            // Índice del archivo actual
  files: UploadFileDB[];                // Lista de archivos
  startedAt: number;                    // Timestamp de inicio
  lastUpdatedAt: number;               // Timestamp de última actualización
  completedAt?: number;                 // Timestamp de finalización
  errorMessage?: string;                // Mensaje de error si falló
};

/** Archivo individual en una sesión de subida. */
export type UploadFileDB = {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
  processingResult?: any;               // Resultado del procesamiento
};

/** Item pendiente. */
export type PendingItemDB = {
  id: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed';
  order: number;
  color?: string;
  proposedSolution?: string;
  feedback?: Array<{
    id: string;
    text: string;
    createdAt: string;
    resolved: boolean;
  }>;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export class RecibosDB extends Dexie {
  receipts!: Table<ReceiptRowDB, number>;
  consolidated!: Table<ConsolidatedEntity, string>;
  control!: Table<ControlRow, string>;
  savedControls!: Table<SavedControlDB, number>;
  settings!: Table<{ k: string; v: JSONValue }, string>;
  users!: Table<User, string>;
  empresas!: Table<Empresa, string>;
  invitations!: Table<Invitation, string>;
  descuentos!: Table<Descuento, string>;
  userActivities!: Table<UserActivity, string>;
  columnConfigs!: Table<ColumnConfigDB, number>;
  uploadSessions!: Table<UploadSessionDB, number>;
  pendingItems!: Table<PendingItemDB, string>;

  constructor() {
    super("recibosDB-v2");
    // Nota: *hashes => índice multiEntry para búsquedas por hash.
    this.version(7).stores({
      receipts: "++id, key, legajo, periodo, cuilNorm, filename, createdAt, *hashes",
      consolidated: "key, legajo, periodo, cuilNorm",
      control: "key",
      savedControls: "++id, filterKey, periodo, empresa, createdAt",
      settings: "k",
      users: "id, email, empresaId, role, isActive, createdAt",
      empresas: "id, name, adminUserId, isActive, createdAt",
      invitations: "id, email, empresaId, token, expiresAt, isUsed, createdAt",
      descuentos: "id, legajo, empresa, tipoDescuento, estado, fechaInicio, fechaCreacion, *tags",
      userActivities: "id, userId, action, resource, timestamp",
      columnConfigs: "++id, userId, tableType, [userId+tableType], createdAt, updatedAt",
      uploadSessions: "++id, sessionId, userId, status, startedAt, lastUpdatedAt, [userId+status], files",
      pendingItems: "id, title, category, priority, status, createdAt, completedAt, resolvedAt",
    });
  }
}

// 🚨 ROMPER INDEXEDDB: Crear una instancia que falle en todas las consultas
class BrokenDatabase {
  constructor() {
    console.error('🚨 INDEXEDDB ROTO - Intentando crear instancia de base de datos');
    console.error('🚨 Todas las consultas fallarán');
    console.error('🚨 Usa el sistema centralizado en su lugar');
  }

  // Interceptar TODAS las consultas y lanzar errores
  get consolidated() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.consolidated está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get receipts() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.receipts está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get descuentos() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.descuentos está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get empresas() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.empresas está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get savedControls() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.savedControls está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get columnConfigs() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.columnConfigs está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get userActivities() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.userActivities está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get uploadSessions() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.uploadSessions está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  get control() {
    console.error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA');
    console.error('🚨 db.control está roto');
    console.error('🚨 Usa useCentralizedDataManager() en su lugar');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }
}

export const db = new BrokenDatabase();

// utils de normalización
export const normalizePeriodo = (s: unknown) => String(s ?? "").trim();
export const normalizeCuilDigits = (s?: string) => (s ?? "").replace(/\D/g, "");
export const makeKey = (legajo: string, periodo: string) =>
  `${String(legajo ?? "").trim()}||${String(periodo ?? "").trim()}`;

// utils para usuarios
export const generateUserId = () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateEmpresaId = () => `empresa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateInvitationToken = () => `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// utils para descuentos
export const generateDescuentoId = () => `desc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const calculateMontoCuota = (monto: number, cuotas: number) => Math.round((monto / cuotas) * 100) / 100;
export const calculateCuotasRestantes = (cuotaActual: number, cantidadCuotas: number) => Math.max(0, cantidadCuotas - cuotaActual);

// utils para permisos
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
} as const;

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
} as const;
