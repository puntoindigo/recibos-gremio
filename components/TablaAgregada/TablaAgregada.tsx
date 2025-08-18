// components/TablaAgregada/TablaAgregada.tsx
'use client';

import { useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ArchivosCell from "@/components/TablaAgregada/ArchivosCell";
import type { ConsolidatedRow } from "@/lib/repo";
import { labelFor } from "@/lib/code-labels";

type Props = {
  rows: ConsolidatedRow[];
  visibleCols: string[];
  nameByKey: Record<string, string>;
  periodoFiltro: string;
  onPeriodoFiltroChange: (v: string) => void;
  empresaFiltro: string;
  onEmpresaFiltroChange: (v: string) => void;
};

/* --------------------- helpers de normalización --------------------- */

function normalizePeriodo(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m1) {
    const mm = String(parseInt(m1[1], 10)).padStart(2, "0");
    return `${m1[2]}-${mm}`;
  }
  if (m2) {
    const mm = String(parseInt(m2[2], 10)).padStart(2, "0");
    return `${m2[1]}-${mm}`;
  }
  const m3 = s.match(/^(\d{4})-(\d{2})$/);
  if (m3) return s;
  return s;
}

function normalizeEmpresa(s: string): string {
  return (s ?? "").trim().toUpperCase();
}

function periodoKeyToNum(p: string): number {
  const m = p.match(/^(\d{4})-(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 100 + Number(m[2]);
}

function getEmpresaRaw(r: ConsolidatedRow): string {
  const raw = ((r.data as Record<string, string | undefined>)?.EMPRESA ?? "").trim();
  return raw || "LIMPAR";
}

/* ------------------------------------------------------------------- */

export default function TablaAgregada({
  rows,
  visibleCols,
  nameByKey,
  periodoFiltro,
  onPeriodoFiltroChange,
  empresaFiltro,
  onEmpresaFiltroChange,
}: Props) {
  // ⚠️ Defensas: si los callbacks no son función, uso no-op y aviso en dev
  const setPeriodo = (v: string) => {
    if (typeof onPeriodoFiltroChange === "function") onPeriodoFiltroChange(v);
    else if (process.env.NODE_ENV !== "production") console.warn("TablaAgregada: onPeriodoFiltroChange no es función");
  };
  const setEmpresa = (v: string) => {
    if (typeof onEmpresaFiltroChange === "function") onEmpresaFiltroChange(v);
    else if (process.env.NODE_ENV !== "production") console.warn("TablaAgregada: onEmpresaFiltroChange no es función");
  };

  const { periodos, empresas } = useMemo(() => {
    const pNorm = new Set<string>();
    const eNorm = new Set<string>();

    for (const r of rows) {
      const pVal = (r.periodo || r.data?.PERIODO || "").trim();
      const pN = normalizePeriodo(pVal);
      if (pN) pNorm.add(pN);

      eNorm.add(normalizeEmpresa(getEmpresaRaw(r)));
    }

    const empresasAll = Array.from(eNorm);
    const empresasOrdered = [
      ...empresasAll.filter((x) => x === "LIMPAR"),
      ...empresasAll.filter((x) => x !== "LIMPAR").sort((a, b) => a.localeCompare(b)),
    ];

    const periodosOrdered = Array.from(pNorm).sort((a, b) => periodoKeyToNum(b) - periodoKeyToNum(a));
    return { periodos: periodosOrdered, empresas: empresasOrdered };
  }, [rows]);

  // Default inicial
  useEffect(() => {
    if (!periodoFiltro && periodos.length > 0) {
      setPeriodo(periodos[0]);
    }
  }, [periodos, periodoFiltro]); // setPeriodo es estable por definición

  useEffect(() => {
    if (!empresaFiltro && empresas.length > 0) {
      const pref = empresas.find((x) => x === "LIMPAR") ?? empresas[0];
      setEmpresa(pref);
    }
  }, [empresas, empresaFiltro]);

  // Reajuste después de borrar: si el filtro ya no existe, mover al primero disponible
  useEffect(() => {
    const pSel = normalizePeriodo(periodoFiltro);
    if (pSel && !periodos.includes(pSel)) {
      setPeriodo(periodos[0] ?? "");
    }
  }, [periodos, periodoFiltro]);

  useEffect(() => {
    const eSel = normalizeEmpresa(empresaFiltro);
    if (eSel && !empresas.includes(eSel)) {
      const pref = empresas.find((x) => x === "LIMPAR") ?? empresas[0] ?? "";
      setEmpresa(pref);
    }
  }, [empresas, empresaFiltro]);

  // Filtrado consistente con page.tsx
  const filteredRows = useMemo(() => {
    const pFilter = normalizePeriodo(periodoFiltro);
    const eFilter = normalizeEmpresa(empresaFiltro);

    return rows.filter((r) => {
      const pValRaw = (r.periodo || r.data?.PERIODO || "").trim();
      const empValRaw = getEmpresaRaw(r);
      const okP = !pFilter || normalizePeriodo(pValRaw) === pFilter;
      const okE = !eFilter || normalizeEmpresa(empValRaw) === eFilter;
      return okP && okE;
    });
  }, [rows, periodoFiltro, empresaFiltro]);

  const computedCols = useMemo(() => {
    let cols = [...visibleCols];
    if (periodoFiltro) cols = cols.filter((c) => c !== "PERIODO");
    if (!empresaFiltro) {
      if (!cols.includes("EMPRESA")) {
        const idxNombre = cols.indexOf("NOMBRE");
        if (idxNombre >= 0) cols.splice(idxNombre + 1, 0, "EMPRESA");
        else cols.unshift("EMPRESA");
      }
    } else {
      cols = cols.filter((c) => c !== "EMPRESA");
    }
    return cols;
  }, [visibleCols, periodoFiltro, empresaFiltro]);

  const periodosDisabled = periodos.length === 0;
  const empresasDisabled = empresas.length === 0;

  return (
    <div className="w-full overflow-auto">
      {/* Barra de filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          {/* Filtro por PERIODO */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground min-w-16">Periodo</span>
            <select
              className="border rounded px-2 py-1 h-9"
              value={normalizePeriodo(periodoFiltro)}
              onChange={(e) => setPeriodo(normalizePeriodo(e.target.value))}
              disabled={periodosDisabled}
            >
              {periodos.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Filtro por EMPRESA */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground min-w-16">Empresa</span>
            <select
              className="border rounded px-2 py-1 h-9"
              value={normalizeEmpresa(empresaFiltro)}
              onChange={(e) => setEmpresa(normalizeEmpresa(e.target.value))}
              disabled={empresasDisabled}
            >
              {empresas.map((em) => (
                <option key={em} value={em}>{em}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cantidad de registros */}
        <div className="text-sm text-muted-foreground">
          Registros: {filteredRows.length}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {computedCols.map((c) => (
              <TableHead key={c} className="whitespace-nowrap">
                {/^\d{5}$/.test(c) ? labelFor(c) : c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((r) => (
            <TableRow key={r.key}>
              {computedCols.map((c) => (
                <TableCell key={c} className="text-xs">
                  {c === "ARCHIVO" ? (
                    <ArchivosCell
                      value={
                        Array.isArray(r.archivos) && r.archivos.length > 0
                          ? (r.archivos as ReadonlyArray<string>).map((n: string) => ({ name: String(n) }))
                          : r.data.ARCHIVO ?? ""
                      }
                    />
                  ) : c === "NOMBRE" ? (
                    r.nombre || r.data.NOMBRE || nameByKey[r.key] || ""
                  ) : c === "LEGAJO" ? (
                    r.legajo
                  ) : c === "PERIODO" ? (
                    r.periodo || r.data?.PERIODO || ""
                  ) : c === "EMPRESA" ? (
                    normalizeEmpresa(getEmpresaRaw(r))
                  ) : (
                    r.data[c] ?? ""
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
