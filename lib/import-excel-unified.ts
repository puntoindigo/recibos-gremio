// lib/import-excel-unified.ts
import { readOfficialXlsx, parseOfficialXlsx } from "./import-excel";
import { parseOfficialXlsxLime } from "./import-excel-lime";
import { parseOfficialXlsxSumar } from "./import-excel-sumar";
import { parseOfficialXlsxTysa } from "./import-excel-tysa";
import type { OfficialRow } from "./import-excel";

export type { OfficialRow };

// lector asíncrono con defaults; acepta File/Blob o ArrayBuffer
export async function readOfficialXlsxUnified(
  file: ArrayBuffer | Uint8Array | Buffer | Blob,
  empresa: string,
  opts?: { periodoResolver?: (periodoRaw: unknown) => string }
): Promise<OfficialRow[]> {
  let buf: ArrayBuffer | Uint8Array | Buffer;
  // Si viene un Blob/File en el cliente, lo convertimos
  if (typeof Blob !== 'undefined' && file instanceof Blob && 'arrayBuffer' in file) {
    buf = await (file as Blob).arrayBuffer();
  } else {
    buf = file as ArrayBuffer;
  }
  
  const periodoResolver = (opts && opts.periodoResolver) ? opts.periodoResolver : undefined;
  
  return parseOfficialXlsxUnified(buf, empresa, { periodoResolver });
}

export function parseOfficialXlsxUnified(
  file: ArrayBuffer | Uint8Array | Buffer,
  empresa: string,
  {
    periodoResolver,
  }: {
    /** Debe devolver "mm/yyyy" a partir del valor crudo de la celda/columna de período */
    periodoResolver?: (periodoRaw: unknown) => string;
  }
): OfficialRow[] {
  // Normalizar nombre de empresa
  const empresaNormalizada = empresa.toUpperCase().trim();
  
  console.log(`🔄 Parseando archivo de control para empresa: ${empresaNormalizada}`);
  
  // Seleccionar parser según empresa
  switch (empresaNormalizada) {
    case "LIME":
      return parseOfficialXlsxLime(file, { 
        periodoResolver: periodoResolver || ((p) => String(p || "").trim()) 
      });
      
    case "SUMAR":
      return parseOfficialXlsxSumar(file, { 
        periodoResolver: periodoResolver || ((p) => String(p || "").trim()) 
      });
      
    case "TYSA":
      return parseOfficialXlsxTysa(file, { 
        periodoResolver: periodoResolver || ((p) => String(p || "").trim()) 
      });
      
    case "LIMPAR":
    default:
      // Usar parser genérico para LIMPAR y empresas no reconocidas
      // SIEMPRE usar el periodoResolver personalizado si se proporciona
      console.log(`🔍 Debug Parser Unificado - LIMPAR:`, {
        periodoResolver: periodoResolver ? "personalizado" : "no proporcionado",
        tipo: periodoResolver ? typeof periodoResolver : "undefined"
      });
      
      if (periodoResolver) {
        // Crear un wrapper que ignore el argumento y use el periodoResolver personalizado
        const wrapper = (p: unknown) => periodoResolver("");
        return parseOfficialXlsx(file, { periodoResolver: wrapper });
      } else {
        // Solo usar fallback si NO hay periodoResolver personalizado
        return parseOfficialXlsx(file, { 
          periodoResolver: (p) => String(p || "").trim() 
        });
      }
  }
}

// Función helper para detectar empresa automáticamente desde el contenido del archivo
export function detectEmpresaFromFile(
  file: ArrayBuffer | Uint8Array | Buffer
): string {
  try {
    const { read, utils } = require("xlsx");
    const wb = read(file, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    
    if (json.length === 0) return "LIMPAR";
    
    // Buscar indicadores de empresa en los datos
    const allText = JSON.stringify(json).toLowerCase();
    
    if (allText.includes("lime") || allText.includes("lima")) {
      return "LIME";
    }
    
    if (allText.includes("sumar")) {
      return "SUMAR";
    }
    
    if (allText.includes("tysa") || allText.includes("taller tysa")) {
      return "TYSA";
    }
    
    return "LIMPAR";
  } catch (error) {
    console.warn("Error detectando empresa, usando LIMPAR por defecto:", error);
    return "LIMPAR";
  }
}
