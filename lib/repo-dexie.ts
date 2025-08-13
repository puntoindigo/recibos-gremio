// lib/repo-dexie.ts
import { db } from "./db";
import { toFixed2 } from "./number";
import type { ConsolidatedRow } from "./repo";

// Helpers
const isCode = (k: string) => /^\d{5}$/.test(k);
const makeKey = (legajo: string, periodo: string) =>
  `${String(legajo).trim()}||${String(periodo).trim()}`;
const normCuil = (s?: string) => (s || "").replace(/\D+/g, "");

type AddReceiptInput = {
  legajo: string;
  periodo: string;
  nombre?: string;
  cuil?: string;
  data: Record<string, string>;
  filename: string;
  fileHash: string;
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
  // Si existe índice multiEntry en `hashes`, esto es O(log n).
  // Si no, el filter hace un scan pero sigue siendo correcto.
  try {
    // @ts-expect-error puede fallar si no hay índice; caemos al filter
    return await db.receipts.where("hashes").equals(hash).first();
  } catch {
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
    const key = makeKey(input.legajo, input.periodo);
    let result: "skipped-duplicate" | "added" | "merged" = "added";

    await db.transaction("rw", db.receipts, db.consolidated, async () => {
      // 🔒 Dedupe global por hash (antes de tocar nada)
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
      const prev = await db.consolidated.get(key);
      const archivos = new Set<string>(
        Array.isArray(prev?.archivos) ? prev!.archivos : []
      );
      archivos.add(input.filename);

      const mergedData = mergeSummingCodes(prev?.data ?? {}, input.data);
      const row: ConsolidatedRow = {
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
    });

    return result;
  },

  /** ¿Existe ya este hash en algún receipt? (pre-chequeo opcional para la UI) */
  async hasFileHash(hash: string): Promise<boolean> {
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
  }): Promise<ConsolidatedRow[]> {
    const { offset, limit } = opts;
    return db.consolidated.orderBy("key").offset(offset).limit(limit).toArray();
  },

  /** Control (dataset oficial desde Excel) */
  async upsertControl(
    rows: Array<{ key: string; valores: Record<string, string>; meta?: any }>
  ): Promise<void> {
    await db.transaction("rw", db.control, async () => {
      for (const r of rows) {
        await db.control.put({ key: r.key, valores: r.valores, meta: r.meta });
      }
    });
  },

  async getControl(key: string): Promise<
    { key: string; valores: Record<string, string>; meta?: any } | undefined
  > {
    return db.control.get(key);
  },

  /** Utilitarios */
  async wipe(): Promise<void> {
    await db.transaction("rw", db.receipts, db.consolidated, db.control, async () => {
      await db.receipts.clear();
      await db.consolidated.clear();
      await db.control.clear();
    });
  },
};
