'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  BarChart3, 
  Upload,
  Database,
  Shield,
  HelpCircle,
  Plus,
  ChevronRight,
  ChevronLeft,
  Home,
  Calendar,
  CheckSquare,
  Grid3X3,
  List,
  Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface ModernSidebarProps {
  currentView?: string;
  onViewChange?: (view: string) => void;
  className?: string;
}

export default function ModernSidebar({ 
  currentView = 'dashboard', 
  onViewChange,
  className 
}: ModernSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const mainNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      onClick: () => onViewChange?.('dashboard')
    },
    {
      id: 'pending-items',
      label: 'Items Pendientes',
      icon: CheckSquare,
      badge: '12',
      onClick: () => onViewChange?.('pending-items')
    },
    {
      id: 'receipts',
      label: 'Recibos',
      icon: FileText,
      onClick: () => onViewChange?.('receipts')
    },
    {
      id: 'employees',
      label: 'Empleados',
      icon: Users,
      onClick: () => onViewChange?.('employees')
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      onClick: () => onViewChange?.('analytics')
    },
    {
      id: 'upload',
      label: 'Subir Archivos',
      icon: Upload,
      onClick: () => onViewChange?.('upload')
    }
  ];

  const secondaryNavItems: NavItem[] = [
    {
      id: 'database',
      label: 'Base de Datos',
      icon: Database,
      onClick: () => onViewChange?.('database')
    },
    {
      id: 'security',
      label: 'Seguridad',
      icon: Shield,
      onClick: () => onViewChange?.('security')
    },
    {
      id: 'help',
      label: 'Ayuda',
      icon: HelpCircle,
      onClick: () => onViewChange?.('help')
    }
  ];

  const viewModeItems: NavItem[] = [
    {
      id: 'list-view',
      label: 'Vista Lista',
      icon: List,
      onClick: () => onViewChange?.('list-view')
    },
    {
      id: 'cards-view',
      label: 'Vista Cards',
      icon: Grid3X3,
      onClick: () => onViewChange?.('cards-view')
    },
    {
      id: 'board-view',
      label: 'Vista Tablero',
      icon: Layout,
      onClick: () => onViewChange?.('board-view')
    }
  ];

  const renderNavItem = (item: NavItem, isSecondary = false) => {
    const isActive = currentView === item.id;
    const isHovered = hoveredItem === item.id;
    
    return (
      <Button
        key={item.id}
        variant="ghost"
        size="sm"
        onClick={item.onClick}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={cn(
          "w-full justify-start h-10 px-3 mb-1 transition-all duration-200",
          isActive && "bg-blue-50 border-r-2 border-blue-500 text-blue-700",
          isHovered && !isActive && "bg-gray-50",
          isSecondary && "opacity-70"
        )}
      >
        <item.icon className={cn(
          "h-4 w-4 mr-3 transition-colors",
          isActive ? "text-blue-600" : "text-gray-500",
          isHovered && !isActive && "text-gray-700"
        )} />
        
        {!isCollapsed && (
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
        
        {isCollapsed && item.badge && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
            {item.badge}
          </div>
        )}
      </Button>
    );
  };

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
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
          
          {isCollapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">R</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            {isCollapsed ? (
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
          {mainNavItems.map(item => renderNavItem(item))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4" />

        {/* View Mode Navigation - Solo visible en Items Pendientes */}
        {currentView === 'pending-items' && (
          <div className="space-y-1 mb-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 mb-2">
              {!isCollapsed && "Vistas"}
            </div>
            {viewModeItems.map(item => renderNavItem(item))}
          </div>
        )}

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryNavItems.map(item => renderNavItem(item, true))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <Plus className="h-4 w-4 mr-3" />
          {!isCollapsed && "Nuevo Item"}
        </Button>
      </div>
    </div>
  );
}
