// components/TablaAgregada/TablaAgregada.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import ColumnSelector from '@/components/ColumnSelector';
import { ColumnConfigManager } from '@/lib/column-config-manager';
import type { ConsolidatedEntity } from '@/lib/repo';

type Props = {
  data: ConsolidatedEntity[];
  showEmpresa?: boolean;
  onColumnsChange?: (visibleColumns: string[], aliases: Record<string, string>) => void;
};

function fmtNumber(v?: string): string {
  if (!v || v === '0.00' || v === '0') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function extractEmpresaFromArchivo(archivo: string): string {
  if (!archivo) return 'N/A';
  const archivoUpper = archivo.toUpperCase();
  if (archivoUpper.includes('LIME')) return 'LIME';
  if (archivoUpper.includes('LIMPAR')) return 'LIMPAR';
  if (archivoUpper.includes('SUMAR')) return 'SUMAR';
  if (archivoUpper.includes('TYSA')) return 'TYSA';
  return 'N/A';
}

export default function TablaAgregada({ data, showEmpresa = false, onColumnsChange }: Props) {
  const { data: session } = useSession();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});
  const [configLoaded, setConfigLoaded] = useState(false);

  // Cargar configuración de columnas al montar el componente
  useEffect(() => {
    const loadConfig = async () => {
      if (!session?.user?.id) return;
      
      try {
        const config = await ColumnConfigManager.getConfig(session.user.id, 'recibos');
        if (config) {
          setVisibleColumns(config.visibleColumns);
          setColumnAliases(config.columnAliases);
        }
      } catch (error) {
        console.error('Error loading column config:', error);
      } finally {
        setConfigLoaded(true);
      }
    };

    loadConfig();
  }, [session?.user?.id]);

  const enriched = useMemo(() => {
    // Validar que data sea un array válido
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    return data.map((r) => ({
      key: r.key,
      legajo: r.legajo,
      nombre: r.nombre || '',
      periodo: r.periodo,
      archivo: r.archivos ? r.archivos.join(', ') : '',
      data: r.data,
    }));
  }, [data]);

  // Obtener todas las columnas únicas de los datos, excluyendo duplicados
  const allColumns = useMemo(() => {
    const columns = new Set<string>();
    
    // Agregar columnas fijas que se pueden mostrar/ocultar
    columns.add('PERIODO');
    columns.add('ARCHIVO');
    if (showEmpresa) {
      columns.add('EMPRESA');
    }
    
    // Agregar columnas de datos
    enriched.forEach(item => {
      if (item.data) {
        Object.keys(item.data).forEach(key => {
          // Excluir columnas duplicadas y de texto
          if (key !== 'TEXTO_COMPLETO' && 
              key !== 'PRIMERAS_LINEAS' && 
              key !== 'CUIL' && 
              key !== 'NOMBRE' && 
              key !== 'NRO. DE CUIL' &&
              key !== 'PERIODO' && // Ya agregado arriba
              key !== 'ARCHIVO' && // Ya agregado arriba
              key !== 'EMPRESA') { // Ya agregado arriba si showEmpresa
            columns.add(key);
          }
        });
      }
    });
    return Array.from(columns).sort();
  }, [enriched, showEmpresa]);

  // Inicializar columnas visibles si no están configuradas
  const displayColumns = useMemo(() => {
    if (visibleColumns.length === 0) {
      return allColumns; // Mostrar todas por defecto
    }
    return visibleColumns;
  }, [visibleColumns, allColumns]);

  const handleColumnsChange = async (newVisibleColumns: string[], newAliases: Record<string, string>) => {
    setVisibleColumns(newVisibleColumns);
    setColumnAliases(newAliases);
    onColumnsChange?.(newVisibleColumns, newAliases);
    
    // Guardar configuración en la base de datos
    if (session?.user?.id) {
      try {
        await ColumnConfigManager.saveConfig(
          session.user.id, 
          'recibos', 
          newVisibleColumns, 
          newAliases
        );
      } catch (error) {
        console.error('Error saving column config:', error);
      }
    }
  };

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData,
    setCurrentPage,
    setItemsPerPage
  } = usePagination({
    data: enriched,
    initialItemsPerPage: 25
  });

  if (enriched.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Mostrando {displayColumns.length} de {allColumns.length} columnas
        </div>
        <ColumnSelector
          columns={allColumns}
          onColumnsChange={handleColumnsChange}
          initialVisible={visibleColumns}
          initialAliases={columnAliases}
        />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Legajo</TableHead>
              <TableHead>Nombre</TableHead>
              {displayColumns.includes('PERIODO') && <TableHead>Período</TableHead>}
              {displayColumns.includes('EMPRESA') && <TableHead>Empresa</TableHead>}
              {displayColumns.includes('ARCHIVO') && <TableHead>Archivo</TableHead>}
              {displayColumns.filter(col => !['PERIODO', 'EMPRESA', 'ARCHIVO'].includes(col)).map(column => (
                <TableHead key={column} className="text-right">
                  {columnAliases[column] || column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.legajo}</TableCell>
                <TableCell>{row.nombre}</TableCell>
                {displayColumns.includes('PERIODO') && (
                  <TableCell>{row.periodo}</TableCell>
                )}
                {displayColumns.includes('EMPRESA') && (
                  <TableCell>{row.data?.EMPRESA || extractEmpresaFromArchivo(row.archivo)}</TableCell>
                )}
                {displayColumns.includes('ARCHIVO') && (
                  <TableCell className="text-sm text-gray-500">{row.archivo}</TableCell>
                )}
                {displayColumns.filter(col => !['PERIODO', 'EMPRESA', 'ARCHIVO'].includes(col)).map(column => (
                  <TableCell key={column} className="text-right">
                    {fmtNumber(row.data?.[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}