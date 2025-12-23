// components/TablaAgregada/TablaAgregada.tsx
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import ColumnConfigWithPreview from '@/components/ColumnConfigWithPreview';
// import { ColumnConfigManager } from '@/lib/column-config-manager'; // ELIMINADO
import PdfViewerModal from '@/components/PdfViewerModal';
import type { ConsolidatedEntity } from '@/lib/repo';

type Props = {
  data: ConsolidatedEntity[];
  showEmpresa?: boolean;
  onColumnsChange?: (visibleColumns: string[], aliases: Record<string, string>) => void;
  onEditRow?: (row: ConsolidatedEntity) => void;
  onDeleteRow?: (row: ConsolidatedEntity) => void;
  onDeleteRows?: (rows: ConsolidatedEntity[]) => void;
  onReReadOCR?: (rows: ConsolidatedEntity[]) => void;
  onMarkAsReviewed?: (rows: ConsolidatedEntity[]) => void;
  onCellEdit?: (row: ConsolidatedEntity, field: string, newValue: string) => Promise<void>;
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

export default function TablaAgregada({ data, showEmpresa = false, onColumnsChange, onEditRow, onDeleteRow, onDeleteRows, onReReadOCR, onMarkAsReviewed, onCellEdit }: Props) {
  const { data: session } = useSession();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Estados para selección múltiple
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Estados para edición in-line
  const [editingCell, setEditingCell] = useState<{ rowKey: string; column: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [hoveredCell, setHoveredCell] = useState<{ rowKey: string; column: string } | null>(null);
  
  // Funciones para edición in-line
  const handleCellHover = (row: ConsolidatedEntity, column: string) => {
    if (!onCellEdit) return; // Solo si hay callback
    if (editingCell?.rowKey === row.key && editingCell?.column === column) return; // Ya está editando
    const value = row.data?.[column] || '';
    setHoveredCell({ rowKey: row.key, column });
    setEditingValue(value); // Inicializar con el valor actual
  };

  const handleCellLeave = () => {
    // Solo quitar hover si no está editando
    if (!editingCell) {
      setHoveredCell(null);
    }
  };

  const handleCellFocus = (row: ConsolidatedEntity, column: string) => {
    if (!onCellEdit) return;
    const value = row.data?.[column] || '';
    setEditingCell({ rowKey: row.key, column });
    setEditingValue(value);
    setHoveredCell(null); // Ya está en modo edición
  };

  const handleCellSave = async (row: ConsolidatedEntity, column: string) => {
    if (!onCellEdit) return;
    
    const oldValue = row.data?.[column] || '';
    const newValue = editingValue.trim();
    
    // Si no cambió, cancelar
    if (oldValue === newValue) {
      setEditingCell(null);
      setEditingValue('');
      return;
    }
    
    try {
      await onCellEdit(row, column, newValue);
      setEditingCell(null);
      setEditingValue('');
    } catch (error) {
      console.error('Error guardando celda:', error);
      toast.error('Error guardando el cambio');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingValue('');
    setHoveredCell(null);
  };
  
  // Limpiar selección cuando cambian los datos (para evitar estados inconsistentes)
  // Usar una referencia para comparar si los datos realmente cambiaron
  const prevDataRef = useRef<ConsolidatedEntity[]>([]);
  
  useEffect(() => {
    // Comparar por keys para detectar cambios reales
    const prevKeys = new Set(prevDataRef.current.map(r => r.key));
    const currentKeys = new Set(data.map(r => r.key));
    
    // Si las keys son diferentes, limpiar selección y edición
    const keysChanged = prevKeys.size !== currentKeys.size || 
                       Array.from(currentKeys).some(key => !prevKeys.has(key));
    
    if (keysChanged) {
      setSelectedRows(new Set());
      setEditingCell(null);
      setEditingValue('');
      prevDataRef.current = data;
    }
  }, [data]);
  
  // Estados para el modal de PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>('');
  const [selectedReceiptData, setSelectedReceiptData] = useState<{
    legajo: string;
    nombre: string;
    periodo: string;
    empresa?: string;
    archivo: string;
  } | null>(null);

  // Columnas fijas que siempre se muestran
  const fixedColumns = ['PERIODO'];
  if (showEmpresa) {
    fixedColumns.push('EMPRESA');
  }

  const { dataManager } = useCentralizedDataManager();

  // Cargar configuración de columnas al montar el componente - SOLO UNA VEZ
  // NO bloquear renders posteriores con esta carga
  useEffect(() => {
    // Si no hay session o data, inicializar rápido sin consulta
    if (!session?.user?.id || !data || !Array.isArray(data)) {
      setConfigLoaded(true);
      return;
    }
    
    // Evitar recargar si ya se cargó una vez
    if (configLoaded) return;
    
    // Cargar configuración en segundo plano SIN BLOQUEAR el render
    // Usar un flag para evitar múltiples ejecuciones
    let isMounted = true;
    let hasLoaded = false;
    
    // Usar requestIdleCallback o setTimeout para no bloquear el hilo principal
    const loadConfig = async () => {
      if (hasLoaded || !isMounted) return;
      hasLoaded = true;
      
      try {
        // Cargar configuración desde app_config usando dataManager
        const configKey = 'column_config_recibos';
        const config = await dataManager.getAppConfig(configKey);
        
        if (!isMounted) return; // Evitar actualizar si el componente se desmontó
        
        if (config && typeof config === 'object' && 'visibleColumns' in config) {
          // Filtrar columnas problemáticas de la configuración guardada
          const cleanVisibleColumns = (config.visibleColumns as string[]).filter(col => 
            col !== 'MANUA' && 
            col !== 'FECHA_CREACION' && 
            col !== 'GUARDAR' && 
            col !== 'EMPRESA_DETECTADA' &&
            col !== 'LEGAJO' && // Evitar duplicado
            col !== 'fileHash' && // Campo interno
            col !== 'filename' && // Campo interno
            col !== 'FILENAME' && // Campo interno
            col !== 'FILEHASH' && // Campo interno
            !col.includes('_DETECTADA') &&
            !col.includes('_CREACION') &&
            !col.includes('_SISTEMA')
          );
          
          // Combinar columnas fijas con las configurables guardadas
          const allVisibleColumns = [...fixedColumns, ...cleanVisibleColumns];
          setVisibleColumns(allVisibleColumns);
          setColumnAliases((config.columnAliases as Record<string, string>) || {});
        } else {
          // Si no hay configuración guardada, inicializar con columnas fijas + todas las configurables
          // Usar allColumns que está definido más abajo como useMemo
          const allCols = Array.from(new Set(
            data?.flatMap((r: any) => r.data ? Object.keys(r.data) : []) || []
          )).filter((col: string) => 
            col !== 'TEXTO_COMPLETO' && 
            col !== 'PRIMERAS_LINEAS' && 
            col !== 'CUIL' && 
            col !== 'CUIL_NORM' &&
            col !== 'NOMBRE' && 
            col !== 'NRO. DE CUIL' &&
            col !== 'LEGAJO' &&
            col !== 'PERIODO' &&
            col !== 'ARCHIVO' &&
            col !== 'EMPRESA' &&
            col !== 'MANUA' && 
            col !== 'FECHA_CREACION' && 
            col !== 'GUARDAR' &&
            col !== 'EMPRESA_DETECTADA' && 
            col !== 'fileHash' &&
            col !== 'filename' &&
            col !== 'FILENAME' &&
            col !== 'FILEHASH' &&
            !col.includes('_DETECTADA') && 
            !col.includes('_CREACION') && 
            !col.includes('_SISTEMA')
          );
          const allVisibleColumns = [...fixedColumns, ...allCols];
          setVisibleColumns(allVisibleColumns);
          setColumnAliases({});
        }
      } catch (error) {
        console.error('Error loading column config:', error);
      } finally {
        if (isMounted) {
          setConfigLoaded(true);
        }
      }
    };
    
    // Ejecutar en el siguiente frame sin bloquear
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => loadConfig(), { timeout: 100 });
    } else {
      setTimeout(() => loadConfig(), 0);
    }
    
    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]); // SOLO depender de session, NO de dataManager ni data para evitar recargas

  const enriched = useMemo(() => {
    // Validar que data sea un array válido
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    return data.map((r) => {
      // Obtener archivo desde múltiples fuentes posibles:
      // 1. r.archivos (array JSONB directo)
      // 2. r.data.filename (campo dentro de data)
      // 3. r.data.ARCHIVO (campo legacy)
      let archivo = '';
      if (r.archivos && Array.isArray(r.archivos) && r.archivos.length > 0) {
        archivo = r.archivos.join(', ');
      } else if (r.data?.filename) {
        archivo = r.data.filename;
      } else if (r.data?.ARCHIVO) {
        archivo = r.data.ARCHIVO;
      }
      
      return {
        key: r.key,
        legajo: r.legajo,
        nombre: r.nombre || '',
        periodo: r.periodo,
        archivo: archivo,
        archivos: r.archivos || (archivo ? [archivo] : []), // Asegurar que archivos esté presente
        data: r.data,
      };
    });
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
              key !== 'CUIL_NORM' && // Columna interna - no mostrar
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
              key !== 'fileHash' && // Campo interno - no mostrar
              key !== 'filename' && // Campo interno - no mostrar
              key !== 'FILENAME' && // Campo interno - no mostrar
              key !== 'FILEHASH' && // Campo interno - no mostrar
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

  // Columnas configurables (excluyendo las fijas)
  const configurableColumns = allColumns.filter(col => !fixedColumns.includes(col));
  
  // Inicializar columnas visibles si no están configuradas
  const displayColumns = useMemo(() => {
    // Si aún no se ha cargado la configuración, mostrar todas las columnas configurables
    if (!configLoaded) {
      return [...fixedColumns, ...configurableColumns];
    }
    
    // Combinar columnas fijas con las configurables seleccionadas
    const selectedConfigurableColumns = visibleColumns.filter(col => !fixedColumns.includes(col));
    return [...fixedColumns, ...selectedConfigurableColumns];
  }, [visibleColumns, configurableColumns, configLoaded, fixedColumns]);

  const handleColumnsChange = async (newVisibleColumns: string[], newAliases: Record<string, string>) => {
    // Filtrar columnas problemáticas antes de guardar
    const cleanVisibleColumns = newVisibleColumns.filter(col => 
      col !== 'MANUA' && 
      col !== 'FECHA_CREACION' && 
      col !== 'GUARDAR' && 
      col !== 'EMPRESA_DETECTADA' &&
      col !== 'LEGAJO' && // Evitar duplicado
      col !== 'fileHash' && // Campo interno
      col !== 'filename' && // Campo interno
      col !== 'FILENAME' && // Campo interno
      col !== 'FILEHASH' && // Campo interno
      !col.includes('_DETECTADA') &&
      !col.includes('_CREACION') &&
      !col.includes('_SISTEMA')
    );
    
    // Combinar columnas fijas con las configurables seleccionadas
    const allVisibleColumns = [...fixedColumns, ...cleanVisibleColumns];
    
    setVisibleColumns(allVisibleColumns);
    setColumnAliases(newAliases);
    onColumnsChange?.(allVisibleColumns, newAliases);
    
    // Guardar configuración en la base de datos (solo las configurables)
    if (session?.user?.id) {
      try {
        const configKey = 'column_config_recibos';
        const configValue = {
          visibleColumns: cleanVisibleColumns,
          columnAliases: newAliases,
          updatedAt: new Date().toISOString()
        };
        await dataManager.setAppConfig(configKey, configValue);
      } catch (error) {
        console.error('Error saving column config:', error);
      }
    }
  };

  // Función para limpiar configuración de columnas
  const handleResetColumns = async () => {
    if (session?.user?.id) {
      try {
        // await ColumnConfigManager.deleteConfig(session.user.id, 'recibos'); // ELIMINADO
        console.log('TODO: Implementar deleteConfig con dataManager', session.user.id, 'recibos');
        setVisibleColumns([]);
        setColumnAliases({});
        onColumnsChange?.([], {});
      } catch (error) {
        console.error('Error resetting column config:', error);
      }
    }
  };

  const handleFileClick = async (filename: string, e: React.MouseEvent<HTMLAnchorElement>, rowData?: any) => {
    e.preventDefault();
    
    try {
      // Limpiar el nombre del archivo (quitar espacios extra)
      const cleanFilename = filename.trim();
      
      // Usar /api/get-pdf que tiene búsqueda flexible de archivos
      // Esto maneja variaciones en los nombres (con/sin paréntesis, etc.)
      const response = await fetch(`/api/get-pdf?filename=${encodeURIComponent(cleanFilename)}`);
      
      if (response.ok) {
        // El archivo existe, obtener la URL real del PDF
        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);
        setSelectedPdfUrl(pdfUrl);
        
        // Preparar datos del recibo para el modal
        if (rowData) {
          setSelectedReceiptData({
            legajo: rowData.legajo || '',
            nombre: rowData.nombre || '',
            periodo: rowData.periodo || '',
            empresa: rowData.data?.EMPRESA || extractEmpresaFromArchivo(rowData.archivo),
            archivo: cleanFilename
          });
        }
        
        setShowPdfModal(true);
        console.log(`✅ Archivo encontrado y abierto en modal: ${cleanFilename}`);
      } else {
        // El archivo no existe, mostrar mensaje con sugerencias
        const suggestions = await getFileSuggestions(cleanFilename);
        alert(`El archivo "${cleanFilename}" no se encuentra en el servidor.\n\nEsto puede deberse a:\n- El archivo fue eliminado\n- El nombre cambió\n- Error en la base de datos\n\n${suggestions}`);
        console.warn(`❌ Archivo no encontrado: ${cleanFilename} (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Error verificando archivo:', error);
      alert(`Error al verificar el archivo "${filename}". Por favor, intente más tarde.`);
    }
  };

  const handleClosePdfModal = () => {
    setShowPdfModal(false);
    setSelectedPdfUrl('');
    setSelectedReceiptData(null);
  };

  const handleNavigateToReceipt = () => {
    // Esta función se puede usar para navegar de vuelta a la lista
    // Por ahora solo cerramos el modal
    handleClosePdfModal();
  };

  const getFileSuggestions = async (filename: string): Promise<string> => {
    try {
      // Buscar archivos similares en el servidor
      const response = await fetch('/api/cleanup-files', { method: 'POST' });
      const result = await response.json();
      
      if (result.success && result.totalFiles > 0) {
        return `Se encontraron ${result.totalFiles} archivos PDF en el servidor. Es posible que el nombre del archivo haya cambiado.`;
      } else {
        return 'No se encontraron archivos PDF en el servidor.';
      }
    } catch (error) {
      return 'No se pudo verificar los archivos del servidor.';
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
          {selectedRows.size > 0 && (
            <span className="ml-2 text-blue-600 font-medium">
              ({selectedRows.size} seleccionado{selectedRows.size > 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedRows.size > 0 && (
            <>
              {onReReadOCR && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedData = paginatedData.filter(row => selectedRows.has(row.key));
                    if (selectedData.length > 0) {
                      onReReadOCR(selectedData);
                    }
                  }}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  🔄 Releer datos x OCR ({selectedRows.size})
                </Button>
              )}
              {onDeleteRows && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const selectedData = data.filter(row => selectedRows.has(row.key));
                    if (selectedData.length > 0) {
                      onDeleteRows(selectedData);
                    }
                  }}
                  className="bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
                >
                  🗑️ Eliminar ({selectedRows.size})
                </Button>
              )}
              {onMarkAsReviewed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedData = data.filter(row => selectedRows.has(row.key));
                    if (selectedData.length > 0) {
                      onMarkAsReviewed(selectedData);
                    }
                  }}
                  className="bg-green-50 text-green-700 hover:bg-green-100 border-green-300"
                >
                  ✅ Marcar como revisado ({selectedRows.size})
                </Button>
              )}
            </>
          )}
          {/* Selector para seleccionar todos los recibos de una empresa */}
          {(() => {
            const empresas = new Set<string>();
            enriched.forEach(row => {
              const empresa = row.data?.EMPRESA || extractEmpresaFromArchivo(row.archivo);
              if (empresa && empresa !== 'N/A' && empresa !== 'DESCONOCIDA') {
                empresas.add(empresa);
              }
            });
            const empresasArray = Array.from(empresas).sort();
            
            if (empresasArray.length > 0) {
              return (
                <Select
                  onValueChange={(empresaTarget) => {
                    if (empresaTarget) {
                      const empresaRows = enriched.filter(row => {
                        const rowEmpresa = row.data?.EMPRESA || extractEmpresaFromArchivo(row.archivo);
                        return rowEmpresa === empresaTarget;
                      });
                      setSelectedRows(new Set(empresaRows.map(r => r.key)));
                      toast.success(`${empresaRows.length} recibos de ${empresaTarget} seleccionados`);
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px] bg-purple-50 text-purple-700 hover:bg-purple-100">
                    <SelectValue placeholder="🏢 Seleccionar por empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresasArray.map(empresa => (
                      <SelectItem key={empresa} value={empresa}>
                        {empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }
            return null;
          })()}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetColumns}
            title="Resetear configuración de columnas"
          >
            Reset
          </Button>
          <ColumnConfigWithPreview
            columns={configurableColumns}
            onColumnsChange={handleColumnsChange}
            initialVisible={visibleColumns.filter(col => !fixedColumns.includes(col))}
            initialAliases={columnAliases}
            fixedColumns={fixedColumns}
          />
        </div>
      </div>
      <div className="overflow-x-auto max-w-full">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={paginatedData.length > 0 && paginatedData.every(row => selectedRows.has(row.key))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(paginatedData.map(row => row.key)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  className="cursor-pointer"
                />
              </TableHead>
              {(onEditRow || onDeleteRow) && (
                <TableHead className="w-20 sticky left-0 bg-white z-10 border-r">
                  <span className="hidden lg:inline">Acciones</span>
                  <span className="lg:hidden">Act</span>
                </TableHead>
              )}
              <TableHead>Legajo</TableHead>
              <TableHead>Nombre</TableHead>
              {displayColumns.includes('PERIODO') && <TableHead>Período</TableHead>}
              {displayColumns.includes('EMPRESA') && <TableHead>Empresa</TableHead>}
              {displayColumns.includes('ARCHIVO') && <TableHead>Archivo</TableHead>}
              {displayColumns.filter(col => !['PERIODO', 'EMPRESA', 'ARCHIVO', 'fileHash', 'filename', 'FILENAME', 'FILEHASH'].includes(col)).map(column => (
                <TableHead key={column} className="text-right">
                  {columnAliases[column] || column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => {
              // Verificar si tiene todos los campos obligatorios
              // SIEMPRE verificar campos directamente, independientemente de metadata
              const legajo = row.legajo?.trim() || '';
              const nombre = row.nombre?.trim() || '';
              const empresa = row.data?.EMPRESA?.trim() || '';
              const cuil = row.data?.CUIL?.trim() || row.data?.DNI?.trim() || '';
              const categoria = row.data?.CATEGORIA?.trim() || row.data?.CATEGORÍA?.trim() || '';
              
              // Determinar qué campos faltan
              const missingFields: string[] = [];
              if (!legajo) missingFields.push('LEGAJO');
              if (!empresa || empresa === 'DESCONOCIDA' || empresa === 'N/A') missingFields.push('EMPRESA');
              if (!cuil) missingFields.push('CUIL/DNI');
              if (!nombre) missingFields.push('NOMBRE');
              if (!categoria) missingFields.push('CATEGORIA');
              
              // Siempre marcar como incompleto si falta algún campo
              const isIncomplete = missingFields.length > 0;
              
              const isSelected = selectedRows.has(row.key);
              
              // Determinar el archivo a mostrar (ConsolidatedEntity usa archivos[])
              const archivo = (row.archivos && row.archivos.length > 0 ? row.archivos[0] : '');
              
              // Verificar si el recibo fue revisado o modificado
              const isReviewed = row.data?._reviewed === true || row.data?._reviewed === 'true';
              const isModified = row.data?._modified === true || row.data?._modified === 'true';
              
              return (
              <TableRow 
                key={row.key}
                className={`
                  ${isSelected ? '!bg-blue-300 border-l-4 border-l-blue-700 font-medium' : ''}
                  ${isIncomplete && !isSelected ? '!bg-yellow-200 border-l-4 border-l-yellow-600' : ''}
                  ${isIncomplete && isSelected ? '!bg-blue-400 border-l-4 border-l-blue-800' : ''}
                  ${isReviewed && !isSelected && !isIncomplete ? '!bg-green-50 border-l-4 border-l-green-500' : ''}
                  ${isModified && !isSelected && !isIncomplete && !isReviewed ? '!bg-purple-50 border-l-4 border-l-purple-500' : ''}
                  ${isReviewed && isSelected ? '!bg-green-200 border-l-4 border-l-green-700' : ''}
                  ${isModified && isSelected && !isReviewed ? '!bg-purple-200 border-l-4 border-l-purple-700' : ''}
                  transition-colors
                `}
              >
                <TableCell className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.key)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedRows);
                      if (e.target.checked) {
                        newSelected.add(row.key);
                      } else {
                        newSelected.delete(row.key);
                      }
                      setSelectedRows(newSelected);
                    }}
                    className="cursor-pointer"
                  />
                </TableCell>
                {(onEditRow || onDeleteRow) && (
                  <TableCell className="w-20 sticky left-0 bg-white z-10 border-r">
                    <div className="flex gap-1">
                      {onEditRow && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditRow({
                            ...row,
                            archivos: row.archivos || (archivo ? [archivo] : [])
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
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteRow(row);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {row.legajo}
                    {isIncomplete && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5" title={`Campos faltantes: ${missingFields.join(', ')}`}>
                        ⚠️ {missingFields.length} faltante{missingFields.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{row.nombre}</TableCell>
                {displayColumns.includes('PERIODO') && (
                  <TableCell>{row.periodo}</TableCell>
                )}
                {displayColumns.includes('EMPRESA') && (
                  <TableCell>{row.data?.EMPRESA || extractEmpresaFromArchivo(archivo)}</TableCell>
                )}
                {displayColumns.includes('ARCHIVO') && (
                  <TableCell className="text-sm text-gray-500">
                    {(() => {
                      const archivosArray = row.archivos && Array.isArray(row.archivos) ? row.archivos : 
                                           (archivo ? [archivo] : []);
                      
                      if (archivosArray.length === 0) return null;
                      
                      return (
                        <div className="space-y-1">
                          {archivosArray.length > 1 ? (
                            // Múltiples archivos
                            <div className="space-y-0.5">
                              {archivosArray.map((filename, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-4">#{index + 1}</span>
                                  <a 
                                    href={`/recibos/${encodeURIComponent(filename.trim())}`} 
                                    onClick={(e) => handleFileClick(filename.trim(), e, row)}
                                    className="text-gray-600 hover:text-gray-800 underline cursor-pointer text-xs flex-1 transition-colors"
                                    title="Verificar y abrir PDF del recibo"
                                  >
                                    {filename.trim()}
                                  </a>
                                  <span className="text-xs text-gray-400" title="Hacer clic para verificar si el archivo existe">
                                    📄
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Un solo archivo
                            <div className="flex items-center gap-2">
                              <a 
                                href={`/recibos/${encodeURIComponent(archivosArray[0])}`} 
                                onClick={(e) => handleFileClick(archivosArray[0], e, row)}
                                className="text-gray-600 hover:text-gray-800 underline cursor-pointer transition-colors"
                                title="Verificar y abrir PDF del recibo"
                              >
                                {archivosArray[0]}
                              </a>
                              <span className="text-xs text-gray-400" title="Hacer clic para verificar si el archivo existe">
                                📄
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                )}
                {displayColumns.filter(col => !['PERIODO', 'EMPRESA', 'ARCHIVO', 'fileHash', 'filename', 'FILENAME', 'FILEHASH'].includes(col)).map(column => {
                  // Campos de texto que NO deben usar fmtNumber
                  const textFields = ['CATEGORIA', 'CATEGORÍA', 'PUESTO', 'CLASIFICACION', 'CARGO', 'FUNCION', 'NOMBRE', 'LEGAJO'];
                  const value = row.data?.[column];
                  
                  // Debug para TOTAL (solo en desarrollo y solo si el valor está presente pero no se muestra)
                  if (column === 'TOTAL' && process.env.NODE_ENV === 'development' && row.data && 'TOTAL' in row.data && !value) {
                    console.warn(`⚠️ TablaAgregada - TOTAL está en row.data pero value es falsy para ${row.key}:`, row.data.TOTAL, 'row.data:', Object.keys(row.data));
                  }
                  
                  // Si es un campo de texto, mostrar directamente; si no, usar fmtNumber
                  if (textFields.includes(column)) {
                    const isEditing = editingCell?.rowKey === row.key && editingCell?.column === column;
                    const isHovered = hoveredCell?.rowKey === row.key && hoveredCell?.column === column;
                    const canEdit = onCellEdit !== undefined;
                    
                    return (
                      <TableCell 
                        key={column} 
                        className="text-left"
                        onMouseEnter={canEdit ? () => handleCellHover(row, column) : undefined}
                        onMouseLeave={canEdit ? handleCellLeave : undefined}
                        style={canEdit ? { cursor: 'pointer' } : undefined}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellSave(row, column);
                                } else if (e.key === 'Escape') {
                                  handleCellCancel();
                                }
                              }}
                              className="h-7 text-sm flex-1"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellSave(row, column);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellCancel();
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : isHovered && canEdit ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingValue || value || ''}
                              onChange={(e) => {
                                setEditingValue(e.target.value);
                                // Entrar en modo edición cuando se empieza a escribir
                                if (!editingCell || editingCell.rowKey !== row.key || editingCell.column !== column) {
                                  handleCellFocus(row, column);
                                  // Actualizar el valor después de entrar en modo edición
                                  setTimeout(() => {
                                    setEditingValue(e.target.value);
                                  }, 0);
                                }
                              }}
                              onFocus={() => {
                                if (!editingCell || editingCell.rowKey !== row.key || editingCell.column !== column) {
                                  handleCellFocus(row, column);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (!editingCell || editingCell.rowKey !== row.key || editingCell.column !== column) {
                                    handleCellFocus(row, column);
                                    setTimeout(() => {
                                      handleCellSave(row, column);
                                    }, 50);
                                  } else {
                                    handleCellSave(row, column);
                                  }
                                } else if (e.key === 'Escape') {
                                  handleCellCancel();
                                }
                              }}
                              className="h-7 text-sm flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!editingCell || editingCell.rowKey !== row.key || editingCell.column !== column) {
                                  handleCellFocus(row, column);
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!editingCell || editingCell.rowKey !== row.key || editingCell.column !== column) {
                                  handleCellFocus(row, column);
                                  // Esperar un momento para que se actualice el estado
                                  await new Promise(resolve => setTimeout(resolve, 50));
                                }
                                handleCellSave(row, column);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellCancel();
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <span className={canEdit ? 'hover:bg-gray-100 px-1 rounded' : ''}>
                            {value || ''}
                          </span>
                        )}
                      </TableCell>
                    );
                  }
                  
                  // Campos numéricos (códigos como 20500, etc.)
                  return (
                    <TableCell key={column} className="text-right">
                      {fmtNumber(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
            })}
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

      {/* Modal de visualización de PDF */}
      <PdfViewerModal
        open={showPdfModal}
        onClose={handleClosePdfModal}
        pdfUrl={selectedPdfUrl}
        receiptData={selectedReceiptData}
        onNavigateToReceipt={handleNavigateToReceipt}
      />
    </div>
  );
}