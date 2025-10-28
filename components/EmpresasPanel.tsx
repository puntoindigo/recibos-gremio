// components/EmpresasPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePagination } from '@/hooks/usePagination';
import { shouldShowPagination, applyPaginationRule } from '@/lib/pagination-utils';
import { empresaManager, type EmpresaData } from '@/lib/empresa-manager';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Users,
  FileText,
  CreditCard,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { canManageUsers } from '@/lib/user-management';
import EmpresaModal from './EmpresaModal';
import { ConfirmModal } from './ConfirmModal';
import EmpresasColumnSelector from './EmpresasColumnSelector';

interface EmpresasPanelProps {
  empresaFiltro?: string;
}

export default function EmpresasPanel({ empresaFiltro }: EmpresasPanelProps) {
  const { dataManager } = useCentralizedDataManager();
  const { data: session } = useSession();
  const [empresas, setEmpresas] = useState<EmpresaData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['nombre', 'empleadosCount', 'recibosCount', 'descuentosCount']);
  const [showModal, setShowModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaData | null>(null);
  const [empresaToDelete, setEmpresaToDelete] = useState<EmpresaData | null>(null);

  const canManage = session?.user ? canManageUsers(session.user) : false;

  // Debug: verificar permisos
  useEffect(() => {
    console.log('🔍 Debug EmpresasPanel - Usuario:', {
      email: session?.user?.email,
      role: session?.user?.role,
      permissions: session?.user?.permissions,
      canManage
    });
  }, [session, canManage]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // N o + para Nueva Empresa
      if ((event.key?.toLowerCase() === 'n' || event.key === '+') && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (canManage) {
          setSelectedEmpresa(null);
          setShowModal(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canManage]);

  const loadEmpresas = async () => {
    setIsLoading(true);
    try {
      const empresasData = await empresaManager.getAllEmpresas(dataManager);
      console.log('🔍 Debug - Recargando empresas:', empresasData.length);
      console.log('🔍 Debug - Empresas:', empresasData.map(e => e.nombre));
      setEmpresas(empresasData);
    } catch (error) {
      console.error('Error cargando empresas:', error);
      toast.error('Error cargando empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmpresa = (empresa: EmpresaData) => {
    setSelectedEmpresa(empresa);
    setShowModal(true);
  };

  const handleDeleteEmpresa = (empresa: EmpresaData) => {
    setEmpresaToDelete(empresa);
    setShowConfirmModal(true);
  };

  const confirmDeleteEmpresa = async () => {
    if (!empresaToDelete) return;

    try {
      console.log('🔍 Debug - Eliminando empresa:', empresaToDelete.nombre);
      
      // Verificar si tiene empleados vinculados
      const hasEmpleados = await empresaManager.hasEmpleadosVinculados(empresaToDelete.nombre, dataManager);
      console.log('🔍 Debug - Tiene empleados vinculados:', hasEmpleados);
      
      if (hasEmpleados) {
        toast.error('No se puede eliminar la empresa porque tiene empleados vinculados');
        return;
      }

      console.log('🔍 Debug - Procediendo a eliminar empresa con ID:', empresaToDelete.id);
      await empresaManager.deleteEmpresa(empresaToDelete.id, dataManager);
      console.log('🔍 Debug - Empresa eliminada exitosamente');
      
      toast.success('Empresa eliminada correctamente');
      loadEmpresas();
    } catch (error) {
      console.error('Error eliminando empresa:', error);
      toast.error('Error al eliminar la empresa');
    } finally {
      console.log('🔍 Debug - Cerrando modal de confirmación');
      setShowConfirmModal(false);
      setEmpresaToDelete(null);
    }
  };

  const handleViewEmpresa = (empresa: EmpresaData) => {
    // TODO: Implementar vista de ficha de empresa
    console.log('Ver ficha de empresa:', empresa);
  };

  useEffect(() => {
    loadEmpresas();
  }, []);

  // Filtrar empresas
  const filteredEmpresas = (empresas || []).filter(empresa => {
    if (!empresa || !empresa.nombre) return false;
    const matchesSearch = empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (empresa.descripcion && empresa.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Paginación
  const shouldPaginate = shouldShowPagination(filteredEmpresas.length);
  const { currentPage, totalPages, paginatedData } = usePagination({
    data: filteredEmpresas,
    initialItemsPerPage: 25
  });

  const getColumnHeader = (key: string) => {
    const headers: Record<string, string> = {
      nombre: 'Empresa',
      empleadosCount: 'Empleados',
      recibosCount: 'Recibos',
      descuentosCount: 'Descuentos',
      logo: 'Logo'
    };
    return headers[key] || key;
  };

  const renderCellContent = (empresa: EmpresaData, key: string) => {
    switch (key) {
      case 'nombre':
        return (
          <div className="flex items-center gap-2">
            {empresa.logo && (
              <img 
                src={empresa.logo} 
                alt={`Logo ${empresa.nombre}`}
                className="w-6 h-6 object-contain"
              />
            )}
            <span className="font-medium">{empresa.nombre}</span>
          </div>
        );
      case 'empleadosCount':
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{empresa.empleadosCount}</span>
          </div>
        );
      case 'recibosCount':
        return (
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="font-medium">{empresa.recibosCount}</span>
          </div>
        );
      case 'descuentosCount':
        return (
          <div className="flex items-center gap-1">
            <CreditCard className="h-4 w-4 text-orange-600" />
            <span className="font-medium">{empresa.descuentosCount}</span>
          </div>
        );
      case 'logo':
        return empresa.logo ? (
          <img 
            src={empresa.logo} 
            alt={`Logo ${empresa.nombre}`}
            className="w-8 h-8 object-contain border rounded"
          />
        ) : (
          <span className="text-gray-400">Sin logo</span>
        );
      default:
        return String(empresa[key as keyof EmpresaData] || '');
    }
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin Permisos</h3>
          <p className="text-gray-600">No tienes permisos para gestionar empresas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Empresas</p>
                <p className="text-2xl font-bold text-blue-600">{empresas?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-green-600">
                  {(empresas || []).reduce((sum, emp) => sum + emp.empleadosCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recibos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(empresas || []).reduce((sum, emp) => sum + emp.recibosCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Descuentos</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(empresas || []).reduce((sum, emp) => sum + emp.descuentosCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Gestión de Empresas
              </CardTitle>
              <CardDescription>
                Administra las empresas del sistema
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <EmpresasColumnSelector
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
              />
              <Button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Empresa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Búsqueda */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar empresas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((column) => (
                    <TableHead key={column}>
                      {getColumnHeader(column)}
                    </TableHead>
                  ))}
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={(visibleColumns?.length || 0) + 1} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Cargando empresas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (paginatedData?.length || 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(visibleColumns?.length || 0) + 1} className="text-center py-8">
                      <div className="text-gray-500">
                        {searchTerm ? 'No se encontraron empresas que coincidan con la búsqueda' : 'No hay empresas registradas'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((empresa) => (
                    <TableRow key={empresa.id}>
                      {visibleColumns.map((column) => (
                        <TableCell key={column}>
                          {renderCellContent(empresa, column)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEmpresa(empresa)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEmpresa(empresa)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmpresa(empresa)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {shouldPaginate && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * 10) + 1} a {Math.min(currentPage * 10, filteredEmpresas?.length || 0)} de {filteredEmpresas?.length || 0} empresas
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* TODO: Implementar paginación */}}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* TODO: Implementar paginación */}}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      {showModal && (
        <EmpresaModal
          empresa={selectedEmpresa}
          onClose={() => {
            setShowModal(false);
            setSelectedEmpresa(null);
          }}
          onSave={() => {
            setShowModal(false);
            setSelectedEmpresa(null);
            // Recargar empresas después de un pequeño delay para asegurar que se guardó
            setTimeout(() => {
              loadEmpresas();
            }, 100);
          }}
        />
      )}

      {showConfirmModal && empresaToDelete && (
        <ConfirmModal
          open={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setEmpresaToDelete(null);
          }}
          onConfirm={confirmDeleteEmpresa}
          title="Eliminar Empresa"
          description={`¿Estás seguro de que quieres eliminar la empresa ${empresaToDelete.nombre}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />
      )}
    </div>
  );
}

export { EmpresasPanel };
