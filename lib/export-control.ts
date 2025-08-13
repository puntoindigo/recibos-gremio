// lib/export-control.ts
import type { ControlSummary } from "@/lib/control-types";

export type ControlOk = { key: string; legajo: string; periodo: string };

function esc(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildControlCsvSummary(
  difs: ControlSummary[],
  oks: ControlOk[],
  includeOks: boolean,
  nameByKey: Record<string, string> = {},
): string {
  const header = ["LEGAJO", "NOMBRE", "PERIODO", "ESTADO", "#DIFERENCIAS"];
  const rows: string[][] = [header];

  for (const s of difs) {
    rows.push([s.legajo, nameByKey[s.key] ?? "", s.periodo, "DIF", String(s.difs.length)]);
  }
  if (includeOks) {
    for (const o of oks) {
      rows.push([o.legajo, nameByKey[o.key] ?? "", o.periodo, "OK", "0"]);
    }
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
