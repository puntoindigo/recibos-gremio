// lib/import-excel.ts
import * as XLSX from "xlsx";
import { normalizarPeriodo } from "./fechas";

export type OfficialRow = {
  key: string;      // `${legajo}||${periodo}`
  nombre: string;
  valores: Record<string, number>; // claves: códigos de 5 dígitos (ej. "20540")
};

type Cell = string | number | boolean | Date | null | undefined;
type Row = ReadonlyArray<Cell>;

const norm = (s: string) =>
  String(s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

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

// patrones para mapear encabezados con etiquetas a códigos
const labelPatterns: Array<{ rx: RegExp; code: string }> = [
  { rx: /CONTR.*SOLIDAR/, code: "20540" },      // CONTR.SOLIDARIA / CONTRIBUCION SOLIDARIA
  { rx: /SEG.*SEPEL/, code: "20590" },          // SEG.SEPELIO / SEGURO DE SEPELIO
  { rx: /CUOTA\s*MUTUAL/, code: "20595" },      // CUOTA MUTUAL
  { rx: /RESGUARDO\s*MUTUAL/, code: "20610" },  // RESGUARDO MUTUAL
];

export async function readOfficialXlsx(file: File): Promise<OfficialRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: false });
  if (!rows.length) return [];

  const header = (rows[0] ?? []).map((h) => String(h ?? "").trim());
  const headerNorm = header.map(norm);

  const idxLegajo = headerNorm.findIndex((h) => h.includes("LEGAJO"));
  const idxPeriodo = headerNorm.findIndex((h) => h === "PERIODO" || h.includes("PERIODO") || h === "FECHA" || h === "PER");
  const idxNombre = headerNorm.findIndex((h) => {
    return (
      h === "NOMBRE" ||
      h === "APELLIDO Y NOMBRE" ||
      h === "APELLIDO Y NOMBRES" ||
      h.includes("APELLIDO")
    );
  });

  if (idxLegajo < 0 || idxPeriodo < 0) {
    throw new Error("No se encontraron columnas LEGAJO / PERIODO en el Excel.");
  }

  // detectar columnas de códigos y columnas de etiquetas mapeables a códigos
  const codeCols: Array<{ idx: number; code: string }> = [];
  header.forEach((h, i) => {
    const m = String(h).match(/(\d{5})/); // admite "20540" o "20540 - TEXTO"
    if (m) {
      codeCols.push({ idx: i, code: m[1] });
      return;
    }
    const hn = headerNorm[i];
    for (const { rx, code } of labelPatterns) {
      if (rx.test(hn)) {
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

    const nombre =
      idxNombre >= 0
        ? String(row[idxNombre] ?? "")
            .trim()
            .replace(/\s*,\s*/g, ", ")
            .replace(/\s+/g, " ")
        : "";

    out.push({ key: `${legajo}||${periodo}`, nombre, valores });
  }

  return out;
}
