'use client';

import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export type ReceiptRow = {
  LEGAJO: string;
  PERIODO: string;   // formato MM/YYYY
  NOMBRE: string;
  ARCHIVO: string | string[];
  EMPRESA?: string;  // opcional por ahora
  // otros campos…
};

type Props = {
  rows: readonly ReceiptRow[];
  valuePeriodo: string | null;
  onChangePeriodo: (v: string | null) => void;
  valueEmpresa: string | null;
  onChangeEmpresa: (v: string | null) => void;
};

function sortPeriodoDesc(a: string, b: string): number {
  // espera MM/YYYY
  const [ma, ya] = a.split('/').map(Number);
  const [mb, yb] = b.split('/').map(Number);
  if (ya !== yb) return yb - ya;
  return (mb ?? 0) - (ma ?? 0);
}

export default function ReceiptsFilters({
  rows,
  valuePeriodo,
  onChangePeriodo,
  valueEmpresa,
  onChangeEmpresa,
}: Props) {
  const { periodos, empresas } = useMemo(() => {
    const p = new Set<string>();
    const e = new Set<string>();
    for (const r of rows) {
      if (r.PERIODO?.trim()) p.add(r.PERIODO.trim());
      if (r.EMPRESA?.trim()) e.add(r.EMPRESA.trim());
    }
    return {
      periodos: Array.from(p).sort(sortPeriodoDesc),
      empresas: Array.from(e).sort((x, y) => x.localeCompare(y)),
    };
  }, [rows]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Filtro por PERIODO */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-16">Periodo</span>
        <Select
          value={valuePeriodo ?? ''}
          onValueChange={(v) => onChangePeriodo(v || null)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {periodos.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {valuePeriodo && (
          <Button variant="ghost" size="icon" onClick={() => onChangePeriodo(null)} aria-label="Limpiar periodo">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filtro por EMPRESA (queda listo; si no hay datos, se muestra deshabilitado) */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-16">Empresa</span>
        <Select
          value={valueEmpresa ?? ''}
          onValueChange={(v) => onChangeEmpresa(v || null)}
          disabled={empresas.length === 0} // hasta que agreguemos el campo
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder={empresas.length ? 'Todas' : 'Sin datos'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {valueEmpresa && (
          <Button variant="ghost" size="icon" onClick={() => onChangeEmpresa(null)} aria-label="Limpiar empresa">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
