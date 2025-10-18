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
import { Settings, Check, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { db } from '@/lib/db';

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
}

export default function ColumnConfigWithPreview({
  columns,
  onColumnsChange,
  initialVisible = [],
  initialAliases = {}
}: ColumnConfigWithPreviewProps) {
  const [open, setOpen] = useState(false);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
  const [pdfFiles, setPdfFiles] = useState<any[]>([]);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);

  // Cargar archivos PDF disponibles
  const loadPdfFiles = useCallback(async () => {
    try {
      const receipts = await db.receipts.toArray();
      // Solo incluir archivos que realmente existen y son accesibles
      const pdfFiles = receipts
        .filter(receipt => receipt.filename && receipt.filename.toLowerCase().endsWith('.pdf'))
        .map(receipt => ({
          id: receipt.id,
          filename: receipt.filename,
          data: receipt.data,
          hashes: receipt.hashes || []
        }));
      
      console.log('Archivos PDF encontrados:', pdfFiles.length);
      setPdfFiles(pdfFiles);
    } catch (error) {
      console.error('Error cargando archivos PDF:', error);
      setPdfFiles([]);
    }
  }, []);

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

  // Cargar PDFs y configuración cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadPdfFiles();
      loadSavedConfig();
    }
  }, [open, loadPdfFiles]);

  // Cargar configuración guardada
  const loadSavedConfig = useCallback(async () => {
    try {
      const savedConfig = await db.columnConfigs
        .where('userId')
        .equals('default')
        .and(config => config.tableType === 'recibos')
        .first();
      
      if (savedConfig) {
        const configs = columnConfigs.map(config => ({
          ...config,
          visible: savedConfig.visibleColumns.includes(config.key),
          alias: savedConfig.columnAliases[config.key] || config.key
        }));
        setColumnConfigs(configs);
        console.log('Configuración cargada:', savedConfig);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  }, [columnConfigs]);

  // Crear URL del PDF actual
  useEffect(() => {
    if (showPreview && pdfFiles.length > 0 && currentPdfIndex < pdfFiles.length) {
      const currentPdf = pdfFiles[currentPdfIndex];
      
      // Intentar crear una URL del archivo real
      // Nota: En una implementación real, necesitarías acceso al archivo original
      // Por ahora, mostramos un mensaje informativo
      setCurrentPdfUrl(null);
    } else {
      setCurrentPdfUrl(null);
    }
  }, [showPreview, pdfFiles, currentPdfIndex]);

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
      await db.columnConfigs.put({
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

  const handlePreviousPdf = () => {
    if (currentPdfIndex > 0) {
      setCurrentPdfIndex(currentPdfIndex - 1);
    }
  };

  const handleNextPdf = () => {
    if (currentPdfIndex < pdfFiles.length - 1) {
      setCurrentPdfIndex(currentPdfIndex + 1);
    }
  };

  const currentPdf = pdfFiles[currentPdfIndex];

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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Columnas
            </DialogTitle>
            <DialogDescription>
              Configura qué columnas mostrar y sus nombres. Los cambios se guardan automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 h-[70vh]">
            {/* Panel de configuración de columnas */}
            <div className={`space-y-4 overflow-y-auto ${showPreview ? 'w-1/2' : 'w-full'}`}>
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

            {/* Panel de vista previa de PDF */}
            {showPreview && pdfFiles.length > 0 && (
              <div className="w-1/2 border-l border-gray-200 pl-4">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Vista Previa de PDF</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(false)}
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {pdfFiles.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600">
                          {currentPdfIndex + 1} de {pdfFiles.length}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousPdf}
                            disabled={currentPdfIndex === 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPdf}
                            disabled={currentPdfIndex === pdfFiles.length - 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Archivo:</strong> {currentPdf?.filename}
                      </div>
                      
                      <div className="flex-1 border border-gray-300 rounded-md overflow-hidden">
                        <div className="flex items-center justify-center h-full text-gray-500 p-4">
                          <div className="text-center">
                            <div className="text-sm mb-2">
                              📄 Vista previa de PDF no disponible
                            </div>
                            <div className="text-xs text-gray-400">
                              Los archivos PDF originales no están accesibles para vista previa.
                              <br />
                              Usa la información de columnas para configurar la tabla.
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 p-4">
                      <div className="text-center">
                        <div className="text-sm mb-2">
                          📄 No hay archivos PDF disponibles
                        </div>
                        <div className="text-xs text-gray-400">
                          Sube algunos archivos PDF para poder ver la vista previa.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex items-center gap-4">
              {pdfFiles.length > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showPreview ? 'Ocultar PDF' : 'Ver PDF'}
                </Button>
              ) : (
                <div className="text-sm text-gray-500">
                  📄 No hay archivos PDF para vista previa
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Check className="h-4 w-4 mr-2" />
                Guardar Configuración
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
