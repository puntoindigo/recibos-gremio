// lib/pdf-parser.ts
export type Parsed = {
  data: Record<string, string>;
  debugLines: { y: number; text: string; tokens: { str: string; x: number; y: number }[] }[];
};

function assertClient() {
  if (typeof window === "undefined") throw new Error("PDF parsing debe ejecutarse en el navegador");
}

// --- regex y helpers de parseo ---
const MMYYYY_ALL = /([01]?\d\/\d{4})/g;
const MMYYYY_ONE = /([01]?\d\/\d{4})/;
const LEG_LABEL = /(?:LEGAJO|Legajo)\b/;
const PER_LABEL = /Per[ií]odo|PER[iÍ]ODO|PER\.|abonado/i;
const NUM_TOKEN =
  /\b-?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+[.,]\d+|\d+)\b/g;

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

// --- parser principal ---
export async function parsePdfReceiptToRecord(file: File): Promise<Parsed> {
  assertClient();

  // Import dinámico (evita mismatches de versión del worker)
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  const { getDocument, GlobalWorkerOptions } = pdfjs;
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const ok = await fetch("/pdf.worker.min.mjs", { method: "HEAD" })
    .then((r) => r.ok)
    .catch(() => false);
  if (!ok) throw new Error("No se pudo cargar el worker de PDF (/pdf.worker.min.mjs)");

  const buf = await file.arrayBuffer();
  let pdf: any | null = null;

  type Word = { str: string; x: number; y: number };
  const allLines: Word[][] = [];
  const allWords: Word[] = [];
  const Y_TOL = 2.5;

  try {
    pdf = await getDocument({ data: buf }).promise;

    for (let i = 1; i <= (pdf.numPages ?? 1); i++) {
      const page: any = await pdf.getPage(i);
      try {
        const content: any = await page.getTextContent();

        const words: Word[] = (content.items as any[])
          .map((it: any) => {
            const tr = it.transform || it.matrix || [1, 0, 0, 1, it.x || 0, it.y || 0];
            return {
              str: String(it.str ?? "").trim(),
              x: Number(tr[4] || 0),
              y: Number(tr[5] || 0),
            };
          })
          .filter((w) => w.str.length);

        allWords.push(...words);

        // agrupar por línea (misma Y promedio)
        const lines: Word[][] = [];
        for (const w of words.sort((a, b) => b.y - a.y || a.x - b.x)) {
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
        // liberar memoria de la página
        if (typeof page.cleanup === "function") {
          try {
            page.cleanup();
          } catch {}
        }
      }
    }

    const rawText = allWords.map((w) => w.str).join(" ");
    const data: Record<string, string> = { ARCHIVO: file.name, LEGAJO: "-", PERIODO: "-" };

    // ---------- PERIODO ----------
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

    // ---------- LEGAJO ----------
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

    // ---------- CÓDIGOS 20xxx ----------
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

      const hasDecimals = (s: string) => /[.,]\d{1,}$/.test(s);

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

        let chosenRaw: string | null = null;
        if (decimalBig.length) chosenRaw = decimalBig[decimalBig.length - 1].raw;
        else if (decimalTokens.length) chosenRaw = decimalTokens[decimalTokens.length - 1].raw;
        else chosenRaw = numTokens[numTokens.length - 1].raw;

        data[code] = toDotDecimal(chosenRaw!);
      }
    }

    const debugLines = allLines.slice(0, 150).map((line) => ({
      y: Math.round(line.reduce((s, w) => s + w.y, 0) / line.length),
      text: line.map((w) => w.str).join(" "),
      tokens: line.map((w) => ({ str: w.str, x: Math.round(w.x), y: Math.round(w.y) })),
    }));

    return { data, debugLines };
  } finally {
    // liberar el documento completo
    if (pdf) {
      try {
        if (typeof pdf.cleanup === "function") pdf.cleanup();
      } catch {}
      try {
        if (typeof pdf.destroy === "function") await pdf.destroy();
      } catch {}
    }
  }
}
