// lib/pdf-parser-tysa.ts
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type {
  DocumentInitParameters,
  PDFDocumentProxy,
  PDFPageProxy,
  TextContent,
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

export type Parsed = {
  data: Record<string, string>;
  debugLines: { y: number; text: string; tokens: { str: string; x: number; y: number }[] }[];
};

function assertClient(): void {
  if (typeof window === "undefined") throw new Error("PDF parsing debe ejecutarse en el navegador");
}

type Word = { str: string; x: number; y: number };

// Función para extraer conceptos específicos de TYSA
function extraerConceptoTYSA(texto: string, concepto: string): string {
  const conceptRegex = new RegExp(`${concepto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  const conceptMatch = texto.match(conceptRegex);
  
  if (!conceptMatch) return "0.00";
  
  const lines = texto.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (conceptRegex.test(line)) {
      const afterConcept = line.substring(line.search(conceptRegex) + concepto.length);
      
      // Buscar valores con formato europeo: 46.699,65 o 46.699
      const europeanValues = afterConcept.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+[.,]\d+|\d+)/g);
      
      if (europeanValues && europeanValues.length > 0) {
        // Para JORNAL, tomar el valor monetario, no el porcentaje o cantidad
        if (concepto.includes("JORNAL")) {
          // Buscar el valor monetario más grande (probablemente el correcto)
          const monetaryValues = europeanValues.filter(val => 
            parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.')) > 1000
          );
          return monetaryValues.length > 0 ? monetaryValues[0] : europeanValues[0];
        }
        
        // Para HORAS EXTRAS, evitar capturar el porcentaje (100%)
        if (concepto.includes("HORAS EXTRAS")) {
          // Buscar valores que no sean exactamente "100" o porcentajes
          const nonPercentageValues = europeanValues.filter(val => 
            val !== "100" && !val.includes("%") && 
            parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.')) > 100
          );
          return nonPercentageValues.length > 0 ? nonPercentageValues[0] : europeanValues[0];
        }
        
        return europeanValues[0];
      }
      
      // Fallback: buscar en líneas adyacentes
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextValueMatch = nextLine.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+[.,]\d+|\d+)/);
        if (nextValueMatch) return nextValueMatch[1];
      }
      
      if (i > 0) {
        const prevLine = lines[i - 1];
        const prevValueMatch = prevLine.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+[.,]\d+|\d+)/);
        if (prevValueMatch) return prevValueMatch[1];
      }
    }
  }
  
  return "0.00";
}

function toDotDecimal(raw: string): string {
  let t = raw.replace(/\s+/g, "");
  
  // Detectar formato europeo: 77.390,06 -> 77390.06
  if (t.includes(".") && t.includes(",")) {
    // El punto es separador de miles, la coma es decimal
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (t.includes(",") && !t.includes(".")) {
    // Solo coma: puede ser decimal (27.640,12 -> 27640.12) o miles (27,640 -> 27640)
    const lastComma = t.lastIndexOf(",");
    const beforeComma = t.substring(0, lastComma);
    const afterComma = t.substring(lastComma + 1);
    
    // Si después de la coma hay 1-3 dígitos, probablemente es decimal
    if (afterComma.length >= 1 && afterComma.length <= 3 && /^\d+$/.test(afterComma)) {
      t = beforeComma.replace(/\./g, "") + "." + afterComma;
    } else {
      // Si no, la coma es separador de miles
      t = t.replace(/,/g, "");
    }
  }
  
  t = t.replace(/[^0-9.-]/g, "");
  if (!t.includes(".")) return `${t}.00`;
  const [i, f = ""] = t.split(".");
  
  return `${i}.${f}`;
}

// Parser específico para TYSA
export async function parsePdfReceiptToRecord(file: File, debug: boolean = false): Promise<Parsed> {
  try {
    assertClient();

  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const ok = await fetch("/pdf.worker.min.mjs", { method: "HEAD" })
    .then((r) => r.ok)
    .catch(() => false);
  if (!ok) throw new Error("No se pudo cargar el worker de PDF (/pdf.worker.min.mjs)");

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
    LEGAJO: "-", 
    PERIODO: "-",
    EMPRESA: "TYSA"
  };

  // Extraer período - buscar patrones más flexibles para TYSA
  // 1. Buscar "Periodo de Pago" específicamente
  const periodoPagoMatch = rawText.match(/Periodo de Pago:\s*(\d{1,2})\/(\d{4})/i);
  if (periodoPagoMatch) {
    data.PERIODO = `${periodoPagoMatch[1]}/${periodoPagoMatch[2]}`;
  } else {
    // 2. Buscar en el nombre del archivo: TYSA 072025 - CCT - SUELDOS-8-1.pdf
    const archivoMatch = rawText.match(/TYSA\s*(\d{2})(\d{4})/i);
    if (archivoMatch) {
      data.PERIODO = `${archivoMatch[1]}/${archivoMatch[2]}`;
    } else {
      // 3. Buscar patrones de fecha más flexibles
      const periodoMatch = rawText.match(/(\d{1,2})\/(\d{4})/g);
      if (periodoMatch) {
        // Tomar el primer match que parezca un período válido
        for (const match of periodoMatch) {
          const parts = match.split('/');
          const mes = parseInt(parts[0]);
          const año = parseInt(parts[1]);
          if (mes >= 1 && mes <= 12 && año >= 2020 && año <= 2030) {
            data.PERIODO = match;
            break;
          }
        }
      }
      
      // 4. Si no se encontró, buscar formato 072025
      if (data.PERIODO === "-") {
        const formatoMatch = rawText.match(/(\d{2})(\d{4})/);
        if (formatoMatch) {
          const mes = parseInt(formatoMatch[1]);
          const año = parseInt(formatoMatch[2]);
          if (mes >= 1 && mes <= 12 && año >= 2020 && año <= 2030) {
            data.PERIODO = `${formatoMatch[1]}/${formatoMatch[2]}`;
          }
        }
      }
    }
  }
  


  // Extraer legajo - para TYSA, el legajo está después del CUIL y es un número < 100
  const cuilLegajoMatch = rawText.match(/(\d{2}-\d{8}-\d{1})\s*(\d{1,2})/);
  if (cuilLegajoMatch) {
    data.CUIL = cuilLegajoMatch[1];
    data["NRO. DE CUIL"] = cuilLegajoMatch[1];
    data.LEGAJO = cuilLegajoMatch[2];
  } else {
    // Buscar patrón específico de TYSA: "Periodo de Pago" seguido de números repetidos
    const periodoLegajoMatch = rawText.match(/Periodo de Pago\s*(\d{1,2})\s*\1/);
    if (periodoLegajoMatch) {
      data.LEGAJO = periodoLegajoMatch[1];
    } else {
      // Buscar números repetidos cerca de "Periodo de Pago"
      const legajoRepetidoMatch = rawText.match(/Periodo de Pago[^0-9]*(\d{1,2})\s+\1/);
      if (legajoRepetidoMatch) {
        data.LEGAJO = legajoRepetidoMatch[1];
      } else {
        // Fallback: buscar "Legajo:" específicamente para TYSA
        const legajoMatch = rawText.match(/Legajo:\s*(\d{1,2})/i);
        if (legajoMatch) {
          data.LEGAJO = legajoMatch[1];
        } else {
          // Buscar "Legajo" seguido de números pequeños (1-2 dígitos)
          const legajoEspecificoMatch = rawText.match(/Legajo[:\s]*(\d{1,2})/i);
          if (legajoEspecificoMatch) {
            data.LEGAJO = legajoEspecificoMatch[1];
          } else {
            // Buscar en formato de tabla
            const legajoTablaMatch = rawText.match(/Legajo\s*(\d{1,2})\s*[A-ZÁÉÍÓÚÑ]/i);
            if (legajoTablaMatch) {
              data.LEGAJO = legajoTablaMatch[1];
            }
          }
        }
      }
    }
  }

  // Extraer nombre - para TYSA, el nombre no empieza con "Legajo" pero está después
  // Buscar "Apellidos y Nombres" específicamente para TYSA
  const apellidosNombresMatch = rawText.match(/Apellidos y Nombres:\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)/i);
  if (apellidosNombresMatch) {
    let nombre = apellidosNombresMatch[1].trim();
    // Eliminar "Cuil" si está presente
    nombre = nombre.replace(/Cuil\s*/i, "");
    // Eliminar "Legajo" si está presente
    nombre = nombre.replace(/Legajo\s*/i, "");
    data.NOMBRE = nombre;
  } else {
    // Buscar "Apellidos y Nombres" sin dos puntos
    const apellidosNombresSimpleMatch = rawText.match(/Apellidos y Nombres\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)/i);
    if (apellidosNombresSimpleMatch) {
      let nombre = apellidosNombresSimpleMatch[1].trim();
      // Eliminar "Cuil" si está presente
      nombre = nombre.replace(/Cuil\s*/i, "");
      // Eliminar "Legajo" si está presente
      nombre = nombre.replace(/Legajo\s*/i, "");
      data.NOMBRE = nombre;
    } else {
      // Fallback: buscar después de "Apellido y Nombres"
      const nombreMatch = rawText.match(/Apellido y Nombres\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)/i);
      if (nombreMatch) {
        let nombre = nombreMatch[1].trim();
        // Eliminar "Cuil" si está presente
        nombre = nombre.replace(/Cuil\s*/i, "");
        // Eliminar "Legajo" si está presente
        nombre = nombre.replace(/Legajo\s*/i, "");
        data.NOMBRE = nombre;
      } else {
        // Buscar en formato de tabla con legajo (para TYSA, el nombre está después del legajo)
        const legajoNombreMatch = rawText.match(/Legajo\s*(\d{1,2})\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+?)(?=\s+C\.U\.I\.L\.|$)/i);
        if (legajoNombreMatch) {
          let nombre = legajoNombreMatch[2].trim();
          // Eliminar "Cuil" si está presente
          nombre = nombre.replace(/Cuil\s*/i, "");
          // Eliminar "Legajo" si está presente
          nombre = nombre.replace(/Legajo\s*/i, "");
          data.NOMBRE = nombre;
        }
      }
    }
  }
  


  // Extraer CUIL si no se extrajo antes
  if (!data.CUIL) {
    const cuilMatch = rawText.match(/C\.U\.I\.L\.\s*(\d{2}-\d{8}-\d{1})/i);
    if (cuilMatch) {
      data.CUIL = cuilMatch[1];
      data["NRO. DE CUIL"] = cuilMatch[1];
    }
  }

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
      const categoria = categoriaMatch[1].trim();
      if (categoria && categoria.length > 0 && !categoria.match(/^[\s\-]+$/)) {
        data["CATEGORIA"] = categoria;
        if (debug) console.log("🔍 Debug TYSA - Categoría detectada:", categoria);
        break;
      }
    }
  }

  // Extraer conceptos básicos de TYSA
  const jornal = extraerConceptoTYSA(rawText, "Sueldo/Jornal") || 
                 extraerConceptoTYSA(rawText, "JORNAL") || 
                 extraerConceptoTYSA(rawText, "JORNALES");
  const horasExtras = extraerConceptoTYSA(rawText, "Horas Extras 100%") || 
                      extraerConceptoTYSA(rawText, "HORAS EXTRAS") || 
                      extraerConceptoTYSA(rawText, "H.EXTRA");
  const antiguedad = extraerConceptoTYSA(rawText, "Adicional Antiguedad") || 
                     extraerConceptoTYSA(rawText, "ANTIGUEDAD");
  const adicionales = extraerConceptoTYSA(rawText, "Adicional 18 %") || 
                      extraerConceptoTYSA(rawText, "ADICIONALES") || 
                      extraerConceptoTYSA(rawText, "ADICIONAL");
  const inasistencias = extraerConceptoTYSA(rawText, "INASISTENCIAS") || extraerConceptoTYSA(rawText, "INASISTENCIA");
  const sueldoBasico = extraerConceptoTYSA(rawText, "SUELDO BASICO") || extraerConceptoTYSA(rawText, "SUELDO BÁSICO");
  const sueldoBruto = extraerConceptoTYSA(rawText, "SUELDO BRUTO");
  const total = extraerConceptoTYSA(rawText, "TOTAL") || extraerConceptoTYSA(rawText, "TOTAL A COBRAR");
  const descuentos = extraerConceptoTYSA(rawText, "DESCUENTOS") || extraerConceptoTYSA(rawText, "TOTAL DESCUENTOS");

  // Extraer conceptos específicos de TYSA (similar a LIME pero adaptado)
  const contribSolidaria = extraerConceptoTYSA(rawText, "Contrib.Solidaria");
  const gastosSepelio = extraerConceptoTYSA(rawText, "Gastos de sepelio");
  const cuotaMutual = extraerConceptoTYSA(rawText, "Cuota Mutual Ap.Solidar.");
  const resguardoMutuo = extraerConceptoTYSA(rawText, "Resguardo Mutuo");
  const descMutual = extraerConceptoTYSA(rawText, "Mutual 16 de Abril");
  const item5310 = extraerConceptoTYSA(rawText, "ITEM 5.3.10") || 
                   extraerConceptoTYSA(rawText, "5.3.10");



  // Mapear conceptos básicos
  data["JORNAL"] = toDotDecimal(jornal);
  data["HORAS_EXTRAS"] = toDotDecimal(horasExtras);
  data["ANTIGUEDAD"] = toDotDecimal(antiguedad);
  data["ADICIONALES"] = toDotDecimal(adicionales);
  data["INASISTENCIAS"] = toDotDecimal(inasistencias);
  data["SUELDO_BASICO"] = toDotDecimal(sueldoBasico);
  data["SUELDO_BRUTO"] = toDotDecimal(sueldoBruto);
  data["TOTAL"] = toDotDecimal(total);
  data["DESCUENTOS"] = toDotDecimal(descuentos);

  // Mapear a códigos estándar (usando los mismos que LIME)
  data["20540"] = toDotDecimal(contribSolidaria); // CONTRIBUCION SOLIDARIA
  data["20590"] = toDotDecimal(gastosSepelio);    // SEGURO SEPELIO
  data["20595"] = toDotDecimal(cuotaMutual);      // CUOTA MUTUAL
  data["20610"] = toDotDecimal(resguardoMutuo);   // RESGUARDO MUTUAL
  data["20620"] = toDotDecimal(descMutual);       // DESC. MUTUAL
  data["5310"] = toDotDecimal(item5310);          // ITEM 5.3.10



  // Configurar empresa
  data["EMPRESA"] = "TYSA";

  const debugLines = allLines.slice(0, 150).map((line) => ({
    y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
    text: line.map((w) => w.str).join(" "),
    tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
  }));

  return { data, debugLines };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido en parser TYSA';
    
    // Retornar un resultado genérico con error
    return {
      data: {
        ARCHIVO: file.name,
        "TEXTO_COMPLETO": "",
        "EMPRESA_DETECTADA": "TYSA_ERROR",
        "ERROR": errorMessage,
        "GUARDAR": "false"
      },
      debugLines: []
    };
  }
}
