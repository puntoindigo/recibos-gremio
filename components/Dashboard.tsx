'use client';

import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, FileText, CreditCard, Building2, TrendingUp, Calendar, Plus, ChevronDown, ChevronRight, Clock, LogIn, LogOut } from 'lucide-react';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { useConfiguration } from '@/contexts/ConfigurationContext';
import { useSession } from 'next-auth/react';
import { getEstadisticasDescuentos } from '@/lib/descuentos-manager';
import type { ConsolidatedEntity } from '@/lib/repo';
import UploadManagerModal from './UploadManagerModal';
import EmpleadoModal from './EmpleadoModal';
import LoadingSpinner, { SectionSpinner } from './LoadingSpinner';
import { useEmpresasLoading } from '@/hooks/useSupabaseLoading';

interface DashboardStats {
  totalEmployees: number;
  totalReceipts: number;
  totalDiscounts: number;
  totalDiscountAmount: number;
  employeesWithDiscounts: number;
  employeesByCompany: Array<{
    company: string;
    count: number;
    percentage: number;
  }>;
  receiptsByPeriod: Array<{
    period: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: 'receipt' | 'discount' | 'employee' | 'backup' | 'control' | 'user' | 'pending-item';
    description: string;
    timestamp: number;
    icon?: string;
  }>;
}

export interface DashboardRef {
  refresh: () => void;
}

interface DashboardProps {
  onNavigateToTab?: (tab: string) => void;
  onResumeSession?: (sessionId: string) => void;
  onOpenNewDescuento?: () => void;
  onOpenNewEmployee?: () => void;
  onOpenNewEmpresa?: () => void;
  onFilterByPeriod?: (period: string) => void;
  onFilterByCompany?: (company: string) => void;
}

const Dashboard = forwardRef<DashboardRef, DashboardProps>(({ onNavigateToTab, onResumeSession, onOpenNewDescuento, onOpenNewEmployee, onOpenNewEmpresa, onFilterByPeriod, onFilterByCompany }, ref) => {
  const { dataManager } = useCentralizedDataManager();
  const { config } = useConfiguration();
  const { isLoading: isLoadingEmpresas, loadEmpresas } = useEmpresasLoading();
  const { data: session } = useSession();
  
  // Función para verificar permisos
  const canAccess = (permission: string) => {
    if (!session?.user?.permissions) return false;
    return session.user.permissions.includes(permission) || session.user.permissions.includes('*');
  };
  
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalReceipts: 0,
    totalDiscounts: 0,
    totalDiscountAmount: 0,
    employeesWithDiscounts: 0,
    employeesByCompany: [],
    receiptsByPeriod: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadManager, setShowUploadManager] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState<boolean>(false);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [employeesByCategory, setEmployeesByCategory] = useState<Record<string, Array<{
    categoria: string;
    count: number;
  }>>>({});
  const [registros, setRegistros] = useState<any[]>([]);
  
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Obtener todos los datos consolidados
      const allConsolidated = await dataManager.getConsolidated();
      
      // Logs de debug removidos
      
      // Calcular estadísticas básicas
      const totalEmployees = allConsolidated.length;
      
      // Contar recibos reales (no empleados manuales)
      const totalReceipts = allConsolidated.filter(item => item.data?.MANUAL !== 'true').length;
      
      // Logs de debug removidos
      
      // Obtener estadísticas de descuentos desde la base de datos
      const descuentosStats = await getEstadisticasDescuentos(dataManager);
      const totalDiscounts = descuentosStats.total;
      const totalDiscountAmount = descuentosStats.montoTotal;
      const employeesWithDiscounts = descuentosStats.empleadosUnicos;

      // Empleados por empresa
      const companyCounts: Record<string, number> = {};
      allConsolidated.forEach(item => {
        const company = item.data?.EMPRESA || 'Sin empresa';
        companyCounts[company] = (companyCounts[company] || 0) + 1;
      });

      // Si no hay empleados pero hay empresas en la base, mostrar las empresas
      if (totalEmployees === 0) {
        try {
          const empresas = await dataManager.getEmpresas();
          empresas.forEach(empresa => {
            // Manejar tanto strings como objetos con propiedad nombre
            const nombreEmpresa = typeof empresa === 'string' ? empresa : (empresa?.nombre || empresa);
            if (nombreEmpresa && nombreEmpresa !== 'undefined' && nombreEmpresa.trim() !== '') {
              companyCounts[nombreEmpresa] = 0; // 0 empleados pero empresa existe
            }
          });
        } catch (error) {
          console.error('Error obteniendo empresas para dashboard:', error);
        }
      }

      const employeesByCompany = Object.entries(companyCounts)
        .filter(([company]) => {
          // Filtrar valores inválidos pero mantener "Sin nombre" si hay registros con esa empresa
          if (!company || company === 'undefined' || company.trim() === '') return false;
          // Si es "Sin nombre", solo incluirlo si hay registros con esa empresa (count > 0)
          if (company === 'Sin nombre' || company.trim() === 'Sin nombre') {
            return companyCounts[company] > 0;
          }
          return true;
        })
        .map(([company, count]) => ({
          company: company.trim(),
          count,
          percentage: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);
      
      // Logs de debug removidos

      // Recibos por período - contar empleados reales, no archivos
      const periodCounts: Record<string, number> = {};
      
      allConsolidated.forEach((item) => {
        // No contar empleados manuales como recibos
        if (item.data?.MANUAL === 'true') {
          return;
        }
        
        // El período está en item.periodo, no en item.data.PERIODO
        const period = item.periodo;
        
        // Solo considerar como "Sin período" si realmente no hay período o es "NO DETECTADO" o "FALTANTE"
        const periodLabel = (!period || period === 'NO DETECTADO' || period === 'FALTANTE') 
          ? 'Sin período' 
          : period;
        
        // Contar por empleado, no por archivos
        periodCounts[periodLabel] = (periodCounts[periodLabel] || 0) + 1;
      });

      const receiptsByPeriod = Object.entries(periodCounts)
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 períodos

      // Actividad reciente (últimos 10 registros)
      const recentActivity = allConsolidated
        .slice(0, 10)
        .map(item => ({
          type: 'receipt' as const,
          description: `${item.nombre || 'Sin nombre'} - ${item.data?.EMPRESA || 'Sin empresa'}`,
          timestamp: Date.now()
        }));

      setStats({
        totalEmployees,
        totalReceipts,
        totalDiscounts,
        totalDiscountAmount,
        employeesWithDiscounts,
        employeesByCompany,
        receiptsByPeriod,
        recentActivity
      });

      // Cargar registros de entrada/salida
      try {
        const registrosData = await dataManager.getAllRegistros();
        setRegistros(registrosData || []);
      } catch (registrosError: any) {
        console.error('❌ Error cargando registros en dashboard:', {
          error: registrosError,
          code: registrosError?.code,
          message: registrosError?.message,
          details: registrosError?.details,
          hint: registrosError?.hint,
          fullError: JSON.stringify(registrosError, null, 2)
        });
        // No romper el dashboard si falla cargar registros
        setRegistros([]);
      }
    } catch (error: any) {
      console.error('❌ Error cargando datos del dashboard:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        fullError: JSON.stringify(error, null, 2)
      });
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [dataManager, config.enableSupabaseStorage]);

  // Función para obtener empleados por categoría de una empresa
  const loadEmployeesByCategory = useCallback(async (company: string) => {
    try {
      const allConsolidated = await dataManager.getConsolidated();
      const empresaEmployees = allConsolidated.filter(item => item.data?.EMPRESA === company);
      
      // Buscar campos que puedan ser categorías
      const categoryFields = ['CATEGORIA', 'PUESTO', 'CLASIFICACION', 'CARGO', 'FUNCION', 'CATEGORÍA'];
      let categoryField: string | null = null;
      
      // Detectar qué campo de categoría se usa (si existe)
      for (const field of categoryFields) {
        const hasField = empresaEmployees.some(emp => emp.data?.[field]);
        if (hasField) {
          categoryField = field;
          break;
        }
      }
      
      // Agrupar por categoría
      const categoryCounts: Record<string, number> = {};
      empresaEmployees.forEach(emp => {
        const categoria = categoryField 
          ? (emp.data?.[categoryField] || 'Sin categoría')
          : 'Sin categoría';
        categoryCounts[categoria] = (categoryCounts[categoria] || 0) + 1;
      });
      
      // Convertir a array y ordenar
      const categories = Object.entries(categoryCounts)
        .map(([categoria, count]) => ({ categoria, count }))
        .sort((a, b) => b.count - a.count);
      
      setEmployeesByCategory(prev => ({
        ...prev,
        [company]: categories
      }));
    } catch (error) {
      console.error('Error cargando empleados por categoría:', error);
    }
  }, [dataManager]);

  // Debug: monitorear cambios en showCreateEmployee
  useEffect(() => {
    if (showCreateEmployee) {
      console.log('🚨 showCreateEmployee se activó - Modal de empleado se abrirá');
    }
  }, [showCreateEmployee]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // Depende de loadDashboardData memoizada

  // Exponer función de refresh para el componente padre
  useImperativeHandle(ref, () => ({
    refresh: loadDashboardData
  }), [loadDashboardData]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Tablero</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tablero</h1>
        <Badge variant="outline" className="text-sm">
          <Calendar className="h-4 w-4 mr-1" />
          {new Date().toLocaleDateString('es-AR')}
        </Badge>
      </div>


      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
        {canAccess('empleados') && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigateToTab?.('empleados')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Empleados registrados
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('👤 BOTÓN + DE EMPLEADOS - Abriendo modal de crear empleado...');
                  setShowCreateEmployee(true);
                }}
              >
                <Plus className="h-3 w-3 text-blue-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {canAccess('recibos') && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigateToTab?.('recibos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recibos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.totalReceipts}</div>
            <p className="text-xs text-muted-foreground">
              Recibos procesados
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-green-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToTab?.('recibos');
                }}
              >
                <Plus className="h-3 w-3 text-green-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {canAccess('descuentos') && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigateToTab?.('descuentos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total Descuentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 break-words">${(stats.totalDiscountAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDiscounts || 0} descuentos cargados
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-purple-100"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('💳 BOTÓN + DE DESCUENTOS - CLICK DETECTADO');
                  console.log('💳 onOpenNewDescuento existe:', !!onOpenNewDescuento);
                  console.log('💳 Llamando onOpenNewDescuento...');
                  onOpenNewDescuento?.();
                  console.log('💳 onOpenNewDescuento llamado');
                }}
              >
                <Plus className="h-3 w-3 text-purple-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {canAccess('descuentos') && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigateToTab?.('descuentos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados con Descuentos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">{stats.employeesWithDiscounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Empleados con descuentos activos
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-orange-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToTab?.('descuentos');
                }}
              >
                <TrendingUp className="h-3 w-3 text-orange-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {canAccess('empresas') && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigateToTab?.('empresas')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.employeesByCompany.length}</div>
            <p className="text-xs text-muted-foreground">
              Empresas diferentes
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-orange-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToTab?.('empresas');
                }}
              >
                <Plus className="h-3 w-3 text-orange-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Items Pendientes - Card destacada */}
        <Card 
          className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab?.('pending-items')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Items Pendientes</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                Nuevo
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToTab?.('pending-items');
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-700">10</div>
            <p className="text-xs text-emerald-600 mb-3">
              Tareas pendientes de desarrollo
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-emerald-600 border-emerald-300 hover:bg-emerald-100"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToTab?.('pending-items');
              }}
            >
              Gestionar Items
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {/* Empleados por empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empleados por Empresa
            </CardTitle>
            <CardDescription>
              Distribución de empleados por empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.employeesByCompany.slice(0, 8).map((item, index) => {
                const isExpanded = expandedCompany === item.company;
                const categories = employeesByCategory[item.company] || [];
                
                return (
                  <div key={item.company} className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isExpanded) {
                          setExpandedCompany(null);
                        } else {
                          setExpandedCompany(item.company);
                          if (!employeesByCategory[item.company]) {
                            await loadEmployeesByCategory(item.company);
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {item.company}
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToTab?.('recibos');
                        onFilterByCompany?.(item.company);
                      }}>
                        <span className="text-sm text-muted-foreground">
                          {item.percentage}%
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {item.count}
                        </Badge>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 border-t bg-gray-50/50">
                        {categories.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {categories.map((cat, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                  <span className="text-muted-foreground">
                                    {cat.categoria}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {cat.count}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2 text-center">
                            Cargando categorías...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {stats.employeesByCompany.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay datos disponibles
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recibos por período */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recibos por Período
            </CardTitle>
            <CardDescription>
              Top períodos con más recibos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.receiptsByPeriod.slice(0, 8).map((item, index) => (
                <div 
                  key={item.period} 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  onClick={() => {
                    onNavigateToTab?.('recibos');
                    onFilterByPeriod?.(item.period);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">
                      {item.period}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs cursor-pointer">
                    {item.count} recibos
                  </Badge>
                </div>
              ))}
              {stats.receiptsByPeriod.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay datos disponibles
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registros de Entrada/Salida */}
        {(canAccess('accesos') || canAccess('registro')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registros
            </CardTitle>
            <CardDescription>
              Últimos registros de entrada/salida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {registros.slice(0, 20).map((registro) => (
                <div
                  key={registro.id}
                  className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                    registro.accion === 'entrada' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {registro.accion === 'entrada' ? (
                      <LogIn className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <LogOut className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{registro.nombre}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {registro.legajo}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                        <span className="truncate">{registro.empresa}</span>
                        <span>•</span>
                        <span className="flex-shrink-0">
                          {new Date(registro.fecha_hora).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge className={`ml-2 flex-shrink-0 ${
                      registro.accion === 'entrada' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {registro.accion === 'entrada' ? 'ENTRADA' : 'SALIDA'}
                    </Badge>
                  </div>
                </div>
              ))}
              {registros.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay registros disponibles
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Actividad reciente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>
            Últimos empleados registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay actividad reciente
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Gestión de Subidas */}
      <UploadManagerModal
        isOpen={showUploadManager}
        onClose={() => setShowUploadManager(false)}
        onResumeSession={onResumeSession}
      />

      {/* Modal de Registrar Empleado */}
      {showCreateEmployee && (
        <EmpleadoModal
          empleado={undefined}
          onClose={() => setShowCreateEmployee(false)}
          onSave={() => {
            console.log('✅ Empleado registrado');
            loadDashboardData(); // Refrescar datos
          }}
        />
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
