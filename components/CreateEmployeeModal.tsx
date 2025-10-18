// components/CreateEmployeeModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Save, X } from 'lucide-react';
import { EmpresaSelector } from './EmpresaSelector';
import { useEmpresasInUse } from '@/hooks/useEmpresasInUse';
import { db } from '@/lib/db';
import { toast } from 'sonner';

interface CreateEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (employee: any) => void;
  initialNombre?: string;
}

export default function CreateEmployeeModal({ open, onClose, onSave, initialNombre }: CreateEmployeeModalProps) {
  const { empresas } = useEmpresasInUse();
  const [formData, setFormData] = useState({
    nombre: '',
    legajo: '',
    empresa: '',
    cuil: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const nombreInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        nombre: initialNombre || '',
        legajo: '',
        empresa: '',
        cuil: ''
      });
      setErrors([]);
      
      // Focus en el campo nombre después de que el modal se abra
      setTimeout(() => {
        if (nombreInputRef.current) {
          nombreInputRef.current.focus();
          // Si hay texto pre-llenado, seleccionarlo para facilitar la edición
          if (initialNombre) {
            nombreInputRef.current.select();
          }
        }
      }, 100);
    }
  }, [open, initialNombre]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para aplicar máscara al CUIL
  const applyCuilMask = (value: string): string => {
    // Remover todos los caracteres que no sean números
    const numbersOnly = value.replace(/\D/g, '');
    
    // Aplicar máscara XX-XXXXXXXX-X
    if (numbersOnly.length <= 2) {
      return numbersOnly;
    } else if (numbersOnly.length <= 10) {
      return `${numbersOnly.slice(0, 2)}-${numbersOnly.slice(2)}`;
    } else {
      return `${numbersOnly.slice(0, 2)}-${numbersOnly.slice(2, 10)}-${numbersOnly.slice(10, 11)}`;
    }
  };

  const handleCuilChange = (value: string) => {
    const maskedValue = applyCuilMask(value);
    handleFieldChange('cuil', maskedValue);
  };

  const validateData = (): string[] => {
    const validationErrors: string[] = [];
    
    // Validar nombre
    if (!formData.nombre || formData.nombre.trim() === '') {
      validationErrors.push('El nombre es obligatorio');
    }
    
    // Validar legajo
    if (!formData.legajo || formData.legajo.trim() === '') {
      validationErrors.push('El legajo es obligatorio');
    }
    
    // Validar empresa
    if (!formData.empresa || formData.empresa.trim() === '') {
      validationErrors.push('La empresa es obligatoria');
    }
    
    // Validar CUIL (opcional pero si se ingresa debe tener formato válido)
    if (formData.cuil && formData.cuil.trim() !== '') {
      const cuilValue = formData.cuil.trim();
      // Permitir tanto con guiones como sin guiones
      const cuilWithDashes = /^\d{2}-\d{8}-\d{1}$/;
      const cuilWithoutDashes = /^\d{11}$/;
      
      if (!cuilWithDashes.test(cuilValue) && !cuilWithoutDashes.test(cuilValue)) {
        validationErrors.push('El CUIL debe tener el formato XX-XXXXXXXX-X o 11 dígitos');
      }
    }
    
    return validationErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateData();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Crear un empleado temporal en la base de datos
      const newEmployee = {
        key: `manual_${Date.now()}`,
        legajo: formData.legajo.trim(),
        nombre: formData.nombre.trim(),
        periodo: 'MANUAL',
        archivos: [],
        data: {
          NOMBRE: formData.nombre.trim(),
          LEGAJO: formData.legajo.trim(),
          EMPRESA: formData.empresa.trim(),
          CUIL: formData.cuil.trim() || '',
          PERIODO: 'MANUAL',
          SUELDO_BASICO: '',
          TOTAL: '',
          DESCUENTOS: '',
          TEXTO_COMPLETO: '',
          PRIMERAS_LINEAS: '',
          EMPRESA_DETECTADA: formData.empresa.trim(),
          GUARDAR: 'true',
          MANUAL: 'true', // Marcar como empleado creado manualmente
          FECHA_CREACION: new Date().toISOString()
        }
      };

      // Guardar en la base de datos
      await db.consolidated.add(newEmployee);
      
      toast.success('Empleado registrado exitosamente');
      onSave(newEmployee);
      onClose();
    } catch (error) {
      console.error('Error registrando empleado:', error);
      toast.error('Error al registrar el empleado');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Registrar Empleado Nuevo
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Registra un nuevo empleado para poder asignarle descuentos
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                ref={nombreInputRef}
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleFieldChange('nombre', e.target.value)}
                placeholder="Apellido, Nombre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legajo">Legajo *</Label>
              <Input
                id="legajo"
                value={formData.legajo}
                onChange={(e) => handleFieldChange('legajo', e.target.value)}
                placeholder="Número de legajo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <EmpresaSelector
                value={formData.empresa}
                onValueChange={(value) => handleFieldChange('empresa', value)}
                placeholder="Seleccionar empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuil">CUIL</Label>
              <Input
                id="cuil"
                value={formData.cuil}
                onChange={(e) => handleCuilChange(e.target.value)}
                placeholder="XX-XXXXXXXX-X"
                maxLength={13}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
