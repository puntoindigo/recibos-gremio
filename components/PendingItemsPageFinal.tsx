'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Users, 
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  List,
  Grid3X3,
  Layout,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  Bell
} from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import PendingItemsViewManager from '@/components/PendingItemsViewManager';

const PendingItemsPageNew: React.FC = () => {
  const [currentView, setCurrentView] = useState('pending-items');
  const [viewMode, setViewMode] = useState('board');

  const handleViewChange = (view: string) => {
    if (view.includes('view')) {
      const mode = view.replace('-view', '');
      setViewMode(mode);
      const event = new CustomEvent('setViewMode', { detail: mode });
      window.dispatchEvent(event);
    } else {
      setCurrentView(view);
    }
  };

  return (
    <MainLayout 
      currentView={currentView}
      onViewChange={handleViewChange}
    >
      <div className="p-6 space-y-4">
        {/* Stats Overview - Más compacto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Total</p>
                  <p className="text-xl font-bold text-blue-900">10</p>
                </div>
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600">Completados</p>
                  <p className="text-xl font-bold text-green-900">3</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-yellow-600">En Progreso</p>
                  <p className="text-xl font-bold text-yellow-900">2</p>
                </div>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Pendientes</p>
                  <p className="text-xl font-bold text-gray-900">5</p>
                </div>
                <Clock className="h-6 w-6 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area - Estructura de columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column - Filtros y Acciones (1/4 del ancho) */}
          <div className="space-y-3">
            {/* Filtros */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="space-y-1">
                    <Button variant="outline" size="sm" className="w-full justify-start h-7 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      Completados (3)
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start h-7 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                      En Progreso (2)
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start h-7 text-xs">
                      <Clock className="h-3 w-3 mr-1 text-gray-500" />
                      Pendientes (5)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => {
                    const event = new CustomEvent('openNewItemModal');
                    window.dispatchEvent(event);
                  }}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Nueva Nota
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const event = new CustomEvent('cleanDuplicates');
                    window.dispatchEvent(event);
                  }}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpiar Duplicados
                </Button>
              </CardContent>
            </Card>

            {/* Estadísticas Rápidas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Completados</span>
                    <span className="text-xs font-semibold text-green-600">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Tiempo</span>
                    <span className="text-xs font-semibold text-blue-600">2.3d</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contenido Principal (3/4 del ancho) */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Items Pendientes</CardTitle>
                  <div className="flex items-center space-x-2">
                    {/* Botones de vista */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleViewChange('list-view')}
                        className="h-7 px-2"
                      >
                        <List className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={viewMode === 'cards' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleViewChange('cards-view')}
                        className="h-7 px-2"
                      >
                        <Grid3X3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={viewMode === 'board' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleViewChange('board-view')}
                        className="h-7 px-2"
                      >
                        <Layout className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <PendingItemsViewManager />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PendingItemsPageNew;
