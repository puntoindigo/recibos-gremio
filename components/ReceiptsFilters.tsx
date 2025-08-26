'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search } from 'lucide-react';

type Props = {
  periodos: string[];
  empresas: string[];
  valuePeriodo: string | null;
  onPeriodo: (v: string | null) => void;
  valueEmpresa: string | null;
  onEmpresa: (v: string | null) => void;
  valueNombre: string;
  onNombre: (v: string) => void;
};

const ALL = '__ALL__';

export default function ReceiptsFilters({
  periodos, empresas,
  valuePeriodo, onPeriodo,
  valueEmpresa, onEmpresa,
  valueNombre, onNombre,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-16">Periodo</span>
        <Select value={valuePeriodo ?? ALL} onValueChange={(v) => onPeriodo(v === ALL ? null : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {periodos.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        {valuePeriodo && <Button variant="ghost" size="icon" onClick={() => onPeriodo(null)} aria-label="Limpiar periodo"><X className="h-4 w-4" /></Button>}
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
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-16">Nombre</span>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre..."
            value={valueNombre}
            onChange={(e) => onNombre(e.target.value)}
            className="w-64 pl-10"
          />
        </div>
        {valueNombre && <Button variant="ghost" size="icon" onClick={() => onNombre("")} aria-label="Limpiar nombre"><X className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
