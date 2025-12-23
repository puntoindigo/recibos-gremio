// components/DeleteConfirmModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ConsolidatedEntity } from '@/lib/data-manager-singleton';

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employee: ConsolidatedEntity | null;
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({ 
  open, 
  onClose, 
  onConfirm, 
  employee, 
  isDeleting = false 
}: DeleteConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && confirmButtonRef.current) {
      // Pequeño delay para asegurar que el modal esté completamente renderizado
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    }
  }, [open]);

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Confirmar Eliminación
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 modal-content-fix">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ¿Estás seguro de que deseas eliminar este registro?
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Empleado:</span>
              <span>{employee.nombre || 'Sin nombre'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Legajo:</span>
              <span>{employee.legajo}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Período:</span>
              <span>{employee.periodo}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Empresa:</span>
              <span>{employee.data?.EMPRESA || 'N/A'}</span>
            </div>
            {employee.data?.MANUAL === 'true' && (
              <div className="flex justify-between">
                <span className="font-medium">Tipo:</span>
                <span className="text-blue-600 font-medium">Manual</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            ref={confirmButtonRef}
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
