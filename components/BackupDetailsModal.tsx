// components/BackupDetailsModal.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Database, FileText, Users, Settings, Activity, BarChart3, Loader2 } from 'lucide-react';
// import { db } from '@/lib/db'; // Removido - usar dataManager en su lugar

interface BackupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  data: any;
}

interface DatabaseStats {
  receipts: number;
  consolidated: number;
  descuentos: number;
  columnConfigs: number;
  userActivities: number;
  savedControls: number;
  control: number;
  total: number;
}

export function BackupDetailsModal({ isOpen, onClose, filename, data }: BackupDetailsModalProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);

  useEffect(() => {
    if (isOpen && data) {
      // Calcular estadísticas desde los datos del backup
      const backupStats: DatabaseStats = {
        receipts: data.receipts?.length || 0,
        consolidated: data.consolidated?.length || 0,
        descuentos: data.descuentos?.length || 0,
        columnConfigs: data.columnConfigs?.length || 0,
        userActivities: data.userActivities?.length || 0,
        savedControls: data.savedControls?.length || 0,
        control: data.control?.length || 0,
        total: 0
      };
      
      backupStats.total = backupStats.receipts + backupStats.consolidated + backupStats.descuentos + 
                         backupStats.columnConfigs + backupStats.userActivities + 
                         backupStats.savedControls + backupStats.control;
      
      setStats(backupStats);
    }
  }, [isOpen, data]);

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'receipts':
        return <FileText className="h-4 w-4" />;
      case 'consolidated':
        return <Database className="h-4 w-4" />;
      case 'descuentos':
        return <Users className="h-4 w-4" />;
      case 'columnConfigs':
        return <Settings className="h-4 w-4" />;
      case 'userActivities':
        return <Activity className="h-4 w-4" />;
      case 'savedControls':
        return <BarChart3 className="h-4 w-4" />;
      case 'control':
        return <Database className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getTableName = (tableName: string) => {
    switch (tableName) {
      case 'receipts':
        return 'Recibos';
      case 'consolidated':
        return 'Datos Consolidados';
      case 'descuentos':
        return 'Descuentos';
      case 'columnConfigs':
        return 'Configuraciones de Columnas';
      case 'userActivities':
        return 'Actividades de Usuario';
      case 'savedControls':
        return 'Controles Guardados';
      case 'control':
        return 'Datos de Control';
      default:
        return tableName;
    }
  };

  const getTableDescription = (tableName: string) => {
    switch (tableName) {
      case 'receipts':
        return 'Recibos de sueldo procesados';
      case 'consolidated':
        return 'Datos consolidados por empleado y período';
      case 'descuentos':
        return 'Descuentos aplicados a empleados';
      case 'columnConfigs':
        return 'Configuraciones de visibilidad y alias de columnas';
      case 'userActivities':
        return 'Registro de actividades del usuario';
      case 'savedControls':
        return 'Controles de recibos guardados';
      case 'control':
        return 'Datos de control oficiales';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Detalles del Backup: {filename}
          </DialogTitle>
          <DialogDescription>
            Información detallada sobre los registros contenidos en este backup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {stats ? (
            <>
              {/* Resumen total */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Total de Registros</h3>
                    <p className="text-sm text-blue-700">En todas las tablas de la base de datos</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {stats.total.toLocaleString()}
                  </Badge>
                </div>
              </div>

              {/* Detalle por tabla */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Registros por Tabla</h4>
                <div className="grid gap-3">
                  {Object.entries(stats)
                    .filter(([key]) => key !== 'total')
                    .map(([tableName, count]) => (
                      <div
                        key={tableName}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          {getTableIcon(tableName)}
                          <div>
                            <div className="font-medium text-gray-900">
                              {getTableName(tableName)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getTableDescription(tableName)}
                            </div>
                          </div>
                        </div>
                        <Badge variant={count > 0 ? "default" : "secondary"}>
                          {count.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Información del Sistema</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Los datos se almacenan localmente en IndexedDB</p>
                  <p>• Los backups incluyen todos los registros mostrados arriba</p>
                  <p>• La restauración reemplaza completamente los datos actuales</p>
                  <p>• Última actualización: {new Date().toLocaleString('es-ES')}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se pudieron cargar las estadísticas
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
