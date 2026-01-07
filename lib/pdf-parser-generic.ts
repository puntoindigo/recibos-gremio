// lib/pdf-parser-generic.ts
import { getDocument } from "pdfjs-dist";
import type {
  DocumentInitParameters,
  PDFDocumentProxy,
  PDFPageProxy,
  TextContent,
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
import { configurePdfWorker, verifyPdfWorker } from "./pdf-config";

export type Parsed = {
  data: Record<string, string>;
  debugLines: { y: number; text: string; tokens: { str: string; x: number; y: number }[] }[];
};

function assertClient(): void {
  if (typeof window === "undefined") throw new Error("PDF parsing debe ejecutarse en el navegador");
}

type Word = { str: string; x: number; y: number };

// Parser genérico que solo extrae texto básico para detectar empresas
export async function parsePdfReceiptToRecord(file: File, debug: boolean = false): Promise<Parsed> {
  assertClient();

  // Configurar PDF.js de forma centralizada
  configurePdfWorker();
  
  // Verificar que el worker esté disponible
  const workerOk = await verifyPdfWorker();
  if (!workerOk) {
    throw new Error("No se pudo cargar el worker de PDF");
  }

  const buf = await file.arrayBuffer();

  const params: DocumentInitParameters = { data: buf };
  type LoadingTask = { promise: Promise<PDFDocumentProxy> };
  const loadingTask = getDocument(params) as unknown as LoadingTask;
  const pdf: PDFDocumentProxy = await loadingTask.promise;

  const allLines: Word[][] = [];
  const allWords: Word[] = [];
  const Y_TOL = 2.5;

  for (let i = 1; i <= (pdf.numPages ?? 1); i++) {
    const page: PDFPageProxy = await pdf.getPage(i);
    try {
      const content: TextContent = await page.getTextContent();

      const words: Word[] = [];
      for (const item of content.items as ReadonlyArray<TextItem | TextMarkedContent>) {
        if ("str" in item) {
          const ti = item as TextItem;
          const tr = Array.isArray(ti.transform) ? ti.transform : undefined;
          const x = (tr?.[4] ?? 0) as number;
          const y = (tr?.[5] ?? 0) as number;
          const str = String(ti.str ?? "").trim();
          if (str.length) words.push({ str, x, y });
        }
      }

      allWords.push(...words);

      // agrupar por línea (misma Y promedio)
      const lines: Word[][] = [];
      for (const w of [...words].sort((a, b) => b.y - a.y || a.x - b.x)) {
        let placed = false;
        for (const line of lines) {
          const avgY = line.reduce((s, ww) => s + ww.y, 0) / line.length;
          if (Math.abs(avgY - w.y) <= Y_TOL) {
            line.push(w);
            placed = true;
            break;
          }
        }
        if (!placed) lines.push([w]);
      }
      for (const line of lines) line.sort((a, b) => a.x - b.x);
      allLines.push(...lines);
    } finally {
      try {
        page.cleanup();
      } catch {
        /* noop */
      }
    }
  }

  const rawText = allWords.map((w) => w.str).join(" ");
  const data: Record<string, string> = { 
    ARCHIVO: file.name, 
    "TEXTO_COMPLETO": rawText,
    "EMPRESA_DETECTADA": "DESCONOCIDA",
    "GUARDAR": "true" // Por defecto, intentar guardar
  };

  // Extraer las primeras líneas para análisis
  const primerasLineas = allLines.slice(0, 20).map(line => 
    line.map(w => w.str).join(" ")
  ).join(" | ");

  data["PRIMERAS_LINEAS"] = primerasLineas;

  // Extraer datos básicos usando expresiones regulares más robustas
  // 1. Buscar legajo con diferentes patrones
  const legajoPatterns = [
    /(?:legajo|leg\.?)\s*:?\s*(\d{2,6})/i,
    /(?:empleado|emp\.?)\s*:?\s*(\d{2,6})/i,
    /(?:nro|numero|n°)\s*:?\s*(\d{2,6})/i,
    /\b(\d{3,6})\b/ // Números de 3-6 dígitos como legajo
  ];
  
  for (const pattern of legajoPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const legajo = match[1];
      // Validar que no sea parte de una fecha o código
      if (!legajo.includes('20') && !legajo.includes('19') && parseInt(legajo) > 100) {
        data["LEGAJO"] = legajo;
        break;
      }
    }
  }

      // Buscar CUIL con diferentes patrones - priorizar el del empleado
      const cuilMatch1 = rawText.match(/(?:cuil|c\.u\.i\.l\.?)\s*:?\s*(\d{2,3}-?\d{6,8}-?\d{1,2})/i);
      const cuilMatches2 = rawText.matchAll(/(\d{2,3}-\d{6,8}-\d{1,2})/g);
      const cuilMatches3 = rawText.matchAll(/(\d{2,3}\s*\d{6,8}\s*\d{1,2})/g);
      
      if (cuilMatch1) {
        data["CUIL"] = cuilMatch1[1].replace(/-/g, '');
      } else {
        // Buscar todos los CUILs y tomar el que parece ser del empleado
        const allCuils = [];
        
        // Agregar todos los CUILs encontrados
        for (const match of cuilMatches2) {
          allCuils.push(match[1]);
        }
        for (const match of cuilMatches3) {
          allCuils.push(match[1].replace(/\s/g, ''));
        }
        
        // Para ESTRATEGIA AMBIENTAL, tomar el tercer CUIL (el del empleado)
        // El primer y segundo son de la empresa, el tercero y cuarto son del empleado
        if (allCuils.length > 2) {
          data["CUIL"] = allCuils[2].replace(/-/g, '');
        } else if (allCuils.length > 1) {
          data["CUIL"] = allCuils[1].replace(/-/g, '');
        } else if (allCuils.length === 1) {
          data["CUIL"] = allCuils[0].replace(/-/g, '');
        }
      }

  // 2. Buscar nombre con diferentes patrones
  const nombrePatterns = [
    /(?:nombre|apellido|empleado)\s*:?\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?:\s|$)/i,
    /([A-ZÁÉÍÓÚÑ]+,\s*[A-ZÁÉÍÓÚÑ\s]+?)(?:\s|$)/, // APELLIDO, NOMBRE
    /([A-ZÁÉÍÓÚÑ]{2,}\s+[A-ZÁÉÍÓÚÑ]{2,})/, // NOMBRE APELLIDO
    /(?:apellido\s+y\s+nombre|nombre\s+y\s+apellido)\s*:?\s*([A-ZÁÉÍÓÚÑ\s,]+)/i
  ];
  
  for (const pattern of nombrePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const nombre = match[1].trim();
      // Validar que el nombre tenga al menos 3 caracteres y no contenga números
      if (nombre.length >= 3 && !/\d/.test(nombre) && !nombre.includes('EMPRESA') && !nombre.includes('S.A.')) {
        data["NOMBRE"] = nombre;
        break;
      }
    }
  }
  
  // Para ESTRATEGIA AMBIENTAL, limpiar el nombre para que no incluya texto extra
  if (file.name.toUpperCase().includes('ESTRATEGIA AMBIENTAL') || rawText.toUpperCase().includes('ESTRATEGIA AMBIENTAL')) {
    if (data["NOMBRE"]) {
      // Limpiar el nombre: tomar solo hasta "ESTRATEGIA AMBIENTAL" o hasta caracteres no alfabéticos
      const nombreLimpio = data["NOMBRE"]
        .replace(/\s+ESTRATEGIA\s+AMBIENTAL.*$/i, '') // Quitar "ESTRATEGIA AMBIENTAL" y todo lo que sigue
        .replace(/\s+ULTIMO\s+DEPOSITO.*$/i, '') // Quitar "ULTIMO DEPOSITO" y todo lo que sigue
        .replace(/\s+APORTES\s+Y\s+CONTRIBUCIONES.*$/i, '') // Quitar "APORTES Y CONTRIBUCIONES" y todo lo que sigue
        .replace(/\s+SUELDO.*$/i, '') // Quitar "SUELDO" y todo lo que sigue
        .trim();
      
      if (nombreLimpio) {
        data["NOMBRE"] = nombreLimpio;
      }
    }
  }

  // 3. Buscar período con diferentes formatos
  const periodoPatterns = [
    /(?:periodo|período|mes)\s*:?\s*(\d{1,2})[\/\-](\d{4})/i,
    /(?:periodo|período|mes)\s*:?\s*(\d{1,2})\s*de\s*(\d{4})/i,
    /(\d{1,2})[\/\-](\d{4})/, // mm/yyyy o mm-yyyy
    /(\d{1,2})\s*de\s*(\d{4})/, // mm de yyyy
    /(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*(\d{4})/i
  ];
  
  for (const pattern of periodoPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      let mes, año;
      
      if (pattern.source.includes('enero|febrero')) {
        // Mes en texto
        const meses = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };
        mes = meses[match[1].toLowerCase() as keyof typeof meses];
        año = match[2];
      } else {
        mes = match[1].padStart(2, '0');
        año = match[2];
      }
      
      // Validar que el mes sea válido (1-12) y el año sea razonable (2020-2030)
      const añoNum = parseInt(año);
      const mesNum = parseInt(mes);
      if (mes && mesNum >= 1 && mesNum <= 12 && añoNum >= 2020 && añoNum <= 2030) {
        data["PERIODO"] = `${mes}/${año}`;
        if (debug) {
          console.log("✅ Parser Genérico - Período detectado:", {
            match: match[0],
            mes,
            año,
            periodoFinal: data["PERIODO"]
          });
        }
        break;
        } else if (debug) {
          console.log("❌ Parser Genérico - Período inválido:", {
            match: match[0],
            mes,
            año,
            mesNum,
            añoNum,
            mesValido: mes && mesNum >= 1 && mesNum <= 12,
            añoValido: año && añoNum >= 2020 && añoNum <= 2030,
            razon: añoNum > 2030 ? "Año demasiado alto" : añoNum < 2020 ? "Año demasiado bajo" : "Mes inválido"
          });
        }
    }
  }

      // Si no se encontró período, buscar en el nombre del archivo
      if (!data["PERIODO"]) {
        if (debug) {
          console.log("🔍 Parser Genérico - Buscando período en nombre del archivo:", {
            fileName: file.name,
            fileNameUpper: file.name.toUpperCase(),
            contieneSETIEMBRE: file.name.toUpperCase().includes('SETIEMBRE'),
            contiene2025: file.name.includes('2025')
          });
        }
        
        // PRIMERO: Buscar patrones de mes en texto como "SETIEMBRE 2025" (prioritario)
        const mesTextoMatch = file.name.match(/(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*(\d{4})/i);
        if (mesTextoMatch) {
          if (debug) {
            console.log("✅ Parser Genérico - Mes en texto encontrado:", {
              match: mesTextoMatch,
              mesTexto: mesTextoMatch[1],
              año: mesTextoMatch[2]
            });
          }
          const meses = {
            'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04',
            'MAYO': '05', 'JUNIO': '06', 'JULIO': '07', 'AGOSTO': '08',
            'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
          };
          const mesTexto = mesTextoMatch[1].toUpperCase();
          const año = mesTextoMatch[2];
          const mes = meses[mesTexto as keyof typeof meses];
          if (mes) {
            data["PERIODO"] = `${mes}/${año}`;
            if (debug) {
              console.log("✅ Parser Genérico - Período establecido desde nombre:", data["PERIODO"]);
            }
          }
        } else {
          if (debug) {
            console.log("❌ Parser Genérico - No se encontró mes en texto en el nombre del archivo");
          }
          // SEGUNDO: Buscar patrones numéricos como "09/2025" o "092025" (solo si no hay mes en texto)
          const archivoPeriodoMatch = file.name.match(/(\d{1,2})[\/\-](\d{4})/);
          if (archivoPeriodoMatch) {
            const mes = archivoPeriodoMatch[1].padStart(2, '0');
            const año = archivoPeriodoMatch[2];
            const añoNum = parseInt(año);
            const mesNum = parseInt(mes);
            
            // Validar que el año sea razonable (2020-2030) y el mes sea válido (1-12)
            if (añoNum >= 2020 && añoNum <= 2030 && mesNum >= 1 && mesNum <= 12) {
              data["PERIODO"] = `${mes}/${año}`;
              if (debug) {
                console.log("✅ Parser Genérico - Período detectado desde nombre (con separador):", {
                  match: archivoPeriodoMatch[0],
                  mes,
                  año,
                  periodoFinal: data["PERIODO"]
                });
              }
            } else if (debug) {
              console.log("❌ Parser Genérico - Período inválido desde nombre (con separador):", {
                match: archivoPeriodoMatch[0],
                mes,
                año,
                mesValido: mesNum >= 1 && mesNum <= 12,
                añoValido: añoNum >= 2020 && añoNum <= 2030,
                razon: añoNum > 2030 ? "Año demasiado alto" : añoNum < 2020 ? "Año demasiado bajo" : "Mes inválido"
              });
            }
          } else {
  // TERCERO: Buscar patrones como "092025" (solo si no hay separador)
  // Solo buscar si el año comienza con 20 (2020-2030) y es exactamente 4 dígitos
  const archivoPeriodoMatch2 = file.name.match(/(\d{1,2})(20\d{2})/);
  if (archivoPeriodoMatch2) {
    const mes = archivoPeriodoMatch2[1].padStart(2, '0');
    const año = archivoPeriodoMatch2[2];
    const añoNum = parseInt(año);
    const mesNum = parseInt(mes);
    
    // Validar que el mes sea válido (1-12) y el año sea razonable (2020-2030)
    if (mesNum >= 1 && mesNum <= 12 && añoNum >= 2020 && añoNum <= 2030) {
      data["PERIODO"] = `${mes}/${año}`;
      if (debug) {
        console.log("✅ Parser Genérico - Período detectado desde nombre (sin separador):", {
          match: archivoPeriodoMatch2[0],
          mes,
          año,
          periodoFinal: data["PERIODO"]
        });
      }
    } else if (debug) {
      console.log("❌ Parser Genérico - Período inválido desde nombre (sin separador):", {
        match: archivoPeriodoMatch2[0],
        mes,
        año,
        mesValido: mesNum >= 1 && mesNum <= 12,
        añoValido: añoNum >= 2020 && añoNum <= 2030,
        razon: añoNum > 2030 ? "Año demasiado alto" : añoNum < 2020 ? "Año demasiado bajo" : "Mes inválido"
      });
    }
  }
          }
        }
      }

      // ESPECIAL PARA ESTRATEGIA AMBIENTAL: Buscar período en formato "sept-25", "ago-25", etc.
      if (file.name.toUpperCase().includes('ESTRATEGIA AMBIENTAL') || rawText.toUpperCase().includes('ESTRATEGIA AMBIENTAL')) {
        const mesesAbrev = {
          'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
          'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
        };
        
        // Buscar período en diferentes lugares y formatos
        let periodoEncontrado = false;
        
        // 1. Buscar después de "PERIODO DE PAGO" con diferentes formatos
        let periodoEstrategiaMatch = rawText.match(/PERIODO DE PAGO\s+([a-z]+)-(\d{2,4})/i);
        if (periodoEstrategiaMatch && !periodoEncontrado) {
          const mesAbrev = periodoEstrategiaMatch[1].toLowerCase();
          const año = periodoEstrategiaMatch[2];
          const mes = mesesAbrev[mesAbrev as keyof typeof mesesAbrev];
          if (mes) {
            const añoCompleto = año.length === 2 ? `20${año}` : año;
            data["PERIODO"] = `${mes}/${añoCompleto}`;
            periodoEncontrado = true;
            if (debug) {
              console.log("✅ Parser Genérico - Período ESTRATEGIA detectado (PERIODO DE PAGO):", {
                match: periodoEstrategiaMatch[0],
                mesAbrev,
                año,
                mes,
                añoCompleto,
                periodoFinal: data["PERIODO"]
              });
            }
          }
        }
        
        // 1.1. Buscar formato "PERIODO DE PAGO sept-25" o similar
        if (!periodoEncontrado) {
          const periodoEstrategiaMatch2 = rawText.match(/PERIODO DE PAGO\s+([a-z]+)-(\d{2,4})/i);
          if (periodoEstrategiaMatch2) {
            const mesAbrev = periodoEstrategiaMatch2[1].toLowerCase();
            const año = periodoEstrategiaMatch2[2];
            const mes = mesesAbrev[mesAbrev as keyof typeof mesesAbrev];
            if (mes) {
              const añoCompleto = año.length === 2 ? `20${año}` : año;
              data["PERIODO"] = `${mes}/${añoCompleto}`;
              periodoEncontrado = true;
              if (debug) {
                console.log("✅ Parser Genérico - Período ESTRATEGIA detectado (PERIODO DE PAGO formato 2):", {
                  match: periodoEstrategiaMatch2[0],
                  mesAbrev,
                  año,
                  mes,
                  añoCompleto,
                  periodoFinal: data["PERIODO"]
                });
              }
            }
          }
        }
        
        // 1.2. Buscar formato "SETIEMBRE 2025" en el texto
        if (!periodoEncontrado) {
          const mesesCompletos: Record<string, string> = {
            'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
            'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
            'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
          };
          
          const periodoCompletoMatch = rawText.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/i);
          if (periodoCompletoMatch) {
            const mesNombre = periodoCompletoMatch[1].toLowerCase();
            const año = periodoCompletoMatch[2];
            const mes = mesesCompletos[mesNombre];
            if (mes) {
    data["PERIODO"] = `${mes}/${año}`;
              periodoEncontrado = true;
              if (debug) {
                console.log("✅ Parser Genérico - Período ESTRATEGIA detectado (mes completo):", {
                  match: periodoCompletoMatch[0],
                  mesNombre,
                  año,
                  mes,
                  periodoFinal: data["PERIODO"]
                });
              }
            }
          }
        }
        
        // 2. Buscar en el nombre del archivo
        if (!periodoEncontrado) {
          const periodoArchivoMatch = file.name.match(/([a-z]+)-(\d{2,4})/i);
          if (periodoArchivoMatch) {
            const mesAbrev = periodoArchivoMatch[1].toLowerCase();
            const año = periodoArchivoMatch[2];
            const mes = mesesAbrev[mesAbrev as keyof typeof mesesAbrev];
            if (mes) {
            const añoCompleto = año.length === 2 ? `20${año}` : año;
            
            // Validar que el año sea razonable
            if (parseInt(añoCompleto) >= 2020 && parseInt(añoCompleto) <= 2030) {
              data["PERIODO"] = `${mes}/${añoCompleto}`;
              periodoEncontrado = true;
              if (debug) {
                console.log("✅ Parser Genérico - Período ESTRATEGIA detectado (archivo):", {
                  match: periodoArchivoMatch[0],
                  mesAbrev,
                  año,
                  mes,
                  añoCompleto,
                  periodoFinal: data["PERIODO"]
                });
              }
            } else if (debug) {
              console.log("❌ Parser Genérico - Año inválido en archivo:", {
                match: periodoArchivoMatch[0],
                año,
                añoCompleto,
                añoValido: parseInt(añoCompleto) >= 2020 && parseInt(añoCompleto) <= 2030
              });
            }
            }
          }
        }
        
        // 3. Buscar en cualquier parte del texto
        if (!periodoEncontrado) {
          const periodoTextoMatch = rawText.match(/([a-z]+)-(\d{2,4})/i);
          if (periodoTextoMatch) {
            const mesAbrev = periodoTextoMatch[1].toLowerCase();
            const año = periodoTextoMatch[2];
            const mes = mesesAbrev[mesAbrev as keyof typeof mesesAbrev];
            if (mes) {
              const añoCompleto = año.length === 2 ? `20${año}` : año;
              
              // Validar que el año sea razonable
              if (parseInt(añoCompleto) >= 2020 && parseInt(añoCompleto) <= 2030) {
                data["PERIODO"] = `${mes}/${añoCompleto}`;
                periodoEncontrado = true;
                if (debug) {
                  console.log("✅ Parser Genérico - Período ESTRATEGIA detectado (texto):", {
                    match: periodoTextoMatch[0],
                    mesAbrev,
                    año,
                    mes,
                    añoCompleto,
                    periodoFinal: data["PERIODO"]
                  });
                }
              } else if (debug) {
                console.log("❌ Parser Genérico - Año inválido en texto:", {
                  match: periodoTextoMatch[0],
                  año,
                  añoCompleto,
                  añoValido: parseInt(añoCompleto) >= 2020 && parseInt(añoCompleto) <= 2030
                });
              }
            }
          }
        }
      }

  // Si no se encontró legajo, buscar números que parezcan legajos
  if (!data["LEGAJO"]) {
    // Buscar patrones más específicos de legajo
    const legajoMatch2 = rawText.match(/(?:legajo|leg\.?)\s*:?\s*(\d{2,4})/i);
    if (legajoMatch2) {
      data["LEGAJO"] = legajoMatch2[1];
    } else {
      // Buscar números que no sean parte de fechas o códigos
      const legajoMatch3 = rawText.match(/\b(\d{2,4})\b/);
      if (legajoMatch3) {
        const numero = legajoMatch3[1];
        // Evitar números que parecen ser parte de fechas o códigos
        if (!numero.includes('33') && !numero.includes('7078') && !numero.includes('2025')) {
          data["LEGAJO"] = numero;
        }
      }
    }
  }

  // Si no se encontró nombre, buscar patrones de nombres
  if (!data["NOMBRE"]) {
    const nombreMatch2 = rawText.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/);
    if (nombreMatch2) {
      data["NOMBRE"] = nombreMatch2[1];
    }
  }

  // 4. Detectar empresa con patrones más robustos
  const empresaPatterns = [
    { pattern: /LIMPAR|LIMP\s*AR|LIMPAR\s*S\.A\./i, empresa: "LIMPAR" },
    { pattern: /SUMAR|CUOTA\s*APORT\.|SEG\.\s*SEPELIO/i, empresa: "SUMAR" },
    { pattern: /TYSA|TALLER\s*TYSA/i, empresa: "TYSA" },
    { pattern: /ESTRATEGIA\s*AMBIENTAL|ESTRATEGIA\s*AMBIENTAL\s*S\.A\./i, empresa: "ESTRATEGIA AMBIENTAL" },
    { pattern: /LIME|J09|J10|J11|J12|Contrib\.Solidaria|Gastos\s*de\s*sepelio/i, empresa: "LIME" },
    { pattern: /MAGEVA|MAGEVA\s*SRL/i, empresa: "MAGEVA" },
    { pattern: /RESICOM|RESICOM\s*INGENIERIA|RESICOM\s*INGENIERIA\s*AMBIENTAL/i, empresa: "RESICOM" }
  ];
  
  let empresaDetectada = "DESCONOCIDA";
  for (const { pattern, empresa } of empresaPatterns) {
    if (pattern.test(rawText) || pattern.test(file.name)) {
      empresaDetectada = empresa;
      break;
    }
  }
  
  data["EMPRESA"] = empresaDetectada;
  
  // Extraer CATEGORIA
  const categoriaPatterns = [
    /Categoría\s*:?\s*([A-ZÁÉÍÓÚÑ\s\d\-]+)/i,
    /CATEGORIA\s*:?\s*([A-ZÁÉÍÓÚÑ\s\d\-]+)/i,
    /Categoría\s+([A-ZÁÉÍÓÚÑ\s\d\-]+?)(?:\s|$)/i,
    /CATEGORIA\s+([A-ZÁÉÍÓÚÑ\s\d\-]+?)(?:\s|$)/i
  ];
  
  for (const pattern of categoriaPatterns) {
    const categoriaMatch = rawText.match(pattern);
    if (categoriaMatch) {
      let categoria = categoriaMatch[1].trim();
      if (categoria && categoria.length > 0 && !categoria.match(/^[\s\-]+$/)) {
        data["CATEGORIA"] = categoria;
        break;
      }
    }
  }
  
  // Procesamiento específico por empresa
  if (empresaDetectada === "ESTRATEGIA AMBIENTAL") {
        // Limpiar CATEGORIA para ESTRATEGIA AMBIENTAL - remover texto extra
        if (data["CATEGORIA"]) {
          let categoria = data["CATEGORIA"];
          // Remover "LUGAR Y FECHA DE PAGO" si aparece al inicio
          categoria = categoria.replace(/^LUGAR\s+Y\s+FECHA\s+DE\s+PAGO\s+/i, '');
          // Remover "CATEGORIA" si aparece en el texto
          categoria = categoria.replace(/CATEGORIA\s*/gi, '');
          // Remover "LUGAR Y FECHA DE PAGO" si aparece en el medio
          categoria = categoria.replace(/\s*LUGAR\s+Y\s+FECHA\s+DE\s+PAGO\s*/gi, ' ');
          // Remover fechas y lugares comunes (ej: "Rosario - 03")
          categoria = categoria.replace(/\s*Rosario\s*-\s*\d+\s*/gi, '');
          categoria = categoria.replace(/\s*\d{2}\/\d{2}\/\d{4}\s*/g, '');
          // Remover duplicados de palabras consecutivas
          categoria = categoria.split(/\s+/).filter((word, index, arr) => {
            return index === 0 || word !== arr[index - 1];
          }).join(' ').trim();
          // Limitar a máximo 50 caracteres (las categorías suelen ser cortas)
          if (categoria.length > 50) {
            categoria = categoria.substring(0, 50).trim();
          }
          data["CATEGORIA"] = categoria;
        }
        
        // Para ESTRATEGIA AMBIENTAL, usar CUIL como legajo
        if (data["CUIL"]) {
          data["LEGAJO"] = data["CUIL"]; // Usar CUIL como legajo
        }
        
        // Extraer descuentos y montos para ESTRATEGIA AMBIENTAL
        // Buscar descuentos (valores negativos o con signo menos, o campo "DESCUENTOS")
        const descuentosPatterns = [
          /DESCUENTOS?\s*:?\s*(\d+[.,]\d+)/i,
          /TOTAL\s+DESCUENTOS?\s*:?\s*(\d+[.,]\d+)/i,
          /(?:descuento|deduccion|retencion)\s*:?\s*(\d+[.,]\d+)/gi
        ];
        for (const pattern of descuentosPatterns) {
          const match = rawText.match(pattern);
          if (match) {
            data["DESCUENTOS"] = match[1]?.replace(/[^\d.,]/g, '') || match.map(m => m.replace(/[^\d.,-]/g, '')).join('; ');
            break;
          }
        }
        
        // Buscar sueldo básico
        const sueldoPatterns = [
          /SUELDO\s+BASICO\s*:?\s*(\d+[.,]\d+)/i,
          /SUELDO\s+BÁSICO\s*:?\s*(\d+[.,]\d+)/i,
          /SUELDO\s+BASICO\s+(\d+[.,]\d+)/i
        ];
        for (const pattern of sueldoPatterns) {
          const match = rawText.match(pattern);
          if (match) {
            data["SUELDO_BASICO"] = match[1].replace(/[^\d.,]/g, '');
            break;
          }
        }
        
        // Buscar sueldo bruto
        const sueldoBrutoPatterns = [
          /SUELDO\s+BRUTO\s*:?\s*(\d+[.,]\d+)/i,
          /SUELDO\s+BRUTO\s+(\d+[.,]\d+)/i
        ];
        for (const pattern of sueldoBrutoPatterns) {
          const match = rawText.match(pattern);
          if (match) {
            data["SUELDO_BRUTO"] = match[1].replace(/[^\d.,]/g, '');
            break;
          }
        }
        
        // Buscar totales
        const totalPatterns = [
          /TOTAL\s*:?\s*(\d+[.,]\d+)/i,
          /TOTAL\s+A\s+COBRAR\s*:?\s*(\d+[.,]\d+)/i,
          /TOTAL\s+(\d+[.,]\d+)/i
        ];
        for (const pattern of totalPatterns) {
          const match = rawText.match(pattern);
          if (match) {
            data["TOTAL"] = match[1].replace(/[^\d.,]/g, '');
            break;
          }
        }
        
        // Buscar horas extras
        const horasExtrasPatterns = [
          /HORAS\s+EXTRAS?\s*:?\s*(\d+[.,]\d+)/i,
          /H\.?\s*EXTRA\s*:?\s*(\d+[.,]\d+)/i,
          /HORAS\s+EXTRAS?\s+(\d+[.,]\d+)/i
        ];
        for (const pattern of horasExtrasPatterns) {
          const match = rawText.match(pattern);
          if (match) {
            data["HORAS_EXTRAS"] = match[1].replace(/[^\d.,]/g, '');
            break;
          }
        }
        
        // Buscar inasistencias
        const inasistenciasPatterns = [
          /INASISTENCIAS?\s*:?\s*(\d+[.,]\d+)/i,
          /INASISTENCIAS?\s+(\d+[.,]\d+)/i
        ];
        for (const pattern of inasistenciasPatterns) {
          const match = rawText.match(pattern);
          if (match) {
            data["INASISTENCIAS"] = match[1].replace(/[^\d.,]/g, '');
            break;
          }
        }
        
        // Buscar presentismo
        const presentismoMatch = rawText.match(/PRESENTISMO\s*:?\s*(\d+[.,]\d+)/i);
        if (presentismoMatch) {
          data["PRESENTISMO"] = presentismoMatch[1].replace(/[^\d.,]/g, '');
        }
        
        // Buscar antigüedad
        const antiguedadMatch = rawText.match(/ANTIGÜEDAD\s*:?\s*(\d+[.,]\d+)/i);
        if (antiguedadMatch) {
          data["ANTIGUEDAD"] = antiguedadMatch[1].replace(/[^\d.,]/g, '');
        }
        
        // Buscar jornal
        const jornalMatch = rawText.match(/JORNAL\s*:?\s*(\d+[.,]\d+)/i);
        if (jornalMatch) {
          data["JORNAL"] = jornalMatch[1].replace(/[^\d.,]/g, '');
        }
        
        // Buscar adicionales
        const adicionalesMatch = rawText.match(/ADICIONAL\s*:?\s*(\d+[.,]\d+)/i);
        if (adicionalesMatch) {
          data["ADICIONALES"] = adicionalesMatch[1].replace(/[^\d.,]/g, '');
        }
        
        // Debug: mostrar datos detectados
        if (debug) {
          console.log("🎯 ESTRATEGIA AMBIENTAL DETECTADA:");
          console.log("📄 Archivo:", file.name);
          console.log("🆔 CUIL detectado:", data["CUIL"]);
          console.log("👤 Legajo (CUIL):", data["LEGAJO"]);
          console.log("📅 Período detectado:", data["PERIODO"]);
          console.log("👤 Nombre detectado:", data["NOMBRE"]);
          console.log("🏢 Empresa:", data["EMPRESA"]);
          console.log("💰 Sueldo básico:", data["SUELDO_BASICO"]);
          console.log("💰 Presentismo:", data["PRESENTISMO"]);
          console.log("💰 Antigüedad:", data["ANTIGUEDAD"]);
          console.log("💰 Total:", data["TOTAL"]);
          console.log("💰 Descuentos:", data["DESCUENTOS"]);
        }
        
      } else if (file.name.toUpperCase().includes('ESTRATEGIA URBANA') || rawText.toUpperCase().includes('ESTRATEGIA URBANA')) {
        data["EMPRESA"] = "ESTRATEGIA URBANA";
  } else {
    data["EMPRESA"] = "DESCONOCIDA";
  }

  if (debug) {
    console.log("🔍 Parser Genérico - RESUMEN DE EXTRACCIÓN:", {
      archivo: file.name,
      empresa: data["EMPRESA"],
      legajo: data["LEGAJO"] || "NO DETECTADO",
      cuil: data["CUIL"] || "NO DETECTADO", 
      nombre: data["NOMBRE"] || "NO DETECTADO",
      periodo: data["PERIODO"] || "NO DETECTADO",
      guardar: data["GUARDAR"],
      textoCompleto: {
        longitud: rawText.length,
        preview: rawText.substring(0, 300) + "...",
        primerasLineas: primerasLineas.substring(0, 200) + "..."
      },
      patronesProbados: {
        legajoEncontrado: !!data["LEGAJO"],
        cuilEncontrado: !!data["CUIL"],
        nombreEncontrado: !!data["NOMBRE"],
        periodoEncontrado: !!data["PERIODO"],
        empresaEncontrada: data["EMPRESA"] !== "DESCONOCIDA"
      }
    });
    
    // Debug específico si no se detectaron datos básicos
    if (!data["LEGAJO"] || !data["NOMBRE"] || !data["PERIODO"]) {
      console.log("⚠️ Parser Genérico - DATOS FALTANTES:", {
        legajo: data["LEGAJO"] || "❌ FALTANTE",
        nombre: data["NOMBRE"] || "❌ FALTANTE", 
        periodo: data["PERIODO"] || "❌ FALTANTE",
        empresa: data["EMPRESA"] || "❌ FALTANTE",
        textoCompleto: rawText.substring(0, 1000) + "..."
      });
    }
  }

  // Validaciones adicionales
  const validationErrors: string[] = [];
  
  // Validar que el nombre no sea "INGRESO EGRESO"
  if (data["NOMBRE"] === "INGRESO EGRESO") {
    validationErrors.push("Nombre inválido: 'INGRESO EGRESO'");
    data["NOMBRE"] = "NO DETECTADO";
  }
  
  // Validar formato de período (mm/yyyy)
  if (data["PERIODO"]) {
    const periodoMatch = data["PERIODO"].match(/^(\d{2})\/(\d{4})$/);
    if (!periodoMatch) {
      validationErrors.push(`Formato de período inválido: ${data["PERIODO"]} (debe ser mm/yyyy)`);
    } else {
      const mes = parseInt(periodoMatch[1]);
      const año = parseInt(periodoMatch[2]);
      const ahora = new Date();
      const añoActual = ahora.getFullYear();
      const mesActual = ahora.getMonth() + 1; // getMonth() es 0-based
      
      // Validar que el mes esté entre 1 y 12
      if (mes < 1 || mes > 12) {
        validationErrors.push(`Mes inválido: ${mes} (debe estar entre 1 y 12)`);
      }
      
      // Validar que el año no sea mayor al actual
      if (año > añoActual) {
        validationErrors.push(`Año inválido: ${año} (no puede ser mayor al año actual: ${añoActual})`);
      }
      
      // Validar que si es el año actual, el mes no sea mayor al actual
      if (año === añoActual && mes > mesActual) {
        validationErrors.push(`Período inválido: ${data["PERIODO"]} (no puede ser mayor al período actual: ${mesActual.toString().padStart(2, '0')}/${añoActual})`);
      }
    }
  }
  
  // Agregar errores de validación a los datos
  if (validationErrors.length > 0) {
    data["VALIDATION_ERRORS"] = validationErrors.join("; ");
    if (debug) {
      console.log("❌ Parser Genérico - ERRORES DE VALIDACIÓN:", validationErrors);
    }
  }

  const debugLines = allLines.slice(0, 150).map((line) => ({
    y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
    text: line.map((w) => w.str).join(" "),
    tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
  }));

  return { data, debugLines };
}
