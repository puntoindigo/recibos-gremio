'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Clock, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import PendingItemsViewManager from '@/components/PendingItemsViewManager';

const PendingItemsPage: React.FC = () => {
  const [isCompressed, setIsCompressed] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompressed(!isCompressed)}
            className="flex items-center gap-2"
          >
            {isCompressed ? (
              <>
                <Maximize2 className="h-4 w-4" />
                Expandir
              </>
            ) : (
              <>
                <Minimize2 className="h-4 w-4" />
                Comprimir
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!isCompressed && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">10</div>
              <p className="text-xs text-muted-foreground">
                +2 desde la última semana
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">3</div>
              <p className="text-xs text-muted-foreground">
                30% completado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <p className="text-xs text-muted-foreground">
                Activamente trabajando
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">5</div>
              <p className="text-xs text-muted-foreground">
                Esperando inicio
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barra de herramientas comprimida */}
      {isCompressed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
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
            </div>
            <div className="text-xs text-gray-500">
              Sistema Activo
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Gestor de Items Pendientes</CardTitle>
          <CardDescription>
            Organiza, prioriza y gestiona las tareas pendientes de desarrollo con drag & drop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingItemsViewManager />
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingItemsPage;
