// components/BackupMetricsTooltip.tsx
import { Database, FileText, Users, Settings, Activity, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BackupMetricsTooltipProps {
  data: any;
  filename: string;
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

export function BackupMetricsTooltip({ data, filename }: BackupMetricsTooltipProps) {
  if (!data) return null;

  // Calcular estadísticas desde los datos del backup
  const stats: DatabaseStats = {
    receipts: data.receipts?.length || 0,
    consolidated: data.consolidated?.length || 0,
    descuentos: data.descuentos?.length || 0,
    columnConfigs: data.columnConfigs?.length || 0,
    userActivities: data.userActivities?.length || 0,
    savedControls: data.savedControls?.length || 0,
    control: data.control?.length || 0,
    total: 0
  };
  
  stats.total = stats.receipts + stats.consolidated + stats.descuentos + 
               stats.columnConfigs + stats.userActivities + 
               stats.savedControls + stats.control;

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
        return 'Datos consolidados por empleado';
      case 'descuentos':
        return 'Descuentos de empleados';
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

  const tables = [
    { key: 'receipts', count: stats.receipts },
    { key: 'consolidated', count: stats.consolidated },
    { key: 'descuentos', count: stats.descuentos },
    { key: 'columnConfigs', count: stats.columnConfigs },
    { key: 'userActivities', count: stats.userActivities },
    { key: 'savedControls', count: stats.savedControls },
    { key: 'control', count: stats.control }
  ];

  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      <div className="space-y-3">
        {/* Header */}
        <div className="border-b pb-2">
          <h4 className="font-semibold text-sm text-gray-900">Backup: {filename}</h4>
          <p className="text-xs text-gray-600">Métricas de datos contenidos</p>
        </div>

        {/* Resumen total */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Total de Registros</p>
              <p className="text-xs text-blue-700">En todos los bloques de datos</p>
            </div>
            <Badge className="bg-blue-600 text-white">
              {stats.total.toLocaleString()}
            </Badge>
          </div>
        </div>

        {/* Lista de tablas */}
        <div className="space-y-2">
          {tables.map((table) => (
            <div key={table.key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {getTableIcon(table.key)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {getTableName(table.key)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {getTableDescription(table.key)}
                  </p>
                </div>
              </div>
              <Badge variant={table.count > 0 ? "default" : "secondary"}>
                {table.count.toLocaleString()}
              </Badge>
            </div>
          ))}
        </div>

        {/* Información adicional */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h5 className="font-medium text-sm text-gray-900 mb-1">Información del Sistema</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• Los datos se almacenan localmente en IndexedDB</p>
            <p>• Los backups incluyen todos los registros mostrados arriba</p>
            <p>• La restauración reemplaza completamente los datos actuales</p>
          </div>
        </div>
      </div>
    </div>
  );
}





