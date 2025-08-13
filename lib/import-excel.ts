// lib/import-excel.ts
import * as XLSX from "xlsx";

export type OfficialRow = {
  key: string; // `${legajo}||${periodo}`
  nombre: string;
  valores: Record<string, number>; // columnas código 5 dígitos
};

// "jun-25" -> 06/2025 ; "6/2025" -> 06/2025 ; otro -> igual
function normalizePeriodo(raw: string): string {
  const s = String(raw || "").trim();
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const m = s.match(/^([a-zA-Z]{3})[-/ ]?(\d{2})$/);
  if (m) {
    const idx = meses.indexOf(m[1].toLowerCase());
    if (idx >= 0) return `${String(idx + 1).padStart(2, "0")}/20${m[2]}`;
  }
  const n = s.match(/^([01]?\d)[-/](\d{4})$/);
  if (n) return `${String(+n[1]).padStart(2, "0")}/${n[2]}`;
  return s;
}

export async function readOfficialXlsx(file: File): Promise<OfficialRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  if (!rows.length) return [];

  const header = rows[0].map((h) => String(h || "").trim());
  const idxLegajo = header.findIndex((h) => h.toUpperCase().includes("LEGAJO"));
  const idxPeriodo = header.findIndex((h) => h.toUpperCase().includes("PERIODO"));
  const idxNombre = header.findIndex((h) => {
    const up = h.toUpperCase();
    return up === "NOMBRE" || up === "APELLIDO Y NOMBRES" || up.includes("APELLIDO") || up.includes("NOMBRE");
  });
  if (idxLegajo < 0 || idxPeriodo < 0) {
    throw new Error("No se encontraron columnas LEGAJO / PERIODO en el Excel.");
  }

  // códigos de 5 dígitos
  const codeCols: Array<{ idx: number; code: string }> = [];
  header.forEach((h, i) => {
    const m = h.match(/^\d{5}$/);
    if (m) codeCols.push({ idx: i, code: m[0] });
  });

  const out: OfficialRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const legajo = String(row[idxLegajo] ?? "").trim();
    const periodo = normalizePeriodo(String(row[idxPeriodo] ?? "").trim());
    if (!legajo || !periodo) continue;

    const valores: Record<string, number> = {};
    for (const { idx, code } of codeCols) {
      const n = Number(String(row[idx] ?? "0").replace(",", "."));
      valores[code] = isNaN(n) ? 0 : n;
    }
    const nombre = idxNombre >= 0 ? String(row[idxNombre] ?? "").trim() : "";

    out.push({ key: `${legajo}||${periodo}`, nombre, valores });
  }
  return out;
}
