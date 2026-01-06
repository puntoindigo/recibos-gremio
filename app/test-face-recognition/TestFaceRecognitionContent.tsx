// app/test-face-recognition/TestFaceRecognitionContent.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  VideoOff, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  User,
  Building2,
  Hash,
  ArrowLeft,
  LogIn,
  LogOut,
  Clock,
  MapPin,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';

type RegistrationType = 'entrada' | 'salida' | null;

export default function TestFaceRecognitionContent() {
  const { state, loadModels, detectFace, detectFaceBox, stopDetection } = useFaceRecognition();
  const { dataManager } = useCentralizedDataManager();
  const { data: session } = useSession();
  
  // Verificar si el usuario puede eliminar registros
  const canDelete = session?.user?.email !== 'registro@recibos.com';
  const [registrationType, setRegistrationType] = useState<RegistrationType>(null);
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
  const [faceDetection, setFaceDetection] = useState<any | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [lastRegistration, setLastRegistration] = useState<{
    tipo: 'entrada' | 'salida';
    empleado: string;
    legajo: string;
    timestamp: Date;
  } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [allRegistros, setAllRegistros] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecognizedLegajoRef = useRef<string | null>(null);

  // Cargar modelos al montar
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Cargar todos los registros al montar y después de cada registro
  useEffect(() => {
    const loadRegistros = async () => {
      try {
        const registros = await dataManager.getAllRegistros(true);
        setAllRegistros(registros || []);
      } catch (error) {
        console.error('Error cargando registros:', error);
        setAllRegistros([]);
      }
    };
    loadRegistros();
  }, [dataManager, lastRegistration]);

  // Activar cámara automáticamente cuando se selecciona tipo de registro
  useEffect(() => {
    if (registrationType && state.isModelLoaded && !isStreaming && !isStartingCamera) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [registrationType, state.isModelLoaded]);

  // Limpiar stream y intervalos al desmontar
  useEffect(() => {
    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
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

  // Detección continua de rostros para mostrar encuadres visuales
  useEffect(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    if (isStreaming && state.isModelLoaded && videoRef.current && canvasRef.current) {
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const detection = await detectFaceBox(videoRef.current);
          setFaceDetection(detection);
          
          // Dibujar encuadre en el canvas
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const ctx = canvas.getContext('2d');
          
          if (ctx && video.videoWidth && video.videoHeight) {
            // Ajustar tamaño del canvas al video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Limpiar canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (detection && detection.detection) {
              const box = detection.detection.box;
              const landmarks = detection.landmarks;
              
              // Dibujar rectángulo del rostro
              ctx.strokeStyle = detection.detection.score > 0.5 ? '#22c55e' : '#ef4444';
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              
              // Dibujar puntos de referencia faciales
              if (landmarks) {
                ctx.fillStyle = '#3b82f6';
                landmarks.positions.forEach((point: any) => {
                  ctx.beginPath();
                  ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                  ctx.fill();
                });
              }
              
              // Mostrar score de confianza en negro
              ctx.fillStyle = '#000000';
              ctx.font = 'bold 16px Arial';
              ctx.fillText(
                `Confianza: ${Math.round(detection.detection.score * 100)}%`,
                box.x,
                box.y - 10
              );
            }
          }
        }
      }, 100); // Detectar cada 100ms para fluidez
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isStreaming, state.isModelLoaded, detectFaceBox]);

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
    // - No hay un reconocimiento en curso
    // - No se ha registrado ya
    if (isStreaming && state.isModelLoaded && !isRecognizing && registrationType && !isRegistered) {
      recognitionIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || isRecognizing || !state.isModelLoaded || isRegistered) {
          return;
        }

        try {
          // Detectar rostro y obtener descriptor
          const descriptor = await detectFace(videoRef.current);
          
          if (!descriptor) {
            return;
          }

          // Buscar empleado que coincida
          const match = await findEmployeeByFace(descriptor, dataManager);

          if (match && match.distance < 0.6) {
            // Solo registrar si es un empleado diferente o si pasó suficiente tiempo
            if (lastRecognizedLegajoRef.current !== match.legajo && !isRegistered) {
              // Detener reconocimiento inmediatamente para evitar múltiples registros
              if (recognitionIntervalRef.current) {
                clearInterval(recognitionIntervalRef.current);
                recognitionIntervalRef.current = null;
              }
              
              setIsRegistered(true);
              setRecognizedEmployee(match);
              lastRecognizedLegajoRef.current = match.legajo;
              
              // Registrar entrada/salida
              await registerAttendance(match, registrationType);
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
        }
      }, 2000); // Reconocer cada 2 segundos
    }

    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
    };
  }, [isStreaming, state.isModelLoaded, isRecognizing, registrationType, isRegistered, detectFace, dataManager]);

  const registerAttendance = async (employee: {
    legajo: string;
    nombre: string;
    empresa: string;
    distance: number;
    confidence: number;
  }, type: 'entrada' | 'salida') => {
    const timestamp = new Date();
    
    try {
      // Guardar en la base de datos inmediatamente
      await dataManager.createRegistro({
        legajo: employee.legajo,
        nombre: employee.nombre,
        empresa: employee.empresa,
        accion: type,
        sede: 'CENTRAL',
        fecha_hora: timestamp.toISOString()
      });

      setLastRegistration({
        tipo: type,
        empleado: employee.nombre,
        legajo: employee.legajo,
        timestamp
      });

      toast.success(
        `${type === 'entrada' ? 'Entrada' : 'Salida'} registrada: ${employee.nombre} (${employee.legajo})`,
        {
          duration: 3000,
        }
      );

      // Detener reconocimiento y cámara inmediatamente después de registrar
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
      
      // Resetear después de 3 segundos para permitir otro registro
      setTimeout(() => {
        setRecognizedEmployee(null);
        lastRecognizedLegajoRef.current = null;
        setIsRegistered(false);
        stopStream();
        setRegistrationType(null);
      }, 3000);
    } catch (error: any) {
      console.error('❌ Error guardando registro:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Si es error de tabla no existe, mostrar mensaje específico
      if (error?.code === 'PGRST116' || error?.code === '42P01' || error?.message?.includes('404') || error?.message?.includes('does not exist') || error?.message?.includes('relation') || error?.message?.includes('not found')) {
        toast.error('La tabla de registros no existe o no es accesible. Verifica permisos RLS en Supabase.', {
          duration: 5000,
        });
        console.error('🔍 Verifica en Supabase:');
        console.error('1. Tabla "registros" existe');
        console.error('2. RLS está habilitado pero con políticas que permiten acceso');
        console.error('3. Error completo:', error);
      } else {
        toast.error(`Error al guardar el registro: ${error?.message || 'Error desconocido'}`);
      }
      // Permitir reintentar
      setIsRegistered(false);
    }
  };

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
      setRegistrationType(null);
    }
  };

  const stopStream = () => {
    // Limpiar intervalos
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setIsStreaming(false);
    setRecognizedEmployee(null);
    setFaceDetection(null);
    lastRecognizedLegajoRef.current = null;
    stopDetection();
  };

  const handleTypeSelection = (type: 'entrada' | 'salida') => {
    setRegistrationType(type);
    setRecognizedEmployee(null);
    setLastRegistration(null);
    setIsRegistered(false);
    lastRecognizedLegajoRef.current = null;
  };

  const handleCancel = () => {
    stopStream();
    setRegistrationType(null);
    setRecognizedEmployee(null);
    setLastRegistration(null);
    setIsRegistered(false);
    lastRecognizedLegajoRef.current = null;
  };

  const handleDeleteRegistro = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) {
      return;
    }

    setDeletingId(id);
    try {
      await dataManager.deleteRegistro(id);
      // Recargar registros
      const registros = await dataManager.getAllRegistros(true);
      setAllRegistros(registros || []);
      toast.success('Registro eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando registro:', error);
      toast.error('Error al eliminar el registro');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Statusbar pequeña en la parte superior */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {state.isModelLoaded ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="text-gray-600">Modelos cargados</span>
              </>
            ) : (
              <>
                <Loader2 className="h-3 w-3 text-yellow-600 animate-spin" />
                <span className="text-gray-600">Cargando modelos...</span>
              </>
            )}
          </div>
          {state.error && (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3 w-3" />
              <span>{state.error}</span>
            </div>
          )}
        </div>
        {session?.user?.email === 'registro@recibos.com' ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut className="h-3 w-3 mr-1" />
            Cerrar Sesión
          </Button>
        ) : (
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Volver
            </Button>
          </Link>
        )}
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Registro de Entradas y Salidas
          </h1>
          <p className="text-gray-600">
            Selecciona el tipo de registro y posiciona tu rostro frente a la cámara
          </p>
        </div>

        {/* Selección de tipo de registro */}
        {!registrationType && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
              <Button
                onClick={() => handleTypeSelection('entrada')}
                disabled={!state.isModelLoaded}
                className="h-32 text-xl font-semibold bg-green-600 hover:bg-green-700 text-white"
              >
                <div className="flex flex-col items-center gap-3">
                  <LogIn className="h-12 w-12" />
                  <span>ENTRADA</span>
                </div>
              </Button>
              <Button
                onClick={() => handleTypeSelection('salida')}
                disabled={!state.isModelLoaded}
                className="h-32 text-xl font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                <div className="flex flex-col items-center gap-3">
                  <LogOut className="h-12 w-12" />
                  <span>SALIDA</span>
                </div>
              </Button>
            </div>

            {/* Listado de registros */}
            {allRegistros.length > 0 && (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Registros Recientes
                  </h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allRegistros.map((registro) => (
                      <div
                        key={registro.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          registro.accion === 'entrada' 
                            ? 'bg-green-50 border-green-200' 
                            : registro.accion === 'salida'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {registro.accion === 'entrada' ? (
                            <LogIn className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : registro.accion === 'salida' ? (
                            <LogOut className="h-5 w-5 text-red-600 flex-shrink-0" />
                          ) : (
                            <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{registro.nombre}</span>
                              <Badge variant="outline" className="text-xs">
                                {registro.legajo}
                              </Badge>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-600">{registro.empresa}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  registro.accion === 'entrada' 
                                    ? 'bg-green-600 text-white' 
                                    : registro.accion === 'salida'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-blue-600 text-white'
                                }>
                                  {registro.accion === 'entrada' ? 'ENTRADA' : registro.accion === 'salida' ? 'SALIDA' : 'ALTA'}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  {new Date(registro.fecha_hora).toLocaleString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{registro.sede || 'CENTRAL'}</span>
                                </div>
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => handleDeleteRegistro(registro.id)}
                                    disabled={deletingId === registro.id}
                                  >
                                    {deletingId === registro.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Cámara - solo se muestra cuando se selecciona tipo */}
        {registrationType && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Indicador de tipo de registro */}
                <div className="text-center">
                  <Badge className={`text-lg px-4 py-2 ${
                    registrationType === 'entrada' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {registrationType === 'entrada' ? (
                      <>
                        <LogIn className="h-4 w-4 mr-2 inline" />
                        Registrando ENTRADA
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2 inline" />
                        Registrando SALIDA
                      </>
                    )}
                  </Badge>
                </div>

                {/* Video */}
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
                  />
                  {/* Canvas overlay para dibujar encuadres */}
                  {isStreaming && (
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                  {/* Overlay cuando no está activo */}
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                        <p className="text-lg">Activando cámara...</p>
                      </div>
                    </div>
                  )}
                  {/* Indicador visual de detección */}
                  {isStreaming && faceDetection && (
                    <div className="absolute top-2 left-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        faceDetection.detection.score > 0.5 
                          ? 'bg-green-500 text-white' 
                          : 'bg-yellow-500 text-white'
                      }`}>
                        {faceDetection.detection.score > 0.5 ? '✓ Rostro detectado' : '⏳ Ajustando...'}
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

                {/* Botón cancelar */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="w-full max-w-xs"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado del reconocimiento */}
        {recognizedEmployee && (
          <Card className={`max-w-4xl mx-auto mt-6 border-2 ${
            registrationType === 'entrada' 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className={`h-8 w-8 ${
                    registrationType === 'entrada' ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <h2 className="text-2xl font-bold">
                    {registrationType === 'entrada' ? 'Entrada' : 'Salida'} Registrada
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8 text-gray-600" />
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="font-semibold text-lg">{recognizedEmployee.nombre}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Hash className="h-8 w-8 text-gray-600" />
                    <p className="text-sm text-gray-600">Legajo</p>
                    <p className="font-semibold text-lg">{recognizedEmployee.legajo}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8 text-gray-600" />
                    <p className="text-sm text-gray-600">Empresa</p>
                    <p className="font-semibold text-lg">{recognizedEmployee.empresa}</p>
                  </div>
                </div>

                {lastRegistration && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        {lastRegistration.timestamp.toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de confirmación de logout */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        userName={session?.user?.name}
      />
    </div>
  );
}
