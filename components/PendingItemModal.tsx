// components/PendingItemModal.tsx
import React, { useState, useEffect } from 'react';
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
  X
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
  in_progress: { 
    label: 'En Progreso', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: Calendar,
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
  cardColor = 'bg-blue-50' 
}: PendingItemModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    proposedSolution: '',
    tags: [] as string[]
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData({
          title: item.description || '',
          description: item.description || '',
          category: item.category || '',
          priority: item.priority || 'medium',
          status: item.status || 'pending',
          proposedSolution: item.proposedSolution || '',
          tags: item.tags || []
        });
      } else {
        setFormData({
          title: '',
          description: '',
          category: '',
          priority: 'medium',
          status: 'pending',
          proposedSolution: '',
          tags: []
        });
      }
    }
  }, [isOpen, item]);

  // Función de guardado automático
  const autoSave = async () => {
    if (!item || isSaving) return;
    
    setIsSaving(true);
    try {
      const itemData: PendingItem = {
        ...item,
        description: formData.title, // Usar el título como descripción
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        proposedSolution: formData.proposedSolution,
        tags: formData.tags,
        updatedAt: new Date().toISOString()
      };
      await onSave(itemData);
    } catch (error) {
      console.error('Error en guardado automático:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
  }, [formData]);

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

  const handleSave = async () => {
    if (!formData.description.trim()) {
      toast.error('La descripción es requerida');
      return;
    }

    setIsLoading(true);
    
    try {
      const itemData: PendingItem = {
        id: item?.id || `item_${Date.now()}`,
        description: formData.description.trim(),
        category: formData.category.trim(),
        priority: formData.priority,
        status: formData.status,
        createdAt: item?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        proposedSolution: formData.proposedSolution.trim() || undefined
      };

      await onSave(itemData);
      toast.success(item ? 'Item actualizado' : 'Item creado');
      onClose();
    } catch (error) {
      console.error('Error guardando item:', error);
      toast.error('Error guardando item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const priorityConfig = PRIORITY_CONFIG[formData.priority];
  const statusConfig = STATUS_CONFIG[formData.status];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`max-w-2xl ${cardColor} border-2 shadow-2xl transition-all duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2`}
        style={{
          animation: isOpen ? 'modalSlideIn 0.3s ease-out' : 'modalSlideOut 0.3s ease-in'
        }}
      >
        <style jsx>{`
          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          @keyframes modalSlideOut {
            from {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
            to {
              opacity: 0;
              transform: scale(0.95) translateY(-20px);
            }
          }
        `}</style>
        
        {/* Botón de cerrar fuera del contenido */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 h-8 w-8 p-0 z-10 bg-white/80 hover:bg-white shadow-md"
        >
          <X className="h-4 w-4" />
        </Button>

        <DialogHeader className="space-y-4 pb-4">
          <div className="flex items-center gap-2">
            {item ? (
              <>
                <Calendar className="h-6 w-6 text-blue-600" />
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-2xl font-bold border-none shadow-none p-0 h-auto bg-transparent focus:ring-0 focus:border-none focus:outline-none"
                  placeholder="Título del item..."
                  disabled={isLoading}
                />
              </>
            ) : (
              <>
                <Plus className="h-6 w-6 text-blue-600" />
                <span className="text-2xl font-bold">Nuevo Item Pendiente</span>
              </>
            )}
            {isSaving && (
              <div className="flex items-center gap-1 text-sm text-gray-500 ml-4">
                <div className="animate-spin h-3 w-3 border border-gray-300 border-t-gray-600 rounded-full"></div>
                <span>Guardando...</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del item */}
          {item && (
            <div className="text-xs text-gray-500 text-right">
              <span>Ult.Act.: {new Date(item.updatedAt).toLocaleString()}</span>
            </div>
          )}

          {/* Formulario */}
          <div className="space-y-4">
            {/* Descripción */}
            <div className="space-y-2">
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe el item pendiente..."
                className="min-h-[100px] resize-none"
                disabled={isLoading}
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Categoría (ej: Bug, Feature, Mejora...)"
                disabled={isLoading}
              />
            </div>

            {/* Prioridad y Estado */}
            <div className="grid grid-cols-2 gap-4">
              {/* Prioridad */}
              <div className="space-y-2">
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'high' | 'medium' | 'low') => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className={`${priorityConfig.bgColor} border-2 ${priorityConfig.color.split(' ')[2]}`}>
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key} className={config.bgColor}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Select
                  value={formData.status}
                  onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className={`${statusConfig.bgColor} border-2 ${statusConfig.color.split(' ')[2]}`}>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key} className={config.bgColor}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Solución Propuesta */}
            <div className="space-y-2">
              <Textarea
                id="proposedSolution"
                value={formData.proposedSolution}
                onChange={(e) => setFormData(prev => ({ ...prev, proposedSolution: e.target.value }))}
                placeholder="Solución propuesta (opcional)..."
                className="min-h-[80px] resize-none"
                disabled={isLoading}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <PendingItemTagsSelector
                tags={formData.tags}
                onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                existingTags={['bug', 'feature', 'mejora', 'urgente', 'documentación', 'testing', 'refactor']}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
