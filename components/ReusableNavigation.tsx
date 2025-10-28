'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfiguration } from '@/contexts/ConfigurationContext';
import { 
  FileText, 
  Shield, 
  CreditCard, 
  Users, 
  UserCheck,
  LogOut, 
  Building2,
  Percent,
  Bug,
  BarChart3,
  Database,
  BookOpen,
  Settings,
  CheckSquare
} from 'lucide-react';

interface ReusableNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onDebugClick?: () => void;
  className?: string;
}

const iconMap = {
  BarChart3,
  FileText,
  Shield,
  CreditCard,
  Users,
  UserCheck,
  Database,
  CheckSquare,
  BookOpen,
  Settings
};

export default function ReusableNavigation({ 
  activeTab, 
  onTabChange, 
  onDebugClick,
  className = "fixed left-0 top-0 w-64 h-screen bg-white shadow-lg rounded-r-2xl border-r border-gray-200 flex flex-col z-40 overflow-y-auto"
}: ReusableNavigationProps) {
  const { data: session } = useSession();
  const { getFilteredNavigationItems } = useConfiguration();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const canAccess = (permission: string) => {
    if (!session?.user?.permissions) return false;
    return session.user.permissions.includes(permission) || session.user.permissions.includes('*');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN': return 'bg-red-100 text-red-800';
      case 'ADMIN': return 'bg-blue-100 text-blue-800';
      case 'USER': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener elementos de menú filtrados por configuración
  const filteredMenuItems = getFilteredNavigationItems();

  const handleMenuClick = (itemId: string) => {
    onTabChange(itemId);
  };

  return (
    <>
      {/* Sidebar */}
      <div className={className}>
        {/* Header del sidebar */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={() => onTabChange('tablero')}
            className="w-full flex items-center space-x-3 text-left group"
            title="Ir al Dashboard"
          >
            <div className="bg-blue-600 rounded-xl p-3 group-hover:scale-105 transition-transform">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Sistema de Recibos</h1>
              <p className="text-xs text-gray-500">Gestión de nóminas</p>
            </div>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredMenuItems.map((item, index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive = activeTab === item.id;
            const hasPermission = !item.permission || canAccess(item.permission);
            
            // No mostrar si no tiene permisos
            if (!hasPermission) return null;

            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center justify-start text-left space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? `${item.activeBgColor} ${item.color} shadow-sm border-2 border-current` 
                    : `${item.bgColor} text-gray-600 hover:${item.activeBgColor} hover:${item.color} hover:shadow-sm`
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white' : 'bg-white/50'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-sm">
                  {item.label}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {item.shortcut && (
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded border">
                      {item.shortcut}
                    </kbd>
                  )}
                  {isActive && (
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-3">
            {/* Información del usuario */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getRoleBadgeColor(session?.user?.role || '')}`}>
                    {session?.user?.role}
                  </Badge>
                  {onDebugClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDebugClick}
                      className="h-5 w-5 p-0 hover:bg-gray-200"
                      title="Abrir Debug"
                    >
                      <Bug className="h-3 w-3 text-gray-500" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Botón de logout */}
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
