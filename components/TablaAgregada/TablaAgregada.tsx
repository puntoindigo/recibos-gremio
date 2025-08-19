// components/TablaAgregada/TablaAgregada.tsx
'use client';

import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OfficialRow } from '@/lib/import-excel';
import ArchivosCell from './ArchivosCell';

const CODE_CONTRIB = '20540';
const CODE_SEPELIO = '20590';
const CODE_CUOTA_MUTUAL = '20595';
const CODE_RESGUARDO_MUTUAL = '20610';
const CODE_DESC_MUTUAL = '20620';

type Props = { data: OfficialRow[] };

function fmt(v?: string): string {
  if (!v || v === '0.00') return '';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
}

export default function TablaAgregada({ data }: Props) {
  const displayRows = useMemo(() => {
    const rows = data ?? [];
    return rows.map((r) => ({
      key: r.key,
      legajo: r.meta?.legajo ?? '',
      nombre: r.meta?.nombre ?? '',
      periodo: r.meta?.periodo ?? '',
      archivo: r.meta?.archivo ?? '',
      contrib: fmt(r.valores[CODE_CONTRIB]),
      sepelio: fmt(r.valores[CODE_SEPELIO]),
      cuota: fmt(r.valores[CODE_CUOTA_MUTUAL]),
      resguardo: fmt(r.valores[CODE_RESGUARDO_MUTUAL]),
      desc: fmt(r.valores[CODE_DESC_MUTUAL]),
    }));
  }, [data]);

  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, page, pageSize]);

  if (page > totalPages) {
    setPage(totalPages);
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-3 flex items-center gap-3">
        <div className="text-sm text-muted-foreground">Mostrando {pageRows.length} de {displayRows.length}</div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(Number(v) || 50); }}>
            <SelectTrigger className="w-24"><SelectValue placeholder="50" /></SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
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
            <TableHead>LEGAJO</TableHead>
            <TableHead>NOMBRE</TableHead>
            <TableHead>PERIODO</TableHead>
            <TableHead>CONTRIBUCION SOLIDARIA</TableHead>
            <TableHead>SEGURO DE SEPELIO</TableHead>
            <TableHead>CUOTA MUTUAL</TableHead>
            <TableHead>RESGUARDO MUTUAL</TableHead>
            <TableHead>DESC. MUTUAL</TableHead>
            <TableHead>ARCHIVO</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((r) => (
            <TableRow key={r.key}>
              <TableCell>{r.legajo}</TableCell>
              <TableCell>{r.nombre}</TableCell>
              <TableCell>{r.periodo}</TableCell>
              <TableCell>{r.contrib}</TableCell>
              <TableCell>{r.sepelio}</TableCell>
              <TableCell>{r.cuota}</TableCell>
              <TableCell>{r.resguardo}</TableCell>
              <TableCell>{r.desc}</TableCell>
              <TableCell><ArchivosCell value={r.archivo} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
