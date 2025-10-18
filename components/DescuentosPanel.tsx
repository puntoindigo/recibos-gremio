// components/DescuentosPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useEmpresasFromReceipts } from '@/hooks/useEmpresasFromReceipts';
import TagsFilter from './TagsFilter';
import ExportDescuentos from './ExportDescuentos';
import DescuentosColumnSelector from './DescuentosColumnSelector';
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
  Wallet,
  Calendar,
  User,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDescuentosByEmpresa, 
  getDescuentosActivos,
  getEstadisticasDescuentos,
  deleteDescuento,
  Descuento
} from '@/lib/descuentos-manager';
import { formatTimestampForDisplay } from '@/lib/date-utils';
import { canManageDescuentos } from '@/lib/user-management';
import DescuentoModal from './DescuentoModal';
import FichaEmpleadoModal from './FichaEmpleadoModal';
import ConfirmModal from './ConfirmModal';

interface DescuentosPanelProps {
  empresaFiltro: string;
  employees: any[]; // ConsolidatedEntity[]
}

export default function DescuentosPanel({ empresaFiltro, employees }: DescuentosPanelProps) {
  const { data: session } = useSession();
  const { empresas: empresasFromReceipts, isLoading: empresasLoading } = useEmpresasFromReceipts();
  const [descuentos, setDescuentos] = useState<Descuento[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagsFiltro, setTagsFiltro] = useState<string[]>([]);
  const [lastUsedTag, setLastUsedTag] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [empresaFiltroDescuentos, setEmpresaFiltroDescuentos] = useState<string>('TODOS');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['legajo', 'nombre', 'tags', 'monto', 'cuotas', 'fecha']);
  const [showModal, setShowModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDescuento, setSelectedDescuento] = useState<Descuento | null>(null);
  const [selectedLegajo, setSelectedLegajo] = useState<string>('');
  const [descuentoToDelete, setDescuentoToDelete] = useState<Descuento | null>(null);

  const canManage = session?.user ? canManageDescuentos(session.user) : false;
  
  // Debug: verificar permisos
  useEffect(() => {
    if (session?.user) {
      console.log("🔍 Debug DescuentosPanel - Usuario:", {
        email: session.user.email,
        role: session.user.role,
        permissions: session.user.permissions,
        canManage
      });
    }
  }, [session, canManage]);

  useEffect(() => {
    loadDescuentos();
  }, [empresaFiltroDescuentos]);

  // Escuchar evento personalizado para abrir modal de nuevo descuento
  useEffect(() => {
    const handleOpenNewDescuento = () => {
      console.log('🎯 Evento openNewDescuento recibido, abriendo modal...');
      setShowModal(true);
    };

    console.log('👂 Agregando listener para openNewDescuento');
    window.addEventListener('openNewDescuento', handleOpenNewDescuento);
    
    return () => {
      console.log('🧹 Removiendo listener para openNewDescuento');
      window.removeEventListener('openNewDescuento', handleOpenNewDescuento);
    };
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Solo activar si no estamos escribiendo en un input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // N para Nuevo Descuento
      if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey) {
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

  const loadDescuentos = async () => {
    setIsLoading(true);
    try {
      // Cargar descuentos de la base de datos
      const descuentosData = empresaFiltroDescuentos && empresaFiltroDescuentos !== 'TODOS' 
        ? await getDescuentosByEmpresa(empresaFiltroDescuentos)
        : await getDescuentosActivos();
      
      setDescuentos(descuentosData);
      
      // Cargar estadísticas
      const stats = await getEstadisticasDescuentos(empresaFiltroDescuentos && empresaFiltroDescuentos !== 'TODOS' ? empresaFiltroDescuentos : undefined);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error cargando descuentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDescuento = () => {
    setSelectedDescuento(null);
    setShowModal(true);
  };

  const handleEditDescuento = (descuento: Descuento) => {
    setSelectedDescuento(descuento);
    setShowModal(true);
  };

  const handleDeleteDescuento = (descuento: Descuento) => {
    setDescuentoToDelete(descuento);
    setShowConfirmModal(true);
  };

  const confirmDeleteDescuento = async () => {
    if (!descuentoToDelete) return;
    
    try {
      await deleteDescuento(descuentoToDelete.id, session?.user?.id || '');
      setDescuentos(prev => prev.filter(d => d.id !== descuentoToDelete.id));
      toast.success('Descuento eliminado correctamente');
      // Recargar estadísticas
      const stats = await getEstadisticasDescuentos(empresaFiltro && empresaFiltro !== 'Todas' ? empresaFiltro : undefined);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error eliminando descuento:', error);
      toast.error('Error al eliminar el descuento');
    }
  };

  const handleViewFicha = (legajo: string) => {
    setSelectedLegajo(legajo);
    setShowFichaModal(true);
  };

  const filteredDescuentos = descuentos
    .filter(descuento => {
      const matchesSearch = descuento.legajo.includes(searchTerm) || 
                           descuento.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = estadoFiltro === 'TODOS' || descuento.estado === estadoFiltro;
      
      // Filtro por tags: si hay tags seleccionados, el descuento debe tener al menos uno de ellos
      const matchesTags = tagsFiltro.length === 0 || 
        (descuento.tags && descuento.tags.some(tag => 
          tagsFiltro.some(selectedTag => 
            tag.toLowerCase().includes(selectedTag.toLowerCase())
          )
        ));
      
      return matchesSearch && matchesEstado && matchesTags;
    })
    .sort((a, b) => {
      // Ordenar por fecha de creación descendente (más recientes primero)
      return (b.fechaCreacion || 0) - (a.fechaCreacion || 0);
    });

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'SUSPENDIDO': return 'bg-yellow-100 text-yellow-800';
      case 'FINALIZADO': return 'bg-blue-100 text-blue-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'PRESTAMO': return 'bg-purple-100 text-purple-800';
      case 'ADELANTO': return 'bg-orange-100 text-orange-800';
      case 'DESCUENTO_VARIO': return 'bg-gray-100 text-gray-800';
      case 'JUDICIAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando descuentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Descuentos</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(estadisticas?.montoTotal || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Cantidad</p>
                  <p className="text-2xl font-bold text-blue-600">{estadisticas.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Empleados</p>
                  <p className="text-2xl font-bold text-orange-600">{estadisticas.empleadosUnicos || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Descuentos</CardTitle>
              <CardDescription>
                Gestiona los descuentos de empleados
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={handleCreateDescuento}>
                <Plus className="h-4 w-4 mr-2" />
                <span>Nuevo Descuento</span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">
                  N
                </kbd>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Legajo o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Tags</label>
              <TagsFilter
                selectedTags={tagsFiltro}
                onTagsChange={setTagsFiltro}
                allDescuentos={descuentos}
                disabled={isLoading}
              />
            </div>
            
            <div className="w-[140px]">
              <label className="text-xs font-medium text-muted-foreground">Empresas</label>
              <select
                value={empresaFiltroDescuentos}
                onChange={(e) => setEmpresaFiltroDescuentos(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                disabled={empresasLoading}
              >
                <option value="TODOS">Todas</option>
                {empresasFromReceipts.map((empresa) => (
                  <option key={empresa} value={empresa}>
                    {empresa}
                  </option>
                ))}
              </select>
            </div>
            
            <DescuentosColumnSelector
              visibleColumns={visibleColumns}
              onColumnsChange={setVisibleColumns}
            />
            <ExportDescuentos
              descuentos={filteredDescuentos}
              empresaFiltro={empresaFiltroDescuentos}
              tagsFiltro={tagsFiltro}
              visibleColumns={visibleColumns}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de descuentos */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {visibleColumns.includes('legajo') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empleado
                    </th>
                  )}
                  {visibleColumns.includes('empresa') && empresaFiltroDescuentos === 'TODOS' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                  )}
                  {visibleColumns.includes('tags') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                  )}
                  {visibleColumns.includes('monto') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                  )}
                  {visibleColumns.includes('cuotas') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cuotas
                    </th>
                  )}
                  {visibleColumns.includes('fecha') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                  )}
                  {visibleColumns.includes('estado') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  )}
                  {visibleColumns.includes('tipo') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                  )}
                  {visibleColumns.includes('descripcion') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                  )}
                  {visibleColumns.includes('motivo') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                  )}
                  {visibleColumns.includes('observaciones') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Observaciones
                    </th>
                  )}
                  {visibleColumns.includes('autorizadoPor') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Autorizado Por
                    </th>
                  )}
                  {visibleColumns.includes('fechaAutorizacion') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Autorización
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDescuentos.map((descuento) => (
                  <tr key={descuento.id} className="hover:bg-gray-50">
                    {visibleColumns.includes('legajo') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {descuento.legajo}
                          </div>
                          <div className="text-sm text-gray-500">
                            {descuento.nombre}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes('empresa') && empresaFiltroDescuentos === 'TODOS' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {descuento.empresa || 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('tags') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {descuento.tags && descuento.tags.length > 0 ? (
                            descuento.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">Sin tags</span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes('monto') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${(descuento.monto || 0).toLocaleString()}
                      </td>
                    )}
                    {visibleColumns.includes('cuotas') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {descuento.cantidadCuotas}
                      </td>
                    )}
                    {visibleColumns.includes('fecha') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {descuento.fechaInicio ? formatTimestampForDisplay(descuento.fechaInicio) : 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('estado') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getEstadoBadgeColor(descuento.estado || 'ACTIVO')}>
                          {descuento.estado || 'ACTIVO'}
                        </Badge>
                      </td>
                    )}
                    {visibleColumns.includes('tipo') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getTipoBadgeColor(descuento.tipoDescuento || 'PRESTAMO')}>
                          {descuento.tipoDescuento || 'PRESTAMO'}
                        </Badge>
                      </td>
                    )}
                    {visibleColumns.includes('descripcion') && (
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {descuento.descripcion || 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('motivo') && (
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {descuento.motivo || 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('observaciones') && (
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {descuento.observaciones || 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('autorizadoPor') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {descuento.autorizadoPor || 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('fechaAutorizacion') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {descuento.fechaAutorizacion ? formatTimestampForDisplay(descuento.fechaAutorizacion) : 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewFicha(descuento.legajo)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDescuento(descuento)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDescuento(descuento)}
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
        </CardContent>
      </Card>

      {/* Modales */}
      {showModal && (
        <DescuentoModal
          descuento={selectedDescuento}
          onClose={() => {
            setShowModal(false);
            setSelectedDescuento(null);
          }}
          onSave={() => {
            setShowModal(false);
            setSelectedDescuento(null);
            loadDescuentos();
          }}
          employees={employees}
          allDescuentos={descuentos}
          onEmployeeCreated={(newEmployee) => {
            // Agregar el nuevo empleado a la lista local
            employees.push(newEmployee);
            // Recargar la lista de empleados si es necesario
            console.log('Nuevo empleado creado:', newEmployee);
          }}
        />
      )}

      {showFichaModal && (
        <FichaEmpleadoModal
          legajo={selectedLegajo}
          empresa={empresaFiltro}
          onClose={() => {
            setShowFichaModal(false);
            setSelectedLegajo('');
          }}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          open={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setDescuentoToDelete(null);
          }}
          onConfirm={confirmDeleteDescuento}
          title="Eliminar Descuento"
          description={`¿Estás seguro de que quieres eliminar el descuento de ${descuentoToDelete?.nombre} por $${descuentoToDelete?.monto?.toLocaleString()}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />
      )}
    </div>
  );
}

export { DescuentosPanel };