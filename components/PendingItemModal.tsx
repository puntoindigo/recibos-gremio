// components/PendingItemModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { PendingItemTagsSelector } from './PendingItemTagsSelector';

interface PendingItem {
  id: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  proposedSolution?: string;
  feedback?: string;
  resolvedAt?: string;
  tags?: string[];
}

interface PendingItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: PendingItem) => void;
  item?: PendingItem | null;
  cardColor?: string;
}

const PRIORITY_CONFIG = {
  high: { 
    label: 'Alta', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: AlertTriangle,
    bgColor: 'bg-red-50'
  },
  medium: { 
    label: 'Media', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock,
    bgColor: 'bg-yellow-50'
  },
  low: { 
    label: 'Baja', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    bgColor: 'bg-green-50'
  }
};

const STATUS_CONFIG = {
  pending: { 
    label: 'Pendiente', 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: Clock,
    bgColor: 'bg-gray-50'
  },
  'in_progress': { 
    label: 'En Progreso', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: Clock,
    bgColor: 'bg-blue-50'
  },
  completed: { 
    label: 'Completado', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    bgColor: 'bg-green-50'
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: XCircle,
    bgColor: 'bg-red-50'
  }
};

export default function PendingItemModal({ 
  isOpen, 
  onClose, 
  onSave, 
  item, 
  cardColor 
}: PendingItemModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    proposedSolution: '',
    tags: [] as string[]
  });

  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  // Inicializar datos del formulario
  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData({
          title: item.description || '',
          description: item.description || '',
          priority: item.priority || 'medium',
          status: item.status || 'pending',
          proposedSolution: item.proposedSolution || '',
          tags: item.tags || []
        });
      } else {
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          status: 'pending',
          proposedSolution: '',
          tags: []
        });
      }
    }
  }, [isOpen, item]);

  // Función de guardado automático
  const autoSave = useCallback(async () => {
    if (!item || isSaving) return;
    
    setIsSaving(true);
    setShowSaveAnimation(true);
    
    try {
      const itemData: PendingItem = {
        ...item,
        description: formData.title, // Usar el título como descripción
        priority: formData.priority,
        status: formData.status,
        proposedSolution: formData.proposedSolution,
        tags: formData.tags,
        updatedAt: new Date().toISOString()
      };
      await onSave(itemData);
      
      // Mostrar animación de guardado exitoso
      setTimeout(() => {
        setShowSaveAnimation(false);
      }, 1000);
    } catch (error) {
      console.error('Error en guardado automático:', error);
      setShowSaveAnimation(false);
    } finally {
      setIsSaving(false);
    }
  }, [item, isSaving, onSave]);

  // Efecto para guardado automático con debounce
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    if (item && formData.title.trim()) {
      const timeout = setTimeout(() => {
        autoSave();
      }, 1000); // Guardar después de 1 segundo de inactividad
      
      setAutoSaveTimeout(timeout);
    }
    
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [formData.title, formData.priority, formData.status, formData.proposedSolution, formData.tags, item]);

  // Efecto para manejar tecla ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    onClose();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    setIsSaving(true);
    setShowSaveAnimation(true);

    try {
      const itemData: PendingItem = {
        id: item?.id || `item-${Date.now()}`,
        description: formData.title,
        category: '', // Ya no usamos categoría
        priority: formData.priority,
        status: formData.status,
        createdAt: item?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        proposedSolution: formData.proposedSolution,
        tags: formData.tags
      };

      await onSave(itemData);
      
      // Mostrar animación de guardado exitoso
      setTimeout(() => {
        setShowSaveAnimation(false);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Error guardando item:', error);
      setShowSaveAnimation(false);
      toast.error('Error guardando el item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (tags: string[]) => {
    handleInputChange('tags', tags);
  };

  const PriorityIcon = PRIORITY_CONFIG[formData.priority].icon;
  const StatusIcon = STATUS_CONFIG[formData.status].icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-semibold pr-8">
            {item ? 'Editar Item Pendiente' : 'Nuevo Item Pendiente'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute top-0 right-0 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Título editable */}
          <div>
            <Input
              id="title"
              placeholder="Título del item pendiente..."
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="text-base"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Tags
            </Label>
            <PendingItemTagsSelector
              tags={formData.tags}
              onTagsChange={handleTagsChange}
              defaultTag="General"
            />
          </div>

          {/* Prioridad y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'high' | 'medium' | 'low') => handleInputChange('priority', value)}
              >
                <SelectTrigger className="h-10">
                  <div className="flex items-center space-x-2">
                    <PriorityIcon className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>Alta</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Media</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Baja</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') => handleInputChange('status', value)}
              >
                <SelectTrigger className="h-10">
                  <div className="flex items-center space-x-2">
                    <StatusIcon className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>Pendiente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>En Progreso</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Completado</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Cancelado</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Solución Propuesta */}
          <div className="space-y-2">
            <Label htmlFor="proposedSolution" className="text-sm font-medium">
              Solución Propuesta (opcional)
            </Label>
            <Textarea
              id="proposedSolution"
              placeholder="Describe la solución propuesta..."
              value={formData.proposedSolution}
              onChange={(e) => handleInputChange('proposedSolution', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Indicador de guardado automático */}
          {showSaveAnimation && (
            <div className="flex items-center justify-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Guardando...</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}