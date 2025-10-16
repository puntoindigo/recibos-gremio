'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2 } from 'lucide-react';

interface EmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (empresa: string) => void;
  fileName: string;
}

const EMPRESAS_DISPONIBLES = ['LIMPAR', 'LIME', 'SUMAR', 'TYSA', 'ESTRATEGIA AMBIENTAL', 'ESTRATEGIA URBANA'];

export default function EmpresaModal({ isOpen, onClose, onConfirm, fileName }: EmpresaModalProps) {
  const [empresa, setEmpresa] = useState('');

  const handleConfirm = () => {
    if (empresa.trim()) {
      onConfirm(empresa.trim());
      setEmpresa('');
      onClose();
    }
  };

  const handleCancel = () => {
    setEmpresa('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresa no detectada
          </DialogTitle>
          <DialogDescription>
            No se pudo detectar automáticamente la empresa para el archivo:
            <br />
            <strong>{fileName}</strong>
            <br />
            Por favor, selecciona o ingresa la empresa manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ingresa el nombre de la empresa"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Empresas disponibles:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EMPRESAS_DISPONIBLES.map((emp) => (
                <Button
                  key={emp}
                  variant={empresa === emp ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEmpresa(emp)}
                >
                  {emp}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!empresa.trim()}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
