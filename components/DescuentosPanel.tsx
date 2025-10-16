// components/DescuentosPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  DollarSign,
  Calendar,
  User
} from 'lucide-react';
import { 
  getDescuentosByEmpresa, 
  getDescuentosActivos,
  getEstadisticasDescuentos,
  deleteDescuento,
  Descuento
} from '@/lib/descuentos-manager';
import { canManageDescuentos } from '@/lib/user-management';
import DescuentoModal from './DescuentoModal';
import FichaEmpleadoModal from './FichaEmpleadoModal';

interface DescuentosPanelProps {
  empresaFiltro: string;
}

export default function DescuentosPanel({ empresaFiltro }: DescuentosPanelProps) {
  const { data: session } = useSession();
  const [descuentos, setDescuentos] = useState<Descuento[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [showModal, setShowModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [selectedDescuento, setSelectedDescuento] = useState<Descuento | null>(null);
  const [selectedLegajo, setSelectedLegajo] = useState<string>('');

  const canManage = session?.user ? canManageDescuentos(session.user) : false;

  useEffect(() => {
    loadDescuentos();
  }, [empresaFiltro]);

  const loadDescuentos = async () => {
    setIsLoading(true);
    try {
      const empresa = empresaFiltro === 'Todas' ? undefined : empresaFiltro;
      const descuentosData = empresa ? await getDescuentosByEmpresa(empresa) : await getDescuentosActivos();
      setDescuentos(descuentosData);
      
      const stats = await getEstadisticasDescuentos(empresa);
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

  const handleDeleteDescuento = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este descuento?')) {
      try {
        await deleteDescuento(id, session?.user?.id || '');
        await loadDescuentos();
      } catch (error) {
        console.error('Error eliminando descuento:', error);
      }
    }
  };

  const handleViewFicha = (legajo: string) => {
    setSelectedLegajo(legajo);
    setShowFichaModal(true);
  };

  const filteredDescuentos = descuentos.filter(descuento => {
    const matchesSearch = descuento.legajo.includes(searchTerm) || 
                         descuento.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFiltro === 'TODOS' || descuento.tipoDescuento === tipoFiltro;
    const matchesEstado = estadoFiltro === 'TODOS' || descuento.estado === estadoFiltro;
    
    return matchesSearch && matchesTipo && matchesEstado;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${estadisticas.montoActivos.toLocaleString()}
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
                  <p className="text-sm font-medium text-gray-600">Descuentos Activos</p>
                  <p className="text-2xl font-bold text-blue-600">{estadisticas.activos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Finalizados</p>
                  <p className="text-2xl font-bold text-orange-600">{estadisticas.finalizados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-purple-600">{estadisticas.total}</p>
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
                Nuevo Descuento
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
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-[140px]">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="TODOS">Todos</option>
                <option value="PRESTAMO">Préstamo</option>
                <option value="ADELANTO">Adelanto</option>
                <option value="DESCUENTO_VARIO">Descuento Varios</option>
                <option value="JUDICIAL">Judicial</option>
              </select>
            </div>
            
            <div className="w-[140px]">
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activo</option>
                <option value="SUSPENDIDO">Suspendido</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuotas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDescuentos.map((descuento) => (
                  <tr key={descuento.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getTipoBadgeColor(descuento.tipoDescuento)}>
                        {descuento.tipoDescuento.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${descuento.monto.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {descuento.cuotaActual}/{descuento.cantidadCuotas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getEstadoBadgeColor(descuento.estado)}>
                        {descuento.estado}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(descuento.fechaInicio).toLocaleDateString()}
                    </td>
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
                              onClick={() => handleDeleteDescuento(descuento.id)}
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
    </div>
  );
}