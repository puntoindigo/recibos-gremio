'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit3, 
  Grid3X3, 
  List, 
  Settings,
  Palette,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import PendingItemsListView from './PendingItemsListView';
import PendingItemsCardsView from './PendingItemsCardsView';
import { cleanItems } from '@/lib/text-cleaner';
import { forceCleanAndReload } from '@/lib/force-clean';
import { debugLog, infoLog } from '@/lib/logger';

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

type ViewMode = 'list' | 'cards';

export default function PendingItemsViewManager() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [postItMode, setPostItMode] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    category: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    proposedSolution: ''
  });

  // Cargar items iniciales
  useEffect(() => {
    const initialItems: PendingItem[] = [
      {
        id: '1',
        description: 'Implementar roles granulares (admin, supervisor, operador)',
        category: 'Sistema de Usuarios',
        priority: 'high',
        status: 'pending',
        order: 1
      },
      {
        id: '2',
        description: 'Gráficos interactivos en dashboard con filtros dinámicos',
        category: 'Dashboard',
        priority: 'medium',
        status: 'pending',
        order: 2
      },
      {
        id: '3',
        description: 'Validación automática de recibos con IA',
        category: 'Recibos',
        priority: 'high',
        status: 'pending',
        order: 3
      },
      {
        id: '4',
        description: 'Cálculo automático de descuentos por categoría',
        category: 'Descuentos',
        priority: 'medium',
        status: 'pending',
        order: 4
      },
      {
        id: '5',
        description: 'Comparación automática entre períodos',
        category: 'Control',
        priority: 'high',
        status: 'pending',
        order: 5
      },
      {
        id: '6',
        description: 'Sistema de cache inteligente para mejor rendimiento',
        category: 'Rendimiento',
        priority: 'low',
        status: 'pending',
        order: 6
      },
      {
        id: '7',
        description: 'Modo offline con sincronización automática',
        category: 'UX',
        priority: 'medium',
        status: 'pending',
        order: 7
      },
      {
        id: '8',
        description: 'Encriptación de datos sensibles',
        category: 'Seguridad',
        priority: 'high',
        status: 'pending',
        order: 8
      },
      {
        id: '9',
        description: 'Corregir el title de la página y optimizar el espacio de arriba del sitio',
        category: 'UI/UX',
        priority: 'medium',
        status: 'pending',
        order: 9,
        color: 'bg-yellow-100'
      },
      {
        id: '10',
        description: 'Cambiar título de la página a "Gestor :: Sistema de Recibos"',
        category: 'UI/UX',
        priority: 'high',
        status: 'pending',
        order: 10,
        color: 'bg-blue-100',
        proposedSolution: 'Actualizar el metadata.title en app/layout.tsx y optimizar el header de la página de documentación'
      }
    ];
    
    // Cargar datos del localStorage si existen, sino usar los iniciales
    const savedItems = localStorage.getItem('pendingItems');
    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems);
        // Limpiar datos corruptos usando utilidades
        const cleanedItems = cleanItems(parsedItems);
        setItems(cleanedItems);
        // Guardar datos limpios
        localStorage.setItem('pendingItems', JSON.stringify(cleanedItems));
      } catch (error) {
        console.warn('Error cargando datos del localStorage, usando datos iniciales:', error);
        setItems(initialItems);
      }
    } else {
      setItems(initialItems);
    }
  }, []);

  // Limpieza automática de datos corruptos cuando cambien los items
  useEffect(() => {
    const hasCorruptedData = items.some(item => 
      item.description.includes(')}') || 
      item.description.includes(')') && item.description.endsWith(')') ||
      item.proposedSolution?.includes(')}') ||
      item.proposedSolution?.includes(')') && item.proposedSolution.endsWith(')')
    );

    if (hasCorruptedData) {
      debugLog('Detectados datos corruptos, limpiando automáticamente...');
      const cleanedItems = cleanItems(items);
      setItems(cleanedItems);
      saveChanges(cleanedItems);
    }
  }, [items]);

  // Función para guardar cambios automáticamente
  const saveChanges = (newItems: PendingItem[]) => {
    debugLog('Guardando cambios automáticamente:', newItems);
    localStorage.setItem('pendingItems', JSON.stringify(newItems));
    toast.success('Cambios guardados automáticamente');
  };

  const handleItemsChange = (newItems: PendingItem[]) => {
    setItems(newItems);
    saveChanges(newItems);
  };

  const handleToggleStatus = (itemId: string) => {
    setItems(items => {
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          const newStatus = item.status === 'completed' ? 'pending' : 'completed';
          return { ...item, status: newStatus };
        }
        return item;
      });
      
      saveChanges(updatedItems);
      return updatedItems;
    });
  };


  const handleAddItem = () => {
    if (!newItem.description.trim() || !newItem.category.trim()) {
      toast.error('Descripción y categoría son requeridos');
      return;
    }

    const predefinedColors = [
      'bg-slate-200', 'bg-stone-200', 'bg-zinc-200', 'bg-neutral-200',
      'bg-blue-100', 'bg-indigo-100', 'bg-violet-100', 'bg-purple-100',
      'bg-pink-100', 'bg-rose-100', 'bg-orange-100', 'bg-amber-100',
      'bg-yellow-100', 'bg-lime-100', 'bg-green-100', 'bg-emerald-100',
      'bg-teal-100', 'bg-cyan-100', 'bg-sky-100', 'bg-red-100'
    ];

    const newId = (Math.max(...items.map(i => parseInt(i.id)), 0) + 1).toString();
    const randomColor = predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
    
    const newItemData: PendingItem = {
      id: newId,
      description: newItem.description,
      category: newItem.category,
      priority: newItem.priority,
      status: 'pending',
      order: items.length + 1,
      color: randomColor
    };

    setItems([...items, newItemData]);
    setNewItem({ description: '', category: '', priority: 'medium', proposedSolution: '' });
    setShowAddForm(false);
    toast.success('Nueva nota creada');
  };

  const handleCancelAdd = () => {
    setNewItem({ description: '', category: '', priority: 'medium', proposedSolution: '' });
    setShowAddForm(false);
  };

  const handleExecute = (item: PendingItem) => {
    // Cambiar estado a "in-progress"
    const updatedItems = items.map(i => 
      i.id === item.id ? { ...i, status: 'in-progress' as const } : i
    );
    setItems(updatedItems);
    saveChanges(updatedItems);
    
    // Mostrar mensaje de ejecución
    toast.success(`Ejecutando: ${item.description}`);
    
    // Simular ejecución específica según el tipo de tarea
    setTimeout(() => {
      const completedItems = items.map(i => 
        i.id === item.id ? { ...i, status: 'completed' as const } : i
      );
      setItems(completedItems);
      saveChanges(completedItems);
      
      // Mensaje específico según la tarea
      if (item.description.includes('título de la página')) {
        toast.success(`✅ Título actualizado a "Gestor :: Sistema de Recibos"`);
      } else if (item.description.includes('optimizar el espacio')) {
        toast.success(`✅ Espacio optimizado en la interfaz`);
      } else {
        toast.success(`✅ Completado: ${item.description}`);
      }
    }, 2000);
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    saveChanges(updatedItems);
  };

  const togglePostItMode = () => {
    setPostItMode(!postItMode);
  };

  // Función para limpiar datos corruptos
  const cleanCorruptedData = () => {
    const cleanedItems = cleanItems(items);
    setItems(cleanedItems);
    saveChanges(cleanedItems);
    toast.success(`Datos limpiados: ${cleanedItems.length} items procesados`);
  };

  // Función para limpieza forzada completa
  const forceClean = () => {
    if (confirm('¿Estás seguro de que quieres limpiar completamente todos los datos? Esta acción no se puede deshacer.')) {
      forceCleanAndReload();
    }
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;

  return (
    <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {completedCount}/{totalCount} completados
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-green-50 text-green-700 hover:bg-green-100"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Nueva Nota
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cleanCorruptedData}
                className="bg-orange-50 text-orange-700 hover:bg-orange-100"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar Datos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={forceClean}
                className="bg-red-50 text-red-700 hover:bg-red-100"
              >
                <X className="h-4 w-4 mr-2" />
                Limpieza Total
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Formulario de Nueva Nota */}
        {showAddForm && (
          <div className="px-6 pb-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Crear Nueva Nota</h3>
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
                    onClick={handleAddItem}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Crear
                  </Button>
                  <Button
                    onClick={handleCancelAdd}
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
      
      <CardContent>
        <div className="space-y-4">

          {/* Panel de configuración */}
          {showSettings && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-700">Configuración de Vista</h4>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Vista de Cards
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Vista de Lista
                </Button>
              </div>

              {viewMode === 'cards' && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    Hover sobre el icono de paleta en cada card para personalizar colores
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Contenido según la vista */}
          {viewMode === 'cards' ? (
            <PendingItemsCardsView
              items={items}
              onItemsChange={handleItemsChange}
              onToggleStatus={handleToggleStatus}
              onExecute={handleExecute}
              onDeleteItem={handleDeleteItem}
              postItMode={postItMode}
              onTogglePostItMode={togglePostItMode}
            />
          ) : (
            <PendingItemsListView
              items={items}
              onItemsChange={handleItemsChange}
              onToggleStatus={handleToggleStatus}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
