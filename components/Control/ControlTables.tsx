// components/Control/ControlTables.tsx
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ControlSummary } from "@/lib/control-types";
import type { ControlOk } from "@/lib/export-control";

type Missing = { key: string; legajo: string; periodo: string };

type Props = {
  summaries: ControlSummary[];
  oks: ControlOk[];
  missing: Missing[];
  openDetail: Record<string, boolean>;
  onToggleDetail: (key: string) => void;
  nameByKey: Record<string, string>;
  valuesByKey?: Record<
    string,
    {
      "20540"?: number;
      "20590"?: number;
      "20595"?: number;
      "20610"?: number;
      "DESC. MUTUAL"?: number;
    }
  >;
};

const headers = [
  "Estado",
  "Legajo",
  "Periodo",
  "Nombre",
  "CONTRIBUCION SOLIDARIA",
  "SEGURO DE SEPELIO",
  "CUOTA MUTUAL",
  "RESGUARDO MUTUAL",
  "DESC. MUTUAL",
] as const;

function HeaderRow() {
  return (
    <TableHeader>
      <TableRow>
        {headers.map((h) => (
          <TableHead key={h} className="whitespace-nowrap">
            {h}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function fmt(n?: number | string): string {
  if (n === undefined || n === null || (typeof n === "number" && Number.isNaN(n))) return "";
  const v = typeof n === "number" ? n : Number(String(n).replace(",", "."));
  if (!Number.isFinite(v)) return String(n);
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function num(n?: number | string): number {
  if (n === undefined || n === null) return NaN;
  return typeof n === "number" ? n : Number(String(n).replace(",", "."));
}

/** Celda que muestra oficial y, si difiere, el valor de recibo coloreado */
function DiffValueCell({
  summary,
  code,
  calc,
}: {
  summary: ControlSummary;
  code: string;
  calc?: number;
}) {
  const diff = summary.difs.find((d) => d.codigo === code);
  if (diff) {
    const off = num(diff.oficial);
    const rc = num(diff.calculado);
    const color =
      Number.isFinite(off) && Number.isFinite(rc)
        ? off < rc
          ? "text-red-600"
          : off > rc
          ? "text-green-700"
          : "text-muted-foreground"
        : "text-muted-foreground";
    const different = Math.abs(off - rc) > 1e-9;
    return (
      <TableCell className="px-3 py-2">
        <div className="leading-tight">
          <div className="tabular-nums">{fmt(diff.oficial)}</div>
          {different && <div className={`tabular-nums text-xs ${color}`}>{fmt(diff.calculado)}</div>}
        </div>
      </TableCell>
    );
  }
  return (
    <TableCell className="px-3 py-2">
      <div className="tabular-nums">{fmt(calc)}</div>
    </TableCell>
  );
}

export default function ControlTables({
  summaries,
  oks,
  missing,
  openDetail,
  onToggleDetail,
  nameByKey,
  valuesByKey = {},
}: Props) {
  const colCount = headers.length;
  const [openSection, setOpenSection] = useState<{ diffs: boolean; oks: boolean; missing: boolean }>({ diffs: false, oks: false, missing: false });
  const counts = { diffs: summaries.length, oks: oks.length, missing: missing.length };

  return (
    <div className="space-y-8">
      {/* Diferencias */}
      <div>
        <button
          type="button"
          className="mb-2 inline-flex items-center gap-2 font-medium"
          onClick={() => setOpenSection((s) => ({ ...s, diffs: !s.diffs }))}
          aria-expanded={openSection.diffs}
        >
          {openSection.diffs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {`Claves con diferencias (${counts.diffs})`}
        </button>
        {openSection.diffs && (
          counts.diffs === 0 ? (
            <p className="text-sm text-muted-foreground">No hay claves con diferencias.</p>
          ) : (
            <div className="w-full overflow-auto">
              <Table>
                <HeaderRow />
                <TableBody>
                {summaries.map((s) => {
                  const nombre = nameByKey[s.key] || "";
                  const vals = valuesByKey[s.key] || {};
                  const isOpen = !!openDetail[s.key];

                  const toggle = (e?: React.MouseEvent) => {
                    if (e) e.stopPropagation();
                    onToggleDetail(s.key);
                  };

                  return (
                    <Fragment key={s.key}>
                      <TableRow className="hover:bg-muted/40">
                        <TableCell className="px-3 py-2">
                          <button
                            type="button"
                            onClick={toggle}
                            aria-expanded={isOpen}
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
                            title={isOpen ? "Ocultar detalle" : "Mostrar detalle"}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {`DIF (${s.difs.length})`}
                          </button>
                        </TableCell>
                        <TableCell className="px-3 py-2 font-mono text-xs">{s.legajo}</TableCell>
                        <TableCell className="px-3 py-2 font-mono text-xs">{s.periodo}</TableCell>
                        <TableCell className="px-3 py-2 text-xs">{nombre}</TableCell>

                        {/* Conceptos: oficial + recibo (si difiere) */}
                        <DiffValueCell summary={s} code="20540" calc={vals["20540"]} />
                        <DiffValueCell summary={s} code="20590" calc={vals["20590"]} />
                        <DiffValueCell summary={s} code="20595" calc={vals["20595"]} />
                        <DiffValueCell summary={s} code="20610" calc={vals["20610"]} />
                        <DiffValueCell summary={s} code="DESC. MUTUAL" calc={vals["DESC. MUTUAL"]} />
                      </TableRow>

                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={colCount} className="bg-muted/30 p-0">
                            <div className="p-3">
                              <div className="mb-2 text-sm font-medium">
                                Detalle — Legajo {s.legajo} · {nombre} · Período {s.periodo}
                              </div>
                              <div className="w-full overflow-auto rounded border bg-white">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[90px]">Código</TableHead>
                                      <TableHead>Concepto</TableHead>
                                      <TableHead>Oficial</TableHead>
                                      <TableHead>Calculado</TableHead>
                                      <TableHead>Δ</TableHead>
                                      <TableHead>Dirección</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {s.difs.map((d, i) => (
                                      <TableRow key={s.key + d.codigo + i}>
                                        <TableCell className="font-mono text-xs">{d.codigo}</TableCell>
                                        <TableCell className="text-xs">{d.label}</TableCell>
                                        <TableCell className="text-xs">{d.oficial}</TableCell>
                                        <TableCell className="text-xs">{d.calculado}</TableCell>
                                        <TableCell className="text-xs">{d.delta}</TableCell>
                                        <TableCell className="text-xs">{d.dir}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </div>

      {/* OKs */}
      <div>
        <button
          type="button"
          className="mb-2 inline-flex items-center gap-2 font-medium"
          onClick={() => setOpenSection((s) => ({ ...s, oks: !s.oks }))}
          aria-expanded={openSection.oks}
        >
          {openSection.oks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {`Claves OK (${counts.oks})`}
        </button>
        {openSection.oks && (
          counts.oks === 0 ? (
            <p className="text-sm text-muted-foreground">No hay claves OK para mostrar.</p>
          ) : (
            <div className="w-full overflow-auto">
              <Table>
                <HeaderRow />
                <TableBody>
                  {oks.map((o) => {
                  const nombre = nameByKey[o.key] || "";
                  const vals = valuesByKey[o.key] || {};
                  return (
                    <TableRow key={o.key}>
                      <TableCell className="px-3 py-2">OK</TableCell>
                      <TableCell className="px-3 py-2 font-mono text-xs">{o.legajo}</TableCell>
                      <TableCell className="px-3 py-2 font-mono text-xs">{o.periodo}</TableCell>
                      <TableCell className="px-3 py-2 text-xs">{nombre}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20540"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20590"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20595"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20610"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["DESC. MUTUAL"])}</TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </div>

      {/* Oficiales sin recibo */}
      <div>
        <button
          type="button"
          className="mb-2 inline-flex items-center gap-2 font-medium"
          onClick={() => setOpenSection((s) => ({ ...s, missing: !s.missing }))}
          aria-expanded={openSection.missing}
        >
          {openSection.missing ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {`Registros oficiales sin recibo (${counts.missing})`}
        </button>
        {openSection.missing && (
          counts.missing === 0 ? (
            <p className="text-sm text-muted-foreground">No hay registros del Excel sin su recibo correspondiente.</p>
          ) : (
            <div className="w-full overflow-auto">
              <Table>
                <HeaderRow />
                <TableBody>
                  {missing.map((m) => {
                  const nombre = nameByKey[m.key] || "";
                  const vals = valuesByKey[m.key] || {};
                  return (
                    <TableRow key={m.key}>
                      <TableCell className="px-3 py-2">FALTA</TableCell>
                      <TableCell className="px-3 py-2 font-mono text-xs">{m.legajo}</TableCell>
                      <TableCell className="px-3 py-2 font-mono text-xs">{m.periodo}</TableCell>
                      <TableCell className="px-3 py-2 text-xs">{nombre}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20540"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20590"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20595"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["20610"])}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">{fmt(vals["DESC. MUTUAL"])}</TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
