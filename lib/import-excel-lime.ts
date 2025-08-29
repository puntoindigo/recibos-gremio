// lib/import-excel-lime.ts
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

// Mapeo específico para LIME - coordenadas de columna (A=0, B=1, etc.)
const LIME_COLUMN_MAPPING = {
  "G": "20590", // SEGURO SEPELIO
  "H": "20540", // CONTRIBUCION SOLIDARIA
  "I": "20610", // RESGUARDO MUTUAL
  "J": "20595", // CUOTA MUTUAL
  "K": "20620", // DESC. MUTUAL
} as const;

/** Convierte letra de columna a índice (A=0, B=1, etc.) */
function colToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 65 + 1);
  }
  return index - 1;
}

/** Obtiene valor de celda específica del Excel */
function getCellValue(sheet: XLSX.WorkSheet, col: string, row: number): unknown {
  const cellRef = col + (row + 1); // +1 porque Excel empieza en 1
  const cell = sheet[cellRef];
  return cell ? cell.v : "";
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

export function parseOfficialXlsxLime(
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
  
  // Para LIME, los datos empiezan en la fila 5 (índice 4)
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const startRow = 4; // Fila 5 (índice 4)
  const totalRows = range.e.r - startRow + 1;

  if (totalRows <= 0) return [];

  // Primero necesitamos obtener los metadatos (legajo, período, nombre, cuil)
  // Buscamos en las primeras filas para encontrar los encabezados
  const headerRow = 3; // Fila 4 (índice 3) donde están los encabezados
  
  // Para LIME, necesitamos encontrar la columna correcta del período
  // Vamos a buscar en un rango más amplio
  let legajoCol = "A";
  let periodoCol = "A";
  let nombreCol = "A";
  let cuilCol = "A";
  
  // Buscar en las primeras filas para encontrar los encabezados
  for (let col = 0; col < 26; col++) {
    const colLetter = String.fromCharCode(65 + col);
    const headerValue = String(getCellValue(sheet, colLetter, headerRow)).toLowerCase();
    
    if (headerValue.includes("legajo")) legajoCol = colLetter;
    if (headerValue.includes("per") || headerValue.includes("periodo") || headerValue.includes("fecha")) periodoCol = colLetter;
    if (headerValue.includes("nombre") || headerValue.includes("apellido")) nombreCol = colLetter;
    if (headerValue.includes("cuil") || headerValue.includes("dni")) cuilCol = colLetter;
  }
  
  // Debug: mostrar qué encontramos en las columnas
  console.log("🔍 LIME - Columnas encontradas:", {
    legajo: getCellValue(sheet, legajoCol, headerRow),
    periodo: getCellValue(sheet, periodoCol, headerRow),
    nombre: getCellValue(sheet, nombreCol, headerRow),
    cuil: getCellValue(sheet, cuilCol, headerRow)
  });

  const rows: OfficialRow[] = [];

  // Procesar cada fila de datos (desde fila 5)
  for (let rowIndex = startRow; rowIndex <= range.e.r; rowIndex++) {
    const legajo = String(getCellValue(sheet, legajoCol, rowIndex)).trim();
    // Para LIME, el período viene del desplegable, no del Excel
    const periodo = periodoResolver(""); // Ignorar el valor del Excel, usar el del desplegable
    const nombre = String(getCellValue(sheet, nombreCol, rowIndex)).trim();
    const cuil = String(getCellValue(sheet, cuilCol, rowIndex)).trim();
    
    // Validar que la fila tenga tanto legajo como nombre
    if (!legajo || !nombre || legajo === "" || nombre === "" || legajo === "undefined" || nombre === "undefined") {
      // Debug: mostrar qué filas se están saltando
      if (rowIndex - startRow < 5) {
        console.log(`⏭️ LIME - Saltando fila ${rowIndex + 1} (sin legajo o nombre):`, {
          legajo: legajo || "vacío",
          nombre: nombre || "vacío"
        });
      }
      continue; // Saltar esta fila
    }
    
    // Debug: mostrar qué estamos extrayendo
    if (rowIndex - startRow < 3) {
      console.log(`🔍 LIME - Fila ${rowIndex + 1} - Valores extraídos:`, {
        legajo,
        periodo,
        nombre,
        cuil
      });
    }

    const valores: Record<string, string> = {};

    // Mapear valores usando las columnas específicas de LIME
    for (const [columna, codigo] of Object.entries(LIME_COLUMN_MAPPING)) {
      const valor = getCellValue(sheet, columna, rowIndex);
      valores[codigo] = toDotDecimal(valor);
      
      // Debug: mostrar qué valores estamos extrayendo
      if (rowIndex - startRow < 3) {
        console.log(`🔍 LIME - Columna ${columna} (${codigo}):`, {
          valorOriginal: valor,
          valorProcesado: valores[codigo]
        });
      }
    }

    const key = `${legajo}||${periodo}`;

    // Solo mostrar las primeras 3 filas con información esencial
    if (rowIndex - startRow < 3) {
      console.log(`LIME - Fila ${rowIndex + 1}:`, {
        legajo,
        periodo,
        SEGURO_SEPELIO: valores["20590"],
        CONTRIBUCION_SOLIDARIA: valores["20540"],
        RESGUARDO_MUTUAL: valores["20610"],
        CUOTA_MUTUAL: valores["20595"],
        DESC_MUTUAL: valores["20620"]
      });
    }

    rows.push({
      key,
      valores,
      meta: { legajo, periodoRaw: "", periodo, nombre, cuil },
    });
  }

  return rows;
}
