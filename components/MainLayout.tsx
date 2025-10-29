'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Home,
  FileText,
  Users,
  BarChart3,
  CheckSquare,
  Upload,
  Database,
  Shield,
  HelpCircle,
  Plus,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

export default function MainLayout({ 
  children, 
  currentView = 'dashboard',
  onViewChange 
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'pending-items', label: 'Items Pendientes', icon: CheckSquare, badge: '12' },
    { id: 'receipts', label: 'Recibos', icon: FileText },
    { id: 'employees', label: 'Empleados', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'upload', label: 'Subir Archivos', icon: Upload },
  ];

  const secondaryItems = [
    { id: 'database', label: 'Base de Datos', icon: Database },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'help', label: 'Ayuda', icon: HelpCircle },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        sidebarCollapsed ? "w-16" : "w-64",
        !sidebarOpen && "hidden lg:flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Recibos</h1>
                  <p className="text-xs text-gray-500">Sistema de Gestión</p>
                </div>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-sm">R</span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-3 space-y-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigationItems.map(item => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => onViewChange?.(item.id)}
                className={cn(
                  "w-full justify-start h-10 px-3 mb-1 transition-all duration-200",
                  currentView === item.id && "bg-blue-50 border-r-2 border-blue-500 text-blue-700"
                )}
              >
                <item.icon className="h-4 w-4 mr-3 text-gray-500" />
                {!sidebarCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {sidebarCollapsed && item.badge && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.badge}
                  </div>
                )}
              </Button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Secondary Navigation */}
          <div className="space-y-1">
            {secondaryItems.map(item => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => onViewChange?.(item.id)}
                className="w-full justify-start h-10 px-3 mb-1 opacity-70"
              >
                <item.icon className="h-4 w-4 mr-3 text-gray-500" />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium flex-1 text-left">
                    {item.label}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-3" />
            {!sidebarCollapsed && "Nuevo Item"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Mobile menu button and title */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
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
            </div>
            
            {/* Right side - Search, notifications, user menu */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Usuario Admin</p>
                  <p className="text-xs text-gray-500">Administrador</p>
                </div>
                <div className="relative">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </Button>
            </div>
            {/* Mobile sidebar content would go here */}
          </div>
        </div>
      )}
    </div>
  );
}
