// lib/import-excel-tysa.ts
import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import { normalizarPeriodo } from "./fechas";

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

// Mapeo específico para TYSA
const TYSA_CODE_MAPPING = {
  "CONTRIBUCION SOLIDARIA": "20540",
  "SEGURO SEPELIO": "20590", 
  "CUOTA MUTUAL": "20595",
  "RESGUARDO MUTUAL": "20610",
  "DESC. MUTUAL": "20620"
} as const;

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
  
  // Buscar coincidencia exacta en el mapeo de TYSA
  for (const [label, code] of Object.entries(TYSA_CODE_MAPPING)) {
    if (normalizeHeader(label) === h) {
      return code;
    }
  }
  
  // Buscar coincidencias parciales
  for (const [label, code] of Object.entries(TYSA_CODE_MAPPING)) {
    const normalizedLabel = normalizeHeader(label);
    if (h.includes(normalizedLabel) || normalizedLabel.includes(h)) {
      return code;
    }
  }
  
  return null;
}

export function parseOfficialXlsxTysa(
  file: ArrayBuffer | Uint8Array | Buffer,
  {
    periodoResolver,
  }: {
    /** Debe devolver "mm/yyyy" a partir del valor crudo de la celda/columna de período */
    periodoResolver: (periodoRaw: unknown) => string;
  }
): OfficialRow[] {
  const wb: WorkBook = XLSX.read(file, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (json.length === 0) return [];

  // mapear encabezados a códigos
  const headers = Object.keys(json[0] ?? {});
  const headerToCode = new Map<string, string>();
  for (const h of headers) {
    const code = mapHeaderToCode(h);
    if (code) headerToCode.set(h, String(code));
  }

  // campos meta esperables para TYSA
  const metaKeys = {
    periodo: headers.find(h => /per[ií]odo/i.test(h)) ?? "PERIODO",
    legajo: headers.find(h => /legajo/i.test(h)) ?? "LEGAJO",
    nombre: headers.find(h => /nombre/i.test(h)) ?? "NOMBRE",
    cuil: headers.find(h => /(cuil|dni)/i.test(h)) ?? "CUIL",
  };

  const rows: OfficialRow[] = [];

  json.forEach((linea, idx) => {
    const periodoRaw = linea[metaKeys.periodo];
    const periodo = periodoResolver(periodoRaw);
    const legajo = String(linea[metaKeys.legajo] ?? "").trim();
    const nombre = String(linea[metaKeys.nombre] ?? "").trim();
    const cuil = String(linea[metaKeys.cuil] ?? "").trim();

    const valores: Record<string, string> = {};

    for (const [h, code] of headerToCode.entries()) {
      const value = linea[h];
      const codeStr = String(code);
      valores[codeStr] = toDotDecimal(value);
    }

    const key = `${legajo}||${periodo}`;

    if (idx < 3) {
      console.log("TYSA - fila", idx, {
        _20540: valores["20540"], // CONTRIBUCION SOLIDARIA
        _20590: valores["20590"], // SEGURO SEPELIO
        _20595: valores["20595"], // CUOTA MUTUAL
        _20610: valores["20610"], // RESGUARDO MUTUAL
        _20620: valores["20620"], // DESC. MUTUAL
      });
    }

    rows.push({
      key,
      valores,
      meta: { legajo, periodoRaw: String(periodoRaw ?? ""), periodo, nombre, cuil },
    });
  });

  return rows;
}
