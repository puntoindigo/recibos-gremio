// components/SidebarNavigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfiguration } from '@/contexts/ConfigurationContext';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
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
  CheckSquare,
  Camera
} from 'lucide-react';
import Link from 'next/link';

interface SidebarNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onDebugClick?: () => void;
}

export default function SidebarNavigation({ activeTab, onTabChange, onDebugClick }: SidebarNavigationProps) {
  const { data: session } = useSession();
  const { getFilteredNavigationItems } = useConfiguration();
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Detectar cambios en los items del menú para animar solo los que cambian
  useEffect(() => {
    const currentItems = getFilteredNavigationItems();
    const currentItemIds = currentItems.map(item => item.id);
    const previousItemIds = menuItems.map(item => item.id);
    
    const newItems = currentItemIds.filter(id => !previousItemIds.includes(id));
    const removedItems = previousItemIds.filter(id => !currentItemIds.includes(id));
    
    if (newItems.length > 0 || removedItems.length > 0) {
      // Animar items nuevos
      newItems.forEach(id => {
        setAnimatingItems(prev => new Set([...prev, id]));
        setTimeout(() => {
          setAnimatingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }, 300);
      });

      // Animar items que se van a eliminar
      if (removedItems.length > 0) {
        removedItems.forEach(id => {
          setRemovingItems(prev => new Set([...prev, id]));
          setTimeout(() => {
            setRemovingItems(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }, 300);
        });
      }
    }
    
    // Solo actualizar menuItems si no hay items removiendo
    if (removingItems.size === 0) {
      setMenuItems(currentItems);
    }
  }, [getFilteredNavigationItems, removingItems]);

  // Limpiar items removidos después de la animación
  useEffect(() => {
    if (removingItems.size === 0) {
      const currentItems = getFilteredNavigationItems();
      setMenuItems(currentItems);
    }
  }, [removingItems, getFilteredNavigationItems]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
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

  // Crear lista de items para mostrar (actuales + removiendo)
  const itemsToShow = [...menuItems];
  
  // Agregar items que se están removiendo
  removingItems.forEach(removingId => {
    const itemToRemove = menuItems.find(item => item.id === removingId);
    if (itemToRemove) {
      itemsToShow.push({ ...itemToRemove, isRemoving: true });
    }
  });


  const handleMenuClick = (itemId: string) => {
    onTabChange(itemId);
  };

  return (
    <>
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-white shadow-lg rounded-r-2xl border-r border-gray-200 flex flex-col z-40">
        {/* Header del sidebar */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
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
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {itemsToShow.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasPermission = !item.permission || canAccess(item.permission);
            
            // No mostrar si no tiene permisos
            if (!hasPermission) return null;

            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center justify-start text-left space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 ${
                  isActive 
                    ? `${item.activeBgColor} ${item.color} shadow-sm border-2 border-current scale-105` 
                    : `${item.bgColor} text-gray-600 hover:${item.activeBgColor} hover:${item.color} hover:shadow-sm`
                }`}
                style={{
                  animation: animatingItems.has(item.id) 
                    ? 'fadeInSlide 0.3s ease-out both'
                    : item.isRemoving 
                    ? 'slideOutLeft 0.3s ease-out both'
                    : undefined
                }}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white' : 'bg-white/50'}`}>
                  {Icon && <Icon className="h-5 w-5" />}
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
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
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
                  {onDebugClick && session?.user?.role !== 'ADMIN_REGISTRO' && (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogoutClick}
                    className="h-5 w-5 p-0 hover:bg-red-100"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Botón de salir */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogoutClick}
              className="w-full justify-start text-red-700 hover:text-red-800 hover:border-red-400 border-2 border-red-300 bg-red-100 hover:bg-red-200 transition-all duration-200 font-medium"
              style={{ minHeight: '40px' }}
              title="🔍 Botón de logout visible y funcional"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de logout */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        userName={session?.user?.name}
      />
    </>
  );
}
