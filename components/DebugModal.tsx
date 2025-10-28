// components/DebugModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Trash2, 
  Database, 
  FileText, 
  Shield, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RotateCcw,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { useUploadResume } from '@/hooks/useUploadResume';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo: {
    totalRows: number;
    consolidatedCount: number;
    controlCount: number;
    savedControlsCount: number;
    settingsCount: number;
  };
  onDeleteVisible: () => void;
  onDeleteControl: () => void;
  onClearAllData?: () => void;
  onCheckDatabase?: () => void;
  onCheckPendingUploads?: () => void;
  onCheckAllSessions?: () => void;
  onClearUploadSessions?: () => void;
  onResumeSession?: (sessionId: string) => void; // Nueva prop para manejar reanudación
  activeTab: string;
  periodoFiltro: string;
  empresaFiltro: string;
  nombreFiltro: string;
  hasControlForCurrentFilters: boolean;
  processingFiles: any;
  lastProcessedIndex: number;
}

export default function DebugModal({
  isOpen,
  onClose,
  debugInfo,
  onDeleteVisible,
  onDeleteControl,
  onClearAllData,
  onCheckDatabase,
  onCheckPendingUploads,
  onCheckAllSessions,
  onClearUploadSessions,
  onResumeSession,
  activeTab,
  periodoFiltro,
  empresaFiltro,
  nombreFiltro,
  hasControlForCurrentFilters,
  processingFiles,
  lastProcessedIndex
}: DebugModalProps) {
  const { dataManager } = useCentralizedDataManager();
  const [isResizing, setIsResizing] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 800, height: 600 });
  const [uploadSessions, setUploadSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const { resumeUpload, isResuming } = useUploadResume();

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = Math.max(400, Math.min(1200, e.clientX - 100));
    const newHeight = Math.max(300, Math.min(800, e.clientY - 100));
    
    setModalSize({ width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Cargar sesiones de subida cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log("🔍 Modal de debug abierto, cargando sesiones...");
      loadUploadSessions();
    }
  }, [isOpen]);

  // Cargar sesiones automáticamente cada 5 segundos cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const autoRefreshInterval = setInterval(() => {
      console.log("🔄 Auto-actualizando sesiones cada 5 segundos...");
      loadUploadSessions();
    }, 5000);

    return () => {
      clearInterval(autoRefreshInterval);
      console.log("🧹 Auto-actualización de sesiones detenida");
    };
  }, [isOpen]);

  const handleDeleteVisible = async () => {
    try {
      // Obtener información de los registros visibles antes de eliminar
      const consolidatedCount = await dataManager.countConsolidated();
      const receiptsCount = await dataManager.countReceipts();
      
      if (consolidatedCount === 0 && receiptsCount === 0) {
        toast.info('No hay registros para eliminar');
        return;
      }
      
      const confirmed = window.confirm(
        `¿Estás seguro de que quieres eliminar todos los recibos visibles?\n\n` +
        `Esta acción eliminará:\n` +
        `- ${consolidatedCount} recibos procesados\n` +
        `- ${receiptsCount} archivos de recibos\n` +
        `- Todos los archivos PDF asociados\n\n` +
        `Esta acción no se puede deshacer.`
      );
      
      if (confirmed) {
        await onDeleteVisible();
        toast.success(`✅ Eliminados ${consolidatedCount + receiptsCount} registros correctamente`);
      }
    } catch (error) {
      toast.error('Error eliminando registros');
      console.error('Error eliminando registros:', error);
    }
  };

  const handleDeleteControl = async () => {
    try {
      // Obtener información del control actual
      const controlsCount = await dataManager.countSavedControls();
      
      if (controlsCount === 0) {
        toast.info('No hay controles para eliminar');
        return;
      }
      
      const confirmed = window.confirm(
        `¿Estás seguro de que quieres eliminar el control actual?\n\n` +
        `Esta acción eliminará:\n` +
        `- ${controlsCount} controles guardados\n` +
        `- Datos de resumen asociados\n` +
        `- Historial de controles\n\n` +
        `Esta acción no se puede deshacer.`
      );
      
      if (confirmed) {
        await onDeleteControl();
        toast.success(`✅ Control eliminado correctamente`);
      }
    } catch (error) {
      toast.error('Error eliminando control');
      console.error('Error eliminando control:', error);
    }
  };

  const handleClearAllData = async () => {
    try {
      await onClearAllData?.();
    } catch (error) {
      toast.error('Error limpiando base de datos');
    }
  };

  const handleCheckDatabase = async () => {
    try {
      await onCheckDatabase?.();
    } catch (error) {
      toast.error('Error verificando base de datos');
    }
  };

  const handleCheckPendingUploads = async () => {
    try {
      await onCheckPendingUploads?.();
    } catch (error) {
      toast.error('Error verificando subidas pendientes');
    }
  };

  const handleCheckAllSessions = async () => {
    try {
      await onCheckAllSessions?.();
    } catch (error) {
      toast.error('Error verificando todas las sesiones');
    }
  };

  const loadUploadSessions = async () => {
    setLoadingSessions(true);
    try {
      // const { UploadSessionManager } = await import('@/lib/upload-session-manager'); // ELIMINADO
      // const sessions = await UploadSessionManager.getAllSessions(); // ELIMINADO
      const sessions = []; // TODO: Implementar con dataManager
      
      // Ordenar por fecha de inicio (más recientes primero)
      const sortedSessions = sessions.sort((a, b) => b.startedAt - a.startedAt);
      setUploadSessions(sortedSessions);
    } catch (error) {
      console.error('Error loading upload sessions:', error);
      toast.error('Error cargando sesiones de subida');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    try {
      console.log(`🔄 Reanudando sesión: ${sessionId}`);
      
      // Si hay una función de reanudación externa, usarla
      if (onResumeSession) {
        onResumeSession(sessionId);
        toast.success('Reanudando sesión... Cerrando modal para ver evolución');
        onClose(); // Cerrar el modal inmediatamente
        return;
      }
      
      // Fallback: usar el hook interno
      await resumeUpload(sessionId, {
        onComplete: (sessionId) => {
          console.log(`✅ Sesión completada: ${sessionId}`);
          toast.success('Sesión reanudada y completada exitosamente');
          loadUploadSessions(); // Actualizar la lista
        },
        onError: (sessionId, error) => {
          console.error(`❌ Error reanudando sesión ${sessionId}:`, error);
          toast.error(`Error reanudando sesión: ${error}`);
        }
      });
      toast.success('Iniciando reanudación de sesión...');
    } catch (error) {
      console.error('Error reanudando sesión:', error);
      toast.error('Error reanudando sesión');
    }
  };

  const diagnoseUploadIssue = async () => {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE SESIONES DE SUBIDA');
    console.log('==========================================');
    
    try {
      // 1. Obtener todas las sesiones
      const allSessions = await dataManager.getUploadSessions();
      console.log('📊 Total de sesiones en la base de datos:', allSessions.length);
      
      // 2. Analizar cada sesión
      allSessions.forEach((session, index) => {
        console.log(`\n📋 Sesión ${index + 1}:`);
        console.log(`   ID: ${session.sessionId}`);
        console.log(`   Usuario: ${session.userId}`);
        console.log(`   Estado: ${session.status}`);
        console.log(`   Total archivos: ${session.totalFiles}`);
        console.log(`   Completados: ${session.completedFiles || 0}`);
        console.log(`   Fallidos: ${session.failedFiles || 0}`);
        console.log(`   Omitidos: ${session.skippedFiles || 0}`);
        console.log(`   Pendientes: ${session.pendingFiles || 0}`);
        console.log(`   Iniciada: ${new Date(session.startedAt).toLocaleString()}`);
        if (session.errorMessage) {
          console.log(`   Error: ${session.errorMessage}`);
        }
        
        // Verificar si debería ser detectada como activa
        const shouldBeActive = session.status === 'active' || 
                               session.status === 'failed' || 
                               (session.pendingFiles && session.pendingFiles > 0);
        console.log(`   ¿Debería ser activa?: ${shouldBeActive ? '✅ SÍ' : '❌ NO'}`);
      });
      
      // 3. Simular la lógica de getActiveSessions
      // Obtener el userId actual (basado en los logs, es 'superadmin_initial')
      const currentUserId = 'superadmin_initial';
      const userSessions = allSessions.filter(s => s.userId === currentUserId);
      console.log(`\n👤 Sesiones del usuario ${currentUserId}:`, userSessions.length);
      
      const activeSessions = userSessions.filter(s => 
        s.status === 'active' || 
        s.status === 'failed' || 
        (s.pendingFiles && s.pendingFiles > 0)
      );
      console.log(`✅ Sesiones que deberían ser detectadas como activas:`, activeSessions.length);
      
      if (activeSessions.length === 0) {
        console.log('❌ PROBLEMA: No se detectan sesiones activas');
        console.log('🔍 Posibles causas:');
        console.log('   - Las sesiones no tienen archivos pendientes');
        console.log('   - Las sesiones están marcadas como "completed"');
        console.log('   - El userId no coincide');
      } else {
        console.log('✅ Se detectan sesiones activas correctamente');
      }
      
      toast.success(`Diagnóstico completado. Ver consola para detalles.`);
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      toast.error('Error en diagnóstico');
    }
  };

  const simulate594Case = async () => {
    console.log('🧪 SIMULANDO CASO DE LAS 594 SUBIDAS INTERRUMPIDAS');
    console.log('===============================================');
    
    try {
      // Crear archivos simulados para la sesión
      const mockFiles = [];
      for (let i = 1; i <= 594; i++) {
        const fileName = `J092025-${String(i).padStart(3, '0')}.pdf`;
        mockFiles.push({
          fileName,
          status: i <= 127 ? 'completed' : 'pending', // Primeros 127 completados, resto pendientes
          processedAt: i <= 127 ? Date.now() - (594 - i) * 1000 : undefined,
          result: i <= 127 ? {
            EMPRESA: 'LIME',
            PERIODO: '2025-01',
            LEGAJO: String(1000 + i),
            NOMBRE: `Empleado ${i}`
          } : undefined,
          error: undefined
        });
      }
      
      console.log('📁 Archivos creados:', mockFiles.length);
      console.log('📁 Archivos completados:', mockFiles.filter(f => f.status === 'completed').length);
      console.log('📁 Archivos pendientes:', mockFiles.filter(f => f.status === 'pending').length);
      
      // Crear una sesión simulada
      const mockSession = {
        sessionId: 'test-594-files-interrupted',
        userId: 'superadmin_initial',
        status: 'failed', // Marcada como fallida
        totalFiles: 594,
        completedFiles: 127, // Primeros 127 completados
        failedFiles: 0,
        skippedFiles: 0,
        pendingFiles: 467, // 594 - 127 = 467 pendientes
        currentFileIndex: 127,
        files: mockFiles, // Array de archivos reales
        startedAt: Date.now() - 300000, // 5 minutos atrás
        lastUpdatedAt: Date.now() - 60000, // 1 minuto atrás
        completedAt: undefined,
        errorMessage: 'Error 500 durante la subida masiva'
      };
      
      console.log('📋 Creando sesión simulada:');
      console.log(`   ID: ${mockSession.sessionId}`);
      console.log(`   Usuario: ${mockSession.userId}`);
      console.log(`   Estado: ${mockSession.status}`);
      console.log(`   Total archivos: ${mockSession.totalFiles}`);
      console.log(`   Completados: ${mockSession.completedFiles}`);
      console.log(`   Pendientes: ${mockSession.pendingFiles}`);
      console.log(`   Error: ${mockSession.errorMessage}`);
      
      // Insertar la sesión en la base de datos
      await dataManager.addUploadSession(mockSession);
      console.log('✅ Sesión simulada creada en la base de datos');
      
      // Recargar la lista de sesiones
      await loadUploadSessions();
      
      // Forzar verificación de subidas pendientes
      onCheckPendingUploads?.();
      
      toast.success('Caso 594 simulado. Verificando subidas pendientes...');
      
    } catch (error) {
      console.error('❌ Error creando sesión simulada:', error);
      toast.error('Error creando simulación');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none p-0"
        style={{ 
          width: `${modalSize.width}px`, 
          height: `${modalSize.height}px`,
          maxHeight: '90vh'
        }}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Panel de Debug
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Recibos</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{debugInfo.totalRows}</div>
                  <div className="text-xs text-blue-600">Total registros</div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Controles</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">{debugInfo.savedControlsCount}</div>
                  <div className="text-xs text-green-600">Guardados</div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Configuración</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">{debugInfo.settingsCount}</div>
                  <div className="text-xs text-purple-600">Elementos</div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Estado</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {processingFiles ? 'Procesando' : 'Listo'}
                  </div>
                  <div className="text-xs text-orange-600">Sistema</div>
                </div>
              </div>

              {/* Filtros Actuales */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  Filtros Actuales
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Pestaña Activa</label>
                    <Badge variant="outline" className="mt-1">{activeTab}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Período</label>
                    <Badge variant="outline" className="mt-1">{periodoFiltro || 'Todas'}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Empresa</label>
                    <Badge variant="outline" className="mt-1">{empresaFiltro || 'Todas'}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Búsqueda</label>
                    <Badge variant="outline" className="mt-1">{nombreFiltro || 'Vacía'}</Badge>
                  </div>
                </div>
              </div>

              {/* Estado de Procesamiento */}
              {processingFiles && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Procesamiento en Curso
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Archivos procesados:</span>
                      <span>{lastProcessedIndex + 1} de {processingFiles.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((lastProcessedIndex + 1) / processingFiles.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sesiones de Subida */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    Sesiones de Subida
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={simulate594Case}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Simular 594
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={diagnoseUploadIssue}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Diagnosticar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCheckPendingUploads}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verificar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadUploadSessions}
                      disabled={loadingSessions}
                    >
                      {loadingSessions ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Cargando...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Actualizar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Contar sesiones antes de eliminar
                        const sessionCount = await dataManager.countUploadSessions();
                        if (sessionCount === 0) {
                          toast.info('No hay sesiones de subida para eliminar');
                          return;
                        }
                        
                        const confirmed = window.confirm(
                          `¿Estás seguro de que quieres eliminar ${sessionCount} sesiones de subida?\n\n` +
                          `Esta acción eliminará:\n` +
                          `- ${sessionCount} sesiones de subida\n` +
                          `- Todos los datos de progreso asociados\n` +
                          `- Historial de subidas\n\n` +
                          `Esta acción no se puede deshacer.`
                        );
                        
                        if (confirmed) {
                          try {
                            await dataManager.clearUploadSessions();
                            console.log(`🧹 ${sessionCount} sesiones de subida eliminadas`);
                            toast.success(`✅ Eliminadas ${sessionCount} sesiones de subida`);
                            loadUploadSessions();
                            // Notificar al componente padre para recargar datos
                            onClearUploadSessions?.();
                          } catch (error) {
                            console.error('❌ Error eliminando sesiones:', error);
                          }
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                  </div>
                </div>
                
                {uploadSessions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No hay sesiones de subida registradas
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {uploadSessions.map((session, index) => (
                      <div key={session.id || index} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={session.status === 'active' ? 'default' : 
                                     session.status === 'completed' ? 'secondary' : 
                                     session.status === 'failed' ? 'destructive' : 'outline'}
                            >
                              {session.status === 'active' ? 'Activa' :
                               session.status === 'completed' ? 'Completada' :
                               session.status === 'failed' ? 'Fallida' :
                               session.status === 'cancelled' ? 'Cancelada' : session.status}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(session.startedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            {session.totalFiles} archivos
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-medium text-green-600">{session.completedFiles || 0}</div>
                            <div className="text-gray-500">Completados</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-600">{session.failedFiles || 0}</div>
                            <div className="text-gray-500">Fallidos</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-yellow-600">{session.skippedFiles || 0}</div>
                            <div className="text-gray-500">Omitidos</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-600">{session.pendingFiles || 0}</div>
                            <div className="text-gray-500">Pendientes</div>
                          </div>
                        </div>
                        
                        {session.errorMessage && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            <strong>Error:</strong> {session.errorMessage}
                          </div>
                        )}
                        
                        {/* Botón Reanudar para sesiones fallidas con archivos pendientes */}
                        {session.status === 'failed' && session.pendingFiles > 0 && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              onClick={() => handleResumeSession(session.sessionId)}
                              disabled={isResuming}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isResuming ? (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                                  Reanudando...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Reanudar
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-gray-500">
                          ID: {session.sessionId}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acciones de Debug */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  Acciones de Limpieza
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Button 
                    variant="outline" 
                    onClick={handleCheckDatabase}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Verificar Base de Datos
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCheckPendingUploads}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Verificar Subidas Pendientes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCheckAllSessions}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Verificar Todas las Sesiones
                  </Button>
        <Button 
          variant="destructive" 
          onClick={handleClearAllData}
          className="w-full bg-red-800 hover:bg-red-900"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar TODO
        </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteVisible}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Registros Visibles
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteControl}
                    disabled={!hasControlForCurrentFilters}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Control Actual
                  </Button>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Estas acciones son irreversibles. Úsalas con precaución.
                </p>
              </div>

              {/* Información Técnica */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Información Técnica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Consolidados:</strong> {debugInfo.consolidatedCount}
                  </div>
                  <div>
                    <strong>Controles:</strong> {debugInfo.controlCount}
                  </div>
                  <div>
                    <strong>Configuraciones:</strong> {debugInfo.settingsCount}
                  </div>
                  <div>
                    <strong>Control para filtros actuales:</strong> 
                    {hasControlForCurrentFilters ? (
                      <CheckCircle className="h-4 w-4 text-green-500 inline ml-1" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 inline ml-1" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Resize Handle */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400"
          onMouseDown={handleMouseDown}
        />
      </DialogContent>
    </Dialog>
  );
}
