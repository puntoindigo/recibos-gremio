// lib/repo-dexie.ts
import { db } from "./db";
import { toFixed2 } from "./number";
import type { ConsolidatedEntity } from "./repo";
import type { SavedControlDB, JSONValue } from "./db";

// Helpers
const isCode = (k: string) => /^\d{5}$/.test(k);
const makeKey = (legajo: string, periodo: string, empresa?: string) =>
  `${String(legajo).trim()}||${String(periodo).trim()}||${String(empresa || 'LIMPAR').trim()}`;
const normCuil = (s?: string) => (s || "").replace(/\D+/g, "");

type AddReceiptInput = {
  legajo: string;
  periodo: string;
  nombre?: string;
  cuil?: string;
  data: Record<string, string>;
  filename: string;
  fileHash: string;
  uniqueKey?: string; // Clave única para páginas divididas
};

function mergeSummingCodes(
  prev: Record<string, string>,
  next: Record<string, string>
) {
  const out: Record<string, string> = { ...prev };
  for (const [k, v] of Object.entries(next)) {
    if (isCode(k)) {
      const a = Number(out[k] ?? 0);
      const b = Number(v ?? 0);
      out[k] = toFixed2(a + b);
    } else if (k === "ARCHIVO" || k === "LEGAJO" || k === "PERIODO") {
      // no se consolidan como columnas “base”
      continue;
    } else {
      if (String(v ?? "").length) out[k] = String(v);
    }
  }
  return out;
}

async function findReceiptByHash(hash: string) {
  // Validar que el hash sea un string válido
  if (!hash || typeof hash !== 'string' || hash.trim() === '') {
    console.warn('Hash inválido proporcionado a findReceiptByHash:', hash);
    return null;
  }
  
  // Si existe índice multiEntry en `hashes`, esto es O(log n).
  // Si no, el filter hace un scan pero sigue siendo correcto.
  try {
    return await db.receipts.where("hashes").equals(hash).first();
  } catch (error) {
    console.warn('Error en findReceiptByHash con índice, usando filter:', error);
    return await db.receipts
      .filter((r) => Array.isArray(r.hashes) && r.hashes.includes(hash))
      .first();
  }
}

export const repoDexie = {
  /** Alta + consolidación (suma por LEGAJO+PERIODO) + dedupe por hash (global). */
  async addReceipt(
    input: AddReceiptInput
  ): Promise<"skipped-duplicate" | "added" | "merged"> {
    const empresa = (input.data?.EMPRESA as string | undefined) || 'LIMPAR';
    // Usar uniqueKey si está disponible (para páginas divididas), sino usar la clave normal
    const key = input.uniqueKey || makeKey(input.legajo, input.periodo, empresa);
    const isUniqueKey = !!input.uniqueKey; // Determinar si es una página dividida
    let result: "skipped-duplicate" | "added" | "merged" = "added";

    await db.transaction("rw", db.receipts, db.consolidated, async () => {
      // 🔒 Dedupe global por hash (antes de tocar nada)
      // Validar que el hash sea válido antes de usarlo
      if (!input.fileHash || typeof input.fileHash !== 'string' || input.fileHash.trim() === '') {
        console.warn('Hash de archivo inválido en addReceipt:', input.fileHash);
        throw new Error('Hash de archivo inválido');
      }
      
      const dupAny = await findReceiptByHash(input.fileHash);
      if (dupAny) {
        result = "skipped-duplicate";
        return; // NO tocar consolidado
      }

      // Alta del receipt (histórico)
      await db.receipts.add({
        key,
        legajo: input.legajo,
        periodo: input.periodo,
        nombre: input.nombre,
        cuil: input.cuil,
        cuilNorm: normCuil(input.cuil),
        filename: input.filename,
        createdAt: Date.now(),
        hashes: [input.fileHash],
        data: input.data,
      });

      // Upsert en consolidado
      if (isUniqueKey) {
        // Para páginas divididas, crear registro único sin consolidación
        const row: ConsolidatedEntity = {
          key,
          legajo: input.legajo,
          periodo: input.periodo,
          nombre: input.nombre,
          cuil: input.cuil,
          cuilNorm: normCuil(input.cuil),
          archivos: [input.filename],
          data: input.data,
        };
        await db.consolidated.put(row);
        result = "added";
      } else {
        // Para archivos normales, consolidar como antes
        const prev = await db.consolidated.get(key);
        const archivos = new Set<string>(
          Array.isArray(prev?.archivos) ? prev!.archivos : []
        );
        archivos.add(input.filename);

        const mergedData = mergeSummingCodes(prev?.data ?? {}, input.data);
        const row: ConsolidatedEntity = {
          key,
          legajo: input.legajo,
          periodo: input.periodo,
          nombre: input.nombre ?? prev?.nombre,
          cuil: input.cuil ?? prev?.cuil,
          cuilNorm: normCuil(input.cuil ?? prev?.cuil),
          archivos: Array.from(archivos),
          data: mergedData,
        };

        await db.consolidated.put(row);
        result = prev ? "merged" : "added";
      }
    });

    return result;
  },

  /** ¿Existe ya este hash en algún receipt? (pre-chequeo opcional para la UI) */
  async hasFileHash(hash: string): Promise<boolean> {
    // Validar que el hash sea válido
    if (!hash || typeof hash !== 'string' || hash.trim() === '') {
      console.warn('Hash inválido proporcionado a hasFileHash:', hash);
      return false;
    }
    
    const r = await findReceiptByHash(hash);
    return !!r;
  },

  /** Cantidad de filas consolidadas */
  async countConsolidated(): Promise<number> {
    return db.consolidated.count();
  },

  /** Paginado simple desde DB */
  async getConsolidatedPage(opts: {
    offset: number;
    limit: number;
  }): Promise<ConsolidatedEntity[]> {
    const { offset, limit } = opts;
    try {
      // Como 'key' es la clave primaria, podemos usar orderBy directamente
      return await db.consolidated.orderBy("key").offset(offset).limit(limit).toArray();
    } catch (error) {
      // Fallback: obtener todos y ordenar en memoria
      console.warn("Fallback en getConsolidatedPage:", error);
      const all = await db.consolidated.toArray();
      return all.sort((a, b) => a.key.localeCompare(b.key)).slice(offset, offset + limit);
    }
  },

  /** Control (dataset oficial desde Excel) */
  async upsertControl(
    rows: Array<{ key: string; valores: Record<string, string>; meta?: Record<string, JSONValue> }>
  ): Promise<void> {
    await db.transaction("rw", db.control, async () => {
      for (const r of rows) {
        await db.control.put({ key: r.key, valores: r.valores, meta: r.meta });
      }
    });
  },

  async getControl(key: string): Promise<
    { key: string; valores: Record<string, string>; meta?: Record<string, JSONValue> } | undefined
  > {
    const parts = String(key).split('||');
    const k = parts.length >= 2 ? `${parts[0]}||${parts[1]}` : key;
    return db.control.get(k);
  },

  /** Utilitarios */
  async wipe(): Promise<void> {
    await db.transaction("rw", db.receipts, db.consolidated, db.control, async () => {
      await db.receipts.clear();
      await db.consolidated.clear();
      await db.control.clear();
    });
  },
/** Borrar por clave (LEGAJO||PERIODO): borra recibos históricos y la fila consolidada. */
async deleteByKey(key: string): Promise<void> {
  await db.transaction("rw", db.receipts, db.consolidated, async () => {
    // receipts: puede no tener 'key' como PK; usamos índice 'key' si existe o filtro defensivo
    try {
      await db.receipts.where("key").equals(key).delete();
    } catch {
      // Fallback defensivo: filtrar
      await db.receipts.filter((r: { key?: string }) => r?.key === key).delete();
    }
    // consolidated: la clave 'key' actúa como PK en el código existente (get/put por key)
    try {
      await db.consolidated.delete(key);
    } catch (error) {
      // Fallback si no fuese PK o si hay algún problema
      console.warn("Fallback en deleteByKey consolidated:", error);
      await db.consolidated.where("key").equals(key).delete();
    }
  });
},

/** Alias de compatibilidad */
async removeByKey(key: string): Promise<void> {
  await this.deleteByKey(key);
},

/** Alias de compatibilidad (nombra "receipt" pero aplica a ambas tablas relacionadas) */
async deleteReceipt(key: string): Promise<void> {
  await this.deleteByKey(key);
},

/** Guardar control con filtros específicos */
async saveControl(
  periodo: string,
  empresa: string,
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
  }>,
  oks: Array<{ key: string; legajo: string; periodo: string }>,
  missing: Array<{ key: string; legajo: string; periodo: string }>,
  stats: {
    comps: number;
    compOk: number;
    compDif: number;
    okReceipts: number;
    difReceipts: number;
  },
  officialKeys: string[],
  officialNameByKey: Record<string, string>,
  nameByKey: Record<string, string>,
  showDebug: boolean = false
): Promise<void> {
  const filterKey = `${periodo}||${empresa}`;
  if (showDebug) {
    console.log(`💾 saveControl - INICIO - Guardando control:`, { 
      filterKey, 
      periodo, 
      empresa, 
      totalSummaries: summaries.length,
      totalOks: oks.length,
      totalMissing: missing.length,
      timestamp: new Date().toLocaleString()
    });
  }
  
  try {
    await db.savedControls.put({
      filterKey,
      periodo,
      empresa,
      summaries,
      oks,
      missing,
      stats,
      officialKeys,
      officialNameByKey,
      nameByKey,
      createdAt: Date.now(),
    });
    
    if (showDebug) {
      console.log(`✅ saveControl - EXITOSO - Control guardado exitosamente con filterKey: "${filterKey}"`);
    }
  } catch (error) {
    console.error(`❌ saveControl - ERROR - No se pudo guardar el control:`, error);
    console.error(`❌ saveControl - ERROR - Datos que se intentaron guardar:`, {
      filterKey,
      periodo,
      empresa,
      summariesCount: summaries.length,
      oksCount: oks.length,
      missingCount: missing.length
    });
    throw error;
  }
},

/** Cargar control por filtros */
async getSavedControl(periodo: string, empresa: string): Promise<SavedControlDB | undefined> {
  const filterKey = `${periodo}||${empresa}`;
  return db.savedControls.where("filterKey").equals(filterKey).first();
},

/** Limpiar controles guardados */
async clearSavedControls(): Promise<void> {
  await db.savedControls.clear();
},

/** Eliminar control específico por filtros */
async deleteSavedControl(periodo: string, empresa: string): Promise<void> {
  const filterKey = `${periodo}||${empresa}`;
  await db.savedControls.where("filterKey").equals(filterKey).delete();
},

/** Obtener todos los controles guardados por empresa */
async getSavedControlsByEmpresa(empresa: string, showDebug: boolean = false): Promise<SavedControlDB[]> {
  // Primero, obtener TODOS los controles para debug
  const allControls = await db.savedControls.toArray();
  
  if (showDebug) {
    console.log(`🔍 getSavedControlsByEmpresa - TODOS los controles en DB:`, allControls.map(c => ({ 
      id: c.id, 
      filterKey: c.filterKey, 
      periodo: c.periodo, 
      empresa: c.empresa, 
      createdAt: c.createdAt 
    })));
    
    // Mostrar más detalles de cada control
    console.log(`🔍 getSavedControlsByEmpresa - DETALLES COMPLETOS de cada control:`);
    for (const control of allControls) {
      console.log(`  - ID: ${control.id}, FilterKey: "${control.filterKey}", Periodo: "${control.periodo}", Empresa: "${control.empresa}", Created: ${new Date(control.createdAt).toLocaleString()}`);
    }
  }
  
  const controls = await db.savedControls.where("empresa").equals(empresa).reverse().sortBy("periodo");
  
  if (showDebug) {
    console.log(`🔍 getSavedControlsByEmpresa - Empresa: "${empresa}", Controles encontrados:`, controls.map(c => ({ periodo: c.periodo, empresa: c.empresa, filterKey: c.filterKey })));
  }
  
  return controls;
},

  /** Obtener todos los controles guardados */
  async getAllSavedControls(): Promise<SavedControlDB[]> {
    return db.savedControls.orderBy("createdAt").reverse().toArray();
  },

  /** Obtener todos los datos del control (datos del Excel) */
  async getAllControlData(): Promise<Array<{ key: string; valores: Record<string, string>; meta?: Record<string, JSONValue> }>> {
    return db.control.toArray();
  },

/** Eliminar control por ID */
async deleteSavedControlById(id: number): Promise<void> {
  await db.savedControls.delete(id);
},
};
