'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { GripVertical, CheckCircle, Circle, Clock, Trash2 } from 'lucide-react';
import { getPriorityColor } from '@/lib/priority-utils';
import { getStatusIcon, getStatusColor, getStatusText } from '@/lib/status-utils';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';

interface PendingItem {
  id: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  order: number;
  color?: string;
}

interface SortableItemProps {
  item: PendingItem;
  isDragging?: boolean;
  onToggleStatus: (itemId: string) => void;
  onEdit?: (item: PendingItem) => void;
  onExecute?: (item: PendingItem) => void;
  onDelete?: (itemId: string, event: React.MouseEvent) => void;
}

function SortableItem({ item, isDragging, onToggleStatus, onEdit, onExecute, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };



  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-4 border rounded-lg bg-white shadow-sm mb-2 transition-all duration-200 ${
        isSortableDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center space-x-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon(item.status)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {item.category}
            </span>
            <div className="flex items-center space-x-2">
              <div className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                #{item.id}
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${
                  item.status === 'completed' 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : item.status === 'in-progress'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}
              >
                {item.status === 'completed' ? 'FINALIZADA' : 
                 item.status === 'in-progress' ? 'ACTIVA' : 'PENDIENTE'}
              </Badge>
              <button 
                onClick={(e) => onDelete?.(item.id, e)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <span className="text-sm font-medium">{item.description}</span>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className={`text-xs ${getPriorityColor(item.priority)}`}>
              {item.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {item.category}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PendingItemsListViewProps {
  items: PendingItem[];
  onItemsChange: (items: PendingItem[]) => void;
  onToggleStatus: (itemId: string) => void;
  onDeleteItem: (id: string) => void;
}

export default function PendingItemsListView({ 
  items, 
  onItemsChange, 
  onToggleStatus,
  onDeleteItem
}: PendingItemsListViewProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over?.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Actualizar el orden
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        order: index + 1
      }));
      
      onItemsChange(updatedItems);
    }
  }

  const handleDeleteClick = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setItemToDelete(itemId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete);
      toast.success('Item eliminado correctamente');
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;

  return (
    <div className="space-y-4">
      {/* Instrucciones compactas */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">
          Arrastra para reordenar • Click para completar
        </p>
      </div>

      {/* Lista de items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={items.map(item => item.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleStatus(item.id)}
                className="cursor-pointer"
              >
                <SortableItem 
                  item={item} 
                  isDragging={activeId === item.id}
                  onToggleStatus={onToggleStatus}
                  onEdit={undefined}
                  onExecute={undefined}
                  onDelete={handleDeleteClick}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <SortableItem 
              item={items.find(item => item.id === activeId)!} 
              isDragging={true}
              onToggleStatus={onToggleStatus}
              onEdit={undefined}
              onExecute={undefined}
              onDelete={undefined}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Eliminar Item"
        description="¿Estás seguro de que quieres eliminar este item? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
}
