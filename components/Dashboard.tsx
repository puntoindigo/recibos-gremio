'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, FileText, CreditCard, Building2, TrendingUp, Calendar, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { getEstadisticasDescuentos } from '@/lib/descuentos-manager';
import type { ConsolidatedEntity } from '@/lib/repo';
import UploadManagerModal from './UploadManagerModal';
import CreateEmployeeModal from './CreateEmployeeModal';

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
    type: 'receipt' | 'discount' | 'employee';
    description: string;
    timestamp: number;
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
}

const Dashboard = forwardRef<DashboardRef, DashboardProps>(({ onNavigateToTab, onResumeSession, onOpenNewDescuento, onOpenNewEmployee, onOpenNewEmpresa }, ref) => {
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
  const [showUploadManager, setShowUploadManager] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Exponer función de refresh para el componente padre
  useImperativeHandle(ref, () => ({
    refresh: loadDashboardData
  }), []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los datos consolidados
      const allConsolidated = await db.consolidated.toArray();
      
      // Calcular estadísticas básicas
      const totalEmployees = allConsolidated.length;
      const totalReceipts = allConsolidated.reduce((sum, item) => sum + (item.archivos?.length || 0), 0);
      
      // Obtener estadísticas de descuentos desde la base de datos
      const descuentosStats = await getEstadisticasDescuentos();
      const totalDiscounts = descuentosStats.total;
      const totalDiscountAmount = descuentosStats.montoTotal;
      const employeesWithDiscounts = descuentosStats.empleadosUnicos;

      // Empleados por empresa
      const companyCounts: Record<string, number> = {};
      allConsolidated.forEach(item => {
        const company = item.data?.EMPRESA || 'Sin empresa';
        companyCounts[company] = (companyCounts[company] || 0) + 1;
      });

      const employeesByCompany = Object.entries(companyCounts)
        .map(([company, count]) => ({
          company,
          count,
          percentage: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Recibos por período - contar por archivos individuales, no por empleados consolidados
      const periodCounts: Record<string, number> = {};
      
      allConsolidated.forEach((item) => {
        // El período está en item.periodo, no en item.data.PERIODO
        const period = item.periodo;
        
        // Solo considerar como "Sin período" si realmente no hay período o es "NO DETECTADO" o "FALTANTE"
        const periodLabel = (!period || period === 'NO DETECTADO' || period === 'FALTANTE') 
          ? 'Sin período' 
          : period;
        
        // Contar por cantidad de archivos, no por empleado
        const fileCount = item.archivos?.length || 1;
        periodCounts[periodLabel] = (periodCounts[periodLabel] || 0) + fileCount;
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
          description: `${item.data?.NOMBRE || 'Sin nombre'} - ${item.data?.EMPRESA || 'Sin empresa'}`,
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
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Empleados registrados
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                onClick={() => {
                  console.log('👤 Abriendo modal de crear empleado...');
                  setShowCreateEmployee(true);
                }}
              >
                <Plus className="h-3 w-3 text-blue-600" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recibos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceipts}</div>
            <p className="text-xs text-muted-foreground">
              Recibos procesados
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-green-100"
                onClick={() => onNavigateToTab?.('recibos')}
              >
                <Plus className="h-3 w-3 text-green-600" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total Descuentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(stats.totalDiscountAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDiscounts || 0} descuentos cargados
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-purple-100"
                onClick={() => {
                  onNavigateToTab?.('descuentos');
                  onOpenNewDescuento?.();
                }}
              >
                <Plus className="h-3 w-3 text-purple-600" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados con Descuentos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.employeesWithDiscounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Empleados con descuentos activos
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-orange-100"
                onClick={() => onNavigateToTab?.('descuentos')}
              >
                <TrendingUp className="h-3 w-3 text-orange-600" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employeesByCompany.length}</div>
            <p className="text-xs text-muted-foreground">
              Empresas diferentes
            </p>
            <div className="mt-3 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-orange-100"
                onClick={() => {
                  onNavigateToTab?.('usuarios');
                  onOpenNewEmpresa?.();
                }}
              >
                <Plus className="h-3 w-3 text-orange-600" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items Pendientes - Card destacada */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 hover:shadow-lg transition-shadow">
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
                onClick={() => onNavigateToTab?.('pending-items')}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">10</div>
            <p className="text-xs text-emerald-600 mb-3">
              Tareas pendientes de desarrollo
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-emerald-600 border-emerald-300 hover:bg-emerald-100"
              onClick={() => onNavigateToTab?.('pending-items')}
            >
              Gestionar Items
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="space-y-4">
              {stats.employeesByCompany.slice(0, 8).map((item, index) => (
                <div key={item.company} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {item.company}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.percentage}%
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                  </div>
                </div>
              ))}
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
                <div key={item.period} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">
                      {item.period}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
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
      <CreateEmployeeModal
        isOpen={showCreateEmployee}
        onClose={() => setShowCreateEmployee(false)}
        onEmployeeRegistered={(employee) => {
          console.log('✅ Empleado registrado:', employee);
          loadDashboardData(); // Refrescar datos
        }}
      />
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
