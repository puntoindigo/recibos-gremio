// components/ExportDescuentos.tsx
'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { formatTimestampForDisplay } from '@/lib/date-utils';
import type { Descuento } from '@/lib/db';

interface ExportDescuentosProps {
  descuentos: Descuento[];
  empresaFiltro: string;
  tagsFiltro: string[];
  visibleColumns: string[];
  disabled?: boolean;
}

export default function ExportDescuentos({ descuentos, empresaFiltro, tagsFiltro, visibleColumns, disabled = false }: ExportDescuentosProps) {
  
  const handleExport = () => {
    try {
      // Preparar los datos para exportar - solo columnas visibles
      const exportData = descuentos.map(descuento => {
        const data: any = {};

        if (visibleColumns.includes('legajo')) {
          data['Legajo'] = descuento.legajo;
          data['Nombre'] = descuento.nombre;
        }
        if (visibleColumns.includes('empresa') && empresaFiltro === 'TODOS') {
          data['Empresa'] = descuento.empresa || 'N/A';
        }
        if (visibleColumns.includes('tags')) {
          data['Tags'] = descuento.tags ? descuento.tags.join(', ') : '';
        }
        if (visibleColumns.includes('monto')) {
          data['Monto'] = descuento.monto;
        }
        if (visibleColumns.includes('cuotas')) {
          data['Cuotas'] = descuento.cantidadCuotas;
        }
        if (visibleColumns.includes('fecha')) {
          data['Fecha'] = descuento.fechaInicio ? formatTimestampForDisplay(descuento.fechaInicio) : 'N/A';
        }
        if (visibleColumns.includes('estado')) {
          data['Estado'] = descuento.estado || 'ACTIVO';
        }
        if (visibleColumns.includes('tipo')) {
          data['Tipo'] = descuento.tipoDescuento || 'PRESTAMO';
        }
        if (visibleColumns.includes('descripcion')) {
          data['Descripción'] = descuento.descripcion || '';
        }
        if (visibleColumns.includes('motivo')) {
          data['Motivo'] = descuento.motivo || '';
        }
        if (visibleColumns.includes('observaciones')) {
          data['Observaciones'] = descuento.observaciones || '';
        }
        if (visibleColumns.includes('autorizadoPor')) {
          data['Autorizado Por'] = descuento.autorizadoPor || '';
        }
        if (visibleColumns.includes('fechaAutorizacion')) {
          data['Fecha Autorización'] = descuento.fechaAutorizacion ? formatTimestampForDisplay(descuento.fechaAutorizacion) : 'N/A';
        }

        return data;
      });

      // Crear el workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Configurar el ancho de las columnas dinámicamente
      const colWidths: { wch: number }[] = [];
      
      if (visibleColumns.includes('legajo')) {
        colWidths.push({ wch: 10 }, { wch: 25 }); // Legajo, Nombre
      }
      if (visibleColumns.includes('empresa') && empresaFiltro === 'TODOS') {
        colWidths.push({ wch: 20 }); // Empresa
      }
      if (visibleColumns.includes('tags')) {
        colWidths.push({ wch: 20 }); // Tags
      }
      if (visibleColumns.includes('monto')) {
        colWidths.push({ wch: 12 }); // Monto
      }
      if (visibleColumns.includes('cuotas')) {
        colWidths.push({ wch: 8 }); // Cuotas
      }
      if (visibleColumns.includes('fecha')) {
        colWidths.push({ wch: 12 }); // Fecha
      }
      if (visibleColumns.includes('estado')) {
        colWidths.push({ wch: 10 }); // Estado
      }
      if (visibleColumns.includes('tipo')) {
        colWidths.push({ wch: 15 }); // Tipo
      }
      if (visibleColumns.includes('descripcion')) {
        colWidths.push({ wch: 30 }); // Descripción
      }
      if (visibleColumns.includes('motivo')) {
        colWidths.push({ wch: 30 }); // Motivo
      }
      if (visibleColumns.includes('observaciones')) {
        colWidths.push({ wch: 30 }); // Observaciones
      }
      if (visibleColumns.includes('autorizadoPor')) {
        colWidths.push({ wch: 20 }); // Autorizado Por
      }
      if (visibleColumns.includes('fechaAutorizacion')) {
        colWidths.push({ wch: 15 }); // Fecha Autorización
      }
      ws['!cols'] = colWidths;

      // Agregar la hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Descuentos');

      // Generar el nombre del archivo
      const fecha = new Date().toISOString().split('T')[0];
      let filename = `descuentos_${fecha}`;
      
      if (empresaFiltro && empresaFiltro !== 'TODOS') {
        filename += `_${empresaFiltro.replace(/\s+/g, '_')}`;
      }
      
      if (tagsFiltro.length > 0) {
        filename += `_tags_${tagsFiltro.join('_').replace(/\s+/g, '_')}`;
      }
      
      filename += '.xlsx';

      // Descargar el archivo
      XLSX.writeFile(wb, filename);
      
    } catch (error) {
      console.error('Error exportando descuentos:', error);
      alert('Error al exportar los descuentos. Por favor, inténtalo de nuevo.');
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={disabled || descuentos.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar ({descuentos.length})
    </Button>
  );
}
