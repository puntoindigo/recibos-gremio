'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight,
  Sparkles,
  CheckSquare,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import PendingItemsPageFinal from '@/components/PendingItemsPageFinal';

const PendingItemsDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);

  if (!showDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Items Pendientes - Diseño Final
            </CardTitle>
            <p className="text-gray-600">
              Nuevo diseño con sidebar colapsable, estructura de columnas y cards a la mitad de tamaño
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">✨ Características</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Sidebar colapsable</li>
                  <li>• Header con login arriba</li>
                  <li>• Cards a mitad de tamaño</li>
                  <li>• Estructura de columnas</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">🎯 Mejoras</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Texto en 3-4 líneas</li>
                  <li>• Layout más compacto</li>
                  <li>• Filtros en columna lateral</li>
                  <li>• Navegación mejorada</li>
                </ul>
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                onClick={() => setShowDemo(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Ver Items Pendientes
              </Button>
            </div>
            
            <div className="text-center text-sm text-gray-500">
              <div>Servidor corriendo en: <Badge variant="outline">http://localhost:3000</Badge></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PendingItemsPageFinal />;
};

export default PendingItemsDemo;
