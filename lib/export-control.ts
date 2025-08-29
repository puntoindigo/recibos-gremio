// lib/export-control.ts
import type { ControlSummary } from "@/lib/control-types";
import { getPrincipalLabels } from "@/lib/code-labels";

export type ControlOk = { key: string; legajo: string; periodo: string };

// mismo escapado que export agregado
function esc(v: string): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildControlCsvSummary(
  difs: ControlSummary[],
  oks: ControlOk[],
  includeOks: boolean,
  nameByKey: Record<string, string> = {},
): string {
  const header = ["LEGAJO", "NOMBRE", "PERIODO", "ESTADO", "#DIFERENCIAS"];
  const rows: string[][] = [header];

  for (const s of difs) {
    rows.push([s.legajo, nameByKey[s.key] ?? "", s.periodo, "DIF", String(s.difs.length)]);
  }
  if (includeOks) {
    for (const o of oks) {
      rows.push([o.legajo, nameByKey[o.key] ?? "", o.periodo, "OK", "0"]);
    }
  }
  const body = rows.map((r) => r.map(esc).join(",")).join("\n");
  return "sep=,\n" + body;
}

// Exportar errores y faltantes de un control específico con columnas detalladas
export async function exportControlErrors(
  summaries: ControlSummary[],
  missing: Array<{ key: string; legajo: string; periodo: string }>,
  nameByKey: Record<string, string> = {},
  officialNameByKey: Record<string, string> = {},
  empresa?: string,
  periodo?: string,
): Promise<void> {
  // Obtener conceptos principales para las columnas
  const conceptos = getPrincipalLabels();
  
  // Crear headers dinámicos
  const headers = [
    "LEGAJO", 
    "NOMBRE", 
    "PERIODO", 
    "ESTADO"
  ];
  
  // Agregar columnas para cada concepto (RECIBO y CONTROL)
  for (const [codigo, concepto] of conceptos) {
    headers.push(`${concepto} RECIBO`);
    headers.push(`${concepto} CONTROL`);
  }
  
  // Agregar columna de total de diferencias
  headers.push("TOTAL DIFERENCIAS");
  
  const rows: string[][] = [headers];

  // Agregar errores (diferencias) con columnas detalladas
  for (const summary of summaries) {
    const nombre = nameByKey[summary.key] ?? "";
    const row = [
      summary.legajo,
      nombre,
      summary.periodo,
      "ERROR"
    ];
    
    // Crear mapa de diferencias por código para acceso rápido
    const difsByCode = new Map<string, { oficial: string; calculado: string; delta: string }>();
    for (const dif of summary.difs) {
      difsByCode.set(dif.codigo, {
        oficial: dif.oficial,
        calculado: dif.calculado,
        delta: dif.delta
      });
    }
    
    let totalDiferencias = 0;
    
    // Agregar valores para cada concepto
    for (const [codigo, concepto] of conceptos) {
      const dif = difsByCode.get(codigo);
      if (dif) {
        row.push(dif.calculado); // RECIBO
        row.push(dif.oficial);   // CONTROL
        totalDiferencias += parseFloat(dif.delta);
      } else {
        row.push(""); // RECIBO vacío
        row.push(""); // CONTROL vacío
      }
    }
    
    // Agregar total de diferencias
    row.push(totalDiferencias.toFixed(2));
    
    rows.push(row);
  }

  // Agregar faltantes (sin columnas detalladas)
  for (const item of missing) {
    const nombre = officialNameByKey[item.key] ?? "";
    const row = [
      item.legajo,
      nombre,
      item.periodo,
      "FALTANTE"
    ];
    
    // Agregar columnas vacías para conceptos
    for (const [codigo, concepto] of conceptos) {
      row.push(""); // RECIBO vacío
      row.push(""); // CONTROL vacío
    }
    
    // Total vacío para faltantes
    row.push("");
    
    rows.push(row);
  }

  // Calcular TOTAL GENERAL
  let totalGeneral = 0;
  for (const summary of summaries) {
    for (const dif of summary.difs) {
      totalGeneral += parseFloat(dif.delta);
    }
  }
  
  // Agregar fila de total general
  const totalRow = [
    "",
    "",
    "",
    "TOTAL GENERAL"
  ];
  
  // Columnas vacías para conceptos
  for (const [codigo, concepto] of conceptos) {
    totalRow.push(""); // RECIBO vacío
    totalRow.push(""); // CONTROL vacío
  }
  
  // Total general
  totalRow.push(totalGeneral.toFixed(2));
  
  rows.push(totalRow);

  const body = rows.map((r) => r.map(esc).join(",")).join("\n");
  const csv = "sep=,\n" + body;

  // Generar nombre del archivo con formato: EMPRESA_YYYYMM_control_errores_YYYY-MM-DD.csv
  let fileName = `control_errores_${new Date().toISOString().split('T')[0]}.csv`;
  
  if (empresa && periodo) {
    // Convertir período de formato MM/YYYY a YYYYMM
    const periodoParts = periodo.split('/');
    if (periodoParts.length === 2) {
      const mes = periodoParts[0].padStart(2, '0');
      const anio = periodoParts[1];
      const periodoFormato = `${anio}${mes}`;
      fileName = `${empresa}_${periodoFormato}_control_errores_${new Date().toISOString().split('T')[0]}.csv`;
    }
  }
  
  // Crear y descargar archivo
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
