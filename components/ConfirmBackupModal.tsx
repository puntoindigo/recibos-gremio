// components/ConfirmBackupModal.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Trash2, RotateCcw } from 'lucide-react';

interface ConfirmBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'delete' | 'restore';
  filename: string;
  isLoading?: boolean;
}

export function ConfirmBackupModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  action, 
  filename, 
  isLoading = false 
}: ConfirmBackupModalProps) {
  const isDelete = action === 'delete';
  const isRestore = action === 'restore';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDelete ? (
              <>
                <Trash2 className="h-5 w-5 text-red-600" />
                Eliminar Backup
              </>
            ) : (
              <>
                <RotateCcw className="h-5 w-5 text-green-600" />
                Restaurar Base de Datos
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {isDelete ? (
              <>
                ¿Estás seguro de que quieres eliminar el backup{' '}
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {filename}
                </span>
                ? Esta acción no se puede deshacer.
              </>
            ) : (
              <>
                ¿Estás seguro de que quieres restaurar la base de datos desde{' '}
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {filename}
                </span>
                ? Esto reemplazará todos los datos actuales y no se puede deshacer.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isRestore && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <strong>Advertencia:</strong> Esta operación reemplazará completamente 
                todos los datos actuales de la base de datos. Asegúrate de tener 
                un backup reciente antes de continuar.
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant={isDelete ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
            className={isRestore ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isDelete ? 'Eliminando...' : 'Restaurando...'}
              </>
            ) : (
              <>
                {isDelete ? (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}













