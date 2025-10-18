'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, FileText, CreditCard, Building2, TrendingUp, Calendar, Plus, Shield, Download, Database, Upload } from 'lucide-react';
import { db } from '@/lib/db';
import type { ConsolidatedEntity } from '@/lib/repo';
import UploadManagerModal from './UploadManagerModal';

interface DashboardStats {
  totalEmployees: number;
  totalReceipts: number;
  totalDiscounts: number;
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
    employeesByCompany: [],
    receiptsByPeriod: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [showUploadManager, setShowUploadManager] = useState(false);

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
      
      // Contar descuentos (asumiendo que hay un campo DESCUENTOS)
      const totalDiscounts = allConsolidated.filter(item => 
        item.data?.DESCUENTOS && 
        item.data.DESCUENTOS !== 'NO DETECTADO' && 
        item.data.DESCUENTOS !== '0' &&
        parseFloat(item.data.DESCUENTOS.replace(/[^\d.-]/g, '')) > 0
      ).length;

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
      allConsolidated.forEach(item => {
        const period = item.data?.PERIODO;
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

      {/* Acceso rápido a ABMs */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Acceso Rápido</h2>
          <Badge variant="secondary" className="text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Nuevos Registros
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => onNavigateToTab?.('recibos')}
          >
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium">Nuevo Recibo</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col items-center space-y-2 hover:bg-green-50 hover:border-green-300"
            onClick={() => onNavigateToTab?.('control')}
          >
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium">Nuevo Control</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col items-center space-y-2 hover:bg-purple-50 hover:border-purple-300"
            onClick={() => onNavigateToTab?.('descuentos')}
          >
            <CreditCard className="h-5 w-5 text-purple-600" />
            <span className="text-xs font-medium">Nuevo Descuento</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col items-center space-y-2 hover:bg-orange-50 hover:border-orange-300"
            onClick={() => onNavigateToTab?.('usuarios')}
          >
            <Users className="h-5 w-5 text-orange-600" />
            <span className="text-xs font-medium">Nuevo Usuario</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col items-center space-y-2 hover:bg-cyan-50 hover:border-cyan-300"
            onClick={() => onNavigateToTab?.('export')}
          >
            <Download className="h-5 w-5 text-cyan-600" />
            <span className="text-xs font-medium">Exportar Datos</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col items-center space-y-2 hover:bg-red-50 hover:border-red-300"
            onClick={() => onNavigateToTab?.('backup')}
          >
            <Database className="h-5 w-5 text-red-600" />
            <span className="text-xs font-medium">Backup</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col items-center space-y-2 hover:bg-indigo-50 hover:border-indigo-300"
            onClick={() => setShowUploadManager(true)}
          >
            <Upload className="h-5 w-5 text-indigo-600" />
            <span className="text-xs font-medium">Gestión Subidas</span>
          </Button>
        </div>
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
                  onNavigateToTab?.('usuarios');
                  onOpenNewEmployee?.();
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
            <CardTitle className="text-sm font-medium">Con Descuentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDiscounts}</div>
            <p className="text-xs text-muted-foreground">
              Empleados con descuentos
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
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
