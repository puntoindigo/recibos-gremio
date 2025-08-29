// lib/pdf-parser-generic.ts
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

// Parser genérico que solo extrae texto básico para detectar empresas
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
    "EMPRESA_DETECTADA": "DESCONOCIDA"
  };

  // Extraer las primeras líneas para análisis
  const primerasLineas = allLines.slice(0, 20).map(line => 
    line.map(w => w.str).join(" ")
  ).join(" | ");

  data["PRIMERAS_LINEAS"] = primerasLineas;

  const debugLines = allLines.slice(0, 150).map((line) => ({
    y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
    text: line.map((w) => w.str).join(" "),
    tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
  }));

  return { data, debugLines };
}
