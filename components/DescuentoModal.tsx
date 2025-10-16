// components/DescuentoModal.tsx
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
import { X, Plus, ChevronDown } from 'lucide-react';
import { 
  createDescuento, 
  updateDescuento, 
  searchDescuentosByNombre,
  Descuento 
} from '@/lib/descuentos-manager';
import { toast } from 'sonner';
import { EmployeeSelector } from './EmployeeSelector';
import type { ConsolidatedEntity } from '@/lib/db';

interface DescuentoModalProps {
  descuento?: Descuento | null;
  onClose: () => void;
  onSave: () => void;
  employees: ConsolidatedEntity[];
}

export default function DescuentoModal({ descuento, onClose, onSave, employees }: DescuentoModalProps) {
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
    observaciones: ''
  });
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        observaciones: descuento.observaciones || ''
      });
    } else {
      // Establecer empresa por defecto basada en la sesión
      setFormData(prev => ({
        ...prev,
        empresa: session?.user?.empresaId || ''
      }));
    }
  }, [descuento, session]);

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

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {descuento ? 'Editar Descuento' : 'Nuevo Descuento'}
          </DialogTitle>
          <DialogDescription>
            {descuento ? 'Modifica los datos del descuento' : 'Crea un nuevo descuento para un empleado'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <EmployeeSelector
                employees={employees}
                value={formData.legajo ? `${formData.legajo}||${formData.periodo || ''}` : ''}
                onValueChange={(value) => {
                  if (value) {
                    const [legajo, periodo] = value.split('||');
                    const employee = employees.find(emp => emp.legajo === legajo && emp.periodo === periodo);
                    if (employee) {
                      setFormData(prev => ({
                        ...prev,
                        legajo: employee.legajo,
                        nombre: employee.nombre || '',
                        empresa: employee.data?.EMPRESA || '',
                        periodo: employee.periodo
                      }));
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

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto ($) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '') {
                      e.target.select();
                    }
                  }}
                  placeholder="0.00"
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuotas">Cantidad de Cuotas *</Label>
              <Select
                value={(formData.cantidadCuotas || 1).toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cantidadCuotas: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuotas" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'cuota' : 'cuotas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Agregar tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" onClick={handleAddTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botón para mostrar/ocultar campos avanzados */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              {showAdvanced ? 'Menos opciones' : 'Más opciones'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Campos avanzados */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : (descuento ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { DescuentoModal };
