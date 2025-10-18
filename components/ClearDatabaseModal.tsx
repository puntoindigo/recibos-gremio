// components/ClearDatabaseModal.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Trash2, Database } from 'lucide-react';

interface ClearDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ClearDatabaseModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false 
}: ClearDatabaseModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Database className="h-5 w-5" />
            Vaciar Bases de Datos
          </DialogTitle>
          <DialogDescription className="pt-2">
            Esta acción eliminará <strong>TODOS</strong> los datos del sistema de forma permanente.
            Esta operación no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Vaciando Bases de Datos...
                  </h4>
                  <p className="text-sm text-blue-700">
                    Eliminando todos los datos del sistema. Por favor espera...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <strong>Advertencia Crítica:</strong> Esta operación eliminará:
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>Todos los recibos procesados</li>
                      <li>Todos los datos consolidados</li>
                      <li>Todos los descuentos</li>
                      <li>Todas las configuraciones de columnas</li>
                      <li>Todos los controles guardados</li>
                      <li>Todas las actividades de usuario</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="confirm-clear"
                    checked={isConfirmed}
                    onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <label 
                      htmlFor="confirm-clear" 
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Confirmo que entiendo las consecuencias
                    </label>
                    <p className="text-xs text-gray-600">
                      He leído y comprendo que esta acción eliminará <strong>TODOS</strong> los datos 
                      de forma permanente y no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !isConfirmed}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Vaciando bases de datos...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Vaciar Bases de Datos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
