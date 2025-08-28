import type { ConsolidatedEntity } from "./repo";
import { labelFor } from "./code-labels";
import { toFixed2 } from "./number";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildAggregatedCsv(rows: ConsolidatedEntity[], cols: string[]) {
  const headers = cols.map((c) => (c.match(/^\d{5}$/) ? labelFor(c) : c));

  const cell = (r: ConsolidatedEntity, c: string) => {
    if (c === "LEGAJO") return r.legajo ?? "";
    if (c === "PERIODO") return r.periodo ?? "";
    if (c === "ARCHIVO") return (r.archivos?.join(" + ")) || (r.data.ARCHIVO ?? "");
    return c.match(/^\d{5}$/) ? toFixed2(r.data[c]) : r.data[c] ?? "";
  };

  const body = rows.map((r) => cols.map((c) => esc(cell(r, c))).join(",")).join("\n");
  return "sep=,\n" + headers.map(esc).join(",") + "\n" + body;
}
