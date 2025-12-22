// lib/pdf-parser-sumar.ts
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

// Función para extraer conceptos específicos de SUMAR
function extraerConceptoSUMAR(texto: string, concepto: string): string {
  const conceptRegex = new RegExp(`${concepto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  const conceptMatch = texto.match(conceptRegex);
  
  if (!conceptMatch) return "0.00";
  
  const lines = texto.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (conceptRegex.test(line)) {
      let afterConcept = line.substring(line.search(conceptRegex) + concepto.length);
      
      // Filtrar porcentajes del concepto (ej: "HORAS EXTRAS 100%" -> quitar "100%")
      // Remover porcentajes que aparecen inmediatamente después del concepto
      afterConcept = afterConcept.replace(/^\s*\d+\s*%/, '').trim();
      
      // Buscar valores con formato argentino: 27,640.12 o 27,640
      // Para JORNAL y HORAS_EXTRAS, necesitamos excluir valores pequeños (días/cantidad) y tomar solo valores monetarios grandes
      const isJornalOrHorasExtras = concepto.includes("JORNAL") || concepto.includes("HORAS EXTRAS") || concepto.includes("H.EXTRA");
      
      // Buscar todos los números en la línea después del concepto
      let allNumbers = afterConcept.match(/(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+[.,]\d+|\d+)/g);
      
      if (allNumbers && allNumbers.length > 0) {
        if (isJornalOrHorasExtras) {
          // Para JORNAL y HORAS_EXTRAS, filtrar valores pequeños (días/cantidad) y porcentajes
          // Solo tomar valores monetarios grandes (>= 1000 o con formato monetario)
          const monetaryValues = allNumbers.filter(val => {
            // Verificar si está seguido de %
            const valIndex = afterConcept.indexOf(val);
            const afterVal = afterConcept.substring(valIndex + val.length).trim();
            const isPercentage = /^\s*%/.test(afterVal);
            
            if (isPercentage) return false;
            
            // Normalizar el valor para comparar
            const normalized = val.replace(/[^0-9.]/g, '');
            const numValue = parseFloat(normalized);
            
            // Excluir números pequeños (probablemente días/cantidad) sin formato monetario
            // Si tiene formato monetario (coma o punto como separador de miles) o es >= 1000, es válido
            const hasMonetaryFormat = val.includes(',') || (val.includes('.') && val.split('.').length > 2);
            
            // Para JORNAL y HORAS_EXTRAS, solo aceptar valores >= 1000 o con formato monetario
            // Valores pequeños como 23, 26, 29, 50, 76, 8, 16 son días/cantidad, no monetarios
            if (hasMonetaryFormat || numValue >= 1000) {
              return true;
            }
            
            // Si es un número pequeño sin formato monetario, probablemente es días/cantidad
            return false;
          });
          
          // Si tenemos valores monetarios filtrados, tomar el último (tercera columna monetaria)
          if (monetaryValues.length > 0) {
            // Tomar el último valor monetario (tercera columna)
            return monetaryValues[monetaryValues.length - 1];
          }
          
          // Si no hay valores monetarios válidos, retornar 0.00 en lugar de tomar días/cantidad
          // Esto permitirá que el OCR sobrescriba con el valor correcto
          return "0.00";
        } else {
          // Para otros conceptos, usar la lógica original
          // Filtrar porcentajes
          let argentineValues = allNumbers.filter(val => {
            const valIndex = afterConcept.indexOf(val);
            const afterVal = afterConcept.substring(valIndex + val.length).trim();
            const isPercentage = /^\s*%/.test(afterVal);
            
            const numValue = parseFloat(val.replace(/[^0-9.]/g, ''));
            if (isPercentage || (numValue <= 999 && numValue > 0 && !val.includes('.') && !val.includes(','))) {
              return false;
            }
            return true;
          });
          
          if (argentineValues && argentineValues.length > 0) {
            if (concepto.includes("CUOTA GREMIAL") || concepto.includes("SEG. SEPELIO")) {
              return argentineValues.length > 1 ? argentineValues[1] : argentineValues[0];
            } else if (concepto.includes("5.3.10") || concepto.includes("5310")) {
              return argentineValues.length > 2 ? argentineValues[2] : (argentineValues.length > 1 ? argentineValues[1] : argentineValues[0]);
            } else {
              return argentineValues[0];
            }
          }
        }
      }
      
      // Fallback: buscar en líneas adyacentes
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextValueMatch = nextLine.match(/(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+[.,]\d+|\d+)/);
        if (nextValueMatch) return nextValueMatch[1];
      }
      
      if (i > 0) {
        const prevLine = lines[i - 1];
        const prevValueMatch = prevLine.match(/(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+[.,]\d+|\d+)/);
        if (prevValueMatch) return prevValueMatch[1];
      }
    }
  }
  
  return "0.00";
}

function toDotDecimal(raw: string): string {
  let t = raw.replace(/\s+/g, "");
  
  // Detectar formato argentino: 27,640.12 -> 27640.12
  if (t.includes(",") && t.includes(".")) {
    // La coma es separador de miles, el punto es decimal
    t = t.replace(/,/g, "");
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
  
  // Debug: mostrar el valor procesado
  
  return `${i}.${f}`;
}

// Parser específico para SUMAR
export async function parsePdfReceiptToRecord(file: File, debug: boolean = false): Promise<Parsed> {
  assertClient();

  // Verificar si el archivo tiene metadata de recibo (división por texto)
  const receiptText = (file as any).receiptText;
  const receiptNumber = (file as any).receiptNumber;
  const pageText = (file as any).pageText;
  const pageNumber = (file as any).pageNumber;
  
  let texto;
  let allLines: Word[][] = [];
  let allWords: Word[] = [];
  
  if (receiptText && receiptNumber) {
    // Usar el texto extraído del recibo específico
    texto = receiptText;
    
    
    // Simular estructura de líneas para compatibilidad
    const lines = texto.split('\n');
    allLines = lines.map(line => [{ str: line, x: 0, y: 0 }]);
    allWords = texto.split(' ').map(word => ({ str: word, x: 0, y: 0 }));
  } else if (pageText && pageNumber) {
    // Usar el texto extraído de la página específica (método anterior)
    texto = pageText;
    
    
    // Simular estructura de líneas para compatibilidad
    const lines = texto.split('\n');
    allLines = lines.map(line => [{ str: line, x: 0, y: 0 }]);
    allWords = texto.split(' ').map(word => ({ str: word, x: 0, y: 0 }));
  } else {
    // Usar el parser normal
    // Configurar el worker de PDF.js
    if (typeof window !== 'undefined') {
      GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }
    const ok = await fetch("/pdf.worker.min.mjs", { method: "HEAD" })
      .then((r) => r.ok)
      .catch(() => false);
    if (!ok) throw new Error("No se pudo cargar el worker de PDF (/pdf.worker.min.mjs)");

    const buf = await file.arrayBuffer();

    const params: DocumentInitParameters = { data: buf };
    type LoadingTask = { promise: Promise<PDFDocumentProxy> };
    const loadingTask = getDocument(params) as unknown as LoadingTask;
    const pdf: PDFDocumentProxy = await loadingTask.promise;

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
    
    texto = allWords.map((w) => w.str).join(" ");
  }

  const rawText = texto;
  
  const data: Record<string, string> = { 
    ARCHIVO: file.name, 
    LEGAJO: "-", 
    PERIODO: "-",
    EMPRESA: "SUMAR"
  };

  // Extraer período (buscar patrones como "Período: Mensual 07/2025", "07/2025", etc.)
  // Priorizar "Período: Mensual" sobre otros patrones
  const periodoMensualMatch = rawText.match(/Período:\s*Mensual\s*(\d{1,2})\/(\d{4})/);
  if (periodoMensualMatch) {
    data.PERIODO = `${periodoMensualMatch[1]}/${periodoMensualMatch[2]}`;
  } else {
    // Fallback a otros patrones
    const periodoMatch = rawText.match(/Mensual\s*(\d{1,2})\/(\d{4})|(\d{1,2})\/(\d{4})|(\d{6})/);
    if (periodoMatch) {
      if (periodoMatch[1] && periodoMatch[2]) {
        // Formato "Mensual 07/2025"
        data.PERIODO = `${periodoMatch[1]}/${periodoMatch[2]}`;
      } else if (periodoMatch[3] && periodoMatch[4]) {
        // Formato "07/2025"
        data.PERIODO = `${periodoMatch[3]}/${periodoMatch[4]}`;
      } else if (periodoMatch[5]) {
        // Formato 072025
        const mes = periodoMatch[5].substring(0, 2);
        const año = periodoMatch[5].substring(2);
        data.PERIODO = `${mes}/${año}`;
      }
    }
  }
  

  // Extraer legajo (buscar patrones como "Legajo 00022")
  const legajoMatch = rawText.match(/Legajo\s*(\d+)/i);
  if (legajoMatch) {
    data.LEGAJO = legajoMatch[1];
  } else {
    // Buscar en formato de tabla
    const legajoTablaMatch = rawText.match(/Legajo\s*(\d+)\s*[A-ZÁÉÍÓÚÑ]/i);
    if (legajoTablaMatch) {
      data.LEGAJO = legajoTablaMatch[1];
    }
  }

  // Extraer nombre - buscar el patrón específico de SUMAR
  // Patrón: Legajo 00038 ... DIAZ, LEONEL ORLANDO C.U.I.L.
  const nombreMatch = rawText.match(/Legajo\s*\d+\s*[^A-Z]*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+?)\s*C\.U\.I\.L\./i);
  if (nombreMatch) {
    let nombre = nombreMatch[1].trim();
    
    // Eliminar "MUNICIPAL DE ROSARIO" si está presente
    nombre = nombre.replace(/MUNICIPAL DE ROSARIO\s*/i, "");
    
    // Verificar que no contenga palabras que no deberían estar en un nombre
    if (!nombre.includes("Categoría") && !nombre.includes("Función") && !nombre.includes("Sector") && !nombre.includes("SERV")) {
      data.NOMBRE = nombre;
    }
  }
  
  // Si no se encontró, buscar después de "Apellido y Nombres"
  if (!data.NOMBRE) {
    const apellidoNombresMatch = rawText.match(/Apellido y Nombres\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)/i);
    if (apellidoNombresMatch) {
      data.NOMBRE = apellidoNombresMatch[1].trim();
    }
  }
  

  // Extraer CUIL
  const cuilMatch = rawText.match(/C\.U\.I\.L\.\s*(\d{2}-\d{8}-\d{1})/i);
  if (cuilMatch) {
    data.CUIL = cuilMatch[1];
    data["NRO. DE CUIL"] = cuilMatch[1];
    
    // SUMAR: Usar CUIL como identificador principal para generar claves
    // Normalizar CUIL (solo dígitos) para que coincida con el Excel de control
    const cuilNorm = cuilMatch[1].replace(/[^0-9]/g, "");
    data.CUIL = cuilMatch[1]; // Guardar CUIL original
    data.CUIL_NORM = cuilNorm; // Guardar CUIL normalizado
    // NO sobrescribir LEGAJO - mantener el legajo original para split en cascada
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
        break;
      }
    }
  }

  // Extraer conceptos básicos de SUMAR
  const jornal = extraerConceptoSUMAR(rawText, "JORNAL") || extraerConceptoSUMAR(rawText, "JORNALES");
  const horasExtras = extraerConceptoSUMAR(rawText, "HORAS EXTRAS") || extraerConceptoSUMAR(rawText, "H.EXTRA");
  const antiguedad = extraerConceptoSUMAR(rawText, "ANTIGUEDAD");
  const adicionales = extraerConceptoSUMAR(rawText, "ADICIONALES") || extraerConceptoSUMAR(rawText, "ADICIONAL");
  const inasistencias = extraerConceptoSUMAR(rawText, "INASISTENCIAS") || extraerConceptoSUMAR(rawText, "INASISTENCIA");
  const sueldoBasico = extraerConceptoSUMAR(rawText, "SUELDO BASICO") || extraerConceptoSUMAR(rawText, "SUELDO BÁSICO");
  const sueldoBruto = extraerConceptoSUMAR(rawText, "SUELDO BRUTO");
  const total = extraerConceptoSUMAR(rawText, "TOTAL") || extraerConceptoSUMAR(rawText, "TOTAL A COBRAR");
  const descuentos = extraerConceptoSUMAR(rawText, "DESCUENTOS") || extraerConceptoSUMAR(rawText, "TOTAL DESCUENTOS");

  // Extraer conceptos específicos de SUMAR y mapearlos a códigos estándar
  const cuotaGremial = extraerConceptoSUMAR(rawText, "CUOTA GREMIAL");
  const segSepelio = extraerConceptoSUMAR(rawText, "SEG. SEPELIO");
  const cuotaAport = extraerConceptoSUMAR(rawText, "CUOTA APORT. SOLID. MUT.");
  const resguardoMutuo = extraerConceptoSUMAR(rawText, "RESG. MUTUAL FAM.");
  const descMutual = extraerConceptoSUMAR(rawText, "DESCUENTO MUTUAL");
  const item5310 = extraerConceptoSUMAR(rawText, "CODIGO 5.3.10") || 
                   extraerConceptoSUMAR(rawText, "5.3.10") ||
                   extraerConceptoSUMAR(rawText, "ITEM 5.3.10") ||
                   extraerConceptoSUMAR(rawText, "5310");


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

  // Mapear a códigos estándar (corregido según la especificación)
  data["20540"] = toDotDecimal(cuotaGremial);  // CONTRIBUCION SOLIDARIA (CUOTA GREMIAL)
  data["20590"] = toDotDecimal(segSepelio);    // SEGURO SEPELIO
  data["20595"] = toDotDecimal(cuotaAport);    // CUOTA MUTUAL (CUOTA APORT. SOLID. MUT.)
  data["20610"] = toDotDecimal(resguardoMutuo); // RESGUARDO MUTUAL (RESG. MUTUAL FAM.)
  data["20620"] = toDotDecimal(descMutual);    // DESC. MUTUAL (DESCUENTO MUTUAL)
  data["5310"] = toDotDecimal(item5310);       // ITEM 5.3.10


  // Configurar empresa
  data["EMPRESA"] = "SUMAR";

  const debugLines = allLines.slice(0, 150).map((line) => ({
    y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
    text: line.map((w) => w.str).join(" "),
    tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
  }));

  return { data, debugLines };
}
