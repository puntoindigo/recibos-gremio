// components/BackupPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Database, 
  Clock, 
  HardDrive, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  RotateCcw,
  Settings,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// import { exportDatabaseBackupClient, downloadBackupFile, formatFileSize, restoreDatabaseFromBackup, clearAllDatabases } from '@/lib/backup-client'; // ELIMINADO
import { ConfirmBackupModal } from './ConfirmBackupModal';
import { ClearDatabaseModal } from './ClearDatabaseModal';
import { BackupDetailsModal } from './BackupDetailsModal';
import { BackupMetricsTooltip } from './BackupMetricsTooltip';
import { BackupMetricsButton } from './BackupMetricsButton';
import { buildAggregatedCsv } from '@/lib/export-aggregated';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { NotificationSystem, useNotifications } from './NotificationSystem';

interface BackupInfo {
  name: string;
  size: number;
  created: string;
}

export default function BackupPanel() {
  const { dataManager } = useCentralizedDataManager();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Sistema de notificaciones
  const { notifications, removeNotification, notifySuccess, notifyError, notifyInfo } = useNotifications();
  
  // Estados para exportación
  const [consolidatedData, setConsolidatedData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Estado para datos de backups (para tooltips)
  const [backupDataCache, setBackupDataCache] = useState<Record<string, any>>({});
  
  // Estado para el modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'delete' | 'restore';
    filename: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    action: 'delete',
    filename: '',
    isLoading: false
  });

  // Estado para el modal de vaciar bases de datos
  const [clearModal, setClearModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false
  });

  // Estado para el modal de detalles de backup
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    filename: string;
    data: any;
  }>({
    isOpen: false,
    filename: '',
    data: null
  });

  // Cargar lista de backups
  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBackups(data.backups);
      } else {
        setMessage({ type: 'error', text: 'Error cargando backups: ' + data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al cargar backups' });
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nuevo backup
  const createBackup = async () => {
    setIsCreating(true);
    setMessage(null);
    notifyInfo('Creando Backup', 'Preparando datos para el backup...', { persistent: true });
    
    try {
      // Exportar datos desde el cliente
      const result = await exportDatabaseBackupClient();
      
      if (result.success && result.data) {
        // Crear nombre de archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `backup_${timestamp}.json`;
        
        // Enviar datos al servidor para guardar
        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'create',
            data: result.data,
            filename: filename
          })
        });
        
        const serverResult = await response.json();
        
        if (serverResult.success) {
          notifySuccess(
            'Backup Completado', 
            `Backup creado exitosamente: ${filename}`,
            { duration: 8000 }
          );
          setMessage({ type: 'success', text: `Backup guardado exitosamente: ${filename}` });
          // Recargar lista de backups
          await loadBackups();
        } else {
          notifyError(
            'Error al Guardar Backup',
            `No se pudo guardar el backup: ${serverResult.error}`,
            { persistent: true }
          );
          setMessage({ type: 'error', text: 'Error guardando backup: ' + serverResult.error });
        }
      } else {
        notifyError(
          'Error al Crear Backup',
          `No se pudieron exportar los datos: ${result.error || 'Error desconocido'}`,
          { persistent: true }
        );
        setMessage({ type: 'error', text: 'Error creando backup: ' + (result.error || 'Error desconocido') });
      }
    } catch (error) {
      notifyError(
        'Error de Conexión',
        'No se pudo conectar con el servidor para crear el backup',
        { persistent: true }
      );
      setMessage({ type: 'error', text: 'Error de conexión al crear backup' });
    } finally {
      setIsCreating(false);
    }
  };

  // Abrir modal de confirmación para eliminar
  const openDeleteModal = (filename: string) => {
    setConfirmModal({
      isOpen: true,
      action: 'delete',
      filename,
      isLoading: false
    });
  };

  // Abrir modal de confirmación para restaurar
  const openRestoreModal = (filename: string) => {
    setConfirmModal({
      isOpen: true,
      action: 'restore',
      filename,
      isLoading: false
    });
  };

  // Cerrar modal de confirmación
  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Abrir modal de vaciar bases de datos
  const openClearModal = () => {
    setClearModal({
      isOpen: true,
      isLoading: false
    });
  };

  // Cerrar modal de vaciar bases de datos
  const closeClearModal = () => {
    setClearModal({
      isOpen: false,
      isLoading: false
    });
  };

  // Funciones para modal de detalles
  const openDetailsModal = async (filename: string) => {
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'restore', 
          filename: filename 
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setDetailsModal({
          isOpen: true,
          filename: filename,
          data: data.data
        });
      } else {
        setMessage({ type: 'error', text: 'Error cargando detalles del backup: ' + data.error });
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
      setMessage({ type: 'error', text: 'Error cargando detalles del backup' });
    }
  };

  const closeDetailsModal = () => {
    setDetailsModal({
      isOpen: false,
      filename: '',
      data: null
    });
  };

  // Función para cargar datos de backup (para tooltip)
  const loadBackupData = async (filename: string) => {
    // Si ya tenemos los datos en caché, no los cargamos de nuevo
    if (backupDataCache[filename]) {
      return backupDataCache[filename];
    }

    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'restore', 
          filename: filename 
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Guardar en caché
        setBackupDataCache(prev => ({
          ...prev,
          [filename]: data.data
        }));
        return data.data;
      }
    } catch (error) {
      console.error('Error cargando datos del backup:', error);
    }
    
    return null;
  };

  // Ejecutar vaciado de bases de datos
  const executeClearDatabases = async () => {
    setClearModal(prev => ({ ...prev, isLoading: true }));
    notifyInfo('Vaciando Bases de Datos', 'Eliminando todos los datos del sistema...', { persistent: true });
    
    try {
      const result = await clearAllDatabases();
      
      if (result.success) {
        notifySuccess(
          'Bases de Datos Vacías',
          'Todas las bases de datos han sido vaciadas exitosamente. Redirigiendo al tablero...',
          { duration: 3000 }
        );
        setMessage({ type: 'success', text: 'Todas las bases de datos han sido vaciadas exitosamente. Recarga la página para ver los cambios.' });
        
        // Cerrar modal primero
        closeClearModal();
        
        // Redirigir al tablero después de un breve delay
        setTimeout(() => {
          // Cambiar a la pestaña del tablero
          const tableroButton = document.querySelector('[data-tab="tablero"]') as HTMLButtonElement;
          if (tableroButton) {
            tableroButton.click();
          }
          // Recargar la página para mostrar el tablero vacío
          window.location.reload();
        }, 1500);
      } else {
        notifyError(
          'Error al Vaciar Bases de Datos',
          `No se pudieron vaciar las bases de datos: ${result.error}`,
          { persistent: true }
        );
        setMessage({ type: 'error', text: 'Error vaciando bases de datos: ' + result.error });
        setClearModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      notifyError(
        'Error de Conexión',
        'No se pudo conectar con la base de datos para vaciar los datos',
        { persistent: true }
      );
      setMessage({ type: 'error', text: 'Error de conexión al vaciar bases de datos' });
      setClearModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Funciones de exportación
  const loadConsolidatedData = async () => {
    try {
      const data = await dataManager.getConsolidated();
      setConsolidatedData(data);
    } catch (error) {
      console.error('Error cargando datos consolidados:', error);
      setMessage({ type: 'error', text: 'Error cargando datos para exportación' });
    }
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      await loadConsolidatedData();
      
      if (consolidatedData.length === 0) {
        setMessage({ type: 'error', text: 'No hay datos para exportar' });
        return;
      }

      const csv = buildAggregatedCsv(consolidatedData, ['LEGAJO', 'NOMBRE', 'PERIODO', 'EMPRESA']);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Archivo CSV exportado exitosamente' });
    } catch (error) {
      console.error('Error exportando CSV:', error);
      setMessage({ type: 'error', text: 'Error exportando CSV: ' + (error instanceof Error ? error.message : 'Error desconocido') });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      await loadConsolidatedData();
      
      if (consolidatedData.length === 0) {
        setMessage({ type: 'error', text: 'No hay datos para exportar' });
        return;
      }

      const json = JSON.stringify(consolidatedData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibos_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Archivo JSON exportado exitosamente' });
    } catch (error) {
      console.error('Error exportando JSON:', error);
      setMessage({ type: 'error', text: 'Error exportando JSON: ' + (error instanceof Error ? error.message : 'Error desconocido') });
    } finally {
      setIsExporting(false);
    }
  };

  // Ejecutar acción confirmada
  const executeConfirmedAction = async () => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      if (confirmModal.action === 'delete') {
        // Eliminar backup
        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'delete', 
            filename: confirmModal.filename 
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setMessage({ type: 'success', text: 'Backup eliminado exitosamente' });
          await loadBackups();
          closeConfirmModal();
        } else {
          setMessage({ type: 'error', text: 'Error eliminando backup: ' + data.error });
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        // Restaurar backup
        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'restore', 
            filename: confirmModal.filename 
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
          // Restaurar en el cliente usando los datos recibidos
          const restoreResult = await restoreDatabaseFromBackup(data.data);
          
          if (restoreResult.success) {
            setMessage({ type: 'success', text: 'Base de datos restaurada exitosamente. Recarga la página para ver los cambios.' });
            // Recargar la página después de un breve delay
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            closeConfirmModal();
          } else {
            setMessage({ type: 'error', text: 'Error restaurando base de datos: ' + restoreResult.error });
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setMessage({ type: 'error', text: 'Error leyendo backup: ' + data.error });
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Error de conexión al ${confirmModal.action === 'delete' ? 'eliminar' : 'restaurar'} backup` 
      });
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Cargar backups al montar el componente
  useEffect(() => {
    loadBackups();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Respaldo de Base de Datos
          </CardTitle>
          <CardDescription>
            Crea respaldos completos de todos los datos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mensajes de estado */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'error' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Botón para crear backup */}
          <div className="flex gap-2">
            <Button 
              onClick={createBackup} 
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isCreating ? 'Creando Backup...' : 'Crear Backup'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={loadBackups}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={openClearModal}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Vaciar Bases de Datos
            </Button>
            
            <Button 
              variant="outline" 
              disabled
              className="flex items-center gap-2 opacity-50"
              title="Funcionalidad pendiente - Envío por mail"
            >
              <Database className="h-4 w-4" />
              Enviar por Mail (Próximamente)
            </Button>
          </div>

          {/* Lista de backups existentes */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Backups Existentes</h3>
            
            {isLoading ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Cargando backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay backups disponibles</p>
                <p className="text-sm">Crea tu primer backup para comenzar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup, index) => (
                  <div 
                    key={backup.name}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-blue-600" />
                        <span className="font-mono text-sm">{backup.name}</span>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Más reciente
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(backup.created)}
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {backup.size ? `${(backup.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <BackupMetricsButton
                          filename={backup.name}
                          onLoadData={loadBackupData}
                          cachedData={backupDataCache[backup.name]}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRestoreModal(backup.name)}
                          className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Restaurar desde este backup"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteModal(backup.name)}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar backup"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Información sobre los Backups</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Los backups se guardan en la carpeta <code className="bg-blue-100 px-1 rounded">backups/</code> del proyecto</li>
              <li>• Cada backup incluye todos los recibos, datos consolidados, descuentos, configuraciones de columnas, actividades de usuario, items pendientes y configuración de la aplicación</li>
              <li>• Los archivos se organizan por timestamp para facilitar la identificación</li>
              <li>• Se recomienda crear backups regulares para proteger los datos</li>
              <li>• Los items pendientes y configuraciones se restauran automáticamente al cargar un backup</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Exportación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar Datos
          </CardTitle>
          <CardDescription>
            Exportar datos actuales en diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={exportToCSV}
              disabled={isExporting || consolidatedData.length === 0}
              className="w-full"
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button
              variant="outline"
              onClick={exportToJSON}
              disabled={isExporting || consolidatedData.length === 0}
              className="w-full"
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              {isExporting ? 'Exportando...' : 'Exportar JSON'}
            </Button>
          </div>
          
          {/* Información sobre exportación */}
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Información sobre la Exportación</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Los archivos se descargan automáticamente en tu navegador</li>
              <li>• CSV: Formato compatible con Excel y hojas de cálculo</li>
              <li>• JSON: Formato estructurado para análisis de datos</li>
              <li>• Los datos exportados corresponden al estado actual de la base de datos</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      <ConfirmBackupModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={executeConfirmedAction}
        action={confirmModal.action}
        filename={confirmModal.filename}
        isLoading={confirmModal.isLoading}
      />

      {/* Modal de vaciar bases de datos */}
      <ClearDatabaseModal
        isOpen={clearModal.isOpen}
        onClose={closeClearModal}
        onConfirm={executeClearDatabases}
        isLoading={clearModal.isLoading}
      />

      {/* Modal de detalles de backup */}
      <BackupDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={closeDetailsModal}
        filename={detailsModal.filename}
        data={detailsModal.data}
      />

      {/* Sistema de notificaciones */}
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}
