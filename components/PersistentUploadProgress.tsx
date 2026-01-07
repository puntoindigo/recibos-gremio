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
import type { UploadSessionDB } from '@/lib/db';

interface PersistentUploadProgressProps {
  sessionId?: string;
  onSessionComplete?: (sessionId: string) => void;
  onSessionError?: (sessionId: string, error: string) => void;
  showDetails?: boolean;
}

type UploadSessionState = UploadSessionDB;

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
      // TODO: Implementar obtención de estado de sesión desde dataManager
      // Por ahora, retornar null para evitar errores
      // const state = await UploadSessionManager.getSessionState(sessionId);
      // setSessionState(state);
      
      // Reset auto-resume flag when session changes
      // if (state?.status !== 'active' || state?.pendingFiles === 0) {
      //   hasAutoResumed.current = false;
      // }
      setSessionState(null);
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

  // Retomar subida manualmente
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

  // Actualizar estado periódicamente si la sesión está activa
  useEffect(() => {
    if (!sessionState || sessionState.status !== 'active') return;

    const interval = setInterval(() => {
      loadSessionState();
    }, 2000); // Actualizar cada 2 segundos

    return () => clearInterval(interval);
  }, [sessionState, loadSessionState]);

  // Retomar automáticamente si hay archivos pendientes
  useEffect(() => {
    // Evitar ejecución si ya se está procesando o si ya se auto-resumió
    if (!sessionState || !sessionId) {
      // No loggear si no hay sessionId para evitar spam
      return;
    }
    
    // Solo loggear en desarrollo para evitar spam en producción
    if (process.env.NODE_ENV === 'development') {
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
    }

    // Evitar ejecución si ya se está procesando o si ya se auto-resumó
    if (!sessionState || !sessionId) {
      console.log('❌ No hay sessionState o sessionId');
      return;
    }

    if (hasAutoResumed.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Ya se auto-resumió');
      }
      return;
    }

    if (autoResuming || isResuming || isProcessing) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Ya se está procesando');
      }
      return;
    }

    // Evitar auto-resume en sesiones que se acaban de cargar sin archivos pendientes
    if (sessionState.status === 'active' && sessionState.pendingFiles === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Sesión activa sin archivos pendientes, no se auto-resumirá');
      }
      return;
    }

    // Evitar auto-resume si es una reanudación manual o desde modal
    if (isManualResume.current || isResumeFromModal.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Reanudación manual o desde modal detectada, no se auto-resumirá');
      }
      return;
    }

    // Si hay archivos pendientes y la sesión está activa, retomar automáticamente después de 2 segundos
    if (sessionState.status === 'active' && sessionState.pendingFiles > 0) {
      // Verificar que realmente hay archivos pendientes en el array
      const actualPendingFiles = (sessionState.files || []).filter(f => f.status === 'pending');
      
      if (actualPendingFiles.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Subida pendiente detectada, retomando automáticamente en 2 segundos...');
        }
        setAutoResuming(true);
        hasAutoResumed.current = true;
        
        // Limpiar timer anterior si existe
        if (autoResumeTimerRef.current) {
          clearTimeout(autoResumeTimerRef.current);
        }
        
        // Crear nuevo timer
        autoResumeTimerRef.current = setTimeout(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('🚀 Iniciando retomar automático...');
          }
          setIsProcessing(true);
          handleResumeUpload();
        }, 2000);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ No hay archivos pendientes reales, no se auto-resumirá');
        }
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Condiciones no cumplidas para retomar automático:', {
          status: sessionState.status,
          pendingFiles: sessionState.pendingFiles
        });
      }
    }
  }, [sessionState?.status, sessionState?.pendingFiles, sessionId, handleResumeUpload]);

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

  // Después de verificar que sessionState no es null, podemos usarlo directamente
  const progressPercentage = sessionState.totalFiles > 0 
    ? ((sessionState.completedFiles + sessionState.failedFiles + sessionState.skippedFiles) / sessionState.totalFiles) * 100 
    : 0;

  const currentFile = (sessionState.files && sessionState.files.length > 0)
    ? (sessionState.files.find(f => f.status === 'processing') || 
       (sessionState.files[sessionState.currentFileIndex] ?? null))
    : null;

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]">
      <Card className="w-96 max-w-[calc(100vw-2rem)] shadow-lg border-2 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <FileText className="h-5 w-5" />
            {sessionState.status === 'active' ? 'Subiendo Archivos' : 
             sessionState.status === 'completed' ? 'Subida Completada' :
             sessionState.status === 'failed' ? 'Subida Fallida' : 'Subida Cancelada'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progreso:</span>
              <span className="font-medium">
                {sessionState.completedFiles + sessionState.failedFiles + sessionState.skippedFiles} / {sessionState.totalFiles}
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          </div>

          {/* Archivo actual */}
          {currentFile && sessionState.status === 'active' && (
            <div className="text-sm text-gray-500 truncate">
              Procesando: {currentFile.fileName}
            </div>
          )}

          {/* Estadísticas compactas */}
          <div className="flex justify-between text-xs text-gray-600">
            <span>✅ {sessionState.completedFiles}</span>
            <span>❌ {sessionState.failedFiles}</span>
            <span>⏭️ {sessionState.skippedFiles}</span>
            <span>⏳ {sessionState.pendingFiles}</span>
          </div>

          {/* Botones de acción compactos */}
          {sessionState.status === 'active' && sessionState.pendingFiles > 0 && (
            <div className="flex gap-2">
              <Button 
                onClick={handleResumeUpload} 
                variant="outline" 
                size="sm" 
                disabled={isResuming || autoResuming}
                className="flex-1 text-xs"
              >
                {isResuming || autoResuming ? (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                    Retomando...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Retomar
                  </>
                )}
              </Button>
              <Button 
                onClick={() => sessionId && cancelUpload(sessionId)} 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                Cancelar
              </Button>
            </div>
          )}

          {/* Botón Reanudar para sesiones fallidas o completadas con archivos pendientes */}
          {(sessionState?.status === 'failed' || sessionState?.status === 'completed') && sessionState?.pendingFiles > 0 && (
            <Button
              onClick={handleResumeUpload}
              disabled={isResuming || autoResuming}
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
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
          )}

          {/* Notificación de retomar automático */}
          {autoResuming && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <RotateCcw className="h-3 w-3 animate-spin" />
              Retomando automáticamente...
            </div>
          )}

          {/* Lista detallada (colapsable) */}
          {expandedDetails && sessionState.files && sessionState.files.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto border-t pt-2 mt-2">
              <div className="text-xs font-medium text-gray-700 mb-1">Detalles:</div>
              {sessionState.files.map((file, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-1.5 rounded text-xs ${
                    file.status === 'processing' ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0 truncate">{file.fileName}</div>
                  </div>
                  {getStatusBadge(file.status)}
                </div>
              ))}
            </div>
          )}

          {/* Botón para expandir/colapsar detalles */}
          <Button
            onClick={() => setExpandedDetails(!expandedDetails)}
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7"
          >
            {expandedDetails ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Ocultar detalles
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Mostrar detalles
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
