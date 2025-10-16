// components/SidebarNavigation.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Shield, 
  CreditCard, 
  Users, 
  LogOut, 
  Building2,
  Percent,
  Bug
} from 'lucide-react';

interface SidebarNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onDebugClick?: () => void;
}

export default function SidebarNavigation({ activeTab, onTabChange, onDebugClick }: SidebarNavigationProps) {
  const { data: session } = useSession();

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

  const menuItems = [
    { 
      id: 'recibos', 
      label: 'Recibos', 
      icon: FileText, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      activeBgColor: 'bg-blue-100'
    },
    { 
      id: 'control', 
      label: 'Control', 
      icon: Shield, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      activeBgColor: 'bg-green-100'
    },
    { 
      id: 'export', 
      label: 'Exportar', 
      icon: CreditCard, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      activeBgColor: 'bg-purple-100'
    },
    { 
      id: 'descuentos', 
      label: 'Descuentos', 
      icon: Percent, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      activeBgColor: 'bg-orange-100',
      permission: 'descuentos:view' 
    },
    { 
      id: 'usuarios', 
      label: 'Usuarios', 
      icon: Users, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      activeBgColor: 'bg-red-100',
      permission: 'usuarios:view' 
    },
  ];

  const handleMenuClick = (itemId: string) => {
    onTabChange(itemId);
  };

  return (
    <>
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-white shadow-lg rounded-r-2xl border-r border-gray-200 flex flex-col z-50">
        {/* Header del sidebar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 rounded-xl p-3">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Sistema de Recibos</h1>
              <p className="text-xs text-gray-500">Gestión de nóminas</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasPermission = !item.permission || canAccess(item.permission);
            
            if (!hasPermission) return null;

            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
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
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-current rounded-full"></div>
                )}
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

            {/* Botón de salir */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="w-full justify-start text-gray-600 hover:text-red-600 hover:border-red-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
