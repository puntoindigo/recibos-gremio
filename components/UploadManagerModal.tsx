'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  FileText,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { UploadSessionManager } from '@/lib/upload-session-manager';
import { useUploadResume } from '@/hooks/useUploadResume';
import type { UploadSessionDB } from '@/lib/db';

interface UploadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeSession?: (sessionId: string) => void;
}

export default function UploadManagerModal({ isOpen, onClose, onResumeSession }: UploadManagerModalProps) {
  const { data: session } = useSession();
  const [uploadSessions, setUploadSessions] = useState<UploadSessionDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { resumeUpload, isResuming } = useUploadResume();

  // Cargar sesiones de subida
  const loadUploadSessions = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const sessions = await UploadSessionManager.getActiveSessions(session.user.id);
      console.log('📊 Sesiones de subida cargadas:', sessions);
      setUploadSessions(sessions);
    } catch (error) {
      console.error('❌ Error cargando sesiones:', error);
      toast.error('Error cargando sesiones de subida');
    } finally {
      setLoading(false);
    }
  };

  // Refrescar sesiones
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUploadSessions();
    setRefreshing(false);
  };

  // Reanudar sesión específica
  const handleResumeSession = async (sessionId: string) => {
    try {
      console.log(`🔄 Reanudando sesión: ${sessionId}`);
      
      if (onResumeSession) {
        onResumeSession(sessionId);
        toast.success('Reanudando sesión... Cerrando modal');
        onClose();
        return;
      }

      // Fallback: usar el hook interno
      await resumeUpload(sessionId, {
        onComplete: (sessionId) => {
          console.log(`✅ Sesión completada: ${sessionId}`);
          toast.success('Sesión reanudada y completada exitosamente');
          loadUploadSessions();
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

  // Cargar sesiones al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadUploadSessions();
    }
  }, [isOpen, session?.user?.id]);

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el icono del estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Calcular progreso
  const getProgress = (session: UploadSessionDB) => {
    if (session.totalFiles === 0) return 0;
    return Math.round((session.completedFiles / session.totalFiles) * 100);
  };

  // Filtrar sesiones con archivos pendientes
  const sessionsWithPending = uploadSessions.filter(s => s.pendingFiles > 0);
  const totalPendingFiles = sessionsWithPending.reduce((sum, s) => sum + s.pendingFiles, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestión de Subidas
          </DialogTitle>
          <DialogDescription>
            Administra las sesiones de subida activas y reanuda las interrumpidas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Sesiones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uploadSessions.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Con Archivos Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{sessionsWithPending.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Archivos Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{totalPendingFiles}</div>
              </CardContent>
            </Card>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            {sessionsWithPending.length > 0 && (
              <Button
                onClick={() => {
                  // Reanudar todas las sesiones con archivos pendientes
                  sessionsWithPending.forEach(session => {
                    handleResumeSession(session.sessionId);
                  });
                }}
                disabled={isResuming}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Reanudar Todas
              </Button>
            )}
          </div>

          {/* Lista de sesiones */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Cargando sesiones...</p>
                </div>
              ) : uploadSessions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No hay sesiones de subida</p>
                </div>
              ) : (
                uploadSessions.map((session) => (
                  <Card key={session.sessionId} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(session.status)}
                          <CardTitle className="text-sm font-medium">
                            Sesión {session.sessionId.split('_')[1] || 'N/A'}
                          </CardTitle>
                        </div>
                        <Badge className={getStatusColor(session.status)}>
                          {session.status.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Creada: {new Date(session.startedAt).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Progreso */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Progreso</span>
                          <span>{getProgress(session)}%</span>
                        </div>
                        <Progress value={getProgress(session)} className="h-2" />
                      </div>

                      {/* Estadísticas */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">{session.totalFiles}</div>
                          <div className="text-gray-500">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-600">{session.completedFiles}</div>
                          <div className="text-gray-500">Completados</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-orange-600">{session.pendingFiles}</div>
                          <div className="text-gray-500">Pendientes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-red-600">{session.failedFiles}</div>
                          <div className="text-gray-500">Fallidos</div>
                        </div>
                      </div>

                      {/* Botón de reanudar para sesiones con archivos pendientes */}
                      {session.pendingFiles > 0 && (
                        <div className="mt-4 flex justify-end">
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

                      {/* Mensaje de error si existe */}
                      {session.errorMessage && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <strong>Error:</strong> {session.errorMessage}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
