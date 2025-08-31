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
  oks: Array<{ key: string; legajo: string; periodo: string }>,
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
    "PERIODO",
    "LEGAJO", 
    "NOMBRE", 
    "ESTADO"
  ];
  
  // Agregar columnas para cada concepto (CONTROL primero)
  for (const [codigo, concepto] of conceptos) {
    headers.push(`${concepto} CONTROL`);
  }
  
  // Agregar columnas para cada concepto (RECIBO después)
  for (const [codigo, concepto] of conceptos) {
    headers.push(`${concepto} RECIBO`);
  }
  
  // Agregar columna de diferencias al final
  headers.push("DIFERENCIAS");
  
  const rows: string[][] = [headers];

  // Función auxiliar para formatear números con coma como separador decimal
  const formatNumber = (value: string | number): string => {
    if (!value || value === '0.00' || value === '0') return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (!Number.isFinite(num)) return '';
    // Convertir 1234.56 a 1234,56 (formato argentino)
    return num.toFixed(2).replace('.', ',');
  };

  // Agregar errores (diferencias) con columnas detalladas
  for (const summary of summaries) {
    const nombre = nameByKey[summary.key] ?? "";
    const row = [
      summary.periodo,
      summary.legajo,
      nombre,
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
    
    let totalControl = 0;
    let totalRecibo = 0;
    
    // Agregar valores para cada concepto
    for (const [codigo, concepto] of conceptos) {
      const dif = difsByCode.get(codigo);
      if (dif) {
        row.push(formatNumber(dif.oficial));   // CONTROL
        totalControl += parseFloat(dif.oficial);
      } else {
        row.push(""); // CONTROL vacío
      }
    }
    
    // Agregar valores RECIBO para cada concepto
    for (const [codigo, concepto] of conceptos) {
      const dif = difsByCode.get(codigo);
      if (dif) {
        row.push(formatNumber(dif.calculado)); // RECIBO
        totalRecibo += parseFloat(dif.calculado);
      } else {
        row.push(""); // RECIBO vacío
      }
    }
    
    // Agregar total de diferencias: CONTROL - RECIBO
    const totalDiferencias = totalControl - totalRecibo;
    row.push(formatNumber(totalDiferencias));
    
    rows.push(row);
  }

  // NO incluir OKs en el exportable - solo errores y faltantes

  // Agregar faltantes (sin columnas detalladas)
  for (const item of missing) {
    const nombre = officialNameByKey[item.key] ?? "";
    const row = [
      item.periodo,
      item.legajo,
      nombre,
      "FALTANTE"
    ];
    
    // Agregar columnas vacías para conceptos CONTROL
    for (const [codigo, concepto] of conceptos) {
      row.push(""); // CONTROL vacío
    }
    
    // Agregar columnas vacías para conceptos RECIBO
    for (const [codigo, concepto] of conceptos) {
      row.push(""); // RECIBO vacío
    }
    
    // Diferencia vacía para faltantes
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
  
  // Columnas vacías para conceptos CONTROL
  for (const [codigo, concepto] of conceptos) {
    totalRow.push(""); // CONTROL vacío
  }
  
  // Columnas vacías para conceptos RECIBO
  for (const [codigo, concepto] of conceptos) {
    totalRow.push(""); // RECIBO vacío
  }
  
  // Total general
  totalRow.push(formatNumber(totalGeneral));
  
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
