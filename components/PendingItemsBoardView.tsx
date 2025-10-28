// components/PendingItemsBoardView.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus,
  Edit,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import PendingItemModal from './PendingItemModal';

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

interface PendingItemsBoardViewProps {
  items: PendingItem[];
  onItemsChange: (items: PendingItem[]) => void;
  onStatusChange: (itemId: string, status: PendingItem['status']) => void;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (item: PendingItem) => void;
}

const STATUS_CONFIG = {
  pending: { 
    label: 'Pendiente', 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: Clock,
    bgColor: 'bg-gray-50',
    headerColor: 'bg-gray-100',
    textColor: 'text-gray-800'
  },
  in_progress: { 
    label: 'En Progreso', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: Play,
    bgColor: 'bg-blue-50',
    headerColor: 'bg-blue-100',
    textColor: 'text-blue-800'
  },
  completed: { 
    label: 'Completado', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    headerColor: 'bg-green-100',
    textColor: 'text-green-800'
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: XCircle,
    bgColor: 'bg-red-50',
    headerColor: 'bg-red-100',
    textColor: 'text-red-800'
  }
};

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

export default function PendingItemsBoardView({
  items,
  onItemsChange,
  onStatusChange,
  onDeleteItem,
  onEditItem
}: PendingItemsBoardViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PendingItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<PendingItem | null>(null);

  // Agrupar items por estado y ordenar por prioridad
  const itemsByStatus = items.reduce((acc, item) => {
    if (!acc[item.status]) {
      acc[item.status] = [];
    }
    acc[item.status].push(item);
    return acc;
  }, {} as Record<string, PendingItem[]>);

  // Ordenar cada columna por prioridad (high -> medium -> low)
  Object.keys(itemsByStatus).forEach(status => {
    itemsByStatus[status].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  });

  // Solo mostrar columnas que tengan items
  const visibleStatuses = Object.keys(STATUS_CONFIG).filter(status => 
    itemsByStatus[status] && itemsByStatus[status].length > 0
  );

  const handleDragStart = (e: React.DragEvent, item: PendingItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: PendingItem['status']) => {
    e.preventDefault();
    
    if (draggedItem && draggedItem.status !== targetStatus) {
      onStatusChange(draggedItem.id, targetStatus);
      toast.success(`Item movido a ${STATUS_CONFIG[targetStatus].label}`);
    }
    
    setDraggedItem(null);
  };

  const handleEdit = (item: PendingItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handlePriorityChange = (item: PendingItem) => {
    const priorities: PendingItem['priority'][] = ['high', 'medium', 'low'];
    const currentIndex = priorities.indexOf(item.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    const newPriority = priorities[nextIndex];
    
    const updatedItem = { ...item, priority: newPriority };
    const updatedItems = items.map(i => i.id === item.id ? updatedItem : i);
    onItemsChange(updatedItems);
    toast.success(`Prioridad cambiada a ${PRIORITY_CONFIG[newPriority].label}`);
  };

  const handleSave = async (item: PendingItem) => {
    try {
      if (editingItem) {
        // Actualizar item existente
        const updatedItems = items.map(i => i.id === item.id ? item : i);
        onItemsChange(updatedItems);
      } else {
        // Crear nuevo item
        const newItem = { ...item, id: `item_${Date.now()}` };
        onItemsChange([...items, newItem]);
      }
    } catch (error) {
      console.error('Error guardando item:', error);
      toast.error('Error guardando item');
    }
  };

  const handleDelete = (itemId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este item?')) {
      onDeleteItem(itemId);
      toast.success('Item eliminado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con botón de crear */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Tablero de Items Pendientes</h3>
          <p className="text-sm text-gray-600">
            Organiza tus tareas por estado con drag & drop
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Item
        </Button>
      </div>

      {/* Tablero en columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleStatuses.map((status) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const statusItems = itemsByStatus[status] || [];
          const Icon = config.icon;

          return (
            <div
              key={status}
              className={`${config.bgColor} rounded-lg border-2 ${config.color.split(' ')[2]} min-h-[400px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status as PendingItem['status'])}
            >
              {/* Header de la columna */}
              <div className={`${config.headerColor} ${config.textColor} p-4 rounded-t-lg border-b-2 ${config.color.split(' ')[2]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <h4 className="font-semibold">{config.label}</h4>
                  </div>
                  <Badge variant="secondary" className="bg-white/50 text-gray-700">
                    {statusItems.length}
                  </Badge>
                </div>
              </div>

              {/* Items de la columna */}
              <div className="p-4 space-y-3 min-h-[300px]">
                {statusItems.map((item) => {
                  const priorityConfig = PRIORITY_CONFIG[item.priority];
                  const PriorityIcon = priorityConfig.icon;

                  return (
                    <Card
                      key={item.id}
                      className={`bg-white/70 border border-white/30 hover:shadow-md transition-all duration-200 cursor-move`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      style={{
                        animation: 'cardSlideIn 0.3s ease-out'
                      }}
                    >
                      <style jsx>{`
                        @keyframes cardSlideIn {
                          from {
                            opacity: 0;
                            transform: translateY(-10px);
                          }
                          to {
                            opacity: 1;
                            transform: translateY(0);
                          }
                        }
                      `}</style>
                      
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header del item */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                {item.description}
                              </p>
                              {item.category && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {item.category}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(item)}
                                className="h-6 w-6 p-0 hover:bg-blue-100"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Prioridad */}
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`${priorityConfig.bgColor} ${priorityConfig.color.split(' ')[1]} border-2 ${priorityConfig.color.split(' ')[2]} cursor-pointer hover:opacity-80 transition-opacity`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePriorityChange(item);
                              }}
                            >
                              <PriorityIcon className="h-3 w-3 mr-1" />
                              {priorityConfig.label}
                            </Badge>
                          </div>

                          {/* Solución propuesta */}
                          {item.proposedSolution && (
                            <div className="text-xs text-gray-600 bg-white/50 p-2 rounded border">
                              <strong>Solución:</strong> {item.proposedSolution}
                            </div>
                          )}

                          {/* Fechas */}
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Creado: {new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                            {item.updatedAt !== item.createdAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Actualizado: {new Date(item.updatedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Mensaje cuando no hay items */}
                {statusItems.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                    <div className="text-center">
                      <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay items</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de edición */}
      <PendingItemModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        item={editingItem}
        cardColor="bg-blue-50"
      />
    </div>
  );
}
