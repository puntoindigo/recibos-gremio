// components/EmpresaModal.tsx
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
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  X,
  Save,
  AlertTriangle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { empresaManager, type EmpresaData } from '@/lib/empresa-manager';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { canManageUsers } from '@/lib/user-management';

interface EmpresaModalProps {
  empresa?: EmpresaData;
  onClose: () => void;
  onSave: () => void;
  onEmpresaCreated?: (nombreEmpresa: string) => void;
  open?: boolean;
}

export default function EmpresaModal({ empresa, onClose, onSave, onEmpresaCreated, open = true }: EmpresaModalProps) {
  const { dataManager } = useCentralizedDataManager();
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    logo: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Verificar permisos
  const canRegister = canManageUsers(session?.user);

  useEffect(() => {
    if (empresa) {
      // Modo edición
      setFormData({
        nombre: empresa.nombre || '',
        descripcion: empresa.descripcion || '',
        logo: empresa.logo || ''
      });
    } else {
      // Modo creación
      setFormData({
        nombre: '',
        descripcion: '',
        logo: ''
      });
    }
    setErrors({});
  }, [empresa]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canRegister) {
      toast.error('No tienes permisos para gestionar empresas');
      return;
    }

    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    // Validar que el nombre no esté vacío
    if (!formData.nombre || formData.nombre.trim() === '') {
      toast.error('El nombre de la empresa es obligatorio');
      return;
    }

    setLoading(true);
    
    try {
      if (empresa) {
        // Actualizar empresa existente
        console.log('🔍 Debug - Actualizando empresa:', formData.nombre);
        await empresaManager.updateEmpresa(empresa.id, dataManager, {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
          logo: formData.logo.trim()
        });
        console.log('🔍 Debug - Empresa actualizada exitosamente');
        toast.success('Empresa actualizada correctamente');
      } else {
        // Crear nueva empresa
        console.log('🔍 Debug - Creando empresa:', formData.nombre);
        const empresaId = await empresaManager.createEmpresa(dataManager, {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
          logo: formData.logo.trim()
        }, session?.user?.id || 'system');
        console.log('🔍 Debug - Empresa creada con ID:', empresaId);
        toast.success('Empresa creada correctamente');
        
        // Llamar al callback si existe
        if (onEmpresaCreated) {
          onEmpresaCreated(formData.nombre.trim());
        }
      }
      
      onSave();
    } catch (error) {
      console.error('Error guardando empresa:', error);
      toast.error('Error al guardar la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          logo: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!canRegister) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Sin Permisos
            </DialogTitle>
            <DialogDescription>
              No tienes permisos para gestionar empresas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pt-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {empresa ? 'Editar Empresa' : 'Nueva Empresa'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {empresa 
              ? 'Modifica los datos de la empresa seleccionada'
              : 'Completa la información para crear una nueva empresa'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Nombre de la Empresa *
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder="Ej: Empresa ABC S.A."
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <p className="text-sm text-red-600">{errors.nombre}</p>
              )}
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label htmlFor="logo" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Logo de la Empresa
              </Label>
              <div className="space-y-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="cursor-pointer"
                />
                {formData.logo && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={formData.logo} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-contain border rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Descripción
            </Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Información adicional sobre la empresa..."
              rows={3}
            />
          </div>

          {/* Información adicional */}
          {empresa && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    Estadísticas
                  </Badge>
                  Información de la Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium">Empleados</p>
                    <p className="text-lg font-bold text-blue-600">{empresa.empleadosCount}</p>
                  </div>
                  <div>
                    <p className="font-medium">Recibos</p>
                    <p className="text-lg font-bold text-green-600">{empresa.recibosCount}</p>
                  </div>
                  <div>
                    <p className="font-medium">Descuentos</p>
                    <p className="text-lg font-bold text-orange-600">{empresa.descuentosCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
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
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : (empresa ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}