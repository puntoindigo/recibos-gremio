// lib/pdf-parser-lime.ts
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

// Función para extraer conceptos específicos de LIME
function extraerConceptoLIME(texto: string, concepto: string): string {
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
  
  // Debug: mostrar el valor original
  console.log("🔍 toDotDecimal LIME - Valor original:", raw);
  
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
  
  // Debug: mostrar el valor procesado
  console.log("🔍 toDotDecimal LIME - Valor procesado:", `${i}.${f}`);
  
  return `${i}.${f}`;
}

// Parser específico para LIME
export async function parsePdfReceiptToRecord(file: File, debug: boolean = false): Promise<Parsed> {
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
  
  // Debug: mostrar las primeras líneas para ver qué se está capturando
  if (debug) console.log("🔍 Debug LIME - Primeras líneas:", rawText.substring(0, 1000));
  
  // Debug: buscar patrones específicos
  if (debug) console.log("🔍 Debug LIME - Buscando 'Periodo de Pago':", rawText.includes("Periodo de Pago"));
  if (debug) console.log("🔍 Debug LIME - Buscando 'Legajo':", rawText.includes("Legajo"));
  if (debug) console.log("🔍 Debug LIME - Buscando 'Apellidos y Nombres':", rawText.includes("Apellidos y Nombres"));
  
  // Debug: mostrar todas las coincidencias de período
  const periodoMatches = rawText.match(/(\d{1,2})\/(\d{4})/g);
  if (debug) console.log("🔍 Debug LIME - Todas las coincidencias de período:", periodoMatches);
  
  // Debug: mostrar todas las coincidencias de legajo
  const legajoMatches = rawText.match(/Legajo[:\s]*(\d+)/gi);
  if (debug) console.log("🔍 Debug LIME - Todas las coincidencias de legajo:", legajoMatches);
  
  const data: Record<string, string> = { 
    ARCHIVO: file.name, 
    LEGAJO: "-", 
    PERIODO: "-",
    EMPRESA: "LIME"
  };

  // Extraer período - buscar "Periodo de Pago" específicamente para LIME
  const periodoPagoMatch = rawText.match(/Periodo de Pago:\s*(\d{1,2})\/(\d{4})/i);
  if (periodoPagoMatch) {
    data.PERIODO = `${periodoPagoMatch[1]}/${periodoPagoMatch[2]}`;
  } else {
    // Buscar en el nombre del archivo: LIME 072025 - CCT - SUELDOS-8-1.pdf
    const archivoMatch = rawText.match(/LIME\s*(\d{2})(\d{4})/i);
    if (archivoMatch) {
      data.PERIODO = `${archivoMatch[1]}/${archivoMatch[2]}`;
    } else {
      // Buscar "07/2025" específicamente (evitar falsos positivos como "80/5940")
      const periodoEspecificoMatch = rawText.match(/(?:^|\s)(07)\/(2025)(?:\s|$)/);
      if (periodoEspecificoMatch) {
        data.PERIODO = `${periodoEspecificoMatch[1]}/${periodoEspecificoMatch[2]}`;
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
    }
  }
  
  // Debug: mostrar qué período se detectó
  if (debug) console.log("🔍 Debug LIME - Período detectado:", data.PERIODO);

  // Extraer legajo - buscar "Legajo:" específicamente para LIME
  const legajoMatch = rawText.match(/Legajo:\s*(\d+)/i);
  if (legajoMatch) {
    data.LEGAJO = legajoMatch[1];
  } else {
    // Buscar "Legajo" seguido de números (más específico)
    const legajoEspecificoMatch = rawText.match(/Legajo[:\s]*(\d{6})/i);
    if (legajoEspecificoMatch) {
      data.LEGAJO = legajoEspecificoMatch[1];
    } else {
      // Fallback: buscar patrones como "Legajo 00022"
      const legajoSimpleMatch = rawText.match(/Legajo\s*(\d+)/i);
      if (legajoSimpleMatch) {
        data.LEGAJO = legajoSimpleMatch[1];
      } else {
        // Buscar en formato de tabla
        const legajoTablaMatch = rawText.match(/Legajo\s*(\d+)\s*[A-ZÁÉÍÓÚÑ]/i);
        if (legajoTablaMatch) {
          data.LEGAJO = legajoTablaMatch[1];
        }
      }
    }
  }
  
  // Debug: mostrar qué legajo se detectó
  if (debug) console.log("🔍 Debug LIME - Legajo detectado:", data.LEGAJO);

  // Extraer nombre - buscar "Apellidos y Nombres" específicamente para LIME
  const apellidosNombresMatch = rawText.match(/Apellidos y Nombres:\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)/i);
  if (apellidosNombresMatch) {
    let nombre = apellidosNombresMatch[1].trim();
    // Eliminar "Cuil" si está presente
    nombre = nombre.replace(/Cuil\s*/i, "");
    data.NOMBRE = nombre;
  } else {
    // Buscar "Apellidos y Nombres" sin dos puntos
    const apellidosNombresSimpleMatch = rawText.match(/Apellidos y Nombres\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)/i);
    if (apellidosNombresSimpleMatch) {
      let nombre = apellidosNombresSimpleMatch[1].trim();
      // Eliminar "Cuil" si está presente
      nombre = nombre.replace(/Cuil\s*/i, "");
      data.NOMBRE = nombre;
    } else {
      // Fallback: buscar después de "Apellido y Nombres"
      const nombreMatch = rawText.match(/Apellido y Nombres\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)/i);
      if (nombreMatch) {
        let nombre = nombreMatch[1].trim();
        // Eliminar "Cuil" si está presente
        nombre = nombre.replace(/Cuil\s*/i, "");
        data.NOMBRE = nombre;
      } else {
        // Buscar en formato de tabla con legajo
        const legajoNombreMatch = rawText.match(/Legajo\s*(\d+)\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+?)(?=\s+C\.U\.I\.L\.|$)/i);
        if (legajoNombreMatch) {
          let nombre = legajoNombreMatch[2].trim();
          // Eliminar "Cuil" si está presente
          nombre = nombre.replace(/Cuil\s*/i, "");
          data.NOMBRE = nombre;
        }
      }
    }
  }
  
  // Debug: mostrar qué nombre se detectó
  if (debug) console.log("🔍 Debug LIME - Nombre detectado:", data.NOMBRE);

  // Extraer CUIL
  const cuilMatch = rawText.match(/C\.U\.I\.L\.\s*(\d{2}-\d{8}-\d{1})/i);
  if (cuilMatch) {
    data.CUIL = cuilMatch[1];
    data["NRO. DE CUIL"] = cuilMatch[1];
  }

  // Extraer conceptos específicos de LIME y mapearlos a códigos estándar
  const contribSolidaria = extraerConceptoLIME(rawText, "Contrib.Solidaria");
  const gastosSepelio = extraerConceptoLIME(rawText, "Gastos de sepelio");
  const cuotaMutual = extraerConceptoLIME(rawText, "Cuota Mutual Ap.Solidar.");
  const resguardoMutuo = extraerConceptoLIME(rawText, "Resguardo Mutuo");
  const descMutual = extraerConceptoLIME(rawText, "Mutual 16 de Abril");

  // Debug: mostrar los valores extraídos antes de toDotDecimal
  if (debug) console.log("🔍 Debug LIME - Valores extraídos:", {
    contribSolidaria,
    gastosSepelio,
    cuotaMutual,
    resguardoMutuo,
    descMutual
  });

  // Mapear a códigos estándar (usando los mismos que LIMPAR)
  data["20540"] = toDotDecimal(contribSolidaria); // CONTRIBUCION SOLIDARIA
  data["20590"] = toDotDecimal(gastosSepelio);    // SEGURO SEPELIO
  data["20595"] = toDotDecimal(cuotaMutual);      // CUOTA MUTUAL
  data["20610"] = toDotDecimal(resguardoMutuo);   // RESGUARDO MUTUAL
  data["20620"] = toDotDecimal(descMutual);       // DESC. MUTUAL

  // Debug: mostrar los valores después de toDotDecimal
  if (debug) console.log("🔍 Debug LIME - Valores finales:", {
    "20540": data["20540"],
    "20590": data["20590"],
    "20595": data["20595"],
    "20610": data["20610"],
    "20620": data["20620"]
  });

  const debugLines = allLines.slice(0, 150).map((line) => ({
    y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
    text: line.map((w) => w.str).join(" "),
    tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
  }));

  return { data, debugLines };
}
