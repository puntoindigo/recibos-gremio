// lib/import-excel-sumar.ts
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

// Mapeo específico para SUMAR - basado en las columnas reales del Excel
const SUMAR_CODE_MAPPING = {
  // Columna I: "CUOTA SIND. 3% S/REM." → CONTRIBUCION SOLIDARIA
  "CUOTA SIND. 3% S/REM.": "20540",
  "CUOTA SIND. 3% S/REM": "20540",
  "CUOTA SIND. 3%": "20540",
  "CUOTA SIND.": "20540",
  "CONTRIBUCION SOLIDARIA": "20540",
  
  // Columna J: "CUOTA SEP 1,5% S/REM." → SEGURO SEPELIO
  "CUOTA SEP 1,5% S/REM.": "20590",
  "CUOTA SEP 1,5% S/REM": "20590",
  "CUOTA SEP 1,5%": "20590",
  "CUOTA SEP": "20590",
  "SEGURO SEPELIO": "20590",
  
  // Columna K: "APORT. SOLID. MUTUAL 16 DE ABRIL" → CUOTA MUTUAL
  "APORT. SOLID. MUTUAL 16 DE ABRIL": "20595",
  "APORT. SOLID. MUTUAL": "20595",
  "APORT. SOLID. MUTUAL 16 DE ABRIL.": "20595",
  "CUOTA MUTUAL": "20595",
  
  // Columna L: "RESGUARDO MUTUAL FAM." → DESC. MUTUAL
  "RESGUARDO MUTUAL FAM.": "20620",
  "RESGUARDO MUTUAL FAM": "20620",
  "DESC. MUTUAL": "20620",
  
  // Agregar mapeo para RESGUARDO MUTUAL (código 20610) si existe en el Excel
  "RESGUARDO MUTUAL": "20610",
  "RESGUARDO": "20610",
  "MUTUAL": "20610",
  "RESGUARDO MUTUAL FLIAR.": "20610",
  "RESGUARDO MUTUAL FLIAR": "20610"
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
  
  console.log(`SUMAR - COMPARANDO: "${header}" → "${h}"`);
  
  // Buscar coincidencia exacta en el mapeo de SUMAR
  for (const [label, code] of Object.entries(SUMAR_CODE_MAPPING)) {
    const normalizedLabel = normalizeHeader(label);
    
    if (normalizedLabel === h) {
      console.log(`SUMAR - EXACTO: "${header}" → ${code}`);
      return code;
    }
  }
  
  // Buscar coincidencias parciales
  for (const [label, code] of Object.entries(SUMAR_CODE_MAPPING)) {
    const normalizedLabel = normalizeHeader(label);
    if (h.includes(normalizedLabel) || normalizedLabel.includes(h)) {
      console.log(`SUMAR - PARCIAL: "${header}" → ${code}`);
      return code;
    }
  }
  
  console.log(`SUMAR - NADA: "${header}"`);
  return null;
}

export function parseOfficialXlsxSumarDEBUG(
  file: ArrayBuffer | Uint8Array | Buffer,
  {
    periodoResolver,
  }: {
    /** Debe devolver "mm/yyyy" a partir del valor crudo de la celda/columna de período */
    periodoResolver: (periodoRaw: unknown) => string;
  }
): OfficialRow[] {
  console.log("🚀 SUMAR - INICIO DEL PARSER - VERSION DEBUG");
  console.log("🔍 DEBUG ACTIVADO");
  
  const wb: WorkBook = XLSX.read(file, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  
  // Para SUMAR, necesitamos encontrar la fila que contiene los headers reales
  // Vamos a leer las primeras filas para identificar dónde están los headers
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
    defval: "",
    header: 1 // Comenzar desde la fila 2
  });
  
  console.log("🔍 BUSCANDO HEADERS - PRIMERAS FILAS:", rawData.slice(0, 5));
  
  // Buscar la fila que contiene los headers que necesitamos
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    const rowValues = Object.values(row);
    const hasTargetHeaders = rowValues.some(val => 
      String(val).includes("CUOTA SIND") || 
      String(val).includes("CUOTA SEP") || 
      String(val).includes("APORT. SOLID") ||
      String(val).includes("RESGUARDO MUTUAL") ||
      String(val).includes("RESGUARDO") ||
      String(val).includes("MUTUAL")
    );
    
    if (hasTargetHeaders) {
      headerRowIndex = i; // Sin +1, usar el índice directo
      console.log(`🔍 HEADERS ENCONTRADOS EN FILA ${headerRowIndex + 2} (índice ${headerRowIndex})`);
      console.log(`🔍 HEADERS ENCONTRADOS EN ESTA FILA:`, rowValues);
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    console.error("❌ NO SE ENCONTRARON LOS HEADERS ESPERADOS");
    return [];
  }
  
  // Primero leer solo la fila de headers para obtener los nombres de columnas
  const headerRow = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
    defval: "",
    header: headerRowIndex, // Sin +1, usar el índice directo
    range: headerRowIndex
  });
  
  if (headerRow.length === 0) {
    console.error("❌ NO SE PUDO LEER LA FILA DE HEADERS");
    return [];
  }
  
  const actualHeaders = Object.values(headerRow[0]);
  console.log("🔍 HEADERS REALES DE LA FILA:", actualHeaders);
  console.log("🔍 HEADERS CON ÍNDICES:", actualHeaders.map((h, i) => `${i}: "${h}"`));
  
  // Ahora leer los datos usando los headers reales
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
    defval: "",
    header: actualHeaders as string[],
    range: headerRowIndex + 1 // Comenzar datos desde la fila siguiente a los headers
  });

  if (json.length === 0) return [];

  // Mostrar el mapeo completo que estamos usando
  console.log("🔍 SUMAR - MAPEO:", Object.keys(SUMAR_CODE_MAPPING));
  console.log("🔍 DEBUG MAPEO COMPLETO");

  // Mapeo directo por posición de columna (más confiable)
  const headerToCode = new Map<string, string>();
  
  // Mapeo directo por posición:
  // Columna 8 (índice 8): "3% S/REM." → 20540 (CONTRIBUCION SOLIDARIA)
  // Columna 9 (índice 9): "1,5% S/REM." → 20590 (SEGURO SEPELIO)  
  // Columna 10 (índice 10): "MUTUAL 16 DE ABRIL" → 20595 (CUOTA MUTUAL)
  // Columna 11 (índice 11): "MUTUAL FAM." → 20610 (RESGUARDO MUTUAL) ← COLUMNA L
  // Columna 12 (índice 12): "" → 20620 (DESC. MUTUAL)
  
  if (actualHeaders.length >= 13) {
    const columnaI = String(actualHeaders[8] || "");
    const columnaJ = String(actualHeaders[9] || "");
    const columnaK = String(actualHeaders[10] || "");
    const columnaL = String(actualHeaders[11] || ""); // ← RESGUARDO MUTUAL
    const columnaM = String(actualHeaders[12] || "");
    
    headerToCode.set(columnaI, "20540");  // CONTRIBUCION SOLIDARIA
    headerToCode.set(columnaJ, "20590");  // SEGURO SEPELIO
    headerToCode.set(columnaK, "20595");  // CUOTA MUTUAL
    headerToCode.set(columnaL, "20610");  // RESGUARDO MUTUAL ← COLUMNA L
    headerToCode.set(columnaM, "20620");  // DESC. MUTUAL
    
    console.log("🔍 MAPEO DIRECTO POR POSICIÓN:");
    console.log("🔍 Columna I (8):", columnaI, "→ 20540");
    console.log("🔍 Columna J (9):", columnaJ, "→ 20590");
    console.log("🔍 Columna K (10):", columnaK, "→ 20595");
    console.log("🔍 Columna L (11):", columnaL, "→ 20610 ← RESGUARDO MUTUAL");
    console.log("🔍 Columna M (12):", columnaM, "→ 20620");
  }
  
  console.log("🔍 CONCEPTOS MAPEADOS:", Array.from(headerToCode.values()));
  console.log("🔍 CONCEPTOS FALTANTES:", ["20540", "20590", "20595", "20610", "20620"].filter(code => !headerToCode.has(code)));
  console.log("SUMAR - TOTAL MAPEADOS:", headerToCode.size);

  // campos meta esperables para SUMAR
  const headers = Object.keys(json[0] ?? {});
  
  console.log("🔍 SUMAR - HEADERS DISPONIBLES:", headers);
  
  const metaKeys = {
    periodo: headers.find(h => /per[ií]odo/i.test(h)) ?? "PERIODO",
    legajo: headers.find(h => /(cuil|dni|legajo)/i.test(h)) ?? "CUIL", // SUMAR: CUIL es el legajo
    nombre: headers.find(h => /nombre/i.test(h)) ?? "NOMBRE",
    cuil: headers.find(h => /(cuil|dni)/i.test(h)) ?? "CUIL",
  };
  
  console.log("🔍 SUMAR - METAKEYS MAPEADOS:", metaKeys);

  const rows: OfficialRow[] = [];

  json.forEach((linea, idx) => {
    // SUMAR: Siempre usar el período del formulario (prioridad absoluta)
    // El Excel de SUMAR no tiene columna de período
    const periodo = periodoResolver(""); // Forzar uso del período del formulario
    const legajo = String(linea[metaKeys.legajo] ?? "").trim();
    const nombre = String(linea[metaKeys.nombre] ?? "").trim();
    const cuil = String(linea[metaKeys.cuil] ?? "").trim();
    
    // SUMAR: Normalizar CUIL para que coincida con cuilNorm de los recibos
    const cuilNorm = cuil.replace(/[^0-9]/g, ""); // Solo dígitos
    
    // SUMAR: Solo procesar filas que tengan CUIL válido (más de 10 dígitos)
    if (cuilNorm.length < 10) {
      console.log(`🔍 SUMAR - Fila ${idx} omitida: CUIL inválido "${cuil}" -> "${cuilNorm}"`);
      return; // Saltar esta fila
    }

    const valores: Record<string, string> = {};

    for (const [h, code] of headerToCode.entries()) {
      const value = linea[h];
      const codeStr = String(code);
      valores[codeStr] = toDotDecimal(value);
    }

    // SUMAR: Usar cuilNorm para generar la clave (coincide con recibos consolidados)
    const key = `${cuilNorm}||${periodo}`;

    if (idx < 3) {
      console.log("SUMAR - fila", idx, {
        _20540: valores["20540"], // CONTRIBUCION SOLIDARIA (CUOTA SIND. 3% S/REM.)
        _20590: valores["20590"], // SEGURO SEPELIO (CUOTA SEP 1,5% S/REM.)
        _20595: valores["20595"], // CUOTA MUTUAL (APORT. SOLID. MUTUAL 16 DE ABRIL)
        _20610: valores["20610"], // RESGUARDO MUTUAL
        _20620: valores["20620"], // DESC. MUTUAL (RESGUARDO MUTUAL FAM.)
        headers: Object.keys(headerToCode), // Mostrar qué headers se mapearon
        legajo,
        nombre,
        periodo,
        key: `${legajo}||${periodo}`, // ← Mostrar la clave generada
        // DEBUG: Mostrar más detalles para diagnóstico
        legajoRaw: linea[metaKeys.legajo],
        periodoRaw: linea[metaKeys.periodo],
        periodoResuelto: periodo,
        cuil: cuil,
        cuilNorm: cuilNorm
      });
    }

    rows.push({
      key,
      valores,
      meta: { legajo, periodoRaw: String(""), periodo, nombre, cuil }, // SUMAR: no tiene período en Excel
    });
  });

  console.log("🔍 SUMAR - RESUMEN FINAL:");
  console.log("🔍 Total de filas procesadas:", rows.length);
  console.log("🔍 Primeras 3 claves generadas:", rows.slice(0, 3).map(r => r.key));
  console.log("🔍 Conceptos disponibles:", Object.keys(rows[0]?.valores || {}));
  
  // SUMAR: Logs adicionales para debug del control
  console.log("🔍 SUMAR - DEBUG CONTROL:");
  console.log("🔍 Total registros Excel:", rows.length);
  console.log("🔍 Muestra de claves Excel:", rows.slice(0, 5).map(r => r.key));
  console.log("🔍 Muestra de valores Excel:", rows.slice(0, 3).map(r => ({
    key: r.key,
    cuil: r.meta?.cuil,
    nombre: r.meta?.nombre,
    conceptos: Object.keys(r.valores).filter(k => r.valores[k] !== "0.00")
  })));
  
  return rows;
}
