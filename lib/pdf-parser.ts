// lib/pdf-parser.ts
// Los imports dinámicos se harán dentro de las funciones para evitar errores de SSR

export type Parsed = {
  data: Record<string, string>;
  debugLines: { y: number; text: string; tokens: { str: string; x: number; y: number }[] }[];
};

// Función para detectar la empresa del recibo con patrones mejorados
function detectarEmpresa(texto: string, debug: boolean = false): string {
  // Patrones de detección de empresas (ordenados por prioridad)
  const empresaPatterns = [
    { 
      patterns: [/LIMPAR/i, /LIMP\s*AR/i, /LIMPAR\s+S\.A\./i, /LIMPAR\s+SOCIEDAD/i], 
      empresa: "LIMPAR" 
    },
    { 
      patterns: [/SUMAR/i, /CUOTA\s*APORT\./i, /SEG\.\s*SEPELIO/i], 
      empresa: "SUMAR" 
    },
    { 
      patterns: [/TYSA/i, /TALLER\s*TYSA/i], 
      empresa: "TYSA" 
    },
    { 
      patterns: [/ESTRATEGIA\s*AMBIENTAL/i, /ESTRATEGIA\s*AMBIENTAL\s*S\.A\./i], 
      empresa: "ESTRATEGIA AMBIENTAL" 
    },
    { 
      patterns: [/LIME/i, /J09/i, /J10/i, /J11/i, /J12/i, /Contrib\.Solidaria/i, /Gastos\s*de\s*sepelio/i], 
      empresa: "LIME" 
    },
    { 
      patterns: [/MAGEVA/i, /MAGEVA\s*SRL/i], 
      empresa: "MAGEVA" 
    },
    { 
      patterns: [/RESICOM/i, /RESICOM\s*INGENIERIA/i, /RESICOM\s*INGENIERIA\s*AMBIENTAL/i], 
      empresa: "RESICOM" 
    }
  ];
  
  // Probar cada patrón de empresa
  for (const { patterns, empresa } of empresaPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(texto)) {
        return empresa;
      }
    }
  }
  
  // Fallback inteligente: usar LIMPAR por defecto en lugar de DESCONOCIDA
  // Esto evita que se detenga el procesamiento
  return "LIMPAR";
}



// Función principal que detecta la empresa y usa el parser correspondiente
export async function parsePdfReceiptToRecord(file: File, debug: boolean = false): Promise<Parsed> {
  
  try {
    // Verificar si el archivo tiene metadata de recibo (división por texto)
    const receiptText = (file as any).receiptText;
    const receiptNumber = (file as any).receiptNumber;
    const pageText = (file as any).pageText;
    const pageNumber = (file as any).pageNumber;
    
    let resultadoGenerico;
    let textoCompleto;
    let primerasLineas;
    
    if (receiptText && receiptNumber) {
      // Usar el texto extraído del recibo específico
      textoCompleto = receiptText;
      primerasLineas = receiptText.substring(0, 1000); // Primeras líneas del recibo
      
      // Crear un resultado genérico simulado
      resultadoGenerico = {
        data: {
          "TEXTO_COMPLETO": textoCompleto,
          "PRIMERAS_LINEAS": primerasLineas
        },
        debugLines: []
      };
      
    } else if (pageText && pageNumber) {
      // Usar el texto extraído de la página específica (método anterior)
      textoCompleto = pageText;
      primerasLineas = pageText.substring(0, 1000); // Primeras líneas de la página
      
      // Crear un resultado genérico simulado
      resultadoGenerico = {
        data: {
          "TEXTO_COMPLETO": textoCompleto,
          "PRIMERAS_LINEAS": primerasLineas
        },
        debugLines: []
      };
      
    } else {
      // Usar el parser genérico normal con import dinámico
      try {
        const { parsePdfReceiptToRecord: parseGeneric } = await import("./pdf-parser-generic");
        resultadoGenerico = await parseGeneric(file);
        textoCompleto = resultadoGenerico.data["TEXTO_COMPLETO"] || "";
        primerasLineas = resultadoGenerico.data["PRIMERAS_LINEAS"] || "";
      } catch (genericError) {
        
        // Fallback: usar solo el nombre del archivo para detección
        textoCompleto = "";
        primerasLineas = "";
        resultadoGenerico = {
          data: {
            "TEXTO_COMPLETO": "",
            "PRIMERAS_LINEAS": "",
            "ARCHIVO": file.name
          },
          debugLines: []
        };
      }
    }

  // Detectar la empresa
  const empresa = detectarEmpresa(textoCompleto + " " + primerasLineas + " " + file.name, false);

  if (empresa === "LIMPAR") {
    // Usar el parser de LIMPAR con import dinámico
    const { parsePdfReceiptToRecord: parseLimpar } = await import("./pdf-parser-limpar");
    return await parseLimpar(file, debug);
  } else if (empresa === "TYSA") {
    // Usar el parser de TYSA con import dinámico
    const { parsePdfReceiptToRecord: parseTysa } = await import("./pdf-parser-tysa");
    return await parseTysa(file, debug);
  } else if (empresa === "LIME") {
    // Verificar si el archivo contiene TYSA en el nombre
    if (file.name.toUpperCase().includes("TYSA")) {
      const { parsePdfReceiptToRecord: parseTysa } = await import("./pdf-parser-tysa");
      return await parseTysa(file, debug);
    }
    
    // Verificar si el texto contiene "TALLER TYSA"
    if (textoCompleto.includes("TALLER TYSA") || primerasLineas.includes("TALLER TYSA")) {
      const { parsePdfReceiptToRecord: parseTysa } = await import("./pdf-parser-tysa");
      return await parseTysa(file, debug);
    }
    
    // Usar el parser de LIME con import dinámico
    const { parsePdfReceiptToRecord: parseLime } = await import("./pdf-parser-lime");
    return await parseLime(file, debug);
  } else if (empresa === "SUMAR") {
    // Usar el parser de SUMAR con import dinámico
    const { parsePdfReceiptToRecord: parseSumar } = await import("./pdf-parser-sumar");
    return await parseSumar(file, debug);
  } else if (empresa === "ESTRATEGIA AMBIENTAL") {
    // Para ESTRATEGIA AMBIENTAL, usar el parser genérico pero permitir guardar
    return {
      ...resultadoGenerico,
      data: {
        ...resultadoGenerico.data,
        "EMPRESA": empresa,
        "GUARDAR": "true"
      }
    };
  } else if (empresa === "MAGEVA") {
    // Para MAGEVA, usar el parser genérico pero permitir guardar
    return {
      ...resultadoGenerico,
      data: {
        ...resultadoGenerico.data,
        "EMPRESA": empresa,
        "GUARDAR": "true"
      }
    };
  } else if (empresa === "RESICOM") {
    // Para RESICOM, usar el parser genérico pero permitir guardar
    return {
      ...resultadoGenerico,
      data: {
        ...resultadoGenerico.data,
        "EMPRESA": empresa,
        "GUARDAR": "true"
      }
    };
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
    
    if (debug) {
      console.error(`❌ PDF Parser - ERROR para ${file.name}:`, e);
    }
    
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
