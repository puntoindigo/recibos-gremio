'use client';

import React, { useState, useEffect } from 'react';
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
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  GripVertical, 
  CheckCircle, 
  Circle, 
  Clock, 
  Edit3, 
  Palette,
  Grid3X3,
  List,
  Settings,
  X,
  Save,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from './ConfirmModal';
import { cleanText } from '@/lib/text-cleaner';
import { getPriorityColor } from '@/lib/priority-utils';
import { getStatusIcon, getStatusColor, getStatusText } from '@/lib/status-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResizable } from '@/hooks/useResizable';

interface PendingItem {
  id: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  order: number;
  color?: string;
  proposedSolution?: string;
}

interface SortableCardProps {
  item: PendingItem;
  isDragging?: boolean;
  onColorChange?: (itemId: string, color: string) => void;
  onEdit?: (item: PendingItem) => void;
  onExecute?: (item: PendingItem) => void;
  onDelete?: (itemId: string, event: React.MouseEvent) => void;
  onStatusChange?: (itemId: string, status: string) => void;
  onPriorityChange?: (itemId: string, priority: string) => void;
  postItMode?: boolean;
  statusOptions?: Array<{ value: string; label: string; icon?: React.ReactNode; color?: string }>;
  priorityOptions?: Array<{ value: string; label: string; color?: string }>;
}

function SortableCard({ 
  item, 
  isDragging, 
  onColorChange, 
  onEdit, 
  onExecute, 
  onDelete,
  onStatusChange,
  onPriorityChange,
  postItMode = false,
  statusOptions = [],
  priorityOptions = []
}: SortableCardProps) {
  const [showColorPalette, setShowColorPalette] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  // Cerrar paleta al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPalette) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowColorPalette(false);
        }
      }
    };

    if (showColorPalette) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPalette]);

  const { size, containerRef, handleMouseDown } = useResizable({
    minWidth: 200,
    minHeight: 150,
    maxWidth: 500,
    maxHeight: 400,
    initialWidth: postItMode ? 280 : 320,
    initialHeight: postItMode ? 200 : 250
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };



  const predefinedColors = [
    'bg-slate-200', 'bg-stone-200', 'bg-zinc-200', 'bg-neutral-200',
    'bg-blue-100', 'bg-indigo-100', 'bg-violet-100', 'bg-purple-100',
    'bg-pink-100', 'bg-rose-100', 'bg-orange-100', 'bg-amber-100',
    'bg-yellow-100', 'bg-lime-100', 'bg-green-100', 'bg-emerald-100',
    'bg-teal-100', 'bg-cyan-100', 'bg-sky-100', 'bg-red-100'
  ];

  const cardColor = item.color || predefinedColors[parseInt(item.id) % predefinedColors.length];


  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: postItMode ? `${size.width}px` : 'auto',
        height: postItMode ? `${size.height}px` : 'auto'
      }}
      {...attributes}
      {...listeners}
      className={`relative ${cardColor} rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing group ${
        isSortableDragging ? 'shadow-xl scale-105' : 'hover:scale-102'
      } ${isDragging ? 'opacity-50' : ''} ${postItMode ? 'overflow-hidden' : ''}`}
    >
      {/* Herramientas que aparecen en hover - esquina superior derecha */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
        <button 
          onClick={(e) => onEditItem(item)}
          className="p-1.5 text-gray-600 hover:text-blue-600 transition-colors bg-white/80 hover:bg-blue-100 rounded-md shadow-sm"
          title="Editar item"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button 
          onClick={(e) => onDelete?.(item.id, e)}
          className="p-1.5 text-gray-600 hover:text-red-600 transition-colors bg-white/80 hover:bg-red-100 rounded-md shadow-sm"
          title="Eliminar item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPalette(!showColorPalette);
            }}
            className="p-1.5 text-gray-600 hover:text-gray-800 transition-colors bg-white/80 hover:bg-white rounded-md shadow-sm"
            title="Cambiar color"
          >
            <Palette className="h-4 w-4" />
          </button>
          {showColorPalette && (
            <div className="absolute top-8 right-0 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-3 z-[9999] border border-gray-200/50 min-w-[220px]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-600">Cambiar color</div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-500">Actual:</div>
                  <div className={`w-4 h-4 rounded ${cardColor} border border-gray-300 shadow-sm`}></div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange?.(item.id, color);
                      setShowColorPalette(false);
                    }}
                    className={`w-7 h-7 rounded-md ${color} hover:scale-110 transition-transform border-2 ${
                      cardColor === color 
                        ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 scale-110' 
                        : 'border-gray-300 hover:border-gray-500'
                    } shadow-sm`}
                    title={`Cambiar a ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ID oculto - era muy largo */}

      {/* Contenido principal */}
      <div className="p-4 text-gray-800 h-full flex flex-col" onDoubleClick={() => onEdit?.(item)}>
        {/* Categoría */}
        <div className="text-xs font-medium text-gray-600/80 uppercase tracking-wide mb-2">
          {item.category}
        </div>
          
        {/* Título */}
        <h3 className="font-semibold text-base leading-tight text-gray-900 mb-3 flex-1">
          {cleanText(item.description)}
        </h3>
        
        {/* Solución Propuesta - integrada sin fondo blanco */}
        {item.proposedSolution && (
          <div className="text-sm text-gray-700/90 bg-white/30 p-2 rounded border-l-2 border-blue-400/50 mb-3">
            <span className="font-medium text-blue-800/90">Solución:</span> {cleanText(item.proposedSolution)}
          </div>
        )}
        
        {/* Controles de estado y prioridad */}
        <div className="flex items-center justify-between mt-auto">
          {/* Prioridad con dropdown */}
          <div className="flex-1 mr-2">
            <Select value={item.priority} onValueChange={(value) => onPriorityChange?.(item.id, value)}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Estado con dropdown */}
          <div className="flex-1">
            <Select value={item.status} onValueChange={(value) => onStatusChange?.(item.id, value)}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Handle de redimensionamiento - solo en modo post-it */}
      {postItMode && (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 bg-gray-400/50 rounded-sm"></div>
        </div>
      )}
    </div>
  );
}

interface PendingItemsCardsViewProps {
  items: PendingItem[];
  onItemsChange: (items: PendingItem[]) => void;
  onToggleStatus: (itemId: string, status: 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed') => void;
  onExecute?: (item: PendingItem) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: PendingItem) => void;
  postItMode?: boolean;
  onTogglePostItMode?: () => void;
}

export default function PendingItemsCardsView({ 
  items, 
  onItemsChange, 
  onToggleStatus,
  onExecute,
  onDeleteItem,
  onEditItem,
  postItMode = false,
  onTogglePostItMode
}: PendingItemsCardsViewProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PendingItem | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    category: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    proposedSolution: ''
  });

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

  function handleColorChange(itemId: string, color: string) {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, color } : item
    );
    onItemsChange(updatedItems);
    toast.success('Color actualizado');
  }

  function handleEdit(item: PendingItem) {
    setEditingItem(item);
    setEditForm({
      description: item.description,
      category: item.category,
      priority: item.priority,
      proposedSolution: item.proposedSolution || ''
    });
    setEditModalOpen(true);
  }

  function handleSaveEdit() {
    if (!editingItem) return;
    
    const updatedItems = items.map(i => 
      i.id === editingItem.id ? { ...i, ...editForm } : i
    );
    
    onItemsChange(updatedItems);
    setEditModalOpen(false);
    setEditingItem(null);
    toast.success('Item actualizado');
  }

  function handleCancelEdit() {
    setEditModalOpen(false);
    setEditingItem(null);
  }

  const handleDeleteClick = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Evitar que se active el click del card
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

  const handleStatusChange = (itemId: string, newStatus: string) => {
    onToggleStatus(itemId, newStatus as 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed');
    toast.success('Estado actualizado');
  };

  const handlePriorityChange = (itemId: string, newPriority: string) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, priority: newPriority as 'high' | 'medium' | 'low' } : item
    );
    onItemsChange(updatedItems);
    toast.success('Prioridad actualizada');
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;

  // Opciones para dropdowns
  const statusOptions = [
    { value: 'pending', label: 'PENDIENTE', icon: getStatusIcon('pending'), color: 'bg-gray-100 text-gray-800' },
    { value: 'open', label: 'ABIERTO', icon: getStatusIcon('open'), color: 'bg-blue-100 text-blue-800' },
    { value: 'in-progress', label: 'EN PROGRESO', icon: getStatusIcon('in-progress'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'verifying', label: 'VERIFICANDO', icon: getStatusIcon('verifying'), color: 'bg-purple-100 text-purple-800' },
    { value: 'completed', label: 'COMPLETADO', icon: getStatusIcon('completed'), color: 'bg-green-100 text-green-800' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'BAJA', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'MEDIA', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'ALTA', color: 'bg-red-100 text-red-800' }
  ];

  return (
    <div className="space-y-4">
      {/* Header con contador */}
      <div className="flex items-center justify-end mb-4">
        <div className="text-sm text-gray-500">
          {completedCount}/{totalCount} completados
        </div>
      </div>

      {/* Grid de cards */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={items.map(item => item.id)} 
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer"
              >
                <SortableCard 
                  item={item} 
                  isDragging={activeId === item.id}
                  onColorChange={handleColorChange}
                  onEdit={handleEdit}
                  onExecute={onExecute}
                  onDelete={handleDeleteClick}
                  onStatusChange={handleStatusChange}
                  onPriorityChange={handlePriorityChange}
                  postItMode={postItMode}
                  statusOptions={statusOptions}
                  priorityOptions={priorityOptions}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <SortableCard 
              item={items.find(item => item.id === activeId)!} 
              isDragging={true}
              onColorChange={handleColorChange}
              onEdit={handleEdit}
              onExecute={onExecute}
              onDelete={handleDeleteClick}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              postItMode={postItMode}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de edición */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Editar Item #{editingItem?.id}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresa la categoría"
              />
            </div>
            
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Describe la tarea o funcionalidad"
              />
            </div>
            
            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad
              </label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            
            {/* Solución Propuesta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Solución Propuesta
              </label>
              <textarea
                value={editForm.proposedSolution}
                onChange={(e) => setEditForm(prev => ({ ...prev, proposedSolution: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Describe la solución propuesta para esta tarea..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
