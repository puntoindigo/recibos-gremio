// components/DebugModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Trash2, 
  Database, 
  FileText, 
  Shield, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo: {
    totalRows: number;
    consolidatedCount: number;
    controlCount: number;
    savedControlsCount: number;
    settingsCount: number;
  };
  onDeleteVisible: () => void;
  onDeleteControl: () => void;
  onClearAllData?: () => void;
  onClearReceiptsWithoutEmpresa?: () => void;
  onCheckDatabase?: () => void;
  activeTab: string;
  periodoFiltro: string;
  empresaFiltro: string;
  nombreFiltro: string;
  hasControlForCurrentFilters: boolean;
  processingFiles: any;
  lastProcessedIndex: number;
}

export default function DebugModal({
  isOpen,
  onClose,
  debugInfo,
  onDeleteVisible,
  onDeleteControl,
  onClearAllData,
  onClearReceiptsWithoutEmpresa,
  onCheckDatabase,
  activeTab,
  periodoFiltro,
  empresaFiltro,
  nombreFiltro,
  hasControlForCurrentFilters,
  processingFiles,
  lastProcessedIndex
}: DebugModalProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 800, height: 600 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = Math.max(400, Math.min(1200, e.clientX - 100));
    const newHeight = Math.max(300, Math.min(800, e.clientY - 100));
    
    setModalSize({ width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleDeleteVisible = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar todos los registros visibles?')) {
      try {
        await onDeleteVisible();
        toast.success('Registros eliminados correctamente');
      } catch (error) {
        toast.error('Error eliminando registros');
      }
    }
  };

  const handleDeleteControl = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar el control actual?')) {
      try {
        await onDeleteControl();
        toast.success('Control eliminado correctamente');
      } catch (error) {
        toast.error('Error eliminando control');
      }
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('⚠️ PELIGRO: ¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      try {
        await onClearAllData?.();
        toast.success('Base de datos limpiada completamente');
      } catch (error) {
        toast.error('Error limpiando base de datos');
      }
    }
  };

  const handleCheckDatabase = async () => {
    try {
      await onCheckDatabase?.();
    } catch (error) {
      toast.error('Error verificando base de datos');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none p-0"
        style={{ 
          width: `${modalSize.width}px`, 
          height: `${modalSize.height}px`,
          maxHeight: '90vh'
        }}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Panel de Debug
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Recibos</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{debugInfo.totalRows}</div>
                  <div className="text-xs text-blue-600">Total registros</div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Controles</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">{debugInfo.savedControlsCount}</div>
                  <div className="text-xs text-green-600">Guardados</div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Configuración</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">{debugInfo.settingsCount}</div>
                  <div className="text-xs text-purple-600">Elementos</div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Estado</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {processingFiles ? 'Procesando' : 'Listo'}
                  </div>
                  <div className="text-xs text-orange-600">Sistema</div>
                </div>
              </div>

              {/* Filtros Actuales */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  Filtros Actuales
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Pestaña Activa</label>
                    <Badge variant="outline" className="mt-1">{activeTab}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Período</label>
                    <Badge variant="outline" className="mt-1">{periodoFiltro || 'Todas'}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Empresa</label>
                    <Badge variant="outline" className="mt-1">{empresaFiltro || 'Todas'}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Búsqueda</label>
                    <Badge variant="outline" className="mt-1">{nombreFiltro || 'Vacía'}</Badge>
                  </div>
                </div>
              </div>

              {/* Estado de Procesamiento */}
              {processingFiles && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Procesamiento en Curso
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Archivos procesados:</span>
                      <span>{lastProcessedIndex + 1} de {processingFiles.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((lastProcessedIndex + 1) / processingFiles.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Acciones de Debug */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  Acciones de Limpieza
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Button 
                    variant="outline" 
                    onClick={handleCheckDatabase}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Verificar Base de Datos
                  </Button>
        <Button 
          variant="destructive" 
          onClick={handleClearAllData}
          className="w-full bg-red-800 hover:bg-red-900"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar TODO
        </Button>
        <Button 
          variant="destructive" 
          onClick={onClearReceiptsWithoutEmpresa}
          className="w-full bg-orange-800 hover:bg-orange-900"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar Sin Empresa
        </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteVisible}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Registros Visibles
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteControl}
                    disabled={!hasControlForCurrentFilters}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Control Actual
                  </Button>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Estas acciones son irreversibles. Úsalas con precaución.
                </p>
              </div>

              {/* Información Técnica */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Información Técnica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Consolidados:</strong> {debugInfo.consolidatedCount}
                  </div>
                  <div>
                    <strong>Controles:</strong> {debugInfo.controlCount}
                  </div>
                  <div>
                    <strong>Configuraciones:</strong> {debugInfo.settingsCount}
                  </div>
                  <div>
                    <strong>Control para filtros actuales:</strong> 
                    {hasControlForCurrentFilters ? (
                      <CheckCircle className="h-4 w-4 text-green-500 inline ml-1" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 inline ml-1" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Resize Handle */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400"
          onMouseDown={handleMouseDown}
        />
      </DialogContent>
    </Dialog>
  );
}
