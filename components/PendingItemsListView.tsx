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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  GripVertical, 
  Trash2, 
  Play, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  Edit3
} from 'lucide-react';
import { getPriorityColor } from '@/lib/priority-utils';
import { toast } from 'sonner';
import { ConfirmModal } from './ConfirmModal';

interface PendingItem {
  id: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed';
  order: number;
  color?: string;
  proposedSolution?: string;
  feedback?: Array<{
    id: string;
    text: string;
    createdAt: string;
    resolved: boolean;
  }>;
  resolution?: string;
  resolvedAt?: string;
}

interface SortableItemProps {
  item: PendingItem;
  isDragging?: boolean;
  onStatusChange: (itemId: string, status: 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed') => void;
  onPriorityChange: (itemId: string, priority: 'high' | 'medium' | 'low') => void;
  onAddFeedback: (itemId: string, feedback: string) => void;
  onResolveFeedback: (itemId: string, feedbackId: string) => void;
  onDelete?: (itemId: string, event: React.MouseEvent) => void;
  onExecute?: (item: PendingItem) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  { value: 'open', label: 'Abierto', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
  { value: 'in-progress', label: 'En Progreso', color: 'bg-yellow-100 text-yellow-800', icon: Play },
  { value: 'verifying', label: 'Verificando', color: 'bg-purple-100 text-purple-800', icon: Eye },
  { value: 'completed', label: 'Completado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-800' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-800' },
];

function SortableItem({ 
  item, 
  isDragging, 
  onStatusChange, 
  onPriorityChange,
  onAddFeedback, 
  onResolveFeedback, 
  onDelete,
  onExecute 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const [showFeedback, setShowFeedback] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === item.status);
  const unresolvedFeedback = item.feedback?.filter(f => !f.resolved) || [];
  const hasUnresolvedFeedback = unresolvedFeedback.length > 0;

  const handleExecute = async () => {
    if (!onExecute) return;
    
    setIsExecuting(true);
    setExecutionProgress(0);
    
    // Simular progreso
    const interval = setInterval(() => {
      setExecutionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExecuting(false);
          onExecute(item);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleAddFeedback = () => {
    if (newFeedback.trim()) {
      onAddFeedback(item.id, newFeedback);
      setNewFeedback('');
      setShowFeedback(false);
      toast.success('Feedback agregado');
    }
  };

  const handleResolveFeedback = (feedbackId: string) => {
    onResolveFeedback(item.id, feedbackId);
    toast.success('Feedback marcado como resuelto');
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
        
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {item.category}
            </span>
            <div className="flex items-center space-x-2">
              {/* ID oculto - era muy largo */}
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${currentStatus?.color || 'bg-gray-100 text-gray-800'}`}
              >
                {currentStatus?.label || item.status}
              </Badge>
              {hasUnresolvedFeedback && (
                <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                  {unresolvedFeedback.length} feedback
                </Badge>
              )}
              <button 
                onClick={(e) => onEditItem(item)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Editar item"
              >
                <Edit3 className="h-4 w-4" />
              </button>
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
            {item.proposedSolution && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Solución propuesta
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center space-x-2">
        <Select
          value={item.priority}
          onValueChange={(value: any) => onPriorityChange(item.id, value)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <span className={option.color}>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={item.status}
          onValueChange={(value: any) => onStatusChange(item.id, value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <option.icon className="h-4 w-4" />
                  <span className={option.color}>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFeedback(!showFeedback)}
          className="text-blue-600 hover:text-blue-700"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Feedback
          {hasUnresolvedFeedback && (
            <Badge className="ml-1 bg-red-500 text-white text-xs">
              {unresolvedFeedback.length}
            </Badge>
          )}
        </Button>

        {onExecute && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting}
            className="text-green-600 hover:text-green-700"
          >
            <Play className="h-4 w-4 mr-1" />
            {isExecuting ? 'Ejecutando...' : 'Ejecutar'}
          </Button>
        )}
      </div>

      {/* Panel de Feedback */}
      {showFeedback && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg p-4 z-10 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Feedback</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedback(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de feedback existente */}
          {item.feedback && item.feedback.length > 0 && (
            <div className="space-y-2 mb-4">
              {item.feedback.map(feedback => (
                <div key={feedback.id} className={`p-2 rounded border ${feedback.resolved ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{feedback.text}</span>
                    {!feedback.resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveFeedback(feedback.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(feedback.createdAt).toLocaleString()}
                    {feedback.resolved && ' - Resuelto'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nuevo feedback */}
          <div className="space-y-2">
            <Textarea
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              placeholder="Agregar nuevo feedback..."
              className="min-h-[60px]"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedback(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAddFeedback}
                disabled={!newFeedback.trim()}
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de progreso de ejecución */}
      {isExecuting && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg p-4 z-10 mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ejecutando solución...</span>
              <span className="text-sm text-gray-500">{executionProgress}%</span>
            </div>
            <Progress value={executionProgress} className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

interface PendingItemsListViewProps {
  items: PendingItem[];
  onItemsChange: (items: PendingItem[]) => void;
  onStatusChange: (itemId: string, status: 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed') => void;
  onPriorityChange: (itemId: string, priority: 'high' | 'medium' | 'low') => void;
  onAddFeedback: (itemId: string, feedback: string) => void;
  onResolveFeedback: (itemId: string, feedbackId: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: PendingItem) => void;
}

export default function PendingItemsListView({ 
  items, 
  onItemsChange, 
  onStatusChange,
  onPriorityChange,
  onAddFeedback,
  onResolveFeedback,
  onDeleteItem,
  onEditItem
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

  const handleExecute = (item: PendingItem) => {
    // Simular ejecución de solución
    toast.success(`Ejecutando: ${item.description}`);
    
    // Cambiar estado a "verifying" después de la ejecución
    setTimeout(() => {
      onStatusChange(item.id, 'verifying');
      toast.success(`✅ Solución ejecutada: ${item.description}`);
    }, 2000);
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;

  return (
    <div className="space-y-4">
      {/* Instrucciones compactas */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">
          Arrastra para reordenar • Cambia estado con el desplegable • Click en Feedback para agregar comentarios
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
              <div key={item.id} className="relative">
                <SortableItem 
                  item={item} 
                  isDragging={activeId === item.id}
                  onStatusChange={onStatusChange}
                  onPriorityChange={onPriorityChange}
                  onAddFeedback={onAddFeedback}
                  onResolveFeedback={onResolveFeedback}
                  onDelete={handleDeleteClick}
                  onExecute={handleExecute}
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
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onAddFeedback={onAddFeedback}
              onResolveFeedback={onResolveFeedback}
              onDelete={undefined}
              onExecute={handleExecute}
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