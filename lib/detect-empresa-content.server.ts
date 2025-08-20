// lib/detect-empresa-content.server.ts
import pdf from "pdf-parse";

export type ExtractedResumen = {
  empresa: "limpar" | "lime" | "sumar" | "tysa" | "desconocida";
  legajo?: string;
  periodo?: string;
  nombre?: string;
  contribucion?: string;
  sepelio?: string;
  cuotaMutual?: string;
  resguardoMutual?: string;
  descMutual?: string;
};

function normalize(s: string): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toDecimalLike(raw: string): string {
  let t = (raw ?? "").toString().trim();
  if (!t) return "";
  t = t.replace(/\s+/g, "");
  const lastDot = t.lastIndexOf(".");
  const lastComma = t.lastIndexOf(",");
  const commaDecimal = lastComma > lastDot;
  t = commaDecimal ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  t = t.replace(/[^0-9.\-]/g, "");
  if (!t) return "";
  if (!t.includes(".")) t = `${t}.00`;
  const [i, f = ""] = t.split(".");
  return `${i}.${(f + "00").slice(0, 2)}`;
}

function numAfter(label: string, text: string): string {
  const idx = text.toLowerCase().indexOf(label.toLowerCase());
  const tail = idx === -1 ? text : text.slice(idx + label.length);
  const ms = tail.match(/([+-]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|[+-]?\d+(?:[.,]\d{2}))/g) ?? [];
  for (const cand of ms) {
    const n = Number(toDecimalLike(cand));
    if (Number.isFinite(n) && Math.abs(n) >= 100) return toDecimalLike(cand);
  }
  if (ms.length) return toDecimalLike(ms[ms.length - 1]);
  return "";
}

export async function inspectPdfServer(buf: Buffer): Promise<ExtractedResumen> {
  const parsed = await pdf(buf);
  const raw = parsed.text || "";
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const joined = normalize(lines.join(" \n "));

  let empresa: ExtractedResumen["empresa"] = "desconocida";
  if (/(\b)limpar(\b)/i.test(joined)) empresa = "limpar";
  else if (/(\b)sumar(\b)/i.test(joined) || /\b0323\b|\b0324\b|\b0373\b|\b0374\b/i.test(joined)) empresa = "sumar";
  else if (/contrib\.solidaria/i.test(joined) && !/cuota gremial/i.test(joined)) empresa = "lime";
  else if (/tysa|t\.y\.s\.a|t_y_s_a/i.test(joined)) empresa = "tysa";

  const legM = joined.match(/(?:legajo|leg\.)\s*[:#]?\s*(\d{3,})/i);
  const legajo = legM?.[1];
  const perM = joined.match(/([01]?\d\/\d{4})/);
  const periodo = perM?.[1];

  let nombre: string | undefined = undefined;
  const cuilIdx = lines.findIndex(l => /cuil|cuit/i.test(l));
  if (cuilIdx > 0) {
    const cand = lines[cuilIdx - 1].trim();
    if (/[A-ZÁÉÍÓÚÑ]{3,}/.test(cand.replace(/[,\s]+/g, ""))) nombre = cand;
  }
  if (!nombre) {
    const upper = lines.find(l => /[A-ZÁÉÍÓÚÑ]{3,}/.test(l) && l.split(" ").length <= 5);
    if (upper) nombre = upper.trim();
  }

  const pick = (labels: string[]): string => {
    for (const label of labels) {
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (!ln.toLowerCase().includes(label.toLowerCase())) continue;
        const valSame = numAfter(label, ln);
        if (valSame) return valSame;
        if (i + 1 < lines.length) {
          const valNext = numAfter("", lines[i + 1]);
          if (valNext) return valNext;
        }
      }
    }
    return "";
  };

  const contribucion = pick(["Contrib.Solidaria", "Contrib", "CUOTA GREMIAL", "0323"]);
  const sepelio = pick(["Gastos de sepelio", "sepelio", "SEG. SEPELIO", "0324"]);
  const cuotaMutual = pick(["Cuota Mutual Ap.Solidar.", "Cuota Mutual", "CUOTA APORT. SOLID. MUT.", "0373"]);
  const resguardoMutual = pick(["Resguardo Mutuo", "Resg. Mutual Fam.", "RESG. MUTUAL FAM.", "0374"]);
  const descMutual = pick(["Desc. Mutual", "Descuento Mutual", "DESC. MUTUAL", "20700", "20530"]);

  return { empresa, legajo, periodo, nombre, contribucion, sepelio, cuotaMutual, resguardoMutual, descMutual };
}
