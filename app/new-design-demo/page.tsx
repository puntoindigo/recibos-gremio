'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Users, 
  BarChart3, 
  Upload,
  Database,
  Shield,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Home,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import MainLayout from '@/components/MainLayout';

const NewDesignDemo: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [showDemo, setShowDemo] = useState(false);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  if (!showDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Nuevo Diseño Moderno
            </CardTitle>
            <p className="text-gray-600">
              Layout con sidebar colapsable, header con login y estructura de columnas como en el ejemplo
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">✨ Características</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Sidebar colapsable</li>
                  <li>• Header con login arriba</li>
                  <li>• Estructura de columnas</li>
                  <li>• Diseño responsive</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">🎯 Beneficios</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Más espacio para contenido</li>
                  <li>• Navegación intuitiva</li>
                  <li>• Diseño profesional</li>
                  <li>• Mejor experiencia de usuario</li>
                </ul>
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                onClick={() => setShowDemo(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Ver Nuevo Diseño
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

  return (
    <MainLayout 
      currentView={currentView}
      onViewChange={handleViewChange}
    >
      <div className="p-6 space-y-6">
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">¡Nuevo Diseño Activo!</h1>
          <p className="text-blue-100">Layout moderno con sidebar colapsable y estructura de columnas</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Pendientes</p>
                  <p className="text-3xl font-bold text-gray-900">12</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    +2 esta semana
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recibos Procesados</p>
                  <p className="text-3xl font-bold text-gray-900">1,247</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    +15% este mes
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Empleados Activos</p>
                  <p className="text-3xl font-bold text-gray-900">45</p>
                  <p className="text-xs text-blue-600 flex items-center mt-1">
                    <Users className="h-3 w-3 mr-1" />
                    Todos activos
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tareas Urgentes</p>
                  <p className="text-3xl font-bold text-gray-900">3</p>
                  <p className="text-xs text-red-600 flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Requieren atención
                  </p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LayoutDashboard className="h-5 w-5 mr-2" />
                  Navegación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('dashboard')}
                    className="w-full justify-start"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button 
                    variant={currentView === 'pending-items' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('pending-items')}
                    className="w-full justify-start"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Items Pendientes
                  </Button>
                  <Button 
                    variant={currentView === 'receipts' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('receipts')}
                    className="w-full justify-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Recibos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Contenido Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    ¡Nuevo Diseño Funcionando!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Este es el nuevo layout con sidebar colapsable, header con login arriba a la derecha,
                    y estructura de columnas como en el ejemplo que me mostraste.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button 
                      onClick={() => setShowDemo(false)}
                      variant="outline"
                    >
                      Volver al Inicio
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('pending-items')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Ir a Items Pendientes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewDesignDemo;
