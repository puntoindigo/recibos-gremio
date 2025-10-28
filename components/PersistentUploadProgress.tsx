// components/PersistentUploadProgress.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Play,
  RotateCcw
} from 'lucide-react';
// import { UploadSessionManager, type UploadSessionState } from '@/lib/upload-session-manager'; // ELIMINADO
import { useUploadResume } from '@/hooks/useUploadResume';
import type { SimpleProcessingResult } from '@/lib/simple-pdf-processor';

interface PersistentUploadProgressProps {
  sessionId?: string;
  onSessionComplete?: (sessionId: string) => void;
  onSessionError?: (sessionId: string, error: string) => void;
  showDetails?: boolean;
}

export default function PersistentUploadProgress({ 
  sessionId,
  onSessionComplete,
  onSessionError,
  showDetails = false 
}: PersistentUploadProgressProps) {
  const { data: session } = useSession();
  const { resumeUpload, cancelUpload, isResuming } = useUploadResume();
  const [sessionState, setSessionState] = useState<UploadSessionState | null>(null);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoResuming, setAutoResuming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasAutoResumed = useRef(false);
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualResume = useRef(false); // Flag para detectar reanudación manual
  const isResumeFromModal = useRef(false); // Flag para detectar reanudación desde modal

  // Cargar estado de la sesión
  const loadSessionState = useCallback(async () => {
    if (!sessionId || !session?.user?.id) return;
    
    try {
      setLoading(true);
      const state = await UploadSessionManager.getSessionState(sessionId);
      setSessionState(state);
      
      // Reset auto-resume flag when session changes
      if (state?.status !== 'active' || state?.pendingFiles === 0) {
        hasAutoResumed.current = false;
      }
    } catch (error) {
      console.error('Error loading session state:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, session?.user?.id]);

  // Cargar estado inicial
  useEffect(() => {
    loadSessionState();
  }, [loadSessionState]);

  // Detectar reanudación desde modal y ejecutar automáticamente
  useEffect(() => {
    if (sessionState && sessionId && !isProcessing && !isResuming) {
      // Si es una sesión fallida o completada con archivos pendientes, ejecutar reanudación automáticamente
      if ((sessionState.status === 'failed' || sessionState.status === 'completed') && sessionState.pendingFiles > 0) {
        console.log('🔄 Sesión detectada para reanudación automática desde modal');
        console.log('📊 Estado de la sesión:', {
          status: sessionState.status,
          pendingFiles: sessionState.pendingFiles,
          totalFiles: sessionState.totalFiles,
          filesLength: sessionState.files?.length || 0
        });
        
        // Verificar que realmente hay archivos pendientes en el array
        const actualPendingFiles = sessionState.files?.filter(f => f.status === 'pending') || [];
        console.log('📁 Archivos pendientes reales:', actualPendingFiles.length);
        
        if (actualPendingFiles.length > 0) {
          isResumeFromModal.current = true;
          
          // Ejecutar reanudación automáticamente después de un delay
          setTimeout(async () => {
            console.log('🚀 Ejecutando reanudación automática desde modal...');
            try {
              setIsProcessing(true);
              await resumeUpload(sessionId, {
                showDebug: showDetails,
                onProgress: (current, total) => {
                  console.log(`Procesando archivo ${current} de ${total}`);
                },
                onFileComplete: (fileName, result) => {
                  console.log(`Archivo completado: ${fileName}`);
                },
                onComplete: (completedSessionId) => {
                  console.log('Sesión completada:', completedSessionId);
                  isManualResume.current = false;
                  isResumeFromModal.current = false;
                  onSessionComplete?.(completedSessionId);
                  loadSessionState();
                },
                onError: (errorSessionId, error) => {
                  console.error('Error en sesión:', errorSessionId, error);
                  onSessionError?.(errorSessionId, error);
                }
              });
            } catch (error) {
              console.error('Error resuming upload:', error);
              onSessionError?.(sessionId, error instanceof Error ? error.message : 'Error desconocido');
            } finally {
              setIsProcessing(false);
              setAutoResuming(false);
            }
          }, 2000); // Delay de 2 segundos para permitir que la interfaz se cargue
        } else {
          console.log('❌ No hay archivos pendientes reales, no se ejecutará reanudación automática');
        }
      }
    }
  }, [sessionState, sessionId, isProcessing, isResuming, resumeUpload, showDetails, onSessionComplete, onSessionError, loadSessionState]);

  // Actualizar estado periódicamente si la sesión está activa
  useEffect(() => {
    if (!sessionState || sessionState.status !== 'active') return;

    const interval = setInterval(() => {
      loadSessionState();
    }, 2000); // Actualizar cada 2 segundos

    return () => clearInterval(interval);
  }, [sessionState, loadSessionState]);

  // Retomar subida automáticamente si hay archivos pendientes
  const handleResumeUpload = useCallback(async () => {
    if (!sessionState || !sessionId) return;
    
    try {
      setIsProcessing(true);
      isManualResume.current = true; // Marcar como reanudación manual
      console.log('🔄 Iniciando retomar subida manual...');
      
      await resumeUpload(sessionId, {
        showDebug: showDetails,
        onProgress: (current, total) => {
          console.log(`Procesando archivo ${current} de ${total}`);
        },
        onFileComplete: (fileName, result) => {
          console.log(`Archivo completado: ${fileName}`);
        },
        onComplete: (completedSessionId) => {
          console.log('Sesión completada:', completedSessionId);
          isManualResume.current = false; // Reset flag
          isResumeFromModal.current = false; // Reset modal flag
          onSessionComplete?.(completedSessionId);
          loadSessionState();
        },
        onError: (errorSessionId, error) => {
          console.error('Error en sesión:', errorSessionId, error);
          onSessionError?.(errorSessionId, error);
        }
      });
    } catch (error) {
      console.error('Error resuming upload:', error);
      onSessionError?.(sessionId, error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
      setAutoResuming(false);
    }
  }, [sessionState, sessionId, resumeUpload, showDetails, onSessionComplete, onSessionError, loadSessionState]);

  // Retomar automáticamente si hay archivos pendientes
  useEffect(() => {
    console.log('🔍 useEffect ejecutándose con:', {
      sessionState: !!sessionState,
      sessionId,
      hasAutoResumed: hasAutoResumed.current,
      status: sessionState?.status,
      pendingFiles: sessionState?.pendingFiles,
      autoResuming,
      isResuming,
      isProcessing
    });

    // Evitar ejecución si ya se está procesando o si ya se auto-resumó
    if (!sessionState || !sessionId) {
      console.log('❌ No hay sessionState o sessionId');
      return;
    }

    if (hasAutoResumed.current) {
      console.log('❌ Ya se auto-resumió');
      return;
    }

    if (autoResuming || isResuming || isProcessing) {
      console.log('❌ Ya se está procesando');
      return;
    }

    // Evitar auto-resume en sesiones que se acaban de cargar sin archivos pendientes
    if (sessionState.status === 'active' && sessionState.pendingFiles === 0) {
      console.log('❌ Sesión activa sin archivos pendientes, no se auto-resumirá');
      return;
    }

    // Evitar auto-resume si es una reanudación manual o desde modal
    if (isManualResume.current || isResumeFromModal.current) {
      console.log('❌ Reanudación manual o desde modal detectada, no se auto-resumirá');
      return;
    }

    // Si hay archivos pendientes y la sesión está activa, retomar automáticamente después de 2 segundos
    if (sessionState.status === 'active' && sessionState.pendingFiles > 0) {
      // Verificar que realmente hay archivos pendientes en el array
      const actualPendingFiles = sessionState.files.filter(f => f.status === 'pending');
      
      if (actualPendingFiles.length > 0) {
        console.log('🔄 Subida pendiente detectada, retomando automáticamente en 2 segundos...');
        setAutoResuming(true);
        hasAutoResumed.current = true;
        
        // Limpiar timer anterior si existe
        if (autoResumeTimerRef.current) {
          clearTimeout(autoResumeTimerRef.current);
        }
        
        // Crear nuevo timer
        autoResumeTimerRef.current = setTimeout(() => {
          console.log('🚀 Iniciando retomar automático...');
          setIsProcessing(true);
          handleResumeUpload();
        }, 2000);
      } else {
        console.log('❌ No hay archivos pendientes reales, no se auto-resumirá');
      }
    } else {
      console.log('❌ Condiciones no cumplidas para retomar automático:', {
        status: sessionState.status,
        pendingFiles: sessionState.pendingFiles
      });
    }
  }, [sessionState?.status, sessionState?.pendingFiles, sessionId]);

  // Reset hasAutoResumed cuando la sesión cambia o se completa
  useEffect(() => {
    if (sessionState?.status === 'completed' || sessionState?.status === 'failed' || sessionState?.pendingFiles === 0) {
      hasAutoResumed.current = false;
      isManualResume.current = false; // Reset manual resume flag
      isResumeFromModal.current = false; // Reset modal flag
      setIsProcessing(false);
      setAutoResuming(false);
      console.log('🔄 Reseteando hasAutoResumed, isProcessing y autoResuming por cambio de estado');
    }
  }, [sessionState?.status, sessionState?.pendingFiles]);

  // Reset hasAutoResumed cuando cambia la sesión (nueva sesión)
  useEffect(() => {
    hasAutoResumed.current = false;
    isManualResume.current = false; // Reset manual resume flag
    isResumeFromModal.current = false; // Reset modal flag
    console.log('🔄 Reseteando hasAutoResumed por cambio de sesión');
  }, [sessionId]);

  // Cleanup del timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        console.log('🧹 Timer de auto-resume limpiado');
      }
    };
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando estado de subida...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sessionState) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'skipped':
        return <Badge className="bg-yellow-100 text-yellow-800">Omitido</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Procesando</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pendiente</Badge>;
    }
  };

  const progressPercentage = sessionState.totalFiles > 0 
    ? ((sessionState.completedFiles + sessionState.failedFiles + sessionState.skippedFiles) / sessionState.totalFiles) * 100 
    : 0;

  const currentFile = sessionState.files.find(f => f.status === 'processing') || 
                     sessionState.files[sessionState.currentFileIndex];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {sessionState.status === 'active' ? 'Procesando Archivos' : 
               sessionState.status === 'completed' ? 'Subida Completada' :
               sessionState.status === 'failed' ? 'Subida Fallida' : 'Subida Cancelada'}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {sessionState.completedFiles + sessionState.failedFiles + sessionState.skippedFiles} de {sessionState.totalFiles} archivos procesados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setExpandedDetails(!expandedDetails)}
              variant="outline"
              size="sm"
            >
              {expandedDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expandedDetails ? 'Ocultar' : 'Detalles'}
            </Button>
            {sessionState.status === 'active' && sessionState.pendingFiles > 0 && (
              <>
                <Button onClick={handleResumeUpload} variant="outline" size="sm" disabled={isResuming || autoResuming}>
                  {isResuming ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Retomando...
                    </>
                  ) : autoResuming ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Retomar Manual
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => sessionId && cancelUpload(sessionId)} 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    hasAutoResumed.current = false;
                    setAutoResuming(false);
                    setIsProcessing(false);
                    console.log('🔄 Forzando reset de estados para retomar');
                  }} 
                  variant="outline" 
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${progressPercentage}%`,
                background: sessionState.status === 'completed' ? '#10b981' : // Verde para completado
                           sessionState.status === 'failed' ? '#ef4444' : // Rojo para fallido
                           `linear-gradient(90deg, 
                             hsl(${Math.max(120, 120 - (progressPercentage * 0.6))}, 75%, 65%) 0%, 
                             hsl(${Math.min(240, 240 - (progressPercentage * 0.4))}, 75%, 65%) 100%)`
              }}
            />
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{sessionState.completedFiles}</div>
            <div className="text-xs text-gray-600">Completados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{sessionState.failedFiles}</div>
            <div className="text-xs text-gray-600">Errores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{sessionState.skippedFiles}</div>
            <div className="text-xs text-gray-600">Omitidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{sessionState.pendingFiles}</div>
            <div className="text-xs text-gray-600">Pendientes</div>
          </div>
        </div>

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
            <div>Debug Info:</div>
            <div>Status: {sessionState?.status || 'undefined'}</div>
            <div>Pending: {sessionState?.pendingFiles || 'undefined'}</div>
            <div>Total: {sessionState?.totalFiles || 'undefined'}</div>
            <div>Completed: {sessionState?.completedFiles || 'undefined'}</div>
            <div>ShowButton: {(sessionState?.status === 'failed' || sessionState?.status === 'completed') && sessionState?.pendingFiles > 0 ? 'YES' : 'NO'}</div>
          </div>
        )}

        {/* Botón Reanudar para sesiones fallidas o completadas con archivos pendientes */}
        {(sessionState?.status === 'failed' || sessionState?.status === 'completed') && sessionState?.pendingFiles > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={handleResumeUpload}
              disabled={isResuming || autoResuming}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-7"
            >
              {isResuming ? (
                <>
                  <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                  Reanudando...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Reanudar
                </>
              )}
            </Button>
          </div>
        )}

        {/* Notificación de retomar automático */}
        {autoResuming && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-green-600 animate-spin" />
              <span className="text-sm font-medium text-green-900">
                Retomando subida automáticamente en 2 segundos...
              </span>
            </div>
          </div>
        )}

        {/* Archivo actual */}
        {currentFile && sessionState.status === 'active' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Procesando: {currentFile.fileName}
              </span>
            </div>
          </div>
        )}

        {/* Lista detallada */}
        {expandedDetails && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <div className="text-sm font-medium text-gray-700 mb-2">Detalles por archivo:</div>
            {sessionState.files.map((file, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  file.status === 'processing' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.fileName}</div>
                    {file.errorMessage && (
                      <div className="text-xs text-red-600 truncate">{file.errorMessage}</div>
                    )}
                    {file.processingResult?.validation && (
                      <div className="text-xs text-gray-500">
                        {file.processingResult.validation.warnings?.length > 0 && (
                          <span className="text-yellow-600">
                            {file.processingResult.validation.warnings.length} advertencias
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(file.status)}
                  {file.status === 'processing' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Información de debug */}
        {showDetails && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-gray-600 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Estado de la sesión:</p>
                <ul className="space-y-1">
                  <li>• ID: {sessionId}</li>
                  <li>• Estado: {sessionState.status}</li>
                  <li>• Archivos pendientes: {sessionState.pendingFiles}</li>
                  <li>• Auto-retomar: {autoResuming ? 'Sí' : 'No'}</li>
                  <li>• Ya retomado: {hasAutoResumed.current ? 'Sí' : 'No'}</li>
                  <li>• Procesando: {isProcessing || isResuming ? 'Sí' : 'No'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Información adicional */}
        {showDetails && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-gray-600 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Información del procesamiento:</p>
                <ul className="space-y-1">
                  <li>• Los archivos duplicados se omiten automáticamente</li>
                  <li>• Se validan los datos antes de guardar</li>
                  <li>• Los errores se muestran en la columna de detalles</li>
                  <li>• El progreso se guarda automáticamente</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
