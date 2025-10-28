'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Settings, Check, X } from 'lucide-react';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

interface ColumnConfig {
  key: string;
  visible: boolean;
  alias: string;
}

interface ColumnConfigWithPreviewProps {
  columns: string[];
  onColumnsChange: (visibleColumns: string[], aliases: Record<string, string>) => void;
  initialVisible?: string[];
  initialAliases?: Record<string, string>;
  fixedColumns?: string[];
}

export default function ColumnConfigWithPreview({
  columns,
  onColumnsChange,
  initialVisible = [],
  initialAliases = {},
  fixedColumns = []
}: ColumnConfigWithPreviewProps) {
  const { dataManager } = useCentralizedDataManager();
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
      visible: initialVisible.includes(column),
      alias: initialAliases[column] || column
    }));

    setColumnConfigs(configs);
  }, [columns, initialVisible, initialAliases]);


  const handleColumnToggle = (columnKey: string) => {
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

  const handleSave = async () => {
    const visibleColumns = columnConfigs
      .filter(config => config.visible)
      .map(config => config.key);
    
    const aliases = columnConfigs.reduce((acc, config) => {
      acc[config.key] = config.alias;
      return acc;
    }, {} as Record<string, string>);

    // Guardar configuración en la base de datos
    try {
      await dataManager.addColumnConfig({
        userId: 'default', // Por ahora usar un usuario por defecto
        tableType: 'recibos',
        visibleColumns,
        columnAliases: aliases,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      console.log('Configuración de columnas guardada:', { visibleColumns, aliases });
    } catch (error) {
      console.error('Error guardando configuración de columnas:', error);
    }

    onColumnsChange(visibleColumns, aliases);
    setOpen(false);
  };


  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Settings className="h-4 w-4" />
        Configurar Columnas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Columnas
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Configura qué columnas mostrar y sus nombres. Los cambios se guardan automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 modal-content-fix">
          <div className="space-y-4">
            <div className="space-y-3">
              {columnConfigs.map((config) => (
                <div key={config.key} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={config.key}
                    checked={config.visible}
                    onCheckedChange={() => handleColumnToggle(config.key)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={config.key} className="text-sm font-medium">
                      {config.key}
                    </Label>
                    <Input
                      value={config.alias}
                      onChange={(e) => handleAliasChange(config.key, e.target.value)}
                      placeholder={`Alias para ${config.key}`}
                      className="text-sm w-1/2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          </div>

          <div className="flex justify-end gap-2 pt-4 border-t -mx-6 px-6 flex-shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Guardar Configuración
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
