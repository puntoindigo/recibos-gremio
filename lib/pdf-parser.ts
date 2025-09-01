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
  // Detectar LIMPAR (más específico) - hacer más flexible
  if (/LIMP\s*AR/i.test(texto) || /LIMPAR/i.test(texto)) {
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
export async function parsePdfReceiptToRecord(file: File, debug: boolean = false): Promise<Parsed> {
  try {
    // Primero usamos el parser genérico para detectar la empresa
    const resultadoGenerico = await parseGeneric(file);
  const textoCompleto = resultadoGenerico.data["TEXTO_COMPLETO"] || "";
  const primerasLineas = resultadoGenerico.data["PRIMERAS_LINEAS"] || "";

  // Detectar la empresa
  const empresa = detectarEmpresa(textoCompleto + " " + primerasLineas + " " + file.name);

  // Debug: mostrar qué empresa se detectó
  if (debug) {
    console.log("🔍 Debug PDF Parser - Detección de empresa:", {
      filename: file.name,
      empresaDetectada: empresa,
      textoCompletoLength: textoCompleto.length,
      primerasLineasLength: primerasLineas.length,
      contieneLIMP: /LIMP/i.test(textoCompleto + " " + primerasLineas),
      contieneAR: /AR/i.test(textoCompleto + " " + primerasLineas),
      contieneLIMPAR: /LIMPAR/i.test(textoCompleto + " " + primerasLineas),
      textoCompleto: textoCompleto.substring(0, 200) + "...",
      primerasLineas: primerasLineas.substring(0, 200) + "..."
    });
  }

  if (empresa === "LIMPAR") {
    // Usar el parser de LIMPAR
    return await parseLimpar(file, debug);
  } else if (empresa === "TYSA") {
    // Usar el parser de TYSA
    return await parseTysa(file, debug);
  } else if (empresa === "LIME") {
    // Verificar si el archivo contiene TYSA en el nombre
    if (file.name.toUpperCase().includes("TYSA")) {
      return await parseTysa(file, debug);
    }
    
    // Verificar si el texto contiene "TALLER TYSA"
    if (textoCompleto.includes("TALLER TYSA") || primerasLineas.includes("TALLER TYSA")) {
      return await parseTysa(file, debug);
    }
    
    // Usar el parser de LIME
    return await parseLime(file, debug);
  } else if (empresa === "SUMAR") {
    // Usar el parser de SUMAR
    return await parseSumar(file, debug);
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
