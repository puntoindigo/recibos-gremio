// components/CircularNavigation.tsx
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Shield, 
  CreditCard, 
  Users, 
  LogOut, 
  User,
  Building2,
  Menu,
  X,
  Home
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CircularNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function CircularNavigation({ activeTab, onTabChange }: CircularNavigationProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    { id: 'recibos', label: 'Recibos', icon: FileText, color: 'text-blue-600' },
    { id: 'control', label: 'Control', icon: Shield, color: 'text-green-600' },
    { id: 'export', label: 'Exportar', icon: CreditCard, color: 'text-purple-600' },
    { id: 'descuentos', label: 'Descuentos', icon: CreditCard, color: 'text-orange-600', permission: 'descuentos:view' },
    { id: 'usuarios', label: 'Usuarios', icon: Users, color: 'text-red-600', permission: 'usuarios:view' },
  ];

  const handleMenuClick = (itemId: string) => {
    onTabChange(itemId);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Header superior */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-full p-2">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sistema de Recibos</h1>
                <p className="text-sm text-gray-500">Gestión de nóminas y descuentos</p>
              </div>
            </div>

            {/* Información del usuario */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleBadgeColor(session?.user?.role || '')}>
                    {session?.user?.role}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menú circular flotante */}
      <div className="fixed left-6 top-1/2 transform -translate-y-1/2 z-50">
        {/* Botón central */}
        <div className="relative">
          <Button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-300"
            size="lg"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </Button>

          {/* Items del menú circular */}
          {isMenuOpen && (
            <div className="absolute left-20 top-0 space-y-3">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasPermission = !item.permission || canAccess(item.permission);
                
                if (!hasPermission) return null;

                return (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 bg-white rounded-lg shadow-md p-3 hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => handleMenuClick(item.id)}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'slideInLeft 0.3s ease-out forwards'
                    }}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : item.color}`} />
                    </div>
                    <span className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overlay para cerrar menú */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

