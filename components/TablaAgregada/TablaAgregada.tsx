// components/TablaAgregada/TablaAgregada.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import ColumnConfigWithPreview from '@/components/ColumnConfigWithPreview';
import { ColumnConfigManager } from '@/lib/column-config-manager';
import type { ConsolidatedEntity } from '@/lib/repo';

type Props = {
  data: ConsolidatedEntity[];
  showEmpresa?: boolean;
  onColumnsChange?: (visibleColumns: string[], aliases: Record<string, string>) => void;
  onEditRow?: (row: ConsolidatedEntity) => void;
  onDeleteRow?: (row: ConsolidatedEntity) => void;
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

export default function TablaAgregada({ data, showEmpresa = false, onColumnsChange, onEditRow, onDeleteRow }: Props) {
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
          // Filtrar columnas problemáticas de la configuración guardada
          const cleanVisibleColumns = config.visibleColumns.filter(col => 
            col !== 'MANUA' && 
            col !== 'FECHA_CREACION' && 
            col !== 'GUARDAR' && 
            col !== 'EMPRESA_DETECTADA' &&
            col !== 'LEGAJO' && // Evitar duplicado
            !col.includes('_DETECTADA') &&
            !col.includes('_CREACION') &&
            !col.includes('_SISTEMA')
          );
          
          setVisibleColumns(cleanVisibleColumns);
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
          // Excluir columnas duplicadas, de texto y columnas que no deberían mostrarse
          if (key !== 'TEXTO_COMPLETO' && 
              key !== 'PRIMERAS_LINEAS' && 
              key !== 'CUIL' && 
              key !== 'NOMBRE' && 
              key !== 'NRO. DE CUIL' &&
              key !== 'LEGAJO' && // Evitar duplicado con la columna fija
              key !== 'PERIODO' && // Ya agregado arriba
              key !== 'ARCHIVO' && // Ya agregado arriba
              key !== 'EMPRESA' && // Ya agregado arriba si showEmpresa
              key !== 'MANUA' && // Columna innecesaria
              key !== 'FECHA_CREACION' && // Columna de sistema
              key !== 'GUARDAR' && // Columna de sistema
              key !== 'EMPRESA_DETECTADA' && // Columna de sistema
              !key.includes('_DETECTADA') && // Evitar columnas de detección
              !key.includes('_CREACION') && // Evitar columnas de creación
              !key.includes('_SISTEMA')) { // Evitar columnas de sistema
            columns.add(key);
          }
        });
      }
    });
    return Array.from(columns).sort();
  }, [enriched, showEmpresa]);

  // Inicializar columnas visibles si no están configuradas
  const displayColumns = useMemo(() => {
    if (visibleColumns.length === 0 && !configLoaded) {
      return allColumns; // Mostrar todas por defecto solo mientras se carga la configuración
    }
    return visibleColumns.length > 0 ? visibleColumns : allColumns;
  }, [visibleColumns, allColumns, configLoaded]);

  const handleColumnsChange = async (newVisibleColumns: string[], newAliases: Record<string, string>) => {
    // Filtrar columnas problemáticas antes de guardar
    const cleanVisibleColumns = newVisibleColumns.filter(col => 
      col !== 'MANUA' && 
      col !== 'FECHA_CREACION' && 
      col !== 'GUARDAR' && 
      col !== 'EMPRESA_DETECTADA' &&
      col !== 'LEGAJO' && // Evitar duplicado
      !col.includes('_DETECTADA') &&
      !col.includes('_CREACION') &&
      !col.includes('_SISTEMA')
    );
    
    setVisibleColumns(cleanVisibleColumns);
    setColumnAliases(newAliases);
    onColumnsChange?.(cleanVisibleColumns, newAliases);
    
    // Guardar configuración en la base de datos
    if (session?.user?.id) {
      try {
        await ColumnConfigManager.saveConfig(
          session.user.id, 
          'recibos', 
          cleanVisibleColumns, 
          newAliases
        );
      } catch (error) {
        console.error('Error saving column config:', error);
      }
    }
  };

  // Función para limpiar configuración de columnas
  const handleResetColumns = async () => {
    if (session?.user?.id) {
      try {
        await ColumnConfigManager.deleteConfig(session.user.id, 'recibos');
        setVisibleColumns([]);
        setColumnAliases({});
        onColumnsChange?.([], {});
      } catch (error) {
        console.error('Error resetting column config:', error);
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetColumns}
            title="Resetear configuración de columnas"
          >
            Reset
          </Button>
          <ColumnConfigWithPreview
            columns={allColumns}
            onColumnsChange={handleColumnsChange}
            initialVisible={visibleColumns}
            initialAliases={columnAliases}
          />
        </div>
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
              {(onEditRow || onDeleteRow) && <TableHead className="w-24">Acciones</TableHead>}
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
                {(onEditRow || onDeleteRow) && (
                  <TableCell>
                    <div className="flex gap-1">
                      {onEditRow && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditRow({
                            ...row,
                            archivos: [row.archivo]
                          })}
                          className="h-8 w-8 p-0"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteRow && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteRow({
                            ...row,
                            archivos: [row.archivo]
                          })}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
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