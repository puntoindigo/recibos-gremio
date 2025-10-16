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

  // Extraer datos básicos usando expresiones regulares
  const legajoMatch = rawText.match(/(?:legajo|leg\.?)\s*:?\s*(\d+)/i);
  if (legajoMatch) {
    data["LEGAJO"] = legajoMatch[1];
  }

  const cuilMatch = rawText.match(/(?:cuil|dni)\s*:?\s*(\d{2,3}-?\d{6,8}-?\d{1,2})/i);
  if (cuilMatch) {
    data["CUIL"] = cuilMatch[1].replace(/-/g, '');
  }

  // Buscar nombre (generalmente después de "nombre" o "apellido")
  const nombreMatch = rawText.match(/(?:nombre|apellido)\s*:?\s*([A-ZÁÉÍÓÚÑ\s,]+)/i);
  if (nombreMatch) {
    data["NOMBRE"] = nombreMatch[1].trim();
  }

  // Buscar período (formato mm/yyyy o mm-yyyy)
  const periodoMatch = rawText.match(/(\d{1,2})[\/\-](\d{4})/);
  if (periodoMatch) {
    const mes = periodoMatch[1].padStart(2, '0');
    const año = periodoMatch[2];
    data["PERIODO"] = `${mes}/${año}`;
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
        data["PERIODO"] = `${mes}/${año}`;
      } else {
        // TERCERO: Buscar patrones como "092025" (solo si no hay separador)
        const archivoPeriodoMatch2 = file.name.match(/(\d{1,2})(\d{4})/);
        if (archivoPeriodoMatch2) {
          const mes = archivoPeriodoMatch2[1].padStart(2, '0');
          const año = archivoPeriodoMatch2[2];
          // Validar que el mes sea válido (1-12) y el año sea razonable (2020-2030)
          if (parseInt(mes) >= 1 && parseInt(mes) <= 12 && parseInt(año) >= 2020 && parseInt(año) <= 2030) {
            data["PERIODO"] = `${mes}/${año}`;
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

  // Detectar empresa basada en el nombre del archivo o contenido
  if (file.name.toUpperCase().includes('LIME') || rawText.toUpperCase().includes('LIME')) {
    data["EMPRESA"] = "LIME";
  } else if (file.name.toUpperCase().includes('LIMPAR') || rawText.toUpperCase().includes('LIMPAR')) {
    data["EMPRESA"] = "LIMPAR";
  } else if (file.name.toUpperCase().includes('SUMAR') || rawText.toUpperCase().includes('SUMAR')) {
    data["EMPRESA"] = "SUMAR";
  } else if (file.name.toUpperCase().includes('TYSA') || rawText.toUpperCase().includes('TYSA')) {
    data["EMPRESA"] = "TYSA";
  } else if (file.name.toUpperCase().includes('ESTRATEGIA AMBIENTAL') || rawText.toUpperCase().includes('ESTRATEGIA AMBIENTAL')) {
    data["EMPRESA"] = "ESTRATEGIA AMBIENTAL";
  } else if (file.name.toUpperCase().includes('ESTRATEGIA URBANA') || rawText.toUpperCase().includes('ESTRATEGIA URBANA')) {
    data["EMPRESA"] = "ESTRATEGIA URBANA";
  } else {
    data["EMPRESA"] = "DESCONOCIDA";
  }

  if (debug) {
    console.log("🔍 Parser Genérico - Datos extraídos:", {
      legajo: data["LEGAJO"],
      cuil: data["CUIL"],
      nombre: data["NOMBRE"],
      periodo: data["PERIODO"],
      empresa: data["EMPRESA"],
      guardar: data["GUARDAR"],
      rawTextLength: rawText.length,
      rawTextPreview: rawText.substring(0, 500),
      primerasLineas: primerasLineas.substring(0, 500),
      fileName: file.name,
      fileNameUpper: file.name.toUpperCase(),
      contieneSETIEMBRE: file.name.toUpperCase().includes('SETIEMBRE'),
      contiene2025: file.name.includes('2025')
    });
  }

  const debugLines = allLines.slice(0, 150).map((line) => ({
    y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
    text: line.map((w) => w.str).join(" "),
    tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
  }));

  return { data, debugLines };
}
