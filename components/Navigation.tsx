// components/Navigation.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Shield, 
  CreditCard, 
  Users, 
  LogOut, 
  User,
  Building2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { data: session } = useSession();
  const router = useRouter();

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

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo y título */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            <div className="hidden sm:block">
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">Sistema de Recibos</h1>
              <p className="text-xs lg:text-sm text-gray-500">Gestión de nóminas y descuentos</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-gray-900">Recibos</h1>
            </div>
          </div>

          {/* Información del usuario */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
              <div className="flex items-center space-x-2">
                <Badge className={getRoleBadgeColor(session?.user?.role || '')}>
                  {session?.user?.role}
                </Badge>
                {session?.user?.empresaId && (
                  <Badge variant="outline">
                    <Building2 className="h-3 w-3 mr-1" />
                    Empresa
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Salir</span>
            </Button>
          </div>
        </div>

        {/* Navegación por pestañas - Hidden on mobile */}
        <div className="hidden lg:block">
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="recibos" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Recibos</span>
              </TabsTrigger>
              
              <TabsTrigger value="control" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Control</span>
              </TabsTrigger>
              
              <TabsTrigger value="export" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Exportar</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="descuentos" 
                className="flex items-center space-x-2"
                disabled={!canAccess('descuentos:view')}
              >
                <CreditCard className="h-4 w-4" />
                <span>Descuentos</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="usuarios" 
                className="flex items-center space-x-2"
                disabled={!canAccess('usuarios:view')}
              >
                <Users className="h-4 w-4" />
                <span>Usuarios</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
