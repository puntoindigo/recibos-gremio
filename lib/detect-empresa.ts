// lib/detect-empresa.ts
// Detección mínima por nombre de archivo (prioridad alta).
// No usa 'any'.

export type EmpresaId = "limpar" | "lime" | "sumar" | "tysa" | "desconocida";

function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stripPunct(s: string): string {
  return s.replace(/[._\-\s]+/g, "");
}

export interface Detection {
  empresa: EmpresaId;
  confidence: number; // 0..1
  method: "filename";
  tokensHit: string[];
}

const TOKENS: Record<Exclude<EmpresaId, "desconocida">, string[]> = {
  limpar: ["limpar"],
  lime: ["lime"],
  sumar: ["sumar"],
  tysa: ["tysa", "t.y.s.a", "t_y_s_a", "t-y-s-a"],
};

export function detectEmpresaFromName(fileName: string): Detection {
  const norm = normalizeName(fileName);
  const compact = stripPunct(norm);
  const hits: string[] = [];
  let empresa: EmpresaId = "desconocida";
  let score = 0;

  for (const [id, arr] of Object.entries(TOKENS)) {
    for (const token of arr) {
      const tokenNorm = normalizeName(token);
      const tokenCompact = stripPunct(tokenNorm);
      if (norm.includes(tokenNorm) || compact.includes(tokenCompact)) {
        hits.push(token);
        // filename match = alta confianza
        const s = token.length >= 4 ? 0.95 : 0.8;
        if (s > score) {
          score = s;
          empresa = id as EmpresaId;
        }
      }
    }
  }

  return {
    empresa,
    confidence: score,
    method: "filename",
    tokensHit: hits,
  };
}

export function isEmpresaLimpar(e: EmpresaId): boolean {
  return e === "limpar";
}
