'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Zap
} from 'lucide-react';

interface SimpleDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDevTools: () => void;
  debugInfo: {
    totalRows: number;
    consolidatedCount: number;
    controlCount: number;
    savedControlsCount: number;
    settingsCount: number;
  };
}

export default function SimpleDebugModal({
  isOpen,
  onClose,
  onOpenDevTools,
  debugInfo
}: SimpleDebugModalProps) {
  const handleOpenDevTools = () => {
    onClose();
    onOpenDevTools();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Panel de Debug - Información Básica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información básica */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Total Registros</span>
              </div>
              <Badge variant="outline">{debugInfo.totalRows}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Consolidados</span>
              </div>
              <Badge variant="outline">{debugInfo.consolidatedCount}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Controles Guardados</span>
              </div>
              <Badge variant="outline">{debugInfo.savedControlsCount}</Badge>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Herramientas Avanzadas Disponibles</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Para acceder a todas las herramientas de debug, limpieza de datos y verificaciones, 
                  utiliza el DevTools centralizado.
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleOpenDevTools}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Abrir DevTools
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
