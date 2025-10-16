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
import { X, Plus } from 'lucide-react';
import { 
  createDescuento, 
  updateDescuento, 
  searchDescuentosByNombre,
  Descuento 
} from '@/lib/descuentos-manager';

interface DescuentoModalProps {
  descuento?: Descuento | null;
  onClose: () => void;
  onSave: () => void;
}

export default function DescuentoModal({ descuento, onClose, onSave }: DescuentoModalProps) {
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
    } catch (error) {
      console.error('Error guardando descuento:', error);
      alert('Error al guardar el descuento');
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
              <Label htmlFor="legajo">Legajo *</Label>
              <div className="relative">
                <Input
                  id="legajo"
                  value={formData.legajo}
                  onChange={(e) => handleLegajoChange(e.target.value)}
                  placeholder="Ej: 12345"
                  required
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del empleado"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                value={formData.monto}
                onChange={(e) => setFormData(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuotas">Cantidad de Cuotas *</Label>
              <Input
                id="cuotas"
                type="number"
                min="1"
                value={formData.cantidadCuotas}
                onChange={(e) => setFormData(prev => ({ ...prev, cantidadCuotas: parseInt(e.target.value) || 1 }))}
                placeholder="1"
                required
              />
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
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción del descuento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Input
              id="motivo"
              value={formData.motivo}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Motivo del descuento"
              required
            />
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

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              placeholder="Observaciones adicionales"
            />
          </div>

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
