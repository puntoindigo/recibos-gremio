'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle2, AlertCircle, Edit3, Trash2, List, Grid3X3, Layout } from 'lucide-react';
import PendingItemsViewManager from '@/components/PendingItemsViewManager';

const PendingItemsPage: React.FC = () => {
  const [isCompressed, setIsCompressed] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header consolidado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Items Pendientes</h1>
            <p className="text-gray-600">Gestión de tareas y funcionalidades pendientes de desarrollo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            <Clock className="h-4 w-4 mr-1" />
            Sistema Activo
          </Badge>
        </div>
      </div>

      {/* Contenedor unificado con estadísticas y botones */}
      <Card className="w-full">
        <CardContent className="p-6">
          {/* Header reorganizado */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <FileText className="h-3 w-3 mr-1" />
                10 Total
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                3 Completados
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                <AlertCircle className="h-3 w-3 mr-1" />
                2 En Progreso
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Clock className="h-3 w-3 mr-1" />
                5 Pendientes
              </Badge>
              
              {/* Botón Nueva Nota */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const event = new CustomEvent('openNewItemModal');
                  window.dispatchEvent(event);
                }}
                className="bg-green-50 text-green-700 hover:bg-green-100"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Nueva Nota
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const event = new CustomEvent('cleanDuplicates');
                  window.dispatchEvent(event);
                }}
                className="bg-red-50 text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Duplicados
              </Button>
            </div>
            
            {/* Botones de vista alineados a la derecha */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const event = new CustomEvent('setViewMode', { detail: 'list' });
                    window.dispatchEvent(event);
                  }}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const event = new CustomEvent('setViewMode', { detail: 'cards' });
                    window.dispatchEvent(event);
                  }}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const event = new CustomEvent('setViewMode', { detail: 'board' });
                    window.dispatchEvent(event);
                  }}
                  className="h-8 px-3"
                >
                  <Layout className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="space-y-4">
            <PendingItemsViewManager />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingItemsPage;
