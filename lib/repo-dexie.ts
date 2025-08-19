// lib/repo-dexie.ts
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import Dexie, { type Table } from "dexie";

/** Filas consolidadas que usa la app en memoria / UI */
export type ConsolidatedRow = {
  key: string;                          // `${legajo}||${periodo}`
  legajo: string;
  periodo: string;                      // MM/YYYY
  nombre: string;
  cuil?: string;
  /** NUEVO: nombre de empresa, si existe */
  empresa?: string;
  /** nombre del archivo subido (PDF) */
  filename?: string;
  /** hash del archivo para dedupe local */
  fileHash?: string;
  /** columnas etiquetadas (20540, 20590, etc) + metadatos como NOMBRE, CUIL… */
  data: Record<string, string>;
  createdAt?: number;                   // epoch ms (opcional)
  updatedAt?: number;                   // epoch ms (opcional)
};

export type ControlRow = {
  key: string;                          // `${legajo}||${periodo}`
  valores: Record<string, string>;      // valores oficiales por código
  updatedAt?: number;
};

class RecibosDB extends Dexie {
  public receipts!: Table<ConsolidatedRow, string>;
  public control!: Table<ControlRow, string>;

  public constructor() {
    super("recibos_gremio_db");

    // Versión base (ajustá si ya tenías otra versión)
    // Índices: key (PK), legajo, periodo, empresa (nuevo), fileHash
    this.version(3).stores({
      receipts: "key, legajo, periodo, empresa, fileHash",
      control: "key",
    }).upgrade(async (tx) => {
      // Backfill: setear empresa = "LIMPAR" SOLO si está vacía/indefinida
      await tx.table("receipts")
        .toCollection()
        .modify((r: ConsolidatedRow) => {
          const actual = (r.empresa ?? "").trim();
          if (!actual) r.empresa = "LIMPAR";
          // Normalizamos timestamps si no existen
          if (!r.createdAt) r.createdAt = Date.now();
          r.updatedAt = Date.now();
        });
    });
  }
}

const db = new RecibosDB();

/* ============================ API ============================ */

async function countConsolidated(): Promise<number> {
  return db.receipts.count();
}

async function getConsolidatedPage(opts: { offset: number; limit: number }): Promise<ConsolidatedRow[]> {
  const { offset, limit } = opts;
  // devolvemos en cualquier orden; la UI ordena si lo necesita
  return db.receipts.offset(offset).limit(Math.max(0, limit)).toArray();
}

async function hasFileHash(hash: string): Promise<boolean> {
  if (!hash) return false;
  const n = await db.receipts.where("fileHash").equals(hash).count();
  return n > 0;
}

/**
 * Inserta/actualiza un recibo consolidado.
 * - No forzamos empresa: si viene, se guarda; si no, queda undefined.
 * - La clave se arma como `${legajo}||${periodo}`.
 */
async function addReceipt(rec: {
  legajo: string;
  periodo: string;
  nombre: string;
  cuil?: string;
  empresa?: string;
  filename?: string;
  fileHash?: string;
  data: Record<string, string>;
}): Promise<void> {
  const key = `${rec.legajo}||${rec.periodo}`;
  const now = Date.now();

  // Sanitizamos empresa: solo guardamos si viene con algo
  const empresa = rec.empresa && rec.empresa.trim() ? rec.empresa.trim() : 'LIMPAR';

  const row: ConsolidatedRow = {
    key,
    legajo: rec.legajo,
    periodo: rec.periodo,
    nombre: rec.nombre,
    cuil: rec.cuil,
    empresa,                        // <-- persistimos si existe
    filename: rec.filename,
    fileHash: rec.fileHash,
    data: rec.data,
    createdAt: now,
    updatedAt: now,
  };

  await db.receipts.put(row);
}

async function upsertControl(rows: Array<{ key: string; valores: Record<string, string> }>): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.control, async () => {
    for (const r of rows) {
      const row: ControlRow = { key: r.key, valores: r.valores, updatedAt: now };
      await db.control.put(row);
    }
  });
}

async function getControl(key: string): Promise<ControlRow | undefined> {
  return db.control.get(key);
}

/** Borra toda la base local (recibos + control). */
async function wipe(): Promise<void> {
  await db.transaction("rw", db.receipts, db.control, async () => {
    await db.control.clear();
    await db.receipts.clear();
  });
}

/* ========= utilidades opcionales para mantenimiento ========= */

/** Solo si querés forzar un backfill manual a futuro (no se usa hoy). */
async function backfillEmpresaIfMissing(valor: string): Promise<number> {
  let touched = 0;
  await db.receipts.toCollection().modify((r: ConsolidatedRow) => {
    const emp = (r.empresa ?? "").trim();
    if (!emp) {
      r.empresa = valor;
      r.updatedAt = Date.now();
      touched += 1;
    }
  });
  return touched;
}

/* ========================= export =========================== */

export const repoDexie = {
  countConsolidated,
  getConsolidatedPage,
  hasFileHash,
  addReceipt,
  upsertControl,
  getControl,
  wipe,
  // opcional:
  backfillEmpresaIfMissing,
};

export type { RecibosDB };
