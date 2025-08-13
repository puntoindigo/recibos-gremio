// lib/import-excel.ts
import * as XLSX from "xlsx";
import { normalizarPeriodo } from "./fechas";
import { CODE_LABELS } from "./code-labels";

export type OfficialRow = {
  key: string; // `${legajo}||${periodo}`
  nombre: string;
  valores: Record<string, number>; // columnas código 5 dígitos
};

type Cell = string | number | boolean | Date | null | undefined;
type Row = ReadonlyArray<Cell>;

const norm = (s: string) =>
  s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function toNumberFlexible(v: Cell): number {
  if (typeof v === "number") return v;
  const s0 = String(v ?? "").trim();
  if (!s0) return 0;
  const s = s0.replace(/\s+/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const useCommaDecimal = lastComma > lastDot;
  const normNum = useCommaDecimal ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(normNum);
  return Number.isFinite(n) ? n : 0;
}

// Mapa etiqueta→código (normalizado) para cuando el Excel no trae el código en el header
const codeByLabel = (() => {
  const m = new Map<string, string>();
  for (const [code, label] of CODE_LABELS) {
    m.set(norm(label), code);
  }
  return m;
})();

function detectSheetWithHeaders(wb: XLSX.WorkBook): XLSX.WorkSheet {
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: false });
    if (!rows.length) continue;
    const header = (rows[0] ?? []).map((h) => String(h ?? "").trim());
    const hasLegajo = header.some((h) => norm(h).includes("LEGAJO"));
    const hasPeriodoLike = header.some((h) => {
      const up = norm(h);
      return up === "PERIODO" || up.includes("PERIODO") || up === "PER" || up === "FECHA";
    });
    if (hasLegajo && hasPeriodoLike) return ws;
  }
  // fallback: primera hoja
  return wb.Sheets[wb.SheetNames[0]];
}

export async function readOfficialXlsx(file: File): Promise<OfficialRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = detectSheetWithHeaders(wb);

  const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: false });
  if (!rows.length) return [];

  const header = (rows[0] ?? []).map((h) => String(h ?? "").trim());

  const idxLegajo = header.findIndex((h) => norm(h).includes("LEGAJO"));

  // Detecta PERIODO / PER / FECHA (con o sin acento)
  const idxPeriodo = header.findIndex((h) => {
    const up = norm(h);
    return up === "PERIODO" || up.includes("PERIODO") || up === "PER" || up === "FECHA";
  });

  // Nombre tolerante y evitando "NOMBRE ARCHIVO"
  const idxNombre = header.findIndex((h) => {
    const up = norm(h);
    return (
      up === "NOMBRE" ||
      up === "APELLIDO Y NOMBRE" ||
      up === "APELLIDO Y NOMBRES" ||
      up.includes("APELLIDO") ||
      (up.includes("NOMBRE") && !up.includes("ARCHIVO"))
    );
  });

  if (idxLegajo < 0 || idxPeriodo < 0) {
    throw new Error("No se encontraron columnas LEGAJO / PERIODO en el Excel.");
  }

  // columnas que representan códigos: o bien traen 5 dígitos en el header,
  // o traen la etiqueta que mapeamos a un código con CODE_LABELS
  const codeCols: Array<{ idx: number; code: string }> = [];
  header.forEach((h, i) => {
    const text = String(h);
    const m = text.match(/(\d{5})/);
    if (m) {
      codeCols.push({ idx: i, code: m[1] });
      return;
    }
    const key = norm(text);
    const fromMap = codeByLabel.get(key);
    if (fromMap) {
      codeCols.push({ idx: i, code: fromMap });
      return;
    }
    // intento parcial (por si el header incluye la etiqueta junto a otro texto)
    for (const [lblKey, code] of codeByLabel.entries()) {
      if (key.includes(lblKey) || lblKey.includes(key)) {
        codeCols.push({ idx: i, code });
        break;
      }
    }
  });

  const out: OfficialRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const legajo = String(row[idxLegajo] ?? "").trim();
    const periodo = normalizarPeriodo(row[idxPeriodo] ?? "");

    if (!legajo || !periodo) continue;

    const valores: Record<string, number> = {};
    for (const { idx, code } of codeCols) {
      valores[code] = toNumberFlexible(row[idx]);
    }

    // "ROMERO , RAMON" → "ROMERO, RAMON"
    const nombre = idxNombre >= 0
      ? String(row[idxNombre] ?? "")
          .trim()
          .replace(/\s*,\s*/g, ", ")
          .replace(/\s+/g, " ")
      : "";

    out.push({ key: `${legajo}||${periodo}`, nombre, valores });
  }
  return out;
}
