'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, Check } from 'lucide-react';

interface ColumnConfig {
  key: string;
  visible: boolean;
  alias: string;
}

interface ColumnSelectorProps {
  columns: string[];
  onColumnsChange: (visibleColumns: string[], aliases: Record<string, string>) => void;
  initialVisible?: string[];
  initialAliases?: Record<string, string>;
}

export default function ColumnSelector({
  columns,
  onColumnsChange,
  initialVisible = [],
  initialAliases = {}
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);

  // Inicializar configuraciones de columnas
  useEffect(() => {
    // Ordenar columnas: EMPRESA, PERIODO, ARCHIVO primero, luego el resto
    const priorityColumns = ['EMPRESA', 'PERIODO', 'ARCHIVO'];
    const sortedColumns = [
      ...priorityColumns.filter(col => columns.includes(col)),
      ...columns.filter(col => !priorityColumns.includes(col))
    ];

    const configs = sortedColumns.map(column => ({
      key: column,
      visible: initialVisible.includes(column) || initialVisible.length === 0,
      alias: initialAliases[column] || column
    }));
    setColumnConfigs(configs);
  }, [columns, initialVisible, initialAliases]);

  const handleToggleColumn = (columnKey: string) => {
    setColumnConfigs(prev => 
      prev.map(config => 
        config.key === columnKey 
          ? { ...config, visible: !config.visible }
          : config
      )
    );
  };

  const handleAliasChange = (columnKey: string, alias: string) => {
    setColumnConfigs(prev => 
      prev.map(config => 
        config.key === columnKey 
          ? { ...config, alias }
          : config
      )
    );
  };

  const handleSelectAll = () => {
    setColumnConfigs(prev => 
      prev.map(config => ({ ...config, visible: true }))
    );
  };

  const handleSelectNone = () => {
    setColumnConfigs(prev => 
      prev.map(config => ({ ...config, visible: false }))
    );
  };

  const handleApply = () => {
    const visibleColumns = columnConfigs
      .filter(config => config.visible)
      .map(config => config.key);
    
    const aliases = columnConfigs.reduce((acc, config) => {
      if (config.visible && config.alias !== config.key) {
        acc[config.key] = config.alias;
      }
      return acc;
    }, {} as Record<string, string>);

    onColumnsChange(visibleColumns, aliases);
    setOpen(false);
  };

  const visibleCount = columnConfigs.filter(config => config.visible).length;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Settings className="h-4 w-4" />
        Columnas ({visibleCount})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar Columnas</DialogTitle>
            <DialogDescription>
              Selecciona qué columnas mostrar y personaliza sus nombres
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Seleccionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectNone}>
                  Deseleccionar Todas
                </Button>
              </div>

              <div className="space-y-3">
                {columnConfigs.map((config) => (
                  <div key={config.key} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={config.visible}
                      onCheckedChange={() => handleToggleColumn(config.key)}
                    />
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        {config.key}
                      </Label>
                    </div>
                    <div className="flex-1">
                      <Input
                        value={config.alias}
                        onChange={(e) => handleAliasChange(config.key, e.target.value)}
                        placeholder="Alias (opcional)"
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply} className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Aplicar ({visibleCount} columnas)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

