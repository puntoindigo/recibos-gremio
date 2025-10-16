'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Database, Info, FileText, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDraggable } from '@/hooks/useDraggable';

type UploadItem = { 
  name: string; 
  status: "pending" | "ok" | "error" | "skipped";
  reason?: string;
};

type DebugInfo = {
  totalRows: number;
  consolidatedCount: number;
  controlCount: number;
  savedControlsCount: number;
  settingsCount: number;
};

type Props = {
  debugInfo: DebugInfo;
  onDeleteVisible: () => void;
  onDeleteControl: () => void;
  activeTab: string;
  periodoFiltro: string;
  empresaFiltro: string;
  nombreFiltro: string;
  hasControlForCurrentFilters: boolean;
  processingFiles: UploadItem[] | null;
  lastProcessedIndex: number;
};

export function DebugPanel({ 
  debugInfo, 
  onDeleteVisible, 
  onDeleteControl, 
  activeTab,
  periodoFiltro,
  empresaFiltro,
  nombreFiltro,
  hasControlForCurrentFilters,
  processingFiles,
  lastProcessedIndex
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastProcessedFile, setLastProcessedFile] = useState<string | null>(null);
  
  // Hook para hacer el panel arrastrable
  const getDebugPanelPosition = React.useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return {
      x: window.innerWidth - 300,
      y: window.innerHeight - 200
    };
  }, []);
  
  const drag = useDraggable(getDebugPanelPosition);

  // Mantener información del último archivo procesado
  React.useEffect(() => {
    if (processingFiles && processingFiles.length > 0 && lastProcessedIndex >= 0) {
      const fileName = processingFiles[lastProcessedIndex]?.name || 'archivo desconocido';
      setLastProcessedFile(fileName);
      // Guardar en localStorage para persistencia
      localStorage.setItem('lastProcessedFile', fileName);
    }
  }, [processingFiles, lastProcessedIndex]);

  // Cargar último archivo procesado desde localStorage al montar el componente
  React.useEffect(() => {
    const savedLastFile = localStorage.getItem('lastProcessedFile');
    if (savedLastFile) {
      setLastProcessedFile(savedLastFile);
    }
  }, []);

  if (!drag.isClient) {
    return null;
  }

  return (
    <div 
      ref={drag.elementRef}
      className="status-panel" 
      style={{ 
        position: 'fixed',
        left: drag.position.x,
        top: drag.position.y,
        cursor: drag.isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Header - siempre visible - ARRASTRABLE */}
      <div
        className="status-panel-header select-none"
        onMouseDown={(e) => {
          // Solo arrastrar si se hace clic en el área del título, no en los iconos
          const target = e.target as HTMLElement;
          if (target.closest('.drag-handle') || target.classList.contains('drag-handle')) {
            drag.handleMouseDown(e);
          }
        }}
        onClick={(e) => {
          // Solo expandir/contraer si no estamos arrastrando y no se hizo clic en el área de arrastre
          const target = e.target as HTMLElement;
          if (!drag.isDragging && !target.closest('.drag-handle')) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Indicador de estado principal - ÁREA DE ARRASTRE */}
        <div className="flex items-center space-x-2 drag-handle">
          <GripVertical className="w-3 h-3 text-blue-200" />
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-sm font-medium">Debug</span>
        </div>

        {/* Información básica */}
        <div className="flex items-center space-x-3 flex-1 mx-4">
          <div className="text-xs text-blue-200">
            {debugInfo.totalRows} filas · {debugInfo.consolidatedCount} consolidados
          </div>
        </div>

        {/* Botón expandir/contraer */}
        <div className="ml-2">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="border-t border-blue-500 px-4 py-3 max-h-56 overflow-y-auto">
          {/* Información del último archivo procesado */}
          {(processingFiles && processingFiles.length > 0) || lastProcessedFile ? (
            <div className="mb-3">
              <div className="flex items-center space-x-2 text-sm font-medium mb-2">
                <FileText className="h-4 w-4" />
                <span>Último archivo procesado</span>
              </div>
              <div className="space-y-1 text-sm">
                {processingFiles && processingFiles.length > 0 ? (
                  lastProcessedIndex >= 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span>Progreso:</span>
                        <span className="font-medium text-green-400">
                          {lastProcessedIndex + 1}/{processingFiles.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Archivo actual:</span>
                        <span 
                          className="font-medium text-green-400 truncate max-w-32 cursor-help" 
                          title={processingFiles[lastProcessedIndex]?.name}
                        >
                          {processingFiles[lastProcessedIndex]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Porcentaje:</span>
                        <span className="font-medium text-green-400">
                          {Math.round(((lastProcessedIndex + 1) / processingFiles.length) * 100)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>Archivos en cola:</span>
                        <span className="font-medium text-blue-400">
                          {processingFiles.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Primer archivo:</span>
                        <span 
                          className="font-medium text-blue-400 truncate max-w-32 cursor-help" 
                          title={processingFiles[0]?.name}
                        >
                          {processingFiles[0]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estado:</span>
                        <span className="font-medium text-blue-400">
                          Iniciando...
                        </span>
                      </div>
                    </>
                  )
                ) : (
                  <>
                                          <div className="flex justify-between">
                        <span>Último procesado:</span>
                        <span 
                          className="font-medium text-green-400 truncate max-w-32 cursor-help" 
                          title={lastProcessedFile || ''}
                        >
                          {lastProcessedFile}
                        </span>
                      </div>
                    <div className="flex justify-between">
                      <span>Estado:</span>
                      <span className="font-medium text-green-400">
                        Completado
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Información de la base de datos */}
          <div className="mb-3">
            <div className="flex items-center space-x-2 text-sm font-medium mb-2">
              <Database className="h-4 w-4" />
              <span>Base de datos</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total filas:</span>
                <span className="font-medium">{debugInfo.totalRows}</span>
              </div>
              <div className="flex justify-between">
                <span>Consolidados:</span>
                <span className="font-medium">{debugInfo.consolidatedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Control:</span>
                <span className="font-medium">{debugInfo.controlCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Controles guardados:</span>
                <span className="font-medium">{debugInfo.savedControlsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Configuraciones:</span>
                <span className="font-medium">{debugInfo.settingsCount}</span>
              </div>
            </div>
          </div>

          {/* Filtros actuales */}
          <div className="mb-3">
            <div className="flex items-center space-x-2 text-sm font-medium mb-2">
              <Info className="h-4 w-4" />
              <span>Filtros activos</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Período:</span>
                <span className="font-medium">{periodoFiltro || 'Todos'}</span>
              </div>
              <div className="flex justify-between">
                <span>Empresa:</span>
                <span className="font-medium">{empresaFiltro || 'Todas'}</span>
              </div>
              <div className="flex justify-between">
                <span>Nombre:</span>
                <span className="font-medium">{nombreFiltro || 'Todos'}</span>
              </div>
              <div className="flex justify-between">
                <span>Pestaña:</span>
                <span className="font-medium">{activeTab}</span>
              </div>
              <div className="flex justify-between">
                <span>Control disponible:</span>
                <span className="font-medium">{hasControlForCurrentFilters ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Información del último archivo procesado */}
          {processingFiles && processingFiles.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-2 text-sm font-medium mb-2">
                <Info className="h-4 w-4" />
                <span>Último archivo procesado</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total archivos:</span>
                  <span className="font-medium">{processingFiles.length}</span>
                </div>
                {lastProcessedIndex >= 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span>Último procesado:</span>
                      <span className="font-medium text-blue-200 truncate max-w-32" title={processingFiles[lastProcessedIndex]?.name}>
                        {processingFiles[lastProcessedIndex]?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Progreso:</span>
                      <span className="font-medium">
                        {lastProcessedIndex + 1} / {processingFiles.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Siguiente:</span>
                      <span className="font-medium text-green-200 truncate max-w-32" title={processingFiles[lastProcessedIndex + 1]?.name}>
                        {processingFiles[lastProcessedIndex + 1]?.name || 'Completado'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Primer archivo:</span>
                    <span className="font-medium text-green-200 truncate max-w-32" title={processingFiles[0]?.name}>
                      {processingFiles[0]?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acciones de debug */}
          <div>
            <div className="flex items-center space-x-2 text-sm font-medium mb-2">
              <Settings className="h-4 w-4" />
              <span>Acciones</span>
            </div>
            <div className="space-y-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={activeTab === "control" ? onDeleteControl : onDeleteVisible}
                disabled={activeTab === "control" && (!periodoFiltro && !empresaFiltro && !nombreFiltro || !hasControlForCurrentFilters)}
              >
                {activeTab === "control" ? "Eliminar Control" : "Eliminar registros"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
