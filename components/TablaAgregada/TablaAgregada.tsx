// components/TablaAgregada/TablaAgregada.tsx
'use client';

import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { labelFor } from '@/lib/code-labels';
import ArchivosCell from './ArchivosCell';
import type { ConsolidatedRow } from '@/lib/repo';

type Props = {
  rows: ConsolidatedRow[];
  visibleCols: string[];
  nameByKey: Record<string, string>;
  periodoFiltro: string;
  onPeriodoFiltroChange: (v: string) => void;
  empresaFiltro: string;
  onEmpresaFiltroChange: (v: string) => void;
  nombreFiltro: string;
};

function fmtNumber(v?: string): string {
  if (!v || v === '0.00' || v === '0') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function TablaAgregada({ rows, visibleCols, nameByKey, periodoFiltro, empresaFiltro, nombreFiltro, onPeriodoFiltroChange, onEmpresaFiltroChange }: Props) {
  const enriched = useMemo(() => {
    const empresaOf = (r: ConsolidatedRow) => String(r.data?.EMPRESA ?? 'LIMPAR');
    return rows
      .filter((r) => (periodoFiltro ? r.periodo === periodoFiltro : true))
      .filter((r) => (empresaFiltro ? empresaOf(r) === empresaFiltro : true))
      .filter((r) => {
        if (!nombreFiltro) return true;
        const nombre = nameByKey[r.key] || r.nombre || "";
        return nombre.toLowerCase().includes(nombreFiltro.toLowerCase());
      })
      .map((r) => ({
        key: r.key,
        legajo: r.legajo,
        nombre: nameByKey[r.key] || r.nombre || '',
        periodo: r.periodo,
        archivo: JSON.stringify(r.archivos.map((n: string) => ({ name: n }))),
        data: r.data,
      }));
  }, [rows, periodoFiltro, empresaFiltro, nombreFiltro, nameByKey]);

  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(enriched.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return enriched.slice(start, start + pageSize);
  }, [enriched, page, pageSize]);

  if (page > totalPages) {
    setPage(totalPages);
  }

  const headers = useMemo(() => {
    return visibleCols.map(col => labelFor(col));
  }, [visibleCols]);

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-3 flex items-center gap-3">
        <div className="text-sm text-muted-foreground">Mostrando {pageRows.length} de {enriched.length}</div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Filas por página</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(Number(v) || 50); }}>
            <SelectTrigger className="w-24"><SelectValue placeholder="50" /></SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n: number) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>←</Button>
            <div className="text-sm tabular-nums">{page} / {totalPages}</div>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>→</Button>
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((r) => (
            <TableRow key={r.key}>
              {visibleCols.map((col, index) => {
                const header = headers[index];
                if (col === 'LEGAJO') return <TableCell key={col}>{r.legajo}</TableCell>;
                if (col === 'NOMBRE') return <TableCell key={col}>{r.nombre}</TableCell>;
                if (col === 'PERIODO') return <TableCell key={col}>{r.periodo}</TableCell>;
                if (col === 'ARCHIVO') return <TableCell key={col}><ArchivosCell value={r.archivo} /></TableCell>;
                const v = r.data?.[col];
                return <TableCell key={col}>{fmtNumber(v)}</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
