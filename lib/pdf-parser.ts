// lib/pdf-parser.ts
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

// --- regex y helpers (tuyos) ---
const MMYYYY_ALL = /([01]?\d\/\d{4})/g;
const MMYYYY_ONE = /([01]?\d\/\d{4})/;
const LEG_LABEL = /(?:LEGAJO|Legajo)\b/;
const PER_LABEL = /Per[ií]odo|PER[iÍ]ODO|PER\.|abonado/i;
const NUM_TOKEN =
  /\b-?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+[.,]\d+|\d+)\b/g;

// --- NUEVO: patrones solo para CUIL/NOMBRE (no tocan legajo/periodo) ---
const CUIL_FLEX = /\b\d{2}\D*\d{8}\D*\d\b/g; // 20-20393926-5 / 20 20393926 5 / 20203939265
const CUIL_LABELS = /(CUIL|CUIT|NRO\.?\s*DE\s*CUIL|N\.?°\s*CUIL|N°\s*CUIL|CUIT\/CUIL)/i;
const PERSON_PREFIX = /^(20|23|24|27)/; // prefijos típicos persona
const NAME_COMMA =
  /\b[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]+(?: [A-ZÁÉÍÓÚÑ]+)*\s*,\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]+(?: [A-ZÁÉÍÓÚÑ]+)*\b/;
const UPPER_NAME_BLOCK = /\b[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,6}\b/;

type Word = { str: string; x: number; y: number };

function toDotDecimal(raw: string): string {
  let t = raw.replace(/\s+/g, "");
  const lastDot = t.lastIndexOf(".");
  const lastComma = t.lastIndexOf(",");
  const decimalIsComma = lastComma > lastDot;
  t = decimalIsComma ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  t = t.replace(/[^0-9.-]/g, "");
  if (!t.includes(".")) return `${t}.00`;
  const [i, f = ""] = t.split(".");
  return `${i}.${(f + "00").slice(0, 2)}`;
}

function parseMmYyyyToDate(s: string): Date | null {
  const m = s.match(/^([01]?\d)\/(\d{4})$/);
  if (!m) return null;
  const mm = parseInt(m[1], 10) - 1;
  const yy = parseInt(m[2], 10);
  if (mm < 0 || mm > 11) return null;
  return new Date(yy, mm, 1);
}
function pickMostRecent(list: string[]): string | null {
  let best: { d: Date; s: string } | null = null;
  for (const s of list) {
    const d = parseMmYyyyToDate(s);
    if (!d) continue;
    if (!best || d > best.d) best = { d, s };
  }
  return best?.s ?? null;
}

function formatCuil(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : s;
}
function normalizeName(s: string): string {
  return s.trim().replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ");
}

// --- parser principal (PERIODO y LEGAJO: sin tocar) ---
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

      // agrupar por línea (misma Y promedio) — igual que el tuyo
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
  const data: Record<string, string> = { ARCHIVO: file.name, LEGAJO: "-", PERIODO: "-" };

  // ---------- PERIODO (sin cambios) ----------
  let per: string | null = null;
  let legLine = -1;
  for (let li = 0; li < allLines.length; li++) {
    const joined = allLines[li].map((w) => w.str).join(" ");
    if (LEG_LABEL.test(joined)) {
      legLine = li;
      break;
    }
  }
  if (legLine > 0) {
    for (let k = 1; k <= 3 && legLine - k >= 0; k++) {
      const up = allLines[legLine - k].map((w) => w.str).join(" ");
      const m = up.match(MMYYYY_ONE);
      if (m) {
        per = m[1];
        break;
      }
    }
  }
  if (!per) {
    const near: string[] = [];
    for (let li = 0; li < allLines.length; li++) {
      const joined = allLines[li].map((w) => w.str).join(" ");
      if (!PER_LABEL.test(joined)) continue;
      const pack = [allLines[li], allLines[li + 1], allLines[li + 2]].filter(Boolean) as Word[][];
      for (const l of pack) {
        const jt = l.map((w) => w.str).join(" ");
        for (const m of jt.matchAll(MMYYYY_ALL)) near.push(m[1]);
      }
    }
    per =
      pickMostRecent(near) ??
      pickMostRecent([...rawText.matchAll(MMYYYY_ALL)].map((m) => m[1]));
  }
  if (per) data.PERIODO = per;

  // ---------- LEGAJO (sin cambios) ----------
  if (legLine >= 0) {
    const searchLines = [
      allLines[legLine],
      allLines[legLine + 1],
      allLines[legLine + 2],
      allLines[legLine + 3],
      allLines[legLine + 4],
    ].filter(Boolean) as Word[][];
    for (const l of searchLines) {
      for (const w of l) {
        const digits = w.str.replace(/\D+/g, "");
        if (digits && digits.length >= 3 && digits.length <= 10 && !w.str.includes("-")) {
          data.LEGAJO = digits;
          break;
        }
      }
      if (data.LEGAJO !== "-") break;
    }
  }

  // ---------- CÓDIGOS 20xxx (sin cambios) ----------
  for (const line of allLines) {
    const numTokens: { x: number; raw: string }[] = [];
    for (const w of line) {
      const ms = w.str.match(NUM_TOKEN);
      if (!ms) continue;
      for (const t of ms) numTokens.push({ x: w.x, raw: t });
    }
    numTokens.sort((a, b) => a.x - b.x);

    const codesSet = new Set<string>();
    for (const w of line) {
      const compactDigits = w.str.replace(/\s+/g, "").replace(/\D/g, "");
      if (compactDigits.length === 5 && compactDigits.startsWith("20")) codesSet.add(compactDigits);
    }
    const joined = line.map((w) => w.str).join(" ");
    (joined.replace(/[^\d]/g, " ").match(/\b20\d{3}\b/g) ?? []).forEach((c) => codesSet.add(c));
    const codes = [...codesSet];
    if (!codes.length) continue;

    const hasDecimals = (s: string): boolean => /[.,]\d{1,}$/.test(s);

    for (const code of codes) {
      if (!numTokens.length) {
        data[code] = "-";
        continue;
      }
      const decimalTokens = numTokens.filter((t) => hasDecimals(t.raw));
      const decimalBig = decimalTokens
        .filter((t) => {
          const clean = t.raw.replace(/[^\d.,]/g, "");
          const lastDot = clean.lastIndexOf(".");
          const lastComma = clean.lastIndexOf(",");
          const sep = lastComma > lastDot ? "," : ".";
          const parts = clean.split(sep);
          const intPart = (parts[0] || "").replace(/\D/g, "");
          return intPart.length >= 3;
        })
        .sort((a, b) => a.x - b.x);

      let chosenRaw: string;
      if (decimalBig.length) chosenRaw = decimalBig[decimalBig.length - 1].raw;
      else if (decimalTokens.length) chosenRaw = decimalTokens[decimalTokens.length - 1].raw;
      else chosenRaw = numTokens[numTokens.length - 1].raw;

      data[code] = toDotDecimal(chosenRaw);
    }
  }

  // ---------- NUEVO: CUIL (preferir personal) + NOMBRE (no rompe nada) ----------
  // Recolectar candidatos de CUIL con su línea
  type CuilCand = { digits: string; formatted: string; lineIdx: number; personal: boolean; distToLeg: number };
  const cands: CuilCand[] = [];
  for (let li = 0; li < allLines.length; li++) {
    const joined = allLines[li].map((w) => w.str).join(" ");

    // 1) matches directos (CUIL_FLEX)
    for (const m of joined.matchAll(CUIL_FLEX)) {
      const digits = m[0].replace(/\D/g, "");
      if (digits.length === 11) {
        cands.push({
          digits,
          formatted: formatCuil(m[0]),
          lineIdx: li,
          personal: PERSON_PREFIX.test(digits),
          distToLeg: legLine >= 0 ? Math.abs(li - legLine) : 999,
        });
      }
    }

    // 2) si hay etiqueta, tomar los 11 dígitos a derecha (por si vino tokenizado)
    if (CUIL_LABELS.test(joined)) {
      const pos = joined.search(CUIL_LABELS);
      const digitsRight = joined.slice(Math.max(pos, 0)).replace(/\D/g, "");
      if (digitsRight.length >= 11) {
        const digits = digitsRight.slice(0, 11);
        cands.push({
          digits,
          formatted: formatCuil(digits),
          lineIdx: li,
          personal: PERSON_PREFIX.test(digits),
          distToLeg: legLine >= 0 ? Math.abs(li - legLine) : 999,
        });
      }
    }
  }
  // Elegir: primero personal; si hay varios, el más cerca de legajo; si ninguno personal, el más cerca de legajo.
  const uniq = new Map<string, CuilCand>();
  for (const c of cands) if (!uniq.has(c.digits)) uniq.set(c.digits, c);
  const arr = [...uniq.values()];
  arr.sort((a, b) => {
    // personal primero
    if (a.personal !== b.personal) return a.personal ? -1 : 1;
    // más cerca de legajo
    if (a.distToLeg !== b.distToLeg) return a.distToLeg - b.distToLeg;
    // último criterio: línea más arriba
    return a.lineIdx - b.lineIdx;
  });

  if (arr.length) {
    data["NRO. DE CUIL"] = arr[0].formatted;
    data["CUIL"] = arr[0].formatted;
  }

  // NOMBRE: primero en la misma línea del CUIL elegido / línea anterior; si no, buscar patrón general cerca de legajo
  const setName = (s: string): void => {
    const fixed = normalizeName(s);
    if (fixed) data["NOMBRE"] = fixed;
  };

  if (arr.length) {
    const li = arr[0].lineIdx;
    const line = allLines[li];
    const joined = line.map((w) => w.str).join(" ");
    const cuilStr = arr[0].formatted;
    const before = joined.includes(cuilStr) ? joined.slice(0, joined.indexOf(cuilStr)).trim() : joined;
    const nm = before.match(NAME_COMMA) ?? before.match(UPPER_NAME_BLOCK);
    if (nm) setName(nm[0]);
    if (!data["NOMBRE"] && li > 0) {
      const prev = allLines[li - 1].map((w) => w.str).join(" ");
      const nm2 = prev.match(NAME_COMMA) ?? prev.match(UPPER_NAME_BLOCK);
      if (nm2) setName(nm2[0]);
    }
  }

  if (!data["NOMBRE"] && legLine >= 0) {
    const from = Math.max(0, legLine - 5);
    const to = Math.min(allLines.length - 1, legLine + 5);
    for (let li = from; li <= to; li++) {
      const joined = allLines[li].map((w) => w.str).join(" ");
      const nm = joined.match(NAME_COMMA) ?? joined.match(UPPER_NAME_BLOCK);
      if (nm) {
        setName(nm[0]);
        break;
      }
    }
  }

  const debugLines = allLines.slice(0, 150).map((line) => ({
    y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
    text: line.map((w) => w.str).join(" "),
    tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
  }));

  return { data, debugLines };
}
