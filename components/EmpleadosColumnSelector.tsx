// components/EmpleadosColumnSelector.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings, X, RotateCcw } from 'lucide-react';

interface EmpleadosColumnSelectorProps {
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const AVAILABLE_COLUMNS = [
  { key: 'legajo', label: 'Legajo', default: true },
  { key: 'nombre', label: 'Nombre', default: true },
  { key: 'empresa', label: 'Empresa', default: true },
  { key: 'recibosCount', label: 'Cantidad Recibos', default: true },
  { key: 'descuentosCount', label: 'Cantidad Descuentos', default: true },
  { key: 'periodo', label: 'Período', default: false },
  { key: 'tipo', label: 'Tipo', default: false }
];

export default function EmpleadosColumnSelector({ visibleColumns, onColumnsChange }: EmpleadosColumnSelectorProps) {
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

  const handleCancel = () => {
    setTempColumns(visibleColumns);
    setOpen(false);
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
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Columnas
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Selecciona qué columnas mostrar en la tabla de empleados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={tempColumns.includes(column.key)}
                    onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
                  />
                  <Label htmlFor={column.key} className="text-sm font-medium">
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
