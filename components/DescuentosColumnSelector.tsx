// components/DescuentosColumnSelector.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

interface DescuentosColumnSelectorProps {
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const AVAILABLE_COLUMNS = [
  { key: 'legajo', label: 'Legajo', default: true },
  { key: 'nombre', label: 'Nombre', default: true },
  { key: 'empresa', label: 'Empresa', default: false },
  { key: 'tags', label: 'Tags', default: true },
  { key: 'monto', label: 'Monto', default: true },
  { key: 'cuotas', label: 'Cuotas', default: true },
  { key: 'fecha', label: 'Fecha', default: true },
  { key: 'estado', label: 'Estado', default: false },
  { key: 'tipo', label: 'Tipo', default: false },
  { key: 'descripcion', label: 'Descripción', default: false },
  { key: 'motivo', label: 'Motivo', default: false },
  { key: 'observaciones', label: 'Observaciones', default: false },
  { key: 'autorizadoPor', label: 'Autorizado Por', default: false },
  { key: 'fechaAutorizacion', label: 'Fecha Autorización', default: false }
];

export default function DescuentosColumnSelector({ visibleColumns, onColumnsChange }: DescuentosColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tempColumns, setTempColumns] = useState<string[]>(visibleColumns);

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      setTempColumns(prev => [...prev, columnKey]);
    } else {
      setTempColumns(prev => prev.filter(col => col !== columnKey));
    }
  };

  const handleSave = () => {
    onColumnsChange(tempColumns);
    setOpen(false);
  };

  const handleReset = () => {
    const defaultColumns = AVAILABLE_COLUMNS
      .filter(col => col.default)
      .map(col => col.key);
    setTempColumns(defaultColumns);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4 mr-2" />
        Columnas
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Columnas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={tempColumns.includes(column.key)}
                    onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
                  />
                  <label
                    htmlFor={column.key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                Restablecer
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
