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
      const afterConcept = line.substring(line.search(conceptRegex) + concepto.length);
      
      // Buscar valores con formato argentino: 27,640.12 o 27,640
      const argentineValues = afterConcept.match(/(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+[.,]\d+|\d+)/g);
      
      if (argentineValues && argentineValues.length > 0) {
        // Para CUOTA GREMIAL y SEG. SEPELIO, tomar el segundo valor
        // Para CUOTA APORT., tomar el primer valor
        if (concepto.includes("CUOTA GREMIAL") || concepto.includes("SEG. SEPELIO")) {
          return argentineValues.length > 1 ? argentineValues[1] : argentineValues[0];
        } else {
          return argentineValues[0];
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
  
  // Debug: mostrar el valor original
  console.log("🔍 toDotDecimal - Valor original:", raw);
  
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
  console.log("🔍 toDotDecimal - Valor procesado:", `${i}.${f}`);
  
  return `${i}.${f}`;
}

// Parser específico para SUMAR
export async function parsePdfReceiptToRecord(file: File): Promise<Parsed> {
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
  console.log("🔍 Debug SUMAR - Primeras líneas:", rawText.substring(0, 500));
  
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
  
  // Debug: mostrar qué período se detectó
  console.log("🔍 Debug SUMAR - Período detectado:", data.PERIODO);

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
  
  // Debug: mostrar qué nombre se detectó
  console.log("🔍 Debug SUMAR - Nombre detectado:", data.NOMBRE);

  // Extraer CUIL
  const cuilMatch = rawText.match(/C\.U\.I\.L\.\s*(\d{2}-\d{8}-\d{1})/i);
  if (cuilMatch) {
    data.CUIL = cuilMatch[1];
    data["NRO. DE CUIL"] = cuilMatch[1];
  }

  // Extraer conceptos específicos de SUMAR y mapearlos a códigos estándar
  const cuotaGremial = extraerConceptoSUMAR(rawText, "CUOTA GREMIAL");
  const segSepelio = extraerConceptoSUMAR(rawText, "SEG. SEPELIO");
  const cuotaAport = extraerConceptoSUMAR(rawText, "CUOTA APORT. SOLID. MUT.");
  const resguardoMutuo = extraerConceptoSUMAR(rawText, "RESG. MUTUAL FAM.");
  const descMutual = extraerConceptoSUMAR(rawText, "DESCUENTO MUTUAL");

  // Debug: mostrar los valores extraídos antes de toDotDecimal
  console.log("🔍 Debug SUMAR - Valores extraídos:", {
    cuotaGremial,
    segSepelio,
    cuotaAport,
    resguardoMutuo,
    descMutual
  });

  // Mapear a códigos estándar (corregido según la especificación)
  data["20540"] = toDotDecimal(cuotaGremial);  // CONTRIBUCION SOLIDARIA (CUOTA GREMIAL)
  data["20590"] = toDotDecimal(segSepelio);    // SEGURO SEPELIO
  data["20595"] = toDotDecimal(cuotaAport);    // CUOTA MUTUAL (CUOTA APORT. SOLID. MUT.)
  data["20610"] = toDotDecimal(resguardoMutuo); // RESGUARDO MUTUAL (RESG. MUTUAL FAM.)
  data["20620"] = toDotDecimal(descMutual);    // DESC. MUTUAL (DESCUENTO MUTUAL)

  // Debug: mostrar los valores después de toDotDecimal
  console.log("🔍 Debug SUMAR - Valores finales:", {
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
