// lib/import-excel.ts
import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import { CODE_LABELS } from "./code-labels";
import { normalizarPeriodo } from "./fechas";
// lector asíncrono con defaults; acepta File/Blob o ArrayBuffer
export async function readOfficialXlsx(
  file: ArrayBuffer | Uint8Array | Buffer | Blob,
  opts?: { periodoResolver?: (periodoRaw: unknown) => string }
): Promise<OfficialRow[]> {
  let buf: ArrayBuffer | Uint8Array | Buffer;
  // Si viene un Blob/File en el cliente, lo convertimos
  if (typeof Blob !== 'undefined' && file instanceof Blob && 'arrayBuffer' in file) {
    buf = await (file as Blob).arrayBuffer();
  } else {
    buf = file as ArrayBuffer;
  }
  const periodoResolver = (opts && opts.periodoResolver) ? opts.periodoResolver : normalizarPeriodo;
  return parseOfficialXlsx(buf, { periodoResolver });
}

export type OfficialRow = {
  key: string; // legajo||mm/yyyy
  valores: Record<string, string>; // códigos SIEMPRE como string ("20595", etc.)
  meta?: {
    legajo: string;
    periodoRaw?: string;
    periodo: string;
    nombre?: string;
    cuil?: string;
  };
};

// ---------- helpers ----------

/** Mapa label normalizado -> código (string) */
const codeByLabel: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [code, label] of CODE_LABELS) {
    m.set(normalizeHeader(label), String(code));
  }
  // aliases robustos por si el XLSX trae variantes
  m.set(normalizeHeader("CUOTA MUTUAL"), "20595");
  m.set(normalizeHeader("RESGUARDO MUTUAL"), "20610");
  m.set(normalizeHeader("DESC. MUTUAL"), "20620");
  m.set(normalizeHeader("DESC. MUTUAL 16 DE ABRIL"), "20620");
  
  // Aliases específicos para LIMPAR
  m.set(normalizeHeader("CONT.SOLIDARIA 3 %"), "20540");
  m.set(normalizeHeader("CONT.SOLIDARIA 3%"), "20540");
  m.set(normalizeHeader("CONT.SOLIDARIA"), "20540");
  m.set(normalizeHeader("SEG. SEPELIO 1,50%"), "20590");
  m.set(normalizeHeader("SEG. SEPELIO 1,50 %"), "20590");
  m.set(normalizeHeader("SEG. SEPELIO"), "20590");
  m.set(normalizeHeader("CONT.CUOTA MUTUAL"), "20595");
  m.set(normalizeHeader("RESGUARDO M"), "20610");
  m.set(normalizeHeader("RESGUARDO MUTUAL"), "20610");
  
  return m;
})();

function normalizeHeader(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // diacríticos
    .replace(/[^\w\s.%/()-]/g, "") // limpia rarezas manteniendo %, (), -, /
    .replace(/\s+/g, " ")
    .trim();
}

/** Maneja espacios finos, NBSP, comas y puntos en formatos AR/ES */
function toDotDecimal(raw: unknown): string {
  let s = String(raw ?? "")
    .replace(/[\u00A0\u202F\u2007]/g, " ") // NBSP/NNBSP/figura
    .trim();
  if (!s) return "0.00";
  s = s.replace(/\s+/g, "");

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const commaDecimal = lastComma > lastDot;

  s = commaDecimal ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function mapHeaderToCode(header: string): string | null {
  const h = normalizeHeader(header);
  if (codeByLabel.has(h)) return codeByLabel.get(h) as string;

  // heurística: si el header contiene el label conocido
  for (const [labelNorm, code] of codeByLabel.entries()) {
    if (h.includes(labelNorm)) return code;
  }
  return null;
}

// ---------- parseo principal ----------

export function parseOfficialXlsx(
  file: ArrayBuffer | Uint8Array | Buffer,
  {
    periodoResolver,
    debug = false,
  }: {
    /** Debe devolver "mm/yyyy" a partir del valor crudo de la celda/columna de período */
    periodoResolver: (periodoRaw: unknown) => string;
    /** Si se deben mostrar logs de debug */
    debug?: boolean;
  }
): OfficialRow[] {
  if (debug) {
    console.log("🔍 Debug Parser Genérico - INICIO:", {
      periodoResolver: "proporcionado",
      tipo: typeof periodoResolver,
      testCall: periodoResolver("TEST")
    });
  }
  
  const wb: WorkBook = XLSX.read(file, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (json.length === 0) return [];

  // mapear encabezados a códigos
  const headers = Object.keys(json[0] ?? {});
  const headerToCode = new Map<string, string>();
  for (const h of headers) {
    const code = mapHeaderToCode(h);
    if (code) headerToCode.set(h, String(code)); // Aseguramos string
  }

  // campos meta esperables (no estrictos)
  const metaKeys = {
    periodo: headers.find(h => /per[ií]odo/i.test(h)) ?? "PERIODO",
    legajo: headers.find(h => /legajo/i.test(h)) ?? "LEGAJO",
    nombre: headers.find(h => /nombre/i.test(h)) ?? "NOMBRE",
    cuil: headers.find(h => /(cuil|dni)/i.test(h)) ?? "CUIL",
  };

  if (debug) {
    console.log("🔍 Debug Parser Genérico - Encabezados detectados:", {
      todosLosHeaders: headers,
      metaKeys,
      headerToCode: Object.fromEntries(headerToCode)
    });
  }

  const rows: OfficialRow[] = [];

  json.forEach((linea, idx) => {
    // Si tenemos un periodoResolver personalizado, usarlo SIEMPRE
    // Si no, intentar extraer del Excel
    const periodo = periodoResolver ? periodoResolver("") : String(linea[metaKeys.periodo] ?? "").trim();
    const legajo = String(linea[metaKeys.legajo] ?? "").trim();
    const nombre = String(linea[metaKeys.nombre] ?? "").trim();
    const cuil = String(linea[metaKeys.cuil] ?? "").trim();

    // Debug: verificar qué está pasando con el período
    if (debug && idx < 3) {
      console.log(`🔍 Debug Parser Genérico - Fila ${idx}:`, {
        periodoRaw: linea[metaKeys.periodo],
        periodo,
        legajo,
        nombre,
        metaKeys: {
          periodo: metaKeys.periodo,
          legajo: metaKeys.legajo,
          nombre: metaKeys.nombre,
          cuil: metaKeys.cuil
        },
        headersDisponibles: Object.keys(linea)
      });
    }

    const valores: Record<string, string> = {};

    for (const [h, code] of headerToCode.entries()) {
      const value = linea[h];
      // Guardamos SIEMPRE bajo código string
      const codeStr = String(code);
      valores[codeStr] = toDotDecimal(value);
    }

    const key = `${legajo}||${periodo}`;

    if (debug && idx < 3) {
      // Log de verificación rápido: los 3 códigos de interés
      // (podés dejarlo o quitarlo; ayuda al debug sin ruido)
      console.log("fila", idx, {
        _20595: valores["20595"],
        _20610: valores["20610"],
        _20620: valores["20620"],
      });
    }

    rows.push({
      key,
      valores,
      meta: { legajo, periodoRaw: String(linea[metaKeys.periodo] ?? ""), periodo, nombre, cuil },
    });
  });

  return rows;
}
