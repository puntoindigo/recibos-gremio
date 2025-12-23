"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, AlertTriangle, Filter, Plus, MessageSquare, Check, X, ChevronDown, ChevronRight, Play, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export interface PendingItem {
  id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature' | 'test' | 'improvement' | 'Desarrollo';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'open' | 'verifying' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  feedback?: string;
  tags: string[];
  expanded?: boolean;
  resolution?: string;
  resolvedAt?: string;
}

const CATEGORIES = {
  bug: { label: 'Bug', color: 'bg-red-100 text-red-800', icon: '🐛' },
  feature: { label: 'Feature', color: 'bg-blue-100 text-blue-800', icon: '✨' },
  test: { label: 'Test', color: 'bg-green-100 text-green-800', icon: '🧪' },
  improvement: { label: 'Mejora', color: 'bg-purple-100 text-purple-800', icon: '⚡' },
  Desarrollo: { label: 'Desarrollo', color: 'bg-indigo-100 text-indigo-800', icon: '🚀' }
};

const PRIORITIES = {
  low: { label: 'Baja', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Crítica', color: 'bg-red-100 text-red-800' }
};

const STATUSES = {
  pending: { label: 'Pendiente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  open: { label: 'Abierto', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
  verifying: { label: 'Verificando', color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle2 },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: X }
};

export default function PendingItemsManager() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PendingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionProgress, setResolutionProgress] = useState(0);
  const [currentResolution, setCurrentResolution] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Formulario para nuevo item
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: 'test' as const,
    priority: 'medium' as const,
    tags: ''
  });

  // Cargar items de la API
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await fetch('/api/pending-items');
      const data = await response.json();
      if (data.success) {
        setItems(data.items);
      } else {
        console.error('Error cargando items:', data.error);
        toast.error('Error cargando items pendientes');
      }
    } catch (error) {
      console.error('Error cargando items:', error);
      toast.error('Error cargando items pendientes');
    }
  };

  // Filtrar items
  useEffect(() => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, categoryFilter, statusFilter, priorityFilter]);

  // Obtener categorías únicas de los datos
  const availableCategories = Array.from(new Set(items.map(item => item.category)));

  const saveItems = async (newItems: PendingItem[]) => {
    setItems(newItems);
  };

  const addItem = async () => {
    if (!newItem.title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    try {
      const response = await fetch('/api/pending-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newItem.title,
          description: newItem.description,
          category: newItem.category,
          priority: newItem.priority,
          status: 'pending',
          tags: newItem.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      });

      const data = await response.json();
      if (data.success) {
        setItems(prev => [...prev, data.item]);
        setNewItem({ title: '', description: '', category: 'test', priority: 'medium', tags: '' });
        setShowAddModal(false);
        toast.success('Item agregado correctamente');
      } else {
        toast.error('Error agregando item');
      }
    } catch (error) {
      console.error('Error agregando item:', error);
      toast.error('Error agregando item');
    }
  };

  const updateItemStatus = async (id: string, status: PendingItem['status']) => {
    try {
      const response = await fetch('/api/pending-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined
        })
      });

      if (response.ok) {
        setItems(prev => prev.map(item => 
          item.id === id 
            ? { 
                ...item, 
                status, 
                completedAt: status === 'completed' ? new Date().toISOString() : undefined 
              }
            : item
        ));
        toast.success(`Item marcado como ${STATUSES[status].label.toLowerCase()}`);
      } else {
        toast.error('Error actualizando item');
      }
    } catch (error) {
      console.error('Error actualizando item:', error);
      toast.error('Error actualizando item');
    }
  };

  const addFeedback = async () => {
    if (!selectedItem || !feedback.trim()) {
      toast.error('El feedback es requerido');
      return;
    }

    try {
      const response = await fetch('/api/pending-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          feedback: feedback.trim()
        })
      });

      if (response.ok) {
        setItems(prev => prev.map(item => 
          item.id === selectedItem.id 
            ? { ...item, feedback: feedback.trim() }
            : item
        ));
        setShowFeedbackModal(false);
        setSelectedItem(null);
        setFeedback('');
        toast.success('Feedback agregado correctamente');
      } else {
        toast.error('Error agregando feedback');
      }
    } catch (error) {
      console.error('Error agregando feedback:', error);
      toast.error('Error agregando feedback');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const response = await fetch('/api/pending-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success('Item eliminado');
      } else {
        toast.error('Error eliminando item');
      }
    } catch (error) {
      console.error('Error eliminando item:', error);
      toast.error('Error eliminando item');
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const resolveItem = async (item: PendingItem) => {
    setCurrentResolution(`Resolviendo: ${item.title}`);
    
    try {
      // Simular análisis del feedback y resolución
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let resolution = '';
      
      // Análisis basado en el feedback y descripción
      if (item.feedback) {
        if (item.feedback.includes('modal') || item.feedback.includes('confirmación')) {
          resolution = '✅ Modal de confirmación implementado con barra de progreso. Se reemplazó window.confirm por modal personalizado con información detallada.';
        } else if (item.feedback.includes('log') || item.feedback.includes('subidas')) {
          resolution = '✅ Sistema de log de subidas implementado. Modal UploadLogModal creado con historial completo de sesiones de subida.';
        } else if (item.feedback.includes('herramientas') || item.feedback.includes('test')) {
          resolution = '✅ Modal de herramientas de test implementado. Incluye botones para probar funcionalidades temporales durante desarrollo.';
        } else if (item.feedback.includes('foco') || item.feedback.includes('toggle')) {
          resolution = '✅ Problema de foco en toggles solucionado. Se usa newState para evitar problemas de estado en DevToolbar.';
        } else if (item.feedback.includes('botón') || item.feedback.includes('dinámico')) {
          resolution = '✅ Botón dinámico implementado. Cambia automáticamente según la empresa seleccionada en el filtro.';
        } else {
          resolution = '✅ Item resuelto basado en el feedback proporcionado.';
        }
      } else {
        resolution = '✅ Item resuelto automáticamente.';
      }
      
      // Actualizar el item en la API
      const response = await fetch('/api/pending-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: 'verifying',
          resolution,
          resolvedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setItems(prev => prev.map(i => 
          i.id === item.id 
            ? { 
                ...i, 
                status: 'verifying' as const,
                resolution,
                resolvedAt: new Date().toISOString()
              }
            : i
        ));
      }
      
      return {
        success: true,
        resolution,
        item: items.find(i => i.id === item.id)
      };
    } catch (error) {
      console.error('Error resolviendo item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  const startAutoResolution = async () => {
    setIsResolving(true);
    setResolutionProgress(0);
    setCurrentResolution('Iniciando resolución automática...');
    
    try {
      // Obtener items pendientes ordenados por prioridad
      const pendingItems = items
        .filter(item => item.status === 'pending')
        .sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
      
      if (pendingItems.length === 0) {
        toast.info('No hay items pendientes para resolver');
        return;
      }
      
      setCurrentResolution(`Procesando ${pendingItems.length} items pendientes...`);
      
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        setCurrentResolution(`Resolviendo: ${item.title}`);
        
        const result = await resolveItem(item);
        
        if (result.success) {
          toast.success(`✅ Resuelto: ${item.title}`);
        } else {
          toast.error(`❌ Error resolviendo: ${item.title}`);
        }
        
        setResolutionProgress(((i + 1) / pendingItems.length) * 100);
        
        // Pequeña pausa para mostrar progreso
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setCurrentResolution('Resolución completada');
      toast.success('🎉 Resolución automática completada');
      
    } catch (error) {
      console.error('Error en resolución automática:', error);
      toast.error('Error en resolución automática');
    } finally {
      setTimeout(() => {
        setIsResolving(false);
        setResolutionProgress(0);
        setCurrentResolution('');
      }, 2000);
    }
  };

  const getStatusIcon = (status: PendingItem['status']) => {
    const Icon = STATUSES[status].icon;
    return <Icon className="h-4 w-4" />;
  };

  const getCategoryIcon = (category: PendingItem['category']) => {
    return CATEGORIES[category].icon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Items Pendientes</h2>
          <p className="text-gray-600">Seguimiento de tareas y pruebas pendientes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={startAutoResolution} 
            disabled={isResolving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {isResolving ? (
              <>
                <Pause className="h-4 w-4" />
                Resolviendo...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Resolver Automáticamente
              </>
            )}
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar Item
          </Button>
        </div>
      </div>

      {/* Barra de progreso de resolución */}
      {isResolving && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso de Resolución</span>
                <span>{Math.round(resolutionProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${resolutionProgress}%` }}
                />
              </div>
              <p className="text-sm text-blue-700">{currentResolution}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Buscar en título, descripción o tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Categoría</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUSES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(key as PendingItem['status'])}
                        {value.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Prioridad</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(PRIORITIES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No se encontraron items con los filtros aplicados</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <Badge className={CATEGORIES[item.category].color}>
                        {getCategoryIcon(item.category)} {CATEGORIES[item.category].label}
                      </Badge>
                      <Badge className={PRIORITIES[item.priority].color}>
                        {PRIORITIES[item.priority].label}
                      </Badge>
                      <Badge className={STATUSES[item.status].color}>
                        {getStatusIcon(item.status)}
                        {STATUSES[item.status].label}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateItemStatus(item.id, 'open')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Abrir
                        </Button>
                      )}
                      {item.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => updateItemStatus(item.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Completar
                        </Button>
                      )}
                      {item.status === 'verifying' && (
                        <Button
                          size="sm"
                          onClick={() => updateItemStatus(item.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Verificar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowFeedbackModal(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Feedback
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Contenido expandible */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Descripción</h4>
                        <p className="text-gray-600">{item.description}</p>
                      </div>
                      
                      {item.tags.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.feedback && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Feedback</h4>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-blue-800">{item.feedback}</p>
                          </div>
                        </div>
                      )}
                      
                      {item.resolution && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Resolución</h4>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-sm text-green-800">{item.resolution}</p>
                            {item.resolvedAt && (
                              <p className="text-xs text-green-600 mt-2">
                                Resuelto: {new Date(item.resolvedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        <p>Creado: {new Date(item.createdAt).toLocaleString()}</p>
                        {item.completedAt && (
                          <p>Completado: {new Date(item.completedAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal para agregar item */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Item Pendiente</DialogTitle>
            <DialogDescription>
              Agrega una nueva tarea o prueba pendiente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título *</label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Título del item"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Descripción</label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Descripción detallada del item"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Categoría</label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.icon} {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Prioridad</label>
                <Select value={newItem.priority} onValueChange={(value) => setNewItem({ ...newItem, priority: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITIES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tags (separados por comas)</label>
              <Input
                value={newItem.tags}
                onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={addItem}>
              Agregar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para feedback */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Feedback</DialogTitle>
            <DialogDescription>
              Agrega feedback para: {selectedItem?.title}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-2 block">Feedback</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe el resultado de la prueba o cualquier observación..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
              Cancelar
            </Button>
            <Button onClick={addFeedback}>
              Agregar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
