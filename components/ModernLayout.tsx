'use client';

import React, { useState } from 'react';
import ModernSidebar from './ModernSidebar';
import { cn } from '@/lib/utils';

interface ModernLayoutProps {
  children: React.ReactNode;
  currentView?: string;
  onViewChange?: (view: string) => void;
  className?: string;
}

export default function ModernLayout({ 
  children, 
  currentView = 'dashboard',
  onViewChange,
  className 
}: ModernLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ModernSidebar 
        currentView={currentView}
        onViewChange={onViewChange}
        className="shadow-sm"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'dashboard' && 'Dashboard'}
                {currentView === 'pending-items' && 'Items Pendientes'}
                {currentView === 'receipts' && 'Recibos'}
                {currentView === 'employees' && 'Empleados'}
                {currentView === 'analytics' && 'Analytics'}
                {currentView === 'upload' && 'Subir Archivos'}
                {currentView === 'database' && 'Base de Datos'}
                {currentView === 'security' && 'Seguridad'}
                {currentView === 'help' && 'Ayuda'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentView === 'pending-items' && 'Gestiona tus tareas y funcionalidades pendientes'}
                {currentView === 'dashboard' && 'Vista general del sistema'}
                {currentView === 'receipts' && 'Administración de recibos'}
                {currentView === 'employees' && 'Gestión de empleados'}
                {currentView === 'analytics' && 'Estadísticas y reportes'}
                {currentView === 'upload' && 'Carga de archivos al sistema'}
                {currentView === 'database' && 'Configuración de base de datos'}
                {currentView === 'security' && 'Configuración de seguridad'}
                {currentView === 'help' && 'Centro de ayuda y documentación'}
              </p>
            </div>
            
            {/* Top Right Actions */}
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                Última actualización: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className={cn("h-full", className)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
