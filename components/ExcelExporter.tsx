'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { ConsolidatedEntity } from '@/lib/repo';

interface ExcelExporterProps {
  data: ConsolidatedEntity[];
  showEmpresa?: boolean;
  fileName?: string;
  visibleColumns?: string[];
  columnAliases?: Record<string, string>;
}

export default function ExcelExporter({ 
  data, 
  showEmpresa = false, 
  fileName = 'recibos',
  visibleColumns = [],
  columnAliases = {}
}: ExcelExporterProps) {
  
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Función para extraer empresa del archivo
    const extractEmpresaFromArchivo = (archivo: string): string => {
      if (!archivo) return 'N/A';
      const archivoUpper = archivo.toUpperCase();
      if (archivoUpper.includes('LIME')) return 'LIME';
      if (archivoUpper.includes('LIMPAR')) return 'LIMPAR';
      if (archivoUpper.includes('SUMAR')) return 'SUMAR';
      if (archivoUpper.includes('TYSA')) return 'TYSA';
      if (archivoUpper.includes('ESTRATEGIA AMBIENTAL')) return 'ESTRATEGIA AMBIENTAL';
      if (archivoUpper.includes('ESTRATEGIA URBANA')) return 'ESTRATEGIA URBANA';
      return 'N/A';
    };

    // Ordenar columnas: LEGAJO y NOMBRE primero, luego PERIODO, EMPRESA, ARCHIVO, luego el resto
    const priorityColumns = ['PERIODO', 'EMPRESA', 'ARCHIVO'];
    const sortedVisibleColumns = [
      ...priorityColumns.filter(col => visibleColumns.includes(col)),
      ...visibleColumns.filter(col => !priorityColumns.includes(col))
    ];

    // Preparar los datos para exportar usando solo las columnas visibles
    const exportData = data.map(item => {
      const row: Record<string, any> = {};

      // Siempre agregar LEGAJO y NOMBRE primero
      row['Legajo'] = item.legajo;
      row['Nombre'] = item.nombre || '';

      // Agregar solo las columnas visibles en el orden correcto
      sortedVisibleColumns.forEach(column => {
        const alias = columnAliases[column] || column;
        
        switch (column) {
          case 'PERIODO':
            row[alias] = item.periodo;
            break;
          case 'EMPRESA':
            row[alias] = item.data?.EMPRESA || extractEmpresaFromArchivo(item.archivos ? item.archivos.join(', ') : '');
            break;
          case 'ARCHIVO':
            row[alias] = item.archivos ? item.archivos.join(', ') : '';
            break;
          default:
            // Columnas de datos numéricos
            if (item.data && item.data[column] !== undefined) {
              row[alias] = item.data[column];
            }
            break;
        }
      });

      return row;
    });

    // Crear el libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Ajustar el ancho de las columnas
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Recibos');

    // Generar el nombre del archivo con fecha
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const finalFileName = `${fileName}_${dateStr}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(wb, finalFileName);
  };

  return (
    <Button 
      onClick={exportToExcel}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Exportar a Excel
    </Button>
  );
}
