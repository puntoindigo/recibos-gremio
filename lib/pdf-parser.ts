// lib/pdf-parser.ts
import { parsePdfReceiptToRecord as parseLimpar } from "./pdf-parser-limpar";
import { parsePdfReceiptToRecord as parseLime } from "./pdf-parser-lime";
import { parsePdfReceiptToRecord as parseSumar } from "./pdf-parser-sumar";
import { parsePdfReceiptToRecord as parseTysa } from "./pdf-parser-tysa";
import { parsePdfReceiptToRecord as parseGeneric } from "./pdf-parser-generic";

export type Parsed = {
  data: Record<string, string>;
  debugLines: { y: number; text: string; tokens: { str: string; x: number; y: number }[] }[];
};

// Función para detectar la empresa del recibo
function detectarEmpresa(texto: string): string {
  // Detectar LIMPAR (más específico)
  if (/LIMP\s*AR/i.test(texto) && /\bLEGAJO\b/i.test(texto)) {
    return "LIMPAR";
  }
  
  // Detectar SUMAR (prioritario sobre LIME)
  if (/SUMAR/i.test(texto) || (/CUOTA APORT\./i.test(texto) && /SEG\. SEPELIO/i.test(texto))) {
    return "SUMAR";
  }
  
  // Detectar TYSA (prioritario sobre LIME) - más específico
  if (/TYSA/i.test(texto)) {
    return "TYSA";
  }
  
  // Detectar TYSA por nombre de archivo específico
  if (texto.includes("TYSA") || texto.includes("tysa")) {
    return "TYSA";
  }
  
  // Detectar TYSA por "TALLER TYSA" específicamente
  if (texto.includes("TALLER TYSA")) {
    return "TYSA";
  }
  
  // Detectar LIME (más específico)
  if (/LIME/i.test(texto) || (/Contrib\.Solidaria/i.test(texto) && /Gastos de sepelio/i.test(texto))) {
    return "LIME";
  }
  
  return "DESCONOCIDA";
}



// Función principal que detecta la empresa y usa el parser correspondiente
export async function parsePdfReceiptToRecord(file: File): Promise<Parsed> {
  try {
    // Primero usamos el parser genérico para detectar la empresa
    const resultadoGenerico = await parseGeneric(file);
  const textoCompleto = resultadoGenerico.data["TEXTO_COMPLETO"] || "";
  const primerasLineas = resultadoGenerico.data["PRIMERAS_LINEAS"] || "";

  // Detectar la empresa
  const empresa = detectarEmpresa(textoCompleto + " " + primerasLineas + " " + file.name);

  if (empresa === "LIMPAR") {
    // Usar el parser de LIMPAR
    return await parseLimpar(file);
  } else if (empresa === "TYSA") {
    // Usar el parser de TYSA
    return await parseTysa(file);
  } else if (empresa === "LIME") {
    // Verificar si el archivo contiene TYSA en el nombre
    if (file.name.toUpperCase().includes("TYSA")) {
      return await parseTysa(file);
    }
    
    // Verificar si el texto contiene "TALLER TYSA"
    if (textoCompleto.includes("TALLER TYSA") || primerasLineas.includes("TALLER TYSA")) {
      return await parseTysa(file);
    }
    
    // Usar el parser de LIME
    return await parseLime(file);
  } else if (empresa === "SUMAR") {
    // Usar el parser de SUMAR
    return await parseSumar(file);
  } else {
    // Retornar el resultado genérico pero NO guardar nada
    return {
      ...resultadoGenerico,
      data: {
        ...resultadoGenerico.data,
        "GUARDAR": "false",
        "EMPRESA_DETECTADA": empresa
      }
    };
  }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    
    // Retornar un resultado genérico con error
    return {
      data: {
        ARCHIVO: file.name,
        "TEXTO_COMPLETO": "",
        "EMPRESA_DETECTADA": "ERROR",
        "ERROR": errorMessage,
        "GUARDAR": "false"
      },
      debugLines: []
    };
  }
}
