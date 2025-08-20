'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import React from 'react';

type Props = {
  periodos: string[];
  empresas: string[];
  valuePeriodo: string | null;
  onPeriodo: (v: string | null) => void;
  valueEmpresa: string | null;
  onEmpresa: (v: string | null) => void;
};

const ALL = '__ALL__';

export default function ReceiptsFilters({ periodos, empresas, valuePeriodo, onPeriodo, valueEmpresa, onEmpresa }: Props): JSX.Element {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-16">Período</span>
        <Select value={valuePeriodo ?? ALL} onValueChange={(v) => onPeriodo(v === ALL ? null : v)} disabled={periodos.length === 0}>
          <SelectTrigger className="w-40"><SelectValue placeholder={periodos.length ? 'Todos' : 'Sin datos'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {periodos.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        {valuePeriodo && <Button variant="ghost" size="icon" onClick={() => onPeriodo(null)} aria-label="Limpiar período"><X className="h-4 w-4" /></Button>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-16">Empresa</span>
        <Select value={valueEmpresa ?? ALL} onValueChange={(v) => onEmpresa(v === ALL ? null : v)} disabled={empresas.length === 0}>
          <SelectTrigger className="w-56"><SelectValue placeholder={empresas.length ? 'Todas' : 'Sin datos'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {empresas.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
          </SelectContent>
        </Select>
        {valueEmpresa && <Button variant="ghost" size="icon" onClick={() => onEmpresa(null)} aria-label="Limpiar empresa"><X className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
