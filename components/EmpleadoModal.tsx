// components/EmpleadoModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building2, 
  Hash, 
  CreditCard, 
  Calendar,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';
import FaceRecognitionCapture from '@/components/biometric/FaceRecognitionCapture';
import { toast } from 'sonner';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { empleadoManager, type EmpleadoData } from '@/lib/empleado-manager';
import { canManageUsers } from '@/lib/user-management';
import { useEmpresasFromReceipts } from '@/hooks/useEmpresasFromReceipts';

interface EmpleadoModalProps {
  empleado?: EmpleadoData;
  nuevaEmpresaCreada?: string | null;
  onClose: () => void;
  onSave: () => void;
  onOpenFicha?: (legajo: string, empresa: string) => void;
  onOpenNuevaEmpresa?: () => void;
  onEmpresaCreated?: (nombreEmpresa: string) => void;
}

export default function EmpleadoModal({ empleado, nuevaEmpresaCreada, onClose, onSave, onOpenFicha, onOpenNuevaEmpresa, onEmpresaCreated }: EmpleadoModalProps) {
  const { dataManager } = useCentralizedDataManager();
  const { data: session } = useSession();
  const { empresas: empresasFromReceipts } = useEmpresasFromReceipts();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    legajo: '',
    nombre: '',
    cuil: '',
    empresa: '',
    observaciones: '',
    faceDescriptor: null as number[] | null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const empleadoRef = useRef(empleado);

  // Verificar permisos
  const canRegister = canManageUsers(session?.user);

  // Actualizar ref cuando cambie el empleado
  useEffect(() => {
    empleadoRef.current = empleado;
  }, [empleado]);

  useEffect(() => {
    if (empleado) {
      // Modo edición - solo cuando hay empleado
      console.log('🔍 Debug modal recibiendo empleado COMPLETO:', empleado);
      console.log('🔍 Debug empresa del empleado:', empleado.empresa);
      console.log('🔍 Debug data.EMPRESA:', empleado.data?.EMPRESA);
      console.log('🔍 Debug data completo:', empleado.data);
      const newFormData = {
        legajo: empleado.legajo || '',
        nombre: empleado.nombre || '',
        cuil: empleado.cuil || '',
        empresa: empleado.empresa || '',
        observaciones: empleado.data?.OBSERVACIONES || '',
        faceDescriptor: empleado.data?.FACE_DESCRIPTOR || null
      };
      console.log('🔍 Debug estableciendo formData:', newFormData);
      setFormData(newFormData);
    } else {
      // Modo creación - resetear formulario
      setFormData({
        legajo: '',
        nombre: '',
        cuil: '',
        empresa: '',
        observaciones: '',
        faceDescriptor: null
      });
    }
    setErrors({});
  }, [empleado]);

  // Manejar selección automática de empresa cuando se crea una nueva
  useEffect(() => {
    if (nuevaEmpresaCreada) {
      console.log('🔍 Debug - Seleccionando empresa automáticamente:', nuevaEmpresaCreada);
      console.log('🔍 Debug - Empresas disponibles:', empresasFromReceipts);
      console.log('🔍 Debug - Empresa existe en lista:', empresasFromReceipts.some(emp => emp.nombre === nuevaEmpresaCreada));
      
      setFormData(prev => ({
        ...prev,
        empresa: nuevaEmpresaCreada
      }));
    }
  }, [nuevaEmpresaCreada, empresasFromReceipts]);

  // Debug empresas cuando cambien - SIN afectar formData
  useEffect(() => {
    console.log('🔍 Debug empresas disponibles:', empresasFromReceipts);
    console.log('🔍 Debug formData.empresa actual:', formData.empresa);
  }, [empresasFromReceipts, formData.empresa]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.legajo.trim()) {
      newErrors.legajo = 'El legajo es obligatorio';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.empresa.trim()) {
      newErrors.empresa = 'La empresa es obligatoria';
    }

    // Período ya no es obligatorio para empleados manuales

    // Validar formato de CUIL si se proporciona
    if (formData.cuil && !/^\d{2}-\d{8}-\d{1}$/.test(formData.cuil)) {
      newErrors.cuil = 'El CUIL debe tener el formato XX-XXXXXXXX-X';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canRegister) {
      toast.error('No tienes permisos para gestionar empleados');
      return;
    }

    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    setLoading(true);
    
    try {
      const empleadoData = {
        legajo: formData.legajo.trim(),
        nombre: formData.nombre.trim(),
        cuil: formData.cuil.trim(),
        empresa: formData.empresa.trim(),
        observaciones: formData.observaciones.trim(),
        faceDescriptor: formData.faceDescriptor
      };

      if (empleado) {
        // Modo edición
        await updateEmpleado(empleado.legajo, empleadoData);
        toast.success('Empleado actualizado exitosamente');
      } else {
        // Modo creación
        await createEmpleado(empleadoData);
        toast.success('Empleado creado exitosamente');
      }
      
      onSave();
      
    } catch (error) {
      console.error('Error guardando empleado:', error);
      
      // Mostrar error específico en el formulario
      if (error instanceof Error && error.message.includes('Ya existe un empleado con ese legajo')) {
        setErrors(prev => ({
          ...prev,
          legajo: 'Ya existe un empleado con ese legajo'
        }));
      } else {
        toast.error('Error al guardar el empleado');
      }
    } finally {
      setLoading(false);
    }
  };

  const createEmpleado = async (data: any) => {
    // Verificar si ya existe un empleado con ese legajo Y empresa
    const existing = await dataManager.getConsolidatedByLegajo(data.legajo);
    const duplicateInSameCompany = existing.some(emp => 
      emp.data?.EMPRESA === data.empresa
    );
    
    if (duplicateInSameCompany) {
      throw new Error(`Ya existe un empleado con legajo ${data.legajo} en la empresa ${data.empresa}`);
    }

    // Crear clave única con período por defecto
    const periodo = 'MANUAL';
    const key = `${data.legajo}-${periodo}-${data.empresa}`;
    
    // Crear datos del empleado
    const empleadoRecord = {
      id: key, // Usar la key como id único
      key,
      legajo: data.legajo,
      periodo: periodo,
      nombre: data.nombre,
      cuil: data.cuil,
      cuil_norm: data.cuil ? data.cuil.replace(/-/g, '') : '',
        data: {
          EMPRESA: data.empresa,
          CUIL: data.cuil,
          OBSERVACIONES: data.observaciones,
          MANUAL: 'true',
          TIPO: 'MANUAL',
          ...(data.faceDescriptor && { FACE_DESCRIPTOR: data.faceDescriptor })
        }
    };

    await dataManager.addConsolidated(empleadoRecord);
  };

  const updateEmpleado = async (legajoOriginal: string, data: any) => {
    // Si cambió el legajo, verificar que no exista otro con el nuevo legajo Y empresa
    if (legajoOriginal !== data.legajo) {
      const existing = await dataManager.getConsolidatedByLegajo(data.legajo);
      const duplicateInSameCompany = existing.some(emp => 
        emp.data?.EMPRESA === data.empresa
      );
      
      if (duplicateInSameCompany) {
        throw new Error(`Ya existe un empleado con legajo ${data.legajo} en la empresa ${data.empresa}`);
      }
    }

    // Actualizar todos los registros del empleado
    const empleadosToUpdate = await dataManager.getConsolidatedByLegajo(legajoOriginal);
    
    for (const emp of empleadosToUpdate) {
      const periodo = 'MANUAL';
      const newKey = `${data.legajo}-${periodo}-${data.empresa}`;
      
      await dataManager.updateConsolidated(emp.key, {
        key: newKey,
        legajo: data.legajo,
        nombre: data.nombre,
        cuil: data.cuil,
        cuil_norm: data.cuil ? data.cuil.replace(/-/g, '') : '',
        periodo: periodo,
        data: {
          ...emp.data,
          EMPRESA: data.empresa,
          CUIL: data.cuil,
          OBSERVACIONES: data.observaciones,
          MANUAL: 'true',
          TIPO: 'MANUAL',
          ...(data.faceDescriptor && { FACE_DESCRIPTOR: data.faceDescriptor })
        }
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Manejar selección de "Nueva empresa"
    if (field === 'empresa' && value === '__nueva_empresa__') {
      // No hacer nada aquí, se manejará en el onValueChange del Select
      return;
    }
    
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

  if (!canRegister) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Sin Permisos
            </DialogTitle>
            <DialogDescription>
              No tienes permisos para gestionar empleados.
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pt-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {empleado ? 'Editar Empleado' : 'Nuevo Empleado'}
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
            {empleado 
              ? 'Modifica los datos del empleado seleccionado'
              : 'Completa la información para crear un nuevo empleado'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Legajo */}
            <div className="space-y-2">
              <Label htmlFor="legajo" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Legajo *
              </Label>
              <Input
                id="legajo"
                value={formData.legajo}
                onChange={(e) => handleInputChange('legajo', e.target.value)}
                placeholder="Ej: 001"
                className={errors.legajo ? 'border-red-500' : ''}
              />
              {errors.legajo && (
                <p className="text-sm text-red-600">{errors.legajo}</p>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre Completo *
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder="Ej: Juan Pérez"
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <p className="text-sm text-red-600">{errors.nombre}</p>
              )}
            </div>

            {/* CUIL */}
            <div className="space-y-2">
              <Label htmlFor="cuil" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                CUIL
              </Label>
              <Input
                id="cuil"
                value={formData.cuil}
                onChange={(e) => handleInputChange('cuil', e.target.value)}
                placeholder="Ej: 20-12345678-9"
                className={errors.cuil ? 'border-red-500' : ''}
              />
              {errors.cuil && (
                <p className="text-sm text-red-600">{errors.cuil}</p>
              )}
            </div>

            {/* Empresa */}
            <div className="space-y-2">
              <Label htmlFor="empresa" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa *
              </Label>
              <Select 
                key={`empresa-${formData.empresa}`}
                value={formData.empresa || ''} 
                onValueChange={(value) => {
                  if (value === '__nueva_empresa__') {
                    // Abrir modal de nueva empresa
                    if (onOpenNuevaEmpresa) {
                      onOpenNuevaEmpresa();
                    }
                  } else {
                    handleInputChange('empresa', value);
                  }
                }}
              >
                <SelectTrigger className={`w-full ${errors.empresa ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresasFromReceipts.map(empresa => (
                    <SelectItem key={empresa} value={empresa}>
                      {empresa}
                    </SelectItem>
                  ))}
                  <SelectItem value="__nueva_empresa__" className="text-blue-600 font-medium">
                    + Nueva empresa
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.empresa && (
                <p className="text-sm text-red-600">{errors.empresa}</p>
              )}
            </div>

            {/* Campos de período y salario removidos para empleados manuales */}
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">
              Observaciones
            </Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              placeholder="Notas adicionales sobre el empleado..."
              rows={3}
            />
          </div>

          {/* Reconocimiento Facial - Sección Colapsable */}
          <FaceRecognitionCapture
            savedDescriptor={formData.faceDescriptor}
            onDescriptorCaptured={(descriptor) => {
              setFormData(prev => ({
                ...prev,
                faceDescriptor: descriptor
              }));
            }}
            onDescriptorRemoved={() => {
              setFormData(prev => ({
                ...prev,
                faceDescriptor: null
              }));
            }}
          />

          {/* Información adicional para empleados manuales */}
          {empleado && empleado.recibosCount === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    Manual
                  </Badge>
                  Información del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <p>Este empleado será registrado como <strong>manual</strong>, lo que significa que fue creado sin recibos de sueldo asociados.</p>
                <p className="mt-2">Podrás agregar recibos posteriormente o gestionar descuentos independientemente.</p>
              </CardContent>
            </Card>
          )}

          {/* Información para empleados con recibos */}
          {empleado && empleado.recibosCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">
                    Con Recibos
                  </Badge>
                  Información del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <p>Este empleado tiene <strong>{empleado.recibosCount} recibo(s)</strong> y <strong>{empleado.descuentosCount} descuento(s)</strong> vinculados.</p>
                <p className="mt-2">Puedes ver los detalles completos en la ficha del empleado.</p>
              </CardContent>
            </Card>
          )}

          {/* Botones */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <div className="flex gap-2">
              {empleado && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    if (onOpenFicha && empleado) {
                      onOpenFicha(empleado.legajo, empleado.empresa);
                    }
                  }}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <User className="h-4 w-4 mr-2" />
                  Ver Ficha
                </Button>
              )}
            </div>
            <div className="flex gap-2">
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
                {loading ? 'Guardando...' : (empleado ? 'Actualizar' : 'Crear')}
              </Button>
            </div>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
