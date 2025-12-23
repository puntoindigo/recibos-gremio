// components/SupabaseBackupPanel.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Trash2,
  FileText
} from 'lucide-react';
import { LoadingButton, LoadingCard, LoadingOverlay } from '@/components/LoadingIndicator';
import { getSupabaseBackupManager } from '@/lib/supabase-backup';
import { useSupabaseConnection } from '@/hooks/useSupabaseData';

interface BackupFile {
  name: string;
  size: number;
  created: string;
  data?: any;
}

export default function SupabaseBackupPanel() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'restore' | 'delete' | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  
  const backupManager = getSupabaseBackupManager();
  const { isConnected, error: connectionError, testConnection } = useSupabaseConnection();
  
  // Cargar backups existentes
  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Obtener backups del localStorage (simulado)
      const storedBackups = localStorage.getItem('supabase_backups');
      const backupList: BackupFile[] = storedBackups ? JSON.parse(storedBackups) : [];
      
      setBackups(backupList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando backups');
    } finally {
      setLoading(false);
    }
  };
  
  // Crear backup
  const createBackup = async () => {
    if (!isConnected) {
      setError('No hay conexión con Supabase');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      setProgress(25);
      const result = await backupManager.createBackup();
      
      if (!result.success) {
        throw new Error(result.error || 'Error creando backup');
      }
      
      setProgress(50);
      
      // Guardar backup en localStorage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `backup_supabase_${timestamp}.json`;
      const backupFile: BackupFile = {
        name: filename,
        size: JSON.stringify(result.data).length,
        created: new Date().toISOString(),
        data: result.data
      };
      
      setProgress(75);
      
      const existingBackups = localStorage.getItem('supabase_backups');
      const backupList: BackupFile[] = existingBackups ? JSON.parse(existingBackups) : [];
      backupList.unshift(backupFile);
      
      // Mantener solo los últimos 10 backups
      const limitedBackups = backupList.slice(0, 10);
      localStorage.setItem('supabase_backups', JSON.stringify(limitedBackups));
      
      setProgress(100);
      setSuccess(`Backup creado exitosamente: ${result.data?.metadata.totalRecords || 0} registros`);
      
      // Recargar lista de backups
      await loadBackups();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando backup');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };
  
  // Descargar backup
  const downloadBackup = async (backup: BackupFile) => {
    try {
      const blob = new Blob([JSON.stringify(backup.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess(`Backup ${backup.name} descargado exitosamente`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error descargando backup');
    }
  };
  
  // Restaurar backup
  const restoreBackup = async (backup: BackupFile) => {
    if (!isConnected) {
      setError('No hay conexión con Supabase');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      setProgress(25);
      
      if (!backup.data) {
        throw new Error('Datos de backup no disponibles');
      }
      
      setProgress(50);
      const result = await backupManager.restoreFromBackup(backup.data);
      
      if (!result.success) {
        throw new Error(result.error || 'Error restaurando backup');
      }
      
      setProgress(100);
      setSuccess(`Backup restaurado exitosamente: ${Object.values(result.stats || {}).reduce((a, b) => a + b, 0)} registros`);
      
      // Recargar página después de un delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error restaurando backup');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };
  
  // Eliminar backup
  const deleteBackup = async (backupName: string) => {
    try {
      const existingBackups = localStorage.getItem('supabase_backups');
      const backupList: BackupFile[] = existingBackups ? JSON.parse(existingBackups) : [];
      const filteredBackups = backupList.filter(b => b.name !== backupName);
      
      localStorage.setItem('supabase_backups', JSON.stringify(filteredBackups));
      
      setSuccess(`Backup ${backupName} eliminado exitosamente`);
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando backup');
    }
  };
  
  // Subir backup
  const uploadBackup = async (file: File) => {
    if (!isConnected) {
      setError('No hay conexión con Supabase');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      setProgress(25);
      const result = await backupManager.uploadBackup(file);
      
      if (!result.success) {
        throw new Error(result.error || 'Error subiendo backup');
      }
      
      setProgress(100);
      setSuccess(`Backup subido y restaurado exitosamente: ${Object.values(result.stats || {}).reduce((a, b) => a + b, 0)} registros`);
      
      // Recargar página después de un delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo backup');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };
  
  // Manejar archivo seleccionado
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadBackup(file);
    }
  };
  
  // Confirmar acción
  const confirmAction = async () => {
    if (!confirmAction || !selectedBackup) return;
    
    const backup = backups.find(b => b.name === selectedBackup);
    if (!backup) return;
    
    if (confirmAction === 'restore') {
      await restoreBackup(backup);
    } else if (confirmAction === 'delete') {
      await deleteBackup(backup.name);
    }
    
    setShowConfirmModal(false);
    setConfirmAction(null);
    setSelectedBackup(null);
  };
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Formatear tamaño
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  useEffect(() => {
    loadBackups();
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Respaldo de Base de Datos</h2>
          <p className="text-gray-600">Gestión de backups de Supabase</p>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-4 w-4 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-4 w-4 mr-1" />
              Desconectado
            </Badge>
          )}
        </div>
      </div>
      
      {/* Estado de conexión */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error de conexión: {connectionError}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={testConnection}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Mensajes de estado */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Progreso */}
      {progress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}
      
      {/* Acciones principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LoadingButton
          loading={loading}
          onClick={createBackup}
          disabled={!isConnected}
          className="w-full"
        >
          <Database className="h-4 w-4 mr-2" />
          Crear Backup
        </LoadingButton>
        
        <Button
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={!isConnected || loading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir Backup
        </Button>
        
        <Button
          variant="outline"
          onClick={loadBackups}
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
      
      {/* Input oculto para subir archivos */}
      <input
        id="file-upload"
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Lista de backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Backups Existentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingCard loading={loading} error={error}>
            {backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay backups disponibles
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div
                    key={backup.name}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{backup.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(backup.created)} • {formatSize(backup.size)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBackup(backup)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBackup(backup.name);
                          setConfirmAction('restore');
                          setShowConfirmModal(true);
                        }}
                        disabled={!isConnected}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBackup(backup.name);
                          setConfirmAction('delete');
                          setShowConfirmModal(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </LoadingCard>
        </CardContent>
      </Card>
      
      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {confirmAction === 'restore' ? (
                  <>
                    <RefreshCw className="h-5 w-5 text-green-600" />
                    Restaurar Base de Datos
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5 text-red-600" />
                    Eliminar Backup
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                {confirmAction === 'restore' 
                  ? `¿Estás seguro de que quieres restaurar la base de datos desde ${selectedBackup}? Esto reemplazará todos los datos actuales y no se puede deshacer.`
                  : `¿Estás seguro de que quieres eliminar el backup ${selectedBackup}? Esta acción no se puede deshacer.`
                }
              </p>
              
              {confirmAction === 'restore' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Advertencia: Esta operación reemplazará completamente todos los datos actuales de la base de datos. 
                    Asegúrate de tener un backup reciente antes de continuar.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmAction(null);
                    setSelectedBackup(null);
                  }}
                >
                  Cancelar
                </Button>
                
                <LoadingButton
                  loading={loading}
                  onClick={confirmAction}
                  variant={confirmAction === 'restore' ? 'default' : 'destructive'}
                >
                  {confirmAction === 'restore' ? 'Restaurar' : 'Eliminar'}
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Overlay de carga */}
      <LoadingOverlay loading={loading} message="Procesando backup..." />
    </div>
  );
}
