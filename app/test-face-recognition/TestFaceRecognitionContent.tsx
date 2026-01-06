// app/test-face-recognition/TestFaceRecognitionContent.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  Video, 
  VideoOff, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  User,
  Building2,
  Hash,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TestFaceRecognitionContent() {
  const { state, loadModels, detectFace, stopDetection } = useFaceRecognition();
  const { dataManager } = useCentralizedDataManager();
  const [isStreaming, setIsStreaming] = useState(false);
  const [recognizedEmployee, setRecognizedEmployee] = useState<{
    legajo: string;
    nombre: string;
    empresa: string;
    distance: number;
    confidence: number;
  } | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoRecognitionEnabled, setAutoRecognitionEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecognizedLegajoRef = useRef<string | null>(null);

  // Cargar modelos al montar
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Limpiar stream y intervalos al desmontar
  useEffect(() => {
    return () => {
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
    };
  }, []);

  // Reconocimiento automático continuo
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }

    // Solo iniciar reconocimiento automático si:
    // - La cámara está activa
    // - Los modelos están cargados
    // - El reconocimiento automático está habilitado
    // - No hay un reconocimiento en curso
    if (isStreaming && state.isModelLoaded && autoRecognitionEnabled && !isRecognizing) {
      recognitionIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || isRecognizing || !state.isModelLoaded) {
          return;
        }

        try {
          // Detectar rostro y obtener descriptor
          const descriptor = await detectFace(videoRef.current);
          
          if (!descriptor) {
            // No hay rostro detectado, limpiar reconocimiento previo después de un tiempo
            return;
          }

          // Buscar empleado que coincida
          const match = await findEmployeeByFace(descriptor, dataManager);

          if (match) {
            // Solo actualizar si es un empleado diferente o si pasó suficiente tiempo
            if (lastRecognizedLegajoRef.current !== match.legajo) {
              setRecognizedEmployee(match);
              lastRecognizedLegajoRef.current = match.legajo;
              toast.success(`Empleado reconocido: ${match.nombre} (${match.legajo})`, {
                duration: 2000,
              });
            }
          } else {
            // Si no hay coincidencia, limpiar después de un tiempo
            if (lastRecognizedLegajoRef.current !== null) {
              lastRecognizedLegajoRef.current = null;
              setRecognizedEmployee(null);
            }
          }
        } catch (error) {
          console.error('Error en reconocimiento automático:', error);
          // No mostrar toast para errores silenciosos en reconocimiento automático
        }
      }, 2000); // Reconocer cada 2 segundos
    }

    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
    };
  }, [isStreaming, state.isModelLoaded, autoRecognitionEnabled, isRecognizing, detectFace, dataManager]);

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
          facingMode: 'user'
        }
      });

      console.log('Stream obtenido:', stream);
      console.log('Tracks activos:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));

      if (!videoRef.current) {
        throw new Error('El elemento de video no está disponible');
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsStreaming(true);
      setRecognizedEmployee(null);
      lastRecognizedLegajoRef.current = null;
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

  const stopStream = () => {
    // Limpiar intervalo de reconocimiento automático
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
    setRecognizedEmployee(null);
    lastRecognizedLegajoRef.current = null;
    stopDetection();
  };

  const recognizeFace = async () => {
    if (!videoRef.current) {
      toast.error('El video no está disponible');
      return;
    }

    if (!state.isModelLoaded) {
      toast.error('Los modelos de reconocimiento no están cargados');
      return;
    }

    setIsRecognizing(true);
    setRecognizedEmployee(null);

    try {
      // Detectar rostro y obtener descriptor
      const descriptor = await detectFace(videoRef.current);
      
      if (!descriptor) {
        toast.error('No se detectó ningún rostro. Asegúrate de estar frente a la cámara.');
        setIsRecognizing(false);
        return;
      }

      // Buscar empleado que coincida
      const match = await findEmployeeByFace(descriptor, dataManager);

      if (match) {
        setRecognizedEmployee(match);
        toast.success(`Empleado reconocido: ${match.nombre} (${match.legajo})`);
      } else {
        toast.error('No se encontró ningún empleado que coincida con este rostro');
      }
    } catch (error) {
      console.error('Error reconociendo rostro:', error);
      toast.error('Error al reconocer el rostro');
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Camera className="h-8 w-8" />
              Prueba de Reconocimiento Facial
            </h1>
            <p className="text-gray-600 mt-2">
              Página temporal para probar el reconocimiento facial de empleados
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        {/* Estado de modelos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {state.isModelLoaded ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">Modelos cargados</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                  <span className="text-yellow-700">Cargando modelos...</span>
                </>
              )}
            </div>
            {state.error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <XCircle className="h-4 w-4 inline mr-2" />
                {state.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video y controles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cámara</CardTitle>
            <CardDescription>
              {autoRecognitionEnabled 
                ? 'Reconocimiento automático activado. El sistema reconocerá empleados automáticamente.'
                : 'Activa la cámara y usa el botón para reconocer manualmente.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    <VideoOff className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">Cámara no activa</p>
                    <p className="text-sm mt-2">Haz clic en "Activar Cámara" para comenzar</p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <XCircle className="h-4 w-4 inline mr-2" />
                {cameraError}
              </div>
            )}

            {/* Toggle de reconocimiento automático */}
            {isStreaming && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-gray-600" />
                  <Label htmlFor="auto-recognition" className="text-sm font-medium cursor-pointer">
                    Reconocimiento automático
                  </Label>
                </div>
                <Switch
                  id="auto-recognition"
                  checked={autoRecognitionEnabled}
                  onCheckedChange={setAutoRecognitionEnabled}
                />
              </div>
            )}

            <div className="flex gap-2">
              {!isStreaming ? (
                <Button
                  onClick={startCamera}
                  disabled={!state.isModelLoaded || isStartingCamera}
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
                  {!autoRecognitionEnabled && (
                    <Button
                      onClick={recognizeFace}
                      disabled={isRecognizing || state.isDetecting}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isRecognizing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Reconociendo...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Reconocer Empleado
                        </>
                      )}
                    </Button>
                  )}
                  {autoRecognitionEnabled && (
                    <div className="flex-1 flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span>Reconociendo automáticamente...</span>
                    </div>
                  )}
                  <Button
                    onClick={stopStream}
                    variant="outline"
                  >
                    <VideoOff className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultado del reconocimiento */}
        {recognizedEmployee && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Empleado Reconocido
                </CardTitle>
                <Badge className="bg-green-600">
                  {recognizedEmployee.confidence}% confianza
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="font-semibold text-lg">{recognizedEmployee.nombre}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Hash className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Legajo</p>
                    <p className="font-semibold text-lg">{recognizedEmployee.legajo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Empresa</p>
                    <p className="font-semibold text-lg">{recognizedEmployee.empresa}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Camera className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Distancia</p>
                    <p className="font-semibold text-lg">{recognizedEmployee.distance.toFixed(4)}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-green-200">
                <p className="text-sm text-gray-600">
                  <strong>Nota:</strong> Una distancia menor a 0.6 indica alta probabilidad de coincidencia.
                  La distancia actual es {recognizedEmployee.distance.toFixed(4)}, lo que indica una{' '}
                  {recognizedEmployee.distance < 0.6 ? 'coincidencia muy probable' : 
                   recognizedEmployee.distance < 0.8 ? 'posible coincidencia' : 
                   'coincidencia poco probable'}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instrucciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instrucciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Espera a que los modelos se carguen (verás un check verde)</li>
              <li>Haz clic en "Activar Cámara" para iniciar el video</li>
              <li>Posiciona tu rostro frente a la cámara con buena iluminación</li>
              <li>Haz clic en "Reconocer Empleado" para capturar y buscar</li>
              <li>Si hay coincidencia, verás los datos del empleado reconocido</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

