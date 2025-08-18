// lib/import-excel.ts
import * as XLSX from "xlsx";
import { normalizarPeriodo } from "./fechas";
import { CODE_LABELS } from "./code-labels";

export type OfficialRow = {
  key: string;           // `${legajo}||${periodo}`
  nombre: string;
  valores: Record<string, number>;
};

type Cell = string | number | boolean | Date | null | undefined;
type Row = ReadonlyArray<Cell>;

const norm = (s: string): string =>
  String(s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\t\r\n]+/g, " ")
    .trim();

// Etiqueta EXACTA → código
const codeByExactLabel: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [code, label] of CODE_LABELS) m.set(norm(label), code);
  return m;
})();

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

function detectSheetWithHeaders(wb: XLSX.WorkBook): XLSX.WorkSheet {
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: false });
    if (!rows.length) continue;
    const header = (rows[0] ?? []).map((h) => String(h ?? "").trim());
    const hasLegajo = header.some((h) => norm(h).includes("LEGAJO"));
    const hasPeriodoLike = header.some((h) => {
      const up = norm(h);
      return up === "PERIODO" || up.includes("PERIODO") || up === "PER" || up.includes("FECHA");
    });
    if (hasLegajo && hasPeriodoLike) return ws;
  }
  return wb.Sheets[wb.SheetNames[0]];
}

export async function readOfficialXlsx(file: File): Promise<OfficialRow[]> {
  // Logs SIEMPRE (colapsados) para debug rápido, sin usar `any`
  const group = (title: string): void => { try { console.groupCollapsed(title); } catch { /* noop */ } };
  const groupEnd = (): void => { try { console.groupEnd(); } catch { /* noop */ } };
  const log = (msg: unknown, extra?: unknown): void => {
    try { typeof extra === "undefined" ? console.log(msg) : console.log(msg, extra); } catch { /* noop */ }
  };
  const table = (data: unknown): void => {
    try { (console as Console & { table?: (d: unknown) => void }).table?.(data); } catch { /* noop */ }
  };

  const buf = await file.arrayBuffer();
  // ← clave para que PERIODO sea Date si corresponde
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = detectSheetWithHeaders(wb);

  const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: false });
  if (!rows.length) return [];

  const headerRaw = (rows[0] ?? []) as Row;
  const header = headerRaw.map((h) => String(h ?? "").replace(/[\s\t\r\n]+/g, " ").trim());

  const idxLegajo = header.findIndex((h) => norm(h).includes("LEGAJO"));
  const idxPeriodo = header.findIndex((h) => {
    const up = norm(h);
    return up === "PERIODO" || up.includes("PERIODO") || up === "PER" || up.includes("FECHA");
  });
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

  // Mapear columnas de códigos: 5 dígitos O etiqueta exacta
  const seen = new Set<string>();
  const codeCols: Array<{ idx: number; code: string; header: string; via: "5digits" | "label" }> = [];
  const ignored: Array<{ idx: number; header: string; reason: string }> = [];

  header.forEach((h, i) => {
    const text = String(h).trim();
    if (!text) return;
    const k = norm(text);

    // columnas meta
    if (
      k.includes("PERIODO") ||
      k.includes("LEGAJO") ||
      k.includes("NRO. DE CUIL") ||
      k.includes("CUIL") ||
      k.includes("CATEGORIA") ||
      k === "NOMBRE" ||
      k.includes("APELLIDO")
    ) {
      ignored.push({ idx: i, header: text, reason: "meta" });
      return;
    }

    // 1) 5 dígitos
    const m = text.match(/(\d{5})/);
    if (m) {
      const code = m[1];
      if (!seen.has(code)) { seen.add(code); codeCols.push({ idx: i, code, header: text, via: "5digits" }); }
      else { ignored.push({ idx: i, header: text, reason: `duplicated code ${code}` }); }
      return;
    }

    // 2) etiqueta EXACTA
    const exact = codeByExactLabel.get(k);
    if (exact) {
      if (!seen.has(exact)) { seen.add(exact); codeCols.push({ idx: i, code: exact, header: text, via: "label" }); }
      else { ignored.push({ idx: i, header: text, reason: `duplicated code ${exact}` }); }
      return;
    }

    ignored.push({ idx: i, header: text, reason: "unknown label (ignorado)" });
  });

  const out: OfficialRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const legajo = String(row[idxLegajo] ?? "").trim();
    const periodo = normalizarPeriodo(row[idxPeriodo] as unknown);
    if (!legajo || !periodo) continue;

    const valores: Record<string, number> = {};
    for (const { idx, code } of codeCols) {
      const v = toNumberFlexible(row[idx]);
      valores[code] = (valores[code] ?? 0) + v;
    }

    const nombre = idxNombre >= 0
      ? String(row[idxNombre] ?? "").trim().replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ")
      : "";

    out.push({ key: `${legajo}||${periodo}`, nombre, valores });
  }

  // Logs forenses SIEMPRE
  group("[OFICIAL] Diagnóstico importación");
  log("Headers crudos:", headerRaw);
  table(header.map((h, i) => ({ idx: i, header: h })));
  table(codeCols.map((c) => ({ idx: c.idx, header: c.header, code: c.code, via: c.via })));
  table(ignored);
  log(`Filas parseadas: ${out.length} | Códigos mapeados: ${Array.from(seen).join(", ")}`);
  table(out.slice(0, 8).map(({ key, nombre, valores }) => ({ key, nombre, ...valores })));
  groupEnd();

  return out;
}
