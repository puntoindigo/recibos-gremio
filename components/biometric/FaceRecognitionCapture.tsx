// components/biometric/FaceRecognitionCapture.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { descriptorToArray } from '@/lib/biometric/utils';
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  RefreshCw,
  Video,
  VideoOff
} from 'lucide-react';
import { toast } from 'sonner';

interface FaceRecognitionCaptureProps {
  /** Descriptor facial guardado actualmente (si existe) */
  savedDescriptor?: number[] | null;
  /** Callback cuando se captura un nuevo descriptor */
  onDescriptorCaptured: (descriptor: number[]) => void;
  /** Callback cuando se elimina el descriptor */
  onDescriptorRemoved?: () => void;
  /** Si está en modo lectura (solo mostrar estado) */
  readOnly?: boolean;
}

/**
 * Componente para capturar y gestionar reconocimiento facial
 * 
 * Este componente está completamente separado del resto del sistema
 * y puede ser colapsado/expandido según necesidad.
 */
export default function FaceRecognitionCapture({
  savedDescriptor,
  onDescriptorCaptured,
  onDescriptorRemoved,
  readOnly = false
}: FaceRecognitionCaptureProps) {
  const { state, loadModels, detectFace, stopDetection } = useFaceRecognition();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cargar modelos cuando el componente se monta y se expande
  useEffect(() => {
    if (isExpanded && !state.isModelLoaded) {
      loadModels();
    }
  }, [isExpanded, state.isModelLoaded, loadModels]);

  // Limpiar stream al desmontar
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  /**
   * Inicia la cámara web
   */
  const startCamera = async () => {
    // Verificar que getUserMedia esté disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Tu navegador no soporta acceso a la cámara. Usa Chrome, Firefox o Safari.';
      console.error(errorMsg);
      toast.error(errorMsg);
      setCameraError(errorMsg);
      return;
    }

    setIsStartingCamera(true);
    setCameraError(null);

    try {
      console.log('Solicitando acceso a la cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Cámara frontal
        }
      });

      console.log('Stream obtenido:', stream);

      if (!videoRef.current) {
        throw new Error('El elemento de video no está disponible');
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsStreaming(true);
      setIsStartingCamera(false);

      // Esperar a que el video esté listo
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata cargado');
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error('Error reproduciendo video:', err);
            toast.error('Error iniciando el video');
          });
        }
      };

    } catch (error: any) {
      console.error('Error accediendo a la cámara:', error);
      setIsStartingCamera(false);
      
      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No se encontró ninguna cámara disponible.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Las restricciones de la cámara no se pueden satisfacer.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Error de seguridad. Asegúrate de estar usando HTTPS.';
      } else {
        errorMessage = `Error: ${error.message || error.toString()}`;
      }
      
      toast.error(errorMessage);
      setCameraError(errorMessage);
    }
  };

  /**
   * Detiene la cámara web
   */
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    stopDetection();
  };

  /**
   * Captura el descriptor facial del video actual
   */
  const captureDescriptor = async () => {
    if (!videoRef.current) {
      toast.error('El video no está disponible');
      return;
    }

    if (!state.isModelLoaded) {
      toast.error('Los modelos de reconocimiento no están cargados');
      return;
    }

    try {
      const descriptor = await detectFace(videoRef.current);
      
      if (descriptor) {
        const descriptorArray = descriptorToArray(descriptor);
        onDescriptorCaptured(descriptorArray);
        toast.success('Rostro capturado exitosamente');
        stopStream();
      } else {
        toast.error('No se detectó ningún rostro. Asegúrate de estar frente a la cámara.');
      }
    } catch (error) {
      console.error('Error capturando descriptor:', error);
      toast.error('Error al capturar el rostro');
    }
  };

  /**
   * Elimina el descriptor guardado
   */
  const removeDescriptor = () => {
    if (onDescriptorRemoved) {
      onDescriptorRemoved();
      toast.success('Datos biométricos eliminados');
    }
  };

  const hasSavedDescriptor = savedDescriptor && savedDescriptor.length > 0;

  return (
    <Card className="w-full">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => !readOnly && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <CardTitle className="text-base">Reconocimiento Facial</CardTitle>
            {hasSavedDescriptor && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Registrado
              </Badge>
            )}
          </div>
          {!readOnly && (
            <Badge variant="outline" className="text-xs">
              {isExpanded ? 'Ocultar' : 'Mostrar'}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {hasSavedDescriptor 
            ? 'Datos biométricos registrados. Puedes actualizarlos.'
            : 'Registra los datos biométricos del empleado para reconocimiento facial.'
          }
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Estado de carga de modelos */}
          {!state.isModelLoaded && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando modelos de reconocimiento...</span>
            </div>
          )}

          {/* Error de carga */}
          {state.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <XCircle className="h-4 w-4 inline mr-2" />
              {state.error}
            </div>
          )}

          {/* Video preview */}
          {state.isModelLoaded && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {/* Elemento video siempre presente para que el ref funcione */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
                />
                {/* Overlay cuando no está activo */}
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <VideoOff className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Cámara no activa</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error de cámara */}
              {cameraError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <XCircle className="h-4 w-4 inline mr-2" />
                  {cameraError}
                </div>
              )}

              {/* Controles */}
              <div className="flex gap-2">
                {!isStreaming ? (
                  <Button
                    type="button"
                    onClick={startCamera}
                    disabled={state.isDetecting || isStartingCamera}
                    className="flex-1"
                  >
                    {isStartingCamera ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Activando cámara...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Activar Cámara
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={captureDescriptor}
                      disabled={state.isDetecting}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {state.isDetecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Detectando...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Capturar Rostro
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={stopStream}
                      variant="outline"
                    >
                      <VideoOff className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {hasSavedDescriptor && (
                  <Button
                    type="button"
                    onClick={removeDescriptor}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>

              {/* Instrucciones */}
              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-md">
                <p className="font-medium mb-1">Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Activa la cámara y posiciona tu rostro frente a ella</li>
                  <li>Asegúrate de tener buena iluminación</li>
                  <li>Mantén una expresión neutra</li>
                  <li>Haz clic en "Capturar Rostro" cuando estés listo</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

