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
  Layout
} from 'lucide-react';
import ModernSidebar from '@/components/ModernSidebar';
import ModernLayout from '@/components/ModernLayout';

const NavigationDemo: React.FC = () => {
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
              Nueva Navegación Moderna
            </CardTitle>
            <p className="text-gray-600">
              Prueba la nueva interfaz de navegación lateral inspirada en diseños modernos
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">✨ Características</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Sidebar colapsible</li>
                  <li>• Navegación con iconos</li>
                  <li>• Estados activos visuales</li>
                  <li>• Badges informativos</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">🎯 Beneficios</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Más espacio para contenido</li>
                  <li>• Navegación más rápida</li>
                  <li>• Diseño moderno y limpio</li>
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
                Probar Nueva Navegación
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
    <ModernLayout 
      currentView={currentView}
      onViewChange={handleViewChange}
    >
      <div className="p-6 space-y-6">
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">¡Nueva Navegación Activa!</h1>
          <p className="text-blue-100">Estás viendo la nueva interfaz de navegación lateral moderna</p>
        </div>

        {/* Current View Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LayoutDashboard className="h-5 w-5 mr-2" />
              Vista Actual: {currentView}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Navegación Principal</h3>
                <div className="space-y-2">
                  <Button 
                    variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('dashboard')}
                    className="w-full justify-start"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
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
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Gestión</h3>
                <div className="space-y-2">
                  <Button 
                    variant={currentView === 'employees' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('employees')}
                    className="w-full justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Empleados
                  </Button>
                  <Button 
                    variant={currentView === 'analytics' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('analytics')}
                    className="w-full justify-start"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  <Button 
                    variant={currentView === 'upload' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('upload')}
                    className="w-full justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Archivos
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Configuración</h3>
                <div className="space-y-2">
                  <Button 
                    variant={currentView === 'database' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('database')}
                    className="w-full justify-start"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Base de Datos
                  </Button>
                  <Button 
                    variant={currentView === 'security' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('security')}
                    className="w-full justify-start"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Seguridad
                  </Button>
                  <Button 
                    variant={currentView === 'help' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('help')}
                    className="w-full justify-start"
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Ayuda
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Content */}
        <Card>
          <CardHeader>
            <CardTitle>Contenido de Demostración</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Navegación Moderna Funcionando!
              </h2>
              <p className="text-gray-600 mb-6">
                Usa la barra lateral izquierda para navegar entre diferentes secciones.
                Puedes colapsarla haciendo clic en el botón de flecha.
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
    </ModernLayout>
  );
};

export default NavigationDemo;
