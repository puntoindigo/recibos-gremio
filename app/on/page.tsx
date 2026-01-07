// app/on/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OnPage() {
  const { state, loadModels, detectFace, detectFaceBox, stopDetection } = useFaceRecognition();
  const { dataManager } = useCentralizedDataManager();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [faceDetection, setFaceDetection] = useState<any | null>(null);
  const [detectedEmployee, setDetectedEmployee] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'entrada' | 'salida' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cargar modelos al montar
  useEffect(() => {
    if (!state.isModelLoaded) {
      loadModels();
    }
  }, [state.isModelLoaded, loadModels]);

  // Iniciar cámara cuando los modelos estén cargados
  useEffect(() => {
    if (state.isModelLoaded && !isStreaming && !isStartingCamera && !cameraError) {
      startCamera();
    }
  }, [state.isModelLoaded]);

  // Detección continua de rostros para visualización
  useEffect(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    if (isStreaming && state.isModelLoaded && videoRef.current) {
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && canvasRef.current && !showConfirmModal) {
          const detection = await detectFaceBox(videoRef.current);
          setFaceDetection(detection);
        }
      }, 500); // Cada 500ms para visualización
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isStreaming, state.isModelLoaded, showConfirmModal, detectFaceBox]);

  // Reconocimiento automático cada 2 segundos
  useEffect(() => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
    }

    if (isStreaming && state.isModelLoaded && videoRef.current && !showConfirmModal && !isSaving) {
      recognitionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && faceDetection?.detection?.score > 0.5) {
          try {
            const descriptor = await detectFace(videoRef.current);
            if (descriptor) {
              const employee = await findEmployeeByFace(descriptor, dataManager);
              if (employee) {
                setDetectedEmployee(employee);
                setShowConfirmModal(true);
                // Pausar detección mientras se muestra el modal
                if (recognitionIntervalRef.current) {
                  clearInterval(recognitionIntervalRef.current);
                }
              }
            }
          } catch (error) {
            console.error('Error en reconocimiento:', error);
          }
        }
      }, 2000); // Cada 2 segundos
    }

    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
    };
  }, [isStreaming, state.isModelLoaded, faceDetection, showConfirmModal, isSaving, detectFace, dataManager]);

  const startCamera = async () => {
    if (isStreaming || isStartingCamera) return;

    setIsStartingCamera(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setIsStartingCamera(false);

        // Esperar a que el video esté listo
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
      }
    } catch (error: any) {
      console.error('Error accediendo a la cámara:', error);
      setIsStartingCamera(false);
      
      let errorMessage = 'No se pudo acceder a la cámara.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara disponible.';
      }
      
      toast.error(errorMessage);
      setCameraError(errorMessage);
    }
  };

  const stopStream = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setFaceDetection(null);
    stopDetection();
  };

  // Dibujar encuadres en el canvas
  useEffect(() => {
    if (!canvasRef.current || !faceDetection) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    const { detection, landmarks } = faceDetection;
    if (detection) {
      const { x, y, width, height } = detection.box;
      const score = detection.score;

      // Dibujar caja
      ctx.strokeStyle = score > 0.5 ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Dibujar landmarks
      if (landmarks) {
        ctx.fillStyle = '#3b82f6';
        landmarks.positions.forEach((point: any) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Indicador de confianza
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.fillText(
        `${(score * 100).toFixed(0)}%`,
        x,
        y - 5
      );
    }
  }, [faceDetection]);

  const handleConfirm = async () => {
    if (!detectedEmployee || !selectedAction) return;

    setIsSaving(true);
    try {
      await dataManager.createRegistro({
        legajo: detectedEmployee.legajo,
        nombre: detectedEmployee.nombre || `${detectedEmployee.data?.NOMBRE || 'Desconocido'}`,
        empresa: detectedEmployee.empresa || detectedEmployee.data?.EMPRESA || 'DESCONOCIDA',
        accion: selectedAction,
        sede: 'CENTRAL',
        fecha_hora: new Date().toISOString()
      });

      toast.success(`${selectedAction === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`);
      
      // Cerrar modal y reiniciar detección
      setShowConfirmModal(false);
      setDetectedEmployee(null);
      setSelectedAction(null);
      
      // Reiniciar reconocimiento después de un breve delay
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    } catch (error) {
      console.error('Error guardando registro:', error);
      toast.error('Error al guardar el registro');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setDetectedEmployee(null);
    setSelectedAction(null);
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Estado del sistema */}
        <div className="mb-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm">
              {isStreaming ? 'Cámara activa' : 'Cámara inactiva'}
            </span>
            {!state.isModelLoaded && (
              <span className="text-xs text-yellow-400 ml-2">Cargando modelos...</span>
            )}
          </div>
          {cameraError && (
            <Button
              onClick={startCamera}
              size="sm"
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-gray-900"
            >
              Reintentar
            </Button>
          )}
        </div>

        {/* Video con canvas overlay */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: 'cover' }}
          />
          
          {/* Overlay cuando no está activo */}
          {!isStreaming && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Iniciando cámara...</p>
              </div>
            </div>
          )}

          {/* Indicador visual de detección */}
          {isStreaming && faceDetection && (
            <div className="absolute top-2 left-2">
              <div className={`px-3 py-1 rounded text-sm font-medium ${
                faceDetection.detection.score > 0.5 
                  ? 'bg-green-500 text-white' 
                  : 'bg-yellow-500 text-white'
              }`}>
                {faceDetection.detection.score > 0.5 ? '✓ Rostro detectado' : '⏳ Ajustando...'}
              </div>
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          <p>Posiciona tu rostro frente a la cámara para registro automático</p>
        </div>
      </div>

      {/* Modal de confirmación */}
      <Dialog open={showConfirmModal} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Empleado detectado
            </DialogTitle>
            <DialogDescription>
              {detectedEmployee && (
                <div className="mt-2">
                  <p className="font-semibold text-lg">{detectedEmployee.nombre}</p>
                  <p className="text-sm text-gray-500">Legajo: {detectedEmployee.legajo}</p>
                  <p className="text-sm text-gray-500">Empresa: {detectedEmployee.empresa}</p>
                  {detectedEmployee.confidence && (
                    <p className="text-sm text-green-600 mt-1">Confianza: {detectedEmployee.confidence}%</p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm font-medium">Selecciona el tipo de registro:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setSelectedAction('entrada')}
                variant={selectedAction === 'entrada' ? 'default' : 'outline'}
                className={`h-20 flex flex-col items-center justify-center gap-2 ${
                  selectedAction === 'entrada' ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
                disabled={isSaving}
              >
                <LogIn className="h-6 w-6" />
                <span>Entrada</span>
              </Button>
              <Button
                onClick={() => setSelectedAction('salida')}
                variant={selectedAction === 'salida' ? 'default' : 'outline'}
                className={`h-20 flex flex-col items-center justify-center gap-2 ${
                  selectedAction === 'salida' ? 'bg-red-600 hover:bg-red-700' : ''
                }`}
                disabled={isSaving}
              >
                <LogOut className="h-6 w-6" />
                <span>Salida</span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAction || isSaving}
              className={selectedAction === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

