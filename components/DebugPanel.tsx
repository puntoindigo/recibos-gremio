'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Database, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  onWipeAll: () => void;
  activeTab: string;
  periodoFiltro: string;
  empresaFiltro: string;
  nombreFiltro: string;
  hasControlForCurrentFilters: boolean;
};

export function DebugPanel({ 
  debugInfo, 
  onDeleteVisible, 
  onDeleteControl, 
  onWipeAll,
  activeTab,
  periodoFiltro,
  empresaFiltro,
  nombreFiltro,
  hasControlForCurrentFilters
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="status-panel" style={{ bottom: '4rem', right: '1rem' }}>
      {/* Header - siempre visible */}
      <div
        className="status-panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Indicador de estado principal */}
        <div className="flex items-center space-x-2">
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
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={onWipeAll}
              >
                Limpiar todo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
