// components/EmpleadosPanel.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { usePagination } from '@/hooks/usePagination';
import { shouldShowPagination, applyPaginationRule } from '@/lib/pagination-utils';
import { useEmpresasFromReceipts } from '@/hooks/useEmpresasFromReceipts';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { empleadoManager, type EmpleadoData } from '@/lib/empleado-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  Edit,
  Trash2,
  Eye,
  User,
  X,
  FileText,
  Building2,
  Users,
  Receipt,
  Percent,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { formatTimestampForDisplay } from '@/lib/date-utils';
import { canManageUsers } from '@/lib/user-management';
import EmpleadoModal from './EmpleadoModal';
import FichaEmpleadoModal from './FichaEmpleadoModal';
import EmpresaModal from './EmpresaModal';
import { ConfirmModal } from './ConfirmModal';
import EmpleadosColumnSelector from './EmpleadosColumnSelector';
import Pagination from './Pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmpleadosPanelProps {
  empresaFiltro: string;
}

interface EmpleadoWithCounts {
  legajo: string;
  nombre: string;
  empresa: string;
  cuil: string;
  periodo: string;
  data: any;
  createdAt: number;
  isManual: boolean;
  recibosCount: number;
  descuentosCount: number;
}

export default function EmpleadosPanel({ empresaFiltro }: EmpleadosPanelProps) {
  const { dataManager } = useCentralizedDataManager();
  const { data: session } = useSession();
  const { empresas: empresasFromReceipts, isLoading: empresasLoading } = useEmpresasFromReceipts();
  
  const [empleados, setEmpleados] = useState<EmpleadoData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFiltroEmpleados, setEmpresaFiltroEmpleados] = useState<string>('TODOS');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['legajo', 'nombre', 'empresa', 'recibosCount', 'descuentosCount']);
  const [showModal, setShowModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [fichaFromEdit, setFichaFromEdit] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEmpresaModal, setShowEmpresaModal] = useState<boolean>(false);

  // Debug: verificar por qué se abre el modal
  useEffect(() => {
    console.log('🔍 Debug EmpresasPanel - showEmpresaModal:', showEmpresaModal);
  }, [showEmpresaModal]);

  // Debug: verificar renderizado
  console.log('🔍 Debug EmpresasPanel - renderizando con showEmpresaModal:', showEmpresaModal);
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoData | null>(null);
  const [selectedLegajo, setSelectedLegajo] = useState<string>('');
  const [empleadoToDelete, setEmpleadoToDelete] = useState<EmpleadoData | null>(null);
  const [nuevaEmpresaCreada, setNuevaEmpresaCreada] = useState<string | null>(null);

  const canManage = session?.user ? canManageUsers(session.user) : false;

  // Debug: verificar permisos
  useEffect(() => {
    if (session?.user) {
      console.log("🔍 Debug EmpleadosPanel - Usuario:", {
        email: session.user.email,
        role: session.user.role,
        permissions: session.user.permissions,
        canManage
      });
    }
  }, [session, canManage]);

  useEffect(() => {
    loadEmpleados();
  }, [empresaFiltroEmpleados]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Solo activar si no estamos escribiendo en un input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // N o + para Nuevo Empleado
      if ((event.key.toLowerCase() === 'n' || event.key === '+') && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (canManage) {
          setShowModal(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canManage]);

  const loadEmpleados = async () => {
    setIsLoading(true);
    try {
      const empleadosData = await empleadoManager.getAllEmpleados(dataManager);
      setEmpleados(empleadosData);
    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast.error('Error cargando empleados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      // Recargar empleados para que se actualicen las empresas disponibles
      await loadEmpleados();
    } catch (error) {
      console.error('Error recargando empresas:', error);
    }
  };

  const handleEditEmpleado = (empleado: EmpleadoData) => {
    console.log('🔍 Debug editando empleado:', {
      legajo: empleado.legajo,
      nombre: empleado.nombre,
      empresa: empleado.empresa,
      data: empleado.data
    });
    setSelectedEmpleado(empleado);
    setShowModal(true);
  };

  const handleDeleteEmpleado = (empleado: EmpleadoWithCounts) => {
    setEmpleadoToDelete(empleado);
    setShowConfirmModal(true);
  };

  const confirmDeleteEmpleado = async () => {
    if (!empleadoToDelete) return;
    
    try {
      // Verificar si tiene recibos vinculados
      if (empleadoToDelete.recibosCount > 0) {
        toast.error(`No se puede eliminar el empleado. Tiene ${empleadoToDelete.recibosCount} recibos vinculados. Debe eliminar los recibos primero.`);
        setShowConfirmModal(false);
        setEmpleadoToDelete(null);
        return;
      }

      // Eliminar empleado de la base de datos
      await dataManager.deleteConsolidated(empleadoToDelete.legajo);
      
      // Eliminar descuentos asociados si los hay
      if (empleadoToDelete.descuentosCount > 0) {
        await dataManager.deleteDescuento(empleadoToDelete.legajo);
      }

      toast.success('Empleado eliminado correctamente');
      loadEmpleados(); // Recargar lista
    } catch (error) {
      console.error('Error eliminando empleado:', error);
      toast.error('Error al eliminar el empleado');
    } finally {
      setShowConfirmModal(false);
      setEmpleadoToDelete(null);
    }
  };

  const handleViewFicha = (legajo: string) => {
    setSelectedLegajo(legajo);
    setShowFichaModal(true);
  };

  const filteredEmpleados = empleados
    .filter(empleado => {
      const matchesSearch = empleado.legajo.includes(searchTerm) || 
                           empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEmpresa = empresaFiltroEmpleados === 'TODOS' || empleado.empresa === empresaFiltroEmpleados;
      
      return matchesSearch && matchesEmpresa;
    })
    .sort((a, b) => {
      // Ordenar por legajo numérico si es posible, sino alfabéticamente
      const legajoA = parseInt(a.legajo) || 0;
      const legajoB = parseInt(b.legajo) || 0;
      if (legajoA !== legajoB) {
        return legajoA - legajoB;
      }
      return a.legajo.localeCompare(b.legajo);
    });

  // Paginación - solo si hay 25+ registros
  const showPagination = shouldShowPagination(filteredEmpleados.length);
  const pagination = usePagination({
    data: filteredEmpleados,
    initialItemsPerPage: 25
  });

  // Usar datos paginados si hay 25+ registros, sino mostrar todos
  const displayEmpleados = applyPaginationRule(filteredEmpleados, pagination);

  const getEmpresaBadgeColor = (empresa: string) => {
    const colors: Record<string, string> = {
      'LIMPAR': 'bg-blue-100 text-blue-800',
      'LIME': 'bg-green-100 text-green-800',
      'Sin empresa': 'bg-gray-100 text-gray-800'
    };
    return colors[empresa] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando empleados...</p>
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
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-blue-600">{empleados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados Manuales</p>
                <p className="text-2xl font-bold text-green-600">
                  {empleados.filter(emp => emp.isManual).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recibos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {empleados.reduce((sum, emp) => sum + emp.recibosCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Percent className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Descuentos</p>
                <p className="text-2xl font-bold text-purple-600">
                  {empleados.reduce((sum, emp) => sum + emp.descuentosCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Empleados
          </CardTitle>
          <CardDescription>
            Administra los empleados del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por legajo o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={empresaFiltroEmpleados} onValueChange={setEmpresaFiltroEmpleados}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las empresas</SelectItem>
                  {empresasFromReceipts.map(empresa => (
                    <SelectItem key={empresa} value={empresa}>
                      {empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <EmpleadosColumnSelector
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
              />

              {canManage && (
                <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Empleado
                </Button>
              )}
            </div>
          </div>

          {/* Tabla de empleados */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {visibleColumns.includes('legajo') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Legajo
                    </th>
                  )}
                  {visibleColumns.includes('nombre') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                  )}
                  {visibleColumns.includes('empresa') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                  )}
                  {visibleColumns.includes('recibosCount') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recibos
                    </th>
                  )}
                  {visibleColumns.includes('descuentosCount') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descuentos
                    </th>
                  )}
                  {visibleColumns.includes('periodo') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Período
                    </th>
                  )}
                  {visibleColumns.includes('tipo') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayEmpleados.map((empleado) => (
                  <tr key={empleado.legajo} className="hover:bg-gray-50">
                    {visibleColumns.includes('legajo') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{empleado.legajo}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes('nombre') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{empleado.nombre}</div>
                      </td>
                    )}
                    {visibleColumns.includes('empresa') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getEmpresaBadgeColor(empleado.empresa)}>
                          {empleado.empresa}
                        </Badge>
                      </td>
                    )}
                    {visibleColumns.includes('recibosCount') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Receipt className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {empleado.recibosCount}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes('descuentosCount') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Percent className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {empleado.descuentosCount}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes('periodo') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {empleado.periodo}
                      </td>
                    )}
                    {visibleColumns.includes('tipo') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {empleado.isManual ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            Manual
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            Automático
                          </Badge>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFicha(empleado.legajo)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditEmpleado(empleado)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEmpleado(empleado)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {showPagination && (
            <div className="pt-4">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                onPreviousPage={pagination.previousPage}
                onNextPage={pagination.nextPage}
                hasPreviousPage={pagination.hasPreviousPage}
                hasNextPage={pagination.hasNextPage}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                startItem={pagination.startItem}
                endItem={pagination.endItem}
              />
            </div>
          )}

          {displayEmpleados.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay empleados</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || empresaFiltroEmpleados !== 'TODOS' 
                  ? 'No se encontraron empleados con los filtros aplicados.'
                  : 'Comienza agregando un empleado.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      {showModal && (
        <EmpleadoModal
          empleado={selectedEmpleado}
          nuevaEmpresaCreada={nuevaEmpresaCreada}
          onClose={() => {
            setShowModal(false);
            setSelectedEmpleado(null);
            setNuevaEmpresaCreada(null);
          }}
          onSave={() => {
            setShowModal(false);
            setSelectedEmpleado(null);
            setNuevaEmpresaCreada(null);
            loadEmpleados();
          }}
          onOpenFicha={(legajo, empresa) => {
            setShowModal(false);
            setSelectedEmpleado(null);
            setSelectedLegajo(legajo);
            setFichaFromEdit(true);
            setShowFichaModal(true);
          }}
          onOpenNuevaEmpresa={() => {
            setShowEmpresaModal(true);
          }}
          onEmpresaCreated={(nombreEmpresa) => {
            // Recargar la lista de empresas cuando se crea una nueva
            loadEmpresas();
            // Guardar la empresa creada para seleccionarla automáticamente
            setNuevaEmpresaCreada(nombreEmpresa);
          }}
        />
      )}

      {showFichaModal && (
        <FichaEmpleadoModal
          legajo={selectedLegajo}
          empresa={empresaFiltroEmpleados !== 'TODOS' ? empresaFiltroEmpleados : undefined}
          onClose={() => {
            setShowFichaModal(false);
            setSelectedLegajo('');
            setFichaFromEdit(false);
          }}
          onBack={() => {
            setShowFichaModal(false);
            setSelectedLegajo('');
            setFichaFromEdit(false);
            setShowModal(true);
            setSelectedEmpleado(empleados.find(emp => emp.legajo === selectedLegajo) || null);
          }}
          isFromEdit={fichaFromEdit}
        />
      )}

      {showConfirmModal && empleadoToDelete && (
        <ConfirmModal
          open={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setEmpleadoToDelete(null);
          }}
          onConfirm={confirmDeleteEmpleado}
          title="Eliminar Empleado"
          description={`¿Estás seguro de que quieres eliminar el empleado ${empleadoToDelete.nombre} (${empleadoToDelete.legajo})?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />
      )}

      {showEmpresaModal && (
        <EmpresaModal
          open={true}
          onClose={() => {
            setShowEmpresaModal(false);
          }}
          onSave={() => {
            setShowEmpresaModal(false);
            // Recargar empresas disponibles
            loadEmpresas();
          }}
          onEmpresaCreated={(nombreEmpresa) => {
            // Recargar la lista de empresas cuando se crea una nueva
            loadEmpresas();
          }}
        />
      )}
    </div>
  );
}

export { EmpleadosPanel };
