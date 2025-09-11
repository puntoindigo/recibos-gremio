// components/TablaAgregada/TablaAgregada.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { labelFor } from '@/lib/code-labels';
import ArchivosCell from './ArchivosCell';
import type { ConsolidatedEntity } from '@/lib/repo';

type Props = {
  rows: ConsolidatedEntity[];
  visibleCols: string[];
  nameByKey: Record<string, string>;
  periodoFiltro: string;
  onPeriodoFiltroChange: (v: string) => void;
  empresaFiltro: string;
  onEmpresaFiltroChange: (v: string) => void;
  nombreFiltro: string;
  controlesPorEmpresa?: Record<string, number>;
  getControlesPorEmpresaPeriodo?: (empresa: string, periodo: string) => Promise<number>;
};

function fmtNumber(v?: string): string {
  if (!v || v === '0.00' || v === '0') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// Función para formatear headers largos en dos líneas
function formatHeader(header: string): string {
  const longHeaders: Record<string, string> = {
    'CONTRIBUCION SOLIDARIA': 'CONTRIBUCION\nSOLIDARIA',
    'SEGURO SEPELIO': 'SEGURO\nSEPELIO',
    'CUOTA MUTUAL': 'CUOTA\nMUTUAL',
    'RESGUARDO MUTUAL': 'RESGUARDO\nMUTUAL',
    'DESC. MUTUAL': 'DESC.\nMUTUAL'
  };
  
  return longHeaders[header] || header;
}

export default function TablaAgregada({ rows, visibleCols, nameByKey, periodoFiltro, empresaFiltro, nombreFiltro, onPeriodoFiltroChange, onEmpresaFiltroChange, controlesPorEmpresa, getControlesPorEmpresaPeriodo }: Props) {
  const enriched = useMemo(() => {
    const empresaOf = (r: ConsolidatedEntity) => String(r.data?.EMPRESA ?? 'LIMPAR');
    return rows
      .filter((r) => (periodoFiltro ? r.periodo === periodoFiltro : true))
      .filter((r) => (empresaFiltro && empresaFiltro !== 'Todas' ? empresaOf(r) === empresaFiltro : true))
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

  // Estado para controles específicos del periodo
  const [controlesPeriodo, setControlesPeriodo] = useState<Record<string, number>>({});

  // Cargar controles específicos del periodo cuando cambie
  useEffect(() => {
    if (periodoFiltro && getControlesPorEmpresaPeriodo) {
      const cargarControles = async () => {
        const controlesMap: Record<string, number> = {};
        const empresas = Array.from(new Set(rows.map(r => String(r.data?.EMPRESA ?? 'LIMPAR'))));
        
        for (const empresa of empresas) {
          const cantidad = await getControlesPorEmpresaPeriodo(empresa, periodoFiltro);
          controlesMap[empresa] = cantidad;
        }
        
        setControlesPeriodo(controlesMap);
      };
      
      void cargarControles();
    } else {
      setControlesPeriodo({});
    }
  }, [periodoFiltro, getControlesPorEmpresaPeriodo, rows]);

  // Generar resumen por empresa cuando no hay filtro específico de empresa
  const empresasResumen = useMemo(() => {
    if (empresaFiltro !== 'Todas') return null;
    
    const resumen = new Map<string, { cantidad: number; controles: number }>();
    
    // Contar recibos por empresa
    rows
      .filter((r) => (periodoFiltro ? r.periodo === periodoFiltro : true))
      .forEach((r) => {
        const empresa = String(r.data?.EMPRESA ?? 'LIMPAR');
        const current = resumen.get(empresa) || { cantidad: 0, controles: 0 };
        current.cantidad += 1;
        resumen.set(empresa, current);
      });
    
    // Contar controles por empresa/periodo
    if (periodoFiltro) {
      // Si hay filtro de periodo, usar controles específicos del periodo
      const empresasConControles = new Set(resumen.keys());
      empresasConControles.forEach(empresa => {
        const current = resumen.get(empresa)!;
        current.controles = controlesPeriodo[empresa] || 0;
      });
    } else if (controlesPorEmpresa) {
      // Sin filtro de periodo, mostrar total de controles por empresa
      const empresasConControles = new Set(resumen.keys());
      empresasConControles.forEach(empresa => {
        const current = resumen.get(empresa)!;
        current.controles = controlesPorEmpresa[empresa] || 0;
      });
    }
    
    return Array.from(resumen.entries()).map(([empresa, data]) => ({
      empresa,
      cantidad: data.cantidad,
      controles: data.controles
    })).sort((a, b) => b.cantidad - a.cantidad);
  }, [rows, periodoFiltro, empresaFiltro, controlesPorEmpresa, controlesPeriodo]);

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

  // Componente de paginación reutilizable
  const PaginationControls = () => (
    <div className="flex items-center gap-3">
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
  );

  // Vista de resumen por empresa
  if (empresasResumen) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Resumen por Empresa</h2>
          <p className="text-gray-600">Selecciona una empresa para ver sus recibos</p>
        </div>
        
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center font-semibold">Empresa</TableHead>
                  <TableHead className="text-center font-semibold">Cantidad de Recibos</TableHead>
                  <TableHead className="text-center font-semibold">Controles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresasResumen.map((item) => (
                  <TableRow 
                    key={item.empresa}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onEmpresaFiltroChange(item.empresa)}
                  >
                    <TableCell className="text-center font-medium">{item.empresa}</TableCell>
                    <TableCell className="text-center">{item.cantidad.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-center">
                      {periodoFiltro ? (
                        item.controles > 0 ? (
                          <span className="text-green-600 font-medium">✓ {item.controles}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      ) : (
                        item.controles > 0 ? (
                          <span className="text-blue-600 font-medium">{item.controles}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Paginación superior */}
      <div className="mb-3">
        <PaginationControls />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h} className="whitespace-pre-line text-center min-w-0 max-w-32">
                {formatHeader(h)}
              </TableHead>
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
      
      {/* Paginación inferior */}
      <div className="mt-3">
        <PaginationControls />
      </div>
    </div>
  );
}
