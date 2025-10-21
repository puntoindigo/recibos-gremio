// components/CreateEmployeeModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, User, Building2, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { canManageUsers } from '@/lib/user-management';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeRegistered?: (employee: any) => void;
}

export default function CreateEmployeeModal({ 
  isOpen, 
  onClose, 
  onEmployeeRegistered 
}: CreateEmployeeModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    legajo: '',
    empresa: '',
    periodo: '',
    salario: '',
    descuentos: '',
    observaciones: ''
  });

  // Verificar permisos
  const canRegister = canManageUsers(session?.user);

  useEffect(() => {
    if (isOpen) {
      // Resetear formulario cuando se abre
      setFormData({
        nombre: '',
        legajo: '',
        empresa: '',
        periodo: '',
        salario: '',
        descuentos: '',
        observaciones: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canRegister) {
      toast.error('No tienes permisos para registrar empleados');
      return;
    }

    setLoading(true);
    
    try {
      // Aquí iría la lógica para registrar el empleado
      // Por ahora simulamos el registro
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newEmployee = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString()
      };

      toast.success('Empleado registrado exitosamente');
      onEmployeeRegistered?.(newEmployee);
      onClose();
      
    } catch (error) {
      console.error('Error registrando empleado:', error);
      toast.error('Error al registrar empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!canRegister) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Registrar Empleado
            </DialogTitle>
            <DialogDescription>
              No tienes permisos para registrar empleados
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Contacta al administrador para obtener permisos
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Registrar Nuevo Empleado
          </DialogTitle>
          <DialogDescription>
            Registrar un nuevo empleado en el sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>

            {/* Legajo */}
            <div className="space-y-2">
              <Label htmlFor="legajo">Legajo *</Label>
              <Input
                id="legajo"
                value={formData.legajo}
                onChange={(e) => handleInputChange('legajo', e.target.value)}
                placeholder="Ej: 12345"
                required
              />
            </div>

            {/* Empresa */}
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => handleInputChange('empresa', e.target.value)}
                placeholder="Ej: LIME"
                required
              />
            </div>

            {/* Período */}
            <div className="space-y-2">
              <Label htmlFor="periodo">Período *</Label>
              <Input
                id="periodo"
                value={formData.periodo}
                onChange={(e) => handleInputChange('periodo', e.target.value)}
                placeholder="Ej: 2025-01"
                required
              />
            </div>

            {/* Salario */}
            <div className="space-y-2">
              <Label htmlFor="salario">Salario</Label>
              <Input
                id="salario"
                type="number"
                value={formData.salario}
                onChange={(e) => handleInputChange('salario', e.target.value)}
                placeholder="Ej: 50000"
              />
            </div>

            {/* Descuentos */}
            <div className="space-y-2">
              <Label htmlFor="descuentos">Descuentos</Label>
              <Input
                id="descuentos"
                type="number"
                value={formData.descuentos}
                onChange={(e) => handleInputChange('descuentos', e.target.value)}
                placeholder="Ej: 5000"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              placeholder="Notas adicionales sobre el empleado..."
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Registrando...' : 'Registrar Empleado'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}