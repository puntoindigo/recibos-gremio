// lib/pdf-config.ts
import { GlobalWorkerOptions } from "pdfjs-dist";

// Función centralizada para configurar PDF.js
export function configurePdfWorker(): void {
  if (typeof window !== 'undefined') {
    GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
}

// Función para verificar que el worker esté disponible
export async function verifyPdfWorker(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    const response = await fetch("/pdf.worker.min.mjs", { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}
