// lib/pdf-parser.ts
// Los imports dinámicos se harán dentro de las funciones para evitar errores de SSR

export type Parsed = {
  data: Record<string, string>;
  debugLines: { y: number; text: string; tokens: { str: string; x: number; y: number }[] }[];
};

// Función para detectar la empresa del recibo
function detectarEmpresa(texto: string, debug: boolean = false): string {
  if (debug) {
    console.log(`🔍 Detectando empresa en texto:`, {
      textoLength: texto.length,
      textoPreview: texto.substring(0, 500) + "...",
      nombreArchivo: texto.includes(".") ? texto.split(" ").pop() : "N/A",
      contieneESTRATEGIA: texto.includes("ESTRATEGIA"),
      contieneAMBIENTAL: texto.includes("AMBIENTAL"),
      contieneSA: texto.includes("S.A."),
      textoCompleto: texto // Mostrar el texto completo para debug
    });
  }

  // Detectar LIMPAR (más específico y prioritario)
  if (/LIMPAR/i.test(texto) || /LIMP\s*AR/i.test(texto) || /LIMPAR\s+S\.A\./i.test(texto) || /LIMPAR\s+SOCIEDAD/i.test(texto)) {
    if (debug) {
      console.log("✅ Empresa detectada: LIMPAR");
      console.log("🔍 Texto que contiene LIMPAR:", texto.substring(0, 1000));
    }
    return "LIMPAR";
  }
  
  // Detectar SUMAR (prioritario)
  if (/SUMAR/i.test(texto) || (/CUOTA APORT\./i.test(texto) && /SEG\. SEPELIO/i.test(texto))) {
    if (debug) console.log("✅ Empresa detectada: SUMAR");
    return "SUMAR";
  }
  
  // Detectar TYSA (prioritario)
  if (/TYSA/i.test(texto) || /TALLER TYSA/i.test(texto)) {
    if (debug) console.log("✅ Empresa detectada: TYSA");
    return "TYSA";
  }
  
  // Detectar ESTRATEGIA AMBIENTAL
  if (/ESTRATEGIA AMBIENTAL/i.test(texto) || /ESTRATEGIA\s*AMBIENTAL/i.test(texto) || /ESTRATEGIA AMBIENTAL S\.A\./i.test(texto) || texto.includes("ESTRATEGIA AMBIENTAL")) {
    if (debug) console.log("✅ Empresa detectada: ESTRATEGIA AMBIENTAL");
    return "ESTRATEGIA AMBIENTAL";
  }
  
  // Detectar ESTRATEGIA URBANA
  if (/ESTRATEGIA URBANA/i.test(texto) || /ESTRATEGIA\s*URBANA/i.test(texto)) {
    if (debug) console.log("✅ Empresa detectada: ESTRATEGIA URBANA");
    return "ESTRATEGIA URBANA";
  }
  
  // Detectar LIME (por patrones específicos)
  if (/J09|J10|J11|J12/i.test(texto) || /LIME/i.test(texto) || (/Contrib\.Solidaria/i.test(texto) && /Gastos de sepelio/i.test(texto))) {
    if (debug) console.log("✅ Empresa detectada: LIME");
    return "LIME";
  }
  
  // Debug: mostrar qué patrones se probaron
  if (debug) {
    console.log(`🔍 Patrones de detección probados:`, {
      tieneLIMPAR: /LIMPAR/i.test(texto),
      tieneLIMP_AR: /LIMP\s*AR/i.test(texto),
      tieneSUMAR: /SUMAR/i.test(texto),
      tieneTYSA: /TYSA/i.test(texto),
      tieneTALLER_TYSA: /TALLER TYSA/i.test(texto),
      tieneESTRATEGIA_AMBIENTAL: /ESTRATEGIA AMBIENTAL/i.test(texto),
      tieneESTRATEGIA_AMBIENTAL_SA: /ESTRATEGIA AMBIENTAL S\.A\./i.test(texto),
      tieneESTRATEGIA_URBANA: /ESTRATEGIA URBANA/i.test(texto),
      tieneJ09: /J09/i.test(texto),
      tieneJ10: /J10/i.test(texto),
      tieneJ11: /J11/i.test(texto),
      tieneJ12: /J12/i.test(texto),
      tieneLIME: /LIME/i.test(texto),
      tieneContribSolidaria: /Contrib\.Solidaria/i.test(texto),
      tieneGastosSepelio: /Gastos de sepelio/i.test(texto)
    });
  }
  
  if (debug) console.log("❌ Empresa NO detectada, retornando DESCONOCIDA");
  return "DESCONOCIDA";
}



// Función principal que detecta la empresa y usa el parser correspondiente
export async function parsePdfReceiptToRecord(file: File, debug: boolean = false): Promise<Parsed> {
  if (debug) {
    console.log(`🔍 PDF Parser - INICIO para ${file.name}`);
  }
  
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
      
      if (debug) {
        console.log(`🔍 Debug PDF Parser - Usando texto de recibo específico:`, {
          filename: file.name,
          receiptNumber: receiptNumber,
          textoCompletoLength: textoCompleto.length,
          primerasLineasLength: primerasLineas.length
        });
      }
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
      
      if (debug) {
        console.log(`🔍 Debug PDF Parser - Usando texto de página específica:`, {
          filename: file.name,
          pageNumber: pageNumber,
          textoCompletoLength: textoCompleto.length,
          primerasLineasLength: primerasLineas.length
        });
      }
    } else {
      // Usar el parser genérico normal con import dinámico
      if (debug) {
        console.log(`🔍 PDF Parser - Usando parser genérico para ${file.name}`);
      }
      
      try {
        const { parsePdfReceiptToRecord: parseGeneric } = await import("./pdf-parser-generic");
        resultadoGenerico = await parseGeneric(file);
        textoCompleto = resultadoGenerico.data["TEXTO_COMPLETO"] || "";
        primerasLineas = resultadoGenerico.data["PRIMERAS_LINEAS"] || "";
        
        if (debug) {
          console.log(`🔍 PDF Parser - Parser genérico completado para ${file.name}:`, {
            textoCompletoLength: textoCompleto.length,
            primerasLineasLength: primerasLineas.length,
            primerasLineas: primerasLineas.substring(0, 200) + "..."
          });
        }
      } catch (genericError) {
        if (debug) {
          console.error(`❌ PDF Parser - Error en parser genérico para ${file.name}:`, genericError);
        }
        
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
  const empresa = detectarEmpresa(textoCompleto + " " + primerasLineas + " " + file.name, debug);
  
  if (debug) {
    console.log(`🔍 Empresa detectada para ${file.name}: "${empresa}"`);
    console.log(`🔍 Texto usado para detección:`, {
      nombreArchivo: file.name,
      textoCompletoLength: textoCompleto.length,
      primerasLineasLength: primerasLineas.length,
      textoCombinado: (textoCompleto + " " + primerasLineas + " " + file.name).substring(0, 300) + "..."
    });
  }

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
  } else if (empresa === "ESTRATEGIA AMBIENTAL" || empresa === "ESTRATEGIA URBANA") {
    // Para ESTRATEGIA AMBIENTAL y ESTRATEGIA URBANA, usar el parser genérico pero permitir guardar
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
