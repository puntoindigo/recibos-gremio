'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  List, 
  Grid3X3, 
  Layout,
  Plus
} from 'lucide-react';
import PendingItemsViewManager from '@/components/PendingItemsViewManager';
import ModernLayout from '@/components/ModernLayout';

const PendingItemsPageModern: React.FC = () => {
  const [currentView, setCurrentView] = useState('pending-items');
  const [viewMode, setViewMode] = useState('board');

  const handleViewChange = (view: string) => {
    if (view.includes('view')) {
      // Manejar cambios de vista específicos
      const mode = view.replace('-view', '');
      setViewMode(mode);
      
      // Disparar evento para el ViewManager
      const event = new CustomEvent('setViewMode', { detail: mode });
      window.dispatchEvent(event);
    } else {
      setCurrentView(view);
    }
  };

  return (
    <ModernLayout 
      currentView={currentView}
      onViewChange={handleViewChange}
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Items</p>
                  <p className="text-2xl font-bold text-blue-900">10</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Completados</p>
                  <p className="text-2xl font-bold text-green-900">3</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">En Progreso</p>
                  <p className="text-2xl font-bold text-yellow-900">2</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">5</p>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                const event = new CustomEvent('openNewItemModal');
                window.dispatchEvent(event);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Nota
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                const event = new CustomEvent('cleanDuplicates');
                window.dispatchEvent(event);
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Duplicados
            </Button>
          </div>

          {/* View Mode Indicator */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Vista actual:</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {viewMode === 'list' && <><List className="h-3 w-3 mr-1" />Lista</>}
              {viewMode === 'cards' && <><Grid3X3 className="h-3 w-3 mr-1" />Cards</>}
              {viewMode === 'board' && <><Layout className="h-3 w-3 mr-1" />Tablero</>}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <PendingItemsViewManager />
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
};

export default PendingItemsPageModern;
