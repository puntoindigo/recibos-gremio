// components/DescuentoModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { X, Plus, ChevronDown } from 'lucide-react';
import { 
  createDescuento, 
  updateDescuento, 
  searchDescuentosByNombre,
  Descuento 
} from '@/lib/descuentos-manager';
import { toast } from 'sonner';
import { EmployeeSelector } from './EmployeeSelector';
import { CuotasSelector } from './CuotasSelector';
import { TagsSelector } from './TagsSelector';
import CreateEmployeeModal from './CreateEmployeeModal';
import type { ConsolidatedEntity } from '@/lib/db';

interface DescuentoModalProps {
  descuento?: Descuento | null;
  onClose: () => void;
  onSave: () => void;
  employees: ConsolidatedEntity[];
  allDescuentos?: Descuento[]; // Para autocompletado de tags
  onEmployeeCreated?: (employee: ConsolidatedEntity) => void;
}

import { parseDateToTimestamp, formatTimestampToDateString, getCurrentDateString } from '@/lib/date-utils';

export default function DescuentoModal({ descuento, onClose, onSave, employees, allDescuentos = [], onEmployeeCreated }: DescuentoModalProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    legajo: '',
    nombre: '',
    empresa: '',
    monto: 0,
    cantidadCuotas: 1,
    descripcion: '',
    tipoDescuento: 'PRESTAMO' as const,
    motivo: '',
    tags: [] as string[],
    observaciones: '',
    fechaInicio: getCurrentDateString() // Fecha actual en formato YYYY-MM-DD
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [localEmployees, setLocalEmployees] = useState<ConsolidatedEntity[]>(employees);
  const [employeeSearchValue, setEmployeeSearchValue] = useState('');

  // Refs para manejo de focus
  const employeeRef = useRef<HTMLInputElement>(null);
  const fechaRef = useRef<HTMLInputElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);
  const cuotasRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const crearRef = useRef<HTMLButtonElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const masOpcionesRef = useRef<HTMLButtonElement>(null);

  // Tags existentes para autocompletado
  const existingTags = ['prestamo', 'adelanto', 'cuota', 'multa', 'seguro', 'obra social', 'sindicato'];

  // Obtener el último tag usado
  const getLastUsedTag = (): string => {
    if (allDescuentos.length === 0) return '';
    
    // Ordenar descuentos por fecha de creación descendente
    const sortedDescuentos = [...allDescuentos].sort((a, b) => {
      const fechaA = a.fechaCreacion || 0;
      const fechaB = b.fechaCreacion || 0;
      return fechaB - fechaA;
    });
    
    // Buscar el primer descuento que tenga tags
    for (const descuento of sortedDescuentos) {
      if (descuento.tags && descuento.tags.length > 0) {
        // Retornar el primer tag del descuento más reciente
        return descuento.tags[0];
      }
    }
    
    return '';
  };

  const lastUsedTag = getLastUsedTag();

  // Sincronizar empleados locales con el prop
  useEffect(() => {
    setLocalEmployees(employees);
  }, [employees]);

  useEffect(() => {
    if (descuento) {
      setFormData({
        legajo: descuento.legajo,
        nombre: descuento.nombre,
        empresa: descuento.empresa,
        monto: descuento.monto,
        cantidadCuotas: descuento.cantidadCuotas,
        descripcion: descuento.descripcion,
        tipoDescuento: descuento.tipoDescuento,
        motivo: descuento.motivo,
        tags: descuento.tags,
        observaciones: descuento.observaciones || '',
        fechaInicio: descuento.fechaInicio ? formatTimestampToDateString(descuento.fechaInicio) : getCurrentDateString()
      });
    } else {
      // Establecer empresa por defecto basada en la sesión
      setFormData(prev => ({
        ...prev,
        empresa: session?.user?.empresaId || ''
      }));
      
      // Focus automático en el campo de empleado cuando se abre el modal
      setTimeout(() => {
        employeeRef.current?.focus();
      }, 100);
    }
  }, [descuento, session]);

  // Atajo de teclado ESC para cancelar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleLegajoChange = async (value: string) => {
    setFormData(prev => ({ ...prev, legajo: value }));
    
    if (value.length >= 3) {
      try {
        const results = await searchDescuentosByNombre(value);
        const uniqueNames = [...new Set(results.map(r => r.nombre))];
        setSuggestions(uniqueNames.slice(0, 5));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error buscando sugerencias:', error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (nombre: string) => {
    setFormData(prev => ({ ...prev, nombre }));
    setShowSuggestions(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación: empleado es obligatorio
    if (!formData.legajo || !formData.nombre) {
      alert('Debe seleccionar un empleado');
      return;
    }
    
    // Validación: monto es obligatorio
    if (!formData.monto || formData.monto <= 0) {
      alert('Debe ingresar un monto válido');
      return;
    }
    
    // Validación: al menos uno de los campos opcionales debe estar completo
    const hasDescripcion = formData.descripcion.trim().length > 0;
    const hasMotivo = formData.motivo.trim().length > 0;
    const hasTags = formData.tags.length > 0;
    
    if (!hasDescripcion && !hasMotivo && !hasTags) {
      alert('Debe completar al menos uno de los siguientes campos: Descripción, Motivo o Tags');
      return;
    }
    
    setIsLoading(true);

    try {
      const descuentoData = {
        ...formData,
        fechaInicio: parseDateToTimestamp(formData.fechaInicio),
        cuotaActual: descuento?.cuotaActual || 0,
        estado: descuento?.estado || 'ACTIVO',
        autorizadoPor: session?.user?.name || '',
        fechaAutorizacion: Date.now(),
        creadoPor: session?.user?.id || '',
        modificadoPor: session?.user?.id || ''
      };

      if (descuento) {
        await updateDescuento(descuento.id, descuentoData, session?.user?.id || '');
      } else {
        await createDescuento(descuentoData);
      }

      onSave();
      toast.success(descuento ? 'Descuento actualizado correctamente' : 'Descuento creado correctamente');
    } catch (error) {
      console.error('Error guardando descuento:', error);
      toast.error('Error al guardar el descuento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEmployee = () => {
    setShowCreateEmployee(true);
  };

  const handleEmployeeCreated = (newEmployee: ConsolidatedEntity) => {
    // Agregar el nuevo empleado a la lista local
    setLocalEmployees(prev => [...prev, newEmployee]);
    
    // Seleccionar automáticamente el nuevo empleado
    setFormData(prev => ({
      ...prev,
      legajo: newEmployee.legajo,
      nombre: newEmployee.nombre || '',
      empresa: newEmployee.data?.EMPRESA || ''
    }));
    
    // Notificar al componente padre
    if (onEmployeeCreated) {
      onEmployeeCreated(newEmployee);
    }
    
    setShowCreateEmployee(false);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle>
          {descuento ? 'Editar Descuento' : 'Nuevo Descuento'}
        </DialogTitle>
        <DialogDescription>
          {descuento ? 'Modifica los datos del descuento' : 'Registra un nuevo descuento para un empleado'}
        </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <EmployeeSelector
                ref={employeeRef}
                employees={localEmployees}
                value={formData.legajo || ''}
                tabIndex={1}
                onCreateEmployee={handleCreateEmployee}
                onSearchChange={setEmployeeSearchValue}
                onValueChange={(value) => {
                  if (value) {
                    const employee = localEmployees.find(emp => emp.legajo === value);
                    if (employee) {
                      setFormData(prev => ({
                        ...prev,
                        legajo: employee.legajo,
                        nombre: employee.nombre || '',
                        empresa: employee.data?.EMPRESA || '',
                        periodo: employee.periodo
                      }));
                      
                      // Focus automático en el campo de fecha
                      setTimeout(() => {
                        fechaRef.current?.focus();
                      }, 100);
                    }
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      legajo: '',
                      nombre: '',
                      empresa: '',
                      periodo: ''
                    }));
                  }
                }}
                placeholder="Seleccionar empleado..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                ref={fechaRef}
                id="fecha"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    montoRef.current?.focus();
                  }
                }}
                tabIndex={2}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto ($) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  ref={montoRef}
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      cuotasRef.current?.focus();
                    }
                  }}
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '') {
                      e.target.select();
                    }
                  }}
                  placeholder="0.00"
                  className="pl-8"
                  tabIndex={3}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuotas">Cantidad de Cuotas *</Label>
              <CuotasSelector
                ref={cuotasRef}
                value={formData.cantidadCuotas || 1}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cantidadCuotas: value }))}
                onEnterPress={() => {
                  // Focus en el campo de tags
                  setTimeout(() => {
                    tagsRef.current?.focus();
                  }, 100);
                }}
                tabIndex={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagsSelector
              ref={tagsRef}
              tags={formData.tags}
              onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
              existingTags={existingTags}
              allDescuentos={allDescuentos}
              defaultTag={lastUsedTag}
              tabIndex={5}
            />
          </div>

          {/* Botón para mostrar/ocultar campos avanzados */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
              ref={masOpcionesRef}
              tabIndex={8}
            >
              {showAdvanced ? 'Menos opciones' : 'Más opciones'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Campos avanzados */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Descuento *</Label>
                <Select
                  value={formData.tipoDescuento}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipoDescuento: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESTAMO">Préstamo</SelectItem>
                    <SelectItem value="ADELANTO">Adelanto</SelectItem>
                    <SelectItem value="DESCUENTO_VARIO">Descuento Varios</SelectItem>
                    <SelectItem value="JUDICIAL">Judicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción del descuento (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Input
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Motivo del descuento (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} ref={cancelarRef} tabIndex={7}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} ref={crearRef} tabIndex={6}>
              {isLoading ? 'Guardando...' : (descuento ? 'Actualizar' : 'Registrar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <CreateEmployeeModal
      open={showCreateEmployee}
      onClose={() => setShowCreateEmployee(false)}
      onSave={handleEmployeeCreated}
      initialNombre={employeeSearchValue}
    />
    </>
  );
}

export { DescuentoModal };
