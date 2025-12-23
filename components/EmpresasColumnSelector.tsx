// components/EmpresasColumnSelector.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, X } from 'lucide-react';

interface EmpresasColumnSelectorProps {
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const availableColumns = [
  { key: 'nombre', label: 'Empresa', default: true },
  { key: 'empleadosCount', label: 'Empleados', default: true },
  { key: 'recibosCount', label: 'Recibos', default: true },
  { key: 'descuentosCount', label: 'Descuentos', default: true },
  { key: 'logo', label: 'Logo', default: false },
  { key: 'descripcion', label: 'Descripción', default: false }
];

export default function EmpresasColumnSelector({ visibleColumns, onColumnsChange }: EmpresasColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColumnToggle = (columnKey: string) => {
    if (visibleColumns.includes(columnKey)) {
      onColumnsChange(visibleColumns.filter(col => col !== columnKey));
    } else {
      onColumnsChange([...visibleColumns, columnKey]);
    }
  };

  const handleSelectAll = () => {
    onColumnsChange(availableColumns.map(col => col.key));
  };

  const handleSelectNone = () => {
    onColumnsChange([]);
  };

  const handleReset = () => {
    onColumnsChange(availableColumns.filter(col => col.default).map(col => col.key));
  };

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="h-4 w-4 mr-2" />
        Columnas
      </Button>
      
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-64 z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Mostrar columnas</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableColumns.map((column) => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={visibleColumns.includes(column.key)}
                  onCheckedChange={() => handleColumnToggle(column.key)}
                />
                <Label htmlFor={column.key} className="text-sm">
                  {column.label}
                </Label>
              </div>
            ))}
            
            <div className="pt-2 border-t space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="w-full"
              >
                Seleccionar todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNone}
                className="w-full"
              >
                Deseleccionar todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full"
              >
                Restaurar por defecto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
