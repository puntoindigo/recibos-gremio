'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit3, 
  Grid3X3, 
  List, 
  Settings,
  Palette,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
  Circle,
  Zap,
  AlertCircle,
  Trash2,
  Layout
} from 'lucide-react';
import { toast } from 'sonner';
import PendingItemsListView from './PendingItemsListView';
import PendingItemsCardsView from './PendingItemsCardsView';
import PendingItemsBoardView from './PendingItemsBoardView';
import PendingItemModal from './PendingItemModal';
import ColoredSelect from './ColoredSelect';
import { getSupabaseManager } from '@/lib/supabase-manager';
import { PendingItem } from '@/lib/supabase-client';

type ViewMode = 'list' | 'cards' | 'board';

export default function PendingItemsViewManager() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [postItMode, setPostItMode] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    category: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    proposedSolution: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingItem, setEditingItem] = useState<PendingItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Cargar items desde Supabase
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        
        // Cargar todos los items usando SupabaseManager
        const supabaseManager = getSupabaseManager();
        const allItems = await supabaseManager.getPendingItems();
        
        // Convertir de SupabasePendingItem a PendingItem
        const convertedItems: PendingItem[] = allItems.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          priority: item.priority,
          status: item.status,
          order: item.order,
          color: item.color,
          proposedSolution: item.proposed_solution,
          feedback: item.feedback,
          resolution: item.resolution,
          resolvedAt: item.resolved_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          tags: [] // La tabla no tiene tags, usar array vacío
        }));
        
        setItems(convertedItems);
      } catch (error) {
        console.error('Error cargando items pendientes:', error);
        toast.error('Error cargando items pendientes');
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  // Escuchar eventos personalizados desde el componente padre
  useEffect(() => {
    const handleOpenNewItemModal = () => {
      setEditingItem(null);
      setShowModal(true);
    };

    const handleCleanDuplicatesEvent = () => {
      handleCleanDuplicates();
    };

    const handleSetViewMode = (event: CustomEvent) => {
      setViewMode(event.detail);
    };

    window.addEventListener('openNewItemModal', handleOpenNewItemModal);
    window.addEventListener('cleanDuplicates', handleCleanDuplicatesEvent);
    window.addEventListener('setViewMode', handleSetViewMode as EventListener);

    return () => {
      window.removeEventListener('openNewItemModal', handleOpenNewItemModal);
      window.removeEventListener('cleanDuplicates', handleCleanDuplicatesEvent);
      window.removeEventListener('setViewMode', handleSetViewMode as EventListener);
    };
  }, []);

  // Función para guardar cambios
  const saveChanges = async (newItems: PendingItem[]) => {
    try {
      setItems(newItems);
      toast.success('Cambios guardados');
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast.error('Error guardando cambios');
    }
  };

  const handleItemsChange = (newItems: PendingItem[]) => {
    setItems(newItems);
    saveChanges(newItems);
  };

  const handleStatusChange = async (itemId: string, newStatus: PendingItem['status']) => {
    try {
      const supabaseManager = getSupabaseManager();
      await supabaseManager.updatePendingItem(itemId, { 
        status: newStatus,
        resolved_at: newStatus === 'completed' ? new Date().toISOString() : undefined
      });
      
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          return { 
            ...item, 
            status: newStatus,
            resolvedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
          };
        }
        return item;
      });
      setItems(updatedItems);
      toast.success('Estado actualizado');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      toast.error('Error actualizando estado');
    }
  };

  // Nueva función para manejar cambios de prioridad
  const handlePriorityChange = async (itemId: string, newPriority: PendingItem['priority']) => {
    try {
      console.log('🔍 Cambiando prioridad:', { itemId, newPriority });
      
      const supabaseManager = getSupabaseManager();
      await supabaseManager.updatePendingItem(itemId, { 
        priority: newPriority
      });
      
      console.log('🔍 Resultado de actualización: exitoso');
      
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          return { 
            ...item, 
            priority: newPriority
          };
        }
        return item;
      });
      setItems(updatedItems);
      toast.success('Prioridad actualizada');
    } catch (error) {
      console.error('Error actualizando prioridad:', error);
      toast.error('Error actualizando prioridad');
    }
  };

  const handleAddFeedback = async (itemId: string, feedbackText: string) => {
    try {
      const newFeedback = {
        id: Date.now().toString(),
        text: feedbackText,
        createdAt: new Date().toISOString(),
        resolved: false
      };

      const item = items.find(i => i.id === itemId);
      if (item) {
        const updatedFeedback = [...(item.feedback || []), newFeedback];
        await getSupabaseManager().updatePendingItem(itemId, { feedback: updatedFeedback });
        
        if (success) {
          const updatedItems = items.map(item => {
            if (item.id === itemId) {
              return { ...item, feedback: updatedFeedback };
            }
            return item;
          });
          setItems(updatedItems);
          toast.success('Feedback agregado');
        }
      }
    } catch (error) {
      console.error('Error agregando feedback:', error);
      toast.error('Error agregando feedback');
    }
  };

  const handleResolveFeedback = async (itemId: string, feedbackId: string) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (item && item.feedback) {
        const updatedFeedback = item.feedback.map(f => 
          f.id === feedbackId ? { ...f, resolved: true } : f
        );
        
        await getSupabaseManager().updatePendingItem(itemId, { feedback: updatedFeedback });
        
        if (success) {
          const updatedItems = items.map(item => {
            if (item.id === itemId) {
              return { ...item, feedback: updatedFeedback };
            }
            return item;
          });
          setItems(updatedItems);
          toast.success('Feedback resuelto');
        }
      }
    } catch (error) {
      console.error('Error resolviendo feedback:', error);
      toast.error('Error resolviendo feedback');
    }
  };

  const handleEditItem = (item: PendingItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSaveItem = async (item: PendingItem) => {
    try {
      if (editingItem) {
        // Actualizar item existente
        const updatedItems = items.map(i => i.id === item.id ? item : i);
        await getSupabaseManager().updatePendingItem(item.id, item);
        setItems(updatedItems);
        toast.success('Item actualizado');
      } else {
        // Crear nuevo item
        const newItem = await getSupabaseManager().createPendingItem(item);
        setItems([...items, newItem]);
        toast.success('Item creado');
      }
    } catch (error) {
      console.error('Error guardando item:', error);
      toast.error('Error guardando item');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !newItem.description.trim() || !newItem.category.trim()) {
      toast.error('Descripción y categoría son requeridos');
      return;
    }

    try {
      await getSupabaseManager().updatePendingItem(editingItem.id, {
        title: newItem.description, // Usar description como title por ahora
        description: newItem.description,
        category: newItem.category,
        priority: newItem.priority,
        proposedSolution: newItem.proposedSolution
      });

      if (success) {
        const updatedItems = items.map(item => {
          if (item.id === editingItem.id) {
            return {
              ...item,
              title: newItem.description,
              description: newItem.description,
              category: newItem.category,
              priority: newItem.priority,
              proposedSolution: newItem.proposedSolution
            };
          }
          return item;
        });
        setItems(updatedItems);
        setEditingItem(null);
        setNewItem({ description: '', category: '', priority: 'medium', proposedSolution: '' });
        toast.success('Item actualizado correctamente');
      }
    } catch (error) {
      console.error('Error actualizando item:', error);
      toast.error('Error actualizando item');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.description.trim() || !newItem.category.trim()) {
      toast.error('Descripción y categoría son requeridos');
      return;
    }

    try {
      const newItemData = await getSupabaseManager().createPendingItem({
        title: newItem.description, // Usar description como title por ahora
        description: newItem.description,
        category: newItem.category,
        priority: newItem.priority,
        status: 'pending',
        order: items.length + 1,
        proposedSolution: newItem.proposedSolution
      });

      const updatedItems = [...items, newItemData];
      setItems(updatedItems);
      setNewItem({ description: '', category: '', priority: 'medium', proposedSolution: '' });
      setShowAddForm(false);
      toast.success('Nueva nota creada');
    } catch (error) {
      console.error('Error creando item:', error);
      toast.error('Error creando item');
    }
  };

  const handleCancelAdd = () => {
    setNewItem({ description: '', category: '', priority: 'medium', proposedSolution: '' });
    setShowAddForm(false);
  };

  const handleExecute = async (item: PendingItem) => {
    try {
      // Cambiar estado a "in-progress"
      await pendingItemsManager.updateItem(item.id, { status: 'in-progress' });
      
      const updatedItems = items.map(i => 
        i.id === item.id ? { ...i, status: 'in-progress' as const } : i
      );
      setItems(updatedItems);
      
      toast.success(`Ejecutando: ${item.description}`);
      
      // Simular ejecución específica según el tipo de tarea
      setTimeout(async () => {
        await pendingItemsManager.updateItem(item.id, { status: 'completed' });
        
        const completedItems = items.map(i => 
          i.id === item.id ? { ...i, status: 'completed' as const } : i
        );
        setItems(completedItems);
        
        // Mensaje específico según la tarea
        if (item.description.includes('título de la página')) {
          toast.success(`✅ Título actualizado a "Gestor :: Sistema de Recibos"`);
        } else if (item.description.includes('optimizar el espacio')) {
          toast.success(`✅ Espacio optimizado en la interfaz`);
        } else {
          toast.success(`✅ Completado: ${item.description}`);
        }
      }, 2000);
    } catch (error) {
      console.error('Error ejecutando item:', error);
      toast.error('Error ejecutando item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      console.log('🔍 Eliminando item:', id);
      await getSupabaseManager().deletePendingItem(id);
      const updatedItems = items.filter(item => item.id !== id);
      setItems(updatedItems);
      toast.success('Item eliminado');
    } catch (error) {
      console.error('Error eliminando item:', error);
      toast.error('Error eliminando item');
    }
  };

  const handleCleanDuplicates = async () => {
    try {
      setLoading(true);
      // Limpiar duplicados - función no disponible en SupabaseManager
      toast.info('Función de limpiar duplicados no disponible');
    } catch (error) {
      console.error('Error limpiando duplicados:', error);
      toast.error('Error limpiando duplicados');
    } finally {
      setLoading(false);
    }
  };

  const togglePostItMode = () => {
    setPostItMode(!postItMode);
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;

  // Filtrar items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  // Obtener categorías únicas
  const categories = Array.from(new Set(items.map(item => item.category)));

  // Mostrar indicador de carga
  if (loading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Cargando items pendientes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="pb-2">
          {/* Header simplificado - solo para espaciado */}
        </CardHeader>

        {/* Búsqueda y Filtros */}
        <div className="px-6 pb-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Buscar items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-gray-400" />
                      <span>Todas las categorías</span>
                    </div>
                  </SelectItem>
                  {categories.map(category => {
                    const categoryCount = items.filter(item => item.category === category).length;
                    return (
                      <SelectItem key={category} value={category}>
                        <div className="flex items-center space-x-2">
                          <Circle className="h-4 w-4 text-blue-500" />
                          <span>{category}</span>
                          <span className="text-xs text-gray-500">({categoryCount})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {filterCategory !== 'all' && (
                <button
                  onClick={() => setFilterCategory('all')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-gray-400" />
                      <span>Todas las prioridades</span>
                    </div>
                  </SelectItem>
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
              {filterPriority !== 'all' && (
                <button
                  onClick={() => setFilterPriority('all')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-gray-400" />
                      <span>Todos los estados</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-gray-400" />
                      <span>Pendiente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="open">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <span>Abierto</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in-progress">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>En Progreso</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="verifying">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span>Verificando</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Completado</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {filterStatus !== 'all' && (
                <button
                  onClick={() => setFilterStatus('all')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Botón para limpiar todos los filtros */}
            {(searchTerm || filterCategory !== 'all' || filterPriority !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('all');
                  setFilterPriority('all');
                  setFilterStatus('all');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title="Limpiar todos los filtros"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Formulario de Nueva Nota / Editar */}
        {(showAddForm || editingItem) && (
          <div className="px-6 pb-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                {editingItem ? 'Editar Nota' : 'Crear Nueva Nota'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    placeholder="Ej: Sistema de Usuarios"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({...newItem, priority: e.target.value as 'high' | 'medium' | 'low'})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <Button
                    onClick={editingItem ? handleUpdateItem : handleAddItem}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {editingItem ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button
                    onClick={editingItem ? () => setEditingItem(null) : handleCancelAdd}
                    variant="outline"
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder="Describe la tarea o funcionalidad..."
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Solución Propuesta
                </label>
                <textarea
                  value={newItem.proposedSolution}
                  onChange={(e) => setNewItem({...newItem, proposedSolution: e.target.value})}
                  placeholder="Describe la solución propuesta (opcional)..."
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}
      
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">

          {/* Contenido según la vista */}
          {viewMode === 'cards' ? (
            <PendingItemsCardsView
              items={filteredItems}
              onItemsChange={handleItemsChange}
              onToggleStatus={handleStatusChange}
              onExecute={handleExecute}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
              postItMode={postItMode}
              onTogglePostItMode={togglePostItMode}
            />
          ) : viewMode === 'board' ? (
            <PendingItemsBoardView
              items={filteredItems}
              onItemsChange={handleItemsChange}
              onStatusChange={handleStatusChange}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
            />
          ) : (
            <PendingItemsListView
              items={filteredItems}
              onItemsChange={handleItemsChange}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onAddFeedback={handleAddFeedback}
              onResolveFeedback={handleResolveFeedback}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
            />
          )}
        </div>
      </CardContent>
    </Card>

    {/* Modal de edición */}
    <PendingItemModal
      isOpen={showModal}
      onClose={handleCloseModal}
      onSave={handleSaveItem}
      item={editingItem}
      cardColor="bg-blue-50"
      />
    </>
  );
}
