'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Usb,
  Radio,
  BookOpen,
  PenTool
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// IDs del dispositivo NSCCN Smart Reader
const VENDOR_ID = 0x0416;
const PRODUCT_ID = 0xb030;

interface RFIDReaderProps {
  onCardRead?: (uid: string) => void;
  autoConnect?: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function RFIDReader({ 
  onCardRead, 
  autoConnect = false 
}: RFIDReaderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [device, setDevice] = useState<HIDDevice | null>(null);
  const [lastUid, setLastUid] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [mode, setMode] = useState<'read' | 'write'>('read');
  const [writeId, setWriteId] = useState<string>('');
  const [isWriting, setIsWriting] = useState(false);
  const [readEmpty, setReadEmpty] = useState(false);
  const inputReportListenerRef = useRef<((event: HIDInputReportEvent) => void) | null>(null);
  const keyboardInputRef = useRef<HTMLInputElement>(null);
  const keyboardInputValueRef = useRef<string>('');
  const lastReadTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

  // Verificar si WebHID está disponible
  const isWebHIDAvailable = typeof navigator !== 'undefined' && 'hid' in navigator;

  // Generar ID automático de 12 dígitos
  const generateAutoId = useCallback(() => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    // Tomar últimos 9 dígitos del timestamp + 3 dígitos aleatorios = 12 dígitos
    const id = (timestamp.slice(-9) + random).padStart(12, '0');
    return id;
  }, []);

  // Inicializar ID automático cuando cambia a modo escritura
  useEffect(() => {
    if (mode === 'write' && !writeId) {
      setWriteId(generateAutoId());
    }
  }, [mode, writeId, generateAutoId]);

  // Escribir datos en la tarjeta
  const writeToCard = useCallback(async () => {
    if (!device || !device.opened) {
      toast.error('El dispositivo no está conectado');
      return;
    }

    const idToWrite = writeId.trim() || generateAutoId();
    
    if (idToWrite.length !== 12 || !/^\d+$/.test(idToWrite)) {
      toast.error('El ID debe tener exactamente 12 dígitos numéricos');
      return;
    }

    setIsWriting(true);
    toast.info('Escribiendo en la tarjeta...', { duration: 2000 });

    try {
      // Convertir el ID de 12 dígitos a bytes
      // Dividir en grupos de 2 dígitos y convertir a hexadecimal
      const idBytes: number[] = [];
      for (let i = 0; i < idToWrite.length; i += 2) {
        const twoDigits = idToWrite.slice(i, i + 2);
        idBytes.push(parseInt(twoDigits, 10));
      }

      // Crear buffer con el ID (6 bytes para 12 dígitos)
      const writeBuffer = new Uint8Array(idBytes);

      // Intentar escribir usando output reports
      if (device.collections && device.collections.length > 0) {
        const collection = device.collections[0];
        if (collection.outputReports && collection.outputReports.length > 0) {
          const outputReport = collection.outputReports[0];
          const reportId = outputReport.reportId || 0;

          try {
            // Enviar comando de escritura
            // Formato común: [comando, datos...]
            const commandBuffer = new Uint8Array([0x02, ...writeBuffer]); // 0x02 = comando de escritura
            
            await device.sendReport(reportId, commandBuffer.buffer);
            
            console.log('[RFID] Datos enviados para escritura:', {
              reportId,
              id: idToWrite,
              bytes: Array.from(writeBuffer).map(b => '0x' + b.toString(16).padStart(2, '0'))
            });

            // Esperar un momento para que se complete la escritura
            await new Promise(resolve => setTimeout(resolve, 1000));

            setIsWriting(false);
            toast.success(`✅ Escritura completada. ID escrito: ${idToWrite}`);
            setWriteId(''); // Limpiar campo
            setWriteId(generateAutoId()); // Generar nuevo ID automático
            
          } catch (error) {
            console.error('[RFID] Error escribiendo:', error);
            setIsWriting(false);
            toast.error('Error al escribir en la tarjeta. Verifica que la tarjeta esté cerca del lector.');
          }
        } else {
          setIsWriting(false);
          toast.error('El dispositivo no soporta escritura (no hay output reports)');
        }
      } else {
        setIsWriting(false);
        toast.error('No se encontraron collections en el dispositivo');
      }
    } catch (error) {
      console.error('[RFID] Error en proceso de escritura:', error);
      setIsWriting(false);
      toast.error('Error al escribir en la tarjeta');
    }
  }, [device, writeId, generateAutoId]);

  // Formatear buffer a UID hexadecimal
  const formatUidFromBuffer = useCallback((buffer: DataView, offset: number = 0): string => {
    const bytes: string[] = [];
    const maxBytes = Math.min(buffer.byteLength - offset, 16);
    
    // Leer bytes desde el offset
    for (let i = offset; i < offset + maxBytes; i++) {
      const byte = buffer.getUint8(i);
      bytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
    }
    
    // Eliminar ceros al final (pero mantener al menos 4 bytes si hay datos)
    let trimmedBytes = [...bytes];
    while (trimmedBytes.length > 4 && trimmedBytes[trimmedBytes.length - 1] === '00') {
      trimmedBytes.pop();
    }
    
    // Si después de eliminar ceros tenemos menos de 4 bytes, usar los originales
    if (trimmedBytes.length < 4 && bytes.length >= 4) {
      trimmedBytes = bytes.slice(0, 8); // Tomar hasta 8 bytes máximo
    }
    
    // Unir sin separadores
    return trimmedBytes.join('');
  }, []);

  // Procesar lectura de tarjeta
  const handleCardRead = useCallback((uid: string) => {
    const now = Date.now();
    // Normalizar: eliminar espacios, dos puntos y convertir a mayúsculas
    const normalizedUid = uid.trim().replace(/\s+/g, '').replace(/:/g, '').toUpperCase();

    if (!normalizedUid || normalizedUid.length < 4) {
      return;
    }

    // Anti-rebote: ignorar si es el mismo UID leído recientemente
    if (normalizedUid === lastUid && (now - lastReadTimeRef.current) < DEBOUNCE_MS) {
      return;
    }

    setLastUid(normalizedUid);
    lastReadTimeRef.current = now;

    // Formatear UID con dos puntos cada 2 caracteres para mostrar
    const formattedUid = normalizedUid.match(/.{1,2}/g)?.join(':') || normalizedUid;

    // Llamar al callback con el UID normalizado (sin dos puntos) para que la API lo procese
    if (onCardRead) {
      onCardRead(normalizedUid);
    }
  }, [lastUid, onCardRead]);

  // Manejar eventos de input report
  const handleInputReport = useCallback((event: HIDInputReportEvent) => {
    console.log('[RFID] ⚡ EVENTO INPUT REPORT RECIBIDO!', {
      reportId: event.reportId,
      hasData: !!event.data,
      dataLength: event.data?.byteLength || 0
    });
    
    if (!event.data) {
      console.log('[RFID] Input report sin datos');
      setDebugInfo('Input report recibido pero sin datos');
      return;
    }

    try {
      // Log para debug
      const rawData = Array.from(new Uint8Array(event.data.buffer))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      
      const debugMsg = `Report ID: ${event.reportId || 'N/A'}, Length: ${event.data.byteLength}, Data: ${rawData}`;
      setDebugInfo(debugMsg);
      
      // Siempre loggear en producción también para debug
      console.log('[RFID] Input report recibido:', {
        reportId: event.reportId,
        dataLength: event.data.byteLength,
        data: rawData
      });

      const buffer = new DataView(event.data.buffer);
      const dataArray = new Uint8Array(event.data.buffer);
      
      // Intentar diferentes métodos de lectura según el formato del dispositivo
      let uid = '';
      
      // Método 1: Leer desde el inicio del buffer (formato estándar)
      uid = formatUidFromBuffer(buffer, 0);
      
      // Método 2: Si el buffer tiene más de 4 bytes, podría tener un header
      // Intentar desde diferentes offsets
      if (!uid || uid.length < 4) {
        for (let offset = 1; offset <= 3 && offset < buffer.byteLength - 4; offset++) {
          const testUid = formatUidFromBuffer(buffer, offset);
          if (testUid && testUid.length >= 4) {
            uid = testUid;
            break;
          }
        }
      }
      
      // Método 3: Buscar patrón de UID (4-8 bytes consecutivos no nulos)
      if (!uid || uid.length < 4) {
        let startIdx = -1;
        let endIdx = -1;
        
        // Buscar inicio de secuencia no nula
        for (let i = 0; i < Math.min(buffer.byteLength, 16); i++) {
          if (dataArray[i] !== 0 && startIdx === -1) {
            startIdx = i;
          }
          if (startIdx !== -1 && dataArray[i] !== 0) {
            endIdx = i;
          }
          if (startIdx !== -1 && dataArray[i] === 0 && endIdx !== -1) {
            break;
          }
        }
        
        if (startIdx !== -1 && endIdx !== -1 && (endIdx - startIdx + 1) >= 4) {
          const bytes: string[] = [];
          for (let i = startIdx; i <= endIdx && i < buffer.byteLength; i++) {
            bytes.push(dataArray[i].toString(16).padStart(2, '0').toUpperCase());
          }
          uid = bytes.join('');
        }
      }
      
      // Método 4: Leer primeros 4-8 bytes sin filtrar ceros (para UIDs que incluyen 0x00)
      if (!uid || uid.length < 4) {
        const bytes: string[] = [];
        const maxBytes = Math.min(buffer.byteLength, 8);
        for (let i = 0; i < maxBytes; i++) {
          bytes.push(dataArray[i].toString(16).padStart(2, '0').toUpperCase());
        }
        uid = bytes.join('');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[RFID] UID extraído:', uid);
      }
      
      if (uid && uid.length >= 4) {
        handleCardRead(uid);
        setReadEmpty(false);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[RFID] UID no válido o muy corto:', uid);
        }
        // Si recibimos un report pero el UID está vacío o es muy corto, podría ser una tarjeta sin datos
        if (buffer.byteLength > 0) {
          const allZeros = Array.from(new Uint8Array(event.data.buffer)).every(b => b === 0);
          if (allZeros) {
            setReadEmpty(true);
            toast.warning('Tarjeta detectada pero no contiene datos');
          }
        }
      }
    } catch (error) {
      console.error('[RFID] Error procesando input report:', error);
      toast.error('Error leyendo tarjeta. Revisa la consola para más detalles.');
    }
  }, [formatUidFromBuffer, handleCardRead]);

  // Conectar al dispositivo
  const connectDevice = useCallback(async () => {
    if (!isWebHIDAvailable) {
      toast.error('WebHID no está disponible en este navegador');
      setStatus('error');
      return;
    }

    setStatus('connecting');

    try {
      // Solicitar acceso al dispositivo
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: VENDOR_ID, productId: PRODUCT_ID }
        ]
      });

      if (devices.length === 0) {
        toast.error('No se seleccionó ningún dispositivo');
        setStatus('disconnected');
        return;
      }

      const selectedDevice = devices[0];

      // Abrir el dispositivo
      if (!selectedDevice.opened) {
        await selectedDevice.open();
      }

      // Log información del dispositivo
      console.log('[RFID] Dispositivo conectado:', {
        vendorId: `0x${selectedDevice.vendorId.toString(16).padStart(4, '0')}`,
        productId: `0x${selectedDevice.productId.toString(16).padStart(4, '0')}`,
        productName: selectedDevice.productName,
        manufacturerName: selectedDevice.manufacturerName,
        collections: selectedDevice.collections
      });

      // Log detallado de collections y reports
      if (selectedDevice.collections && selectedDevice.collections.length > 0) {
        console.log('[RFID] Collections del dispositivo:');
        for (let idx = 0; idx < selectedDevice.collections.length; idx++) {
          const collection = selectedDevice.collections[idx];
          console.log(`  Collection ${idx}:`, {
            usage: collection.usage,
            usagePage: collection.usagePage,
            inputReports: collection.inputReports?.map(r => ({
              reportId: r.reportId,
              items: r.items?.length || 0,
              itemsDetail: r.items?.map(item => ({
                usage: item.usage,
                usagePage: item.usagePage,
                reportSize: item.reportSize,
                reportCount: item.reportCount
              }))
            })),
            outputReports: collection.outputReports?.map(r => ({
              reportId: r.reportId,
              items: r.items?.length || 0,
              itemsDetail: r.items?.map(item => ({
                usage: item.usage,
                usagePage: item.usagePage,
                reportSize: item.reportSize,
                reportCount: item.reportCount
              }))
            })),
            featureReports: collection.featureReports?.map(r => ({
              reportId: r.reportId,
              items: r.items?.length || 0
            }))
          });
          
          // Intentar enviar comando de activación si hay output reports
          if (collection.outputReports && collection.outputReports.length > 0) {
            for (const outputReport of collection.outputReports) {
              const reportId = outputReport.reportId || 0;
              try {
                // Intentar enviar comando de activación (común: 0x01 o 0x00)
                // Algunos dispositivos necesitan este comando para empezar a enviar datos
                const activationCommands = [
                  new Uint8Array([0x01]), // Comando de activación común
                  new Uint8Array([0x00]), // Comando de reset
                  new Uint8Array([reportId, 0x01]), // Comando con reportId
                ];
                
                for (const cmd of activationCommands) {
                  try {
                    await selectedDevice.sendFeatureReport(reportId, cmd.buffer);
                    console.log(`[RFID] Comando de activación enviado (reportId: ${reportId}, cmd: ${Array.from(cmd).map(b => '0x' + b.toString(16)).join(', ')})`);
                  } catch (err) {
                    // Intentar con sendReport si sendFeatureReport falla
                    try {
                      await selectedDevice.sendReport(reportId, cmd.buffer);
                      console.log(`[RFID] Comando enviado via sendReport (reportId: ${reportId})`);
                    } catch (err2) {
                      // Ignorar errores, algunos dispositivos no necesitan comandos
                    }
                  }
                }
              } catch (error) {
                console.log(`[RFID] No se pudo enviar comando al reportId ${reportId}:`, error);
              }
            }
          }
        }
      } else {
        console.warn('[RFID] No se encontraron collections en el dispositivo');
      }

      // Configurar listener para input reports
      if (inputReportListenerRef.current) {
        selectedDevice.removeEventListener('inputreport', inputReportListenerRef.current);
      }

      inputReportListenerRef.current = handleInputReport;
      selectedDevice.addEventListener('inputreport', handleInputReport);
      
      // Intentar recibir feature reports si están disponibles
      if (selectedDevice.collections && selectedDevice.collections.length > 0) {
        for (const collection of selectedDevice.collections) {
          if (collection.featureReports && collection.featureReports.length > 0) {
            for (const report of collection.featureReports) {
              try {
                const reportId = report.reportId || 0;
                const data = await selectedDevice.receiveFeatureReport(reportId);
                console.log(`[RFID] Feature report ${reportId} recibido:`, 
                  Array.from(new Uint8Array(data.buffer))
                    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                    .join(' ')
                );
              } catch (error) {
                // Ignorar errores de feature reports
              }
            }
          }
        }
      }
      
      // Actualizar debug info con información del dispositivo
      const inputReportsCount = selectedDevice.collections?.[0]?.inputReports?.length || 0;
      const outputReportsCount = selectedDevice.collections?.[0]?.outputReports?.length || 0;
      setDebugInfo(`Dispositivo: ${selectedDevice.productName || 'N/A'}\nCollections: ${selectedDevice.collections?.length || 0}\nInput Reports: ${inputReportsCount}\nOutput Reports: ${outputReportsCount}\nEsperando datos...`);
      
      // Si el dispositivo funciona como teclado, enfocar el input
      // Esto es importante porque muchos lectores RFID funcionan como emuladores de teclado
      setTimeout(() => {
        if (keyboardInputRef.current) {
          keyboardInputRef.current.focus();
          console.log('[RFID] Input enfocado para capturar teclado');
          
          // Agregar listener global de teclado como respaldo
          const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Solo capturar si el input está enfocado o si es un carácter alfanumérico
            if (keyboardInputRef.current && (document.activeElement === keyboardInputRef.current || /^[a-zA-Z0-9]$/.test(e.key))) {
              console.log('[RFID] Tecla global detectada:', e.key);
            }
          };
          
          window.addEventListener('keydown', handleGlobalKeyDown);
          
          // Limpiar listener al desconectar
          return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
          };
        }
      }, 500);

      setDevice(selectedDevice);
      setStatus('connected');
      toast.success('Dispositivo RFID conectado correctamente');
    } catch (error) {
      console.error('Error conectando dispositivo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error conectando: ${errorMessage}`);
      setStatus('error');
    }
  }, [isWebHIDAvailable, handleInputReport]);

  // Desconectar dispositivo
  const disconnectDevice = useCallback(async () => {
    if (device) {
      try {
        if (inputReportListenerRef.current) {
          device.removeEventListener('inputreport', inputReportListenerRef.current);
          inputReportListenerRef.current = null;
        }

        if (device.opened) {
          await device.close();
        }

        setDevice(null);
        setStatus('disconnected');
        setLastUid('');
        toast.info('Dispositivo desconectado');
      } catch (error) {
        console.error('Error desconectando dispositivo:', error);
        toast.error('Error al desconectar el dispositivo');
      }
    }
  }, [device]);

  // Auto-conectar si está habilitado
  useEffect(() => {
    if (autoConnect && isWebHIDAvailable && status === 'disconnected') {
      connectDevice();
    }
  }, [autoConnect, isWebHIDAvailable, status, connectDevice]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (device && device.opened) {
        disconnectDevice();
      }
    };
  }, [device, disconnectDevice]);

  // Manejar desconexión del dispositivo
  useEffect(() => {
    if (!device) return;

    const handleDisconnect = () => {
      setDevice(null);
      setStatus('disconnected');
      toast.warning('El dispositivo se desconectó');
    };

    device.addEventListener('disconnect', handleDisconnect);

    return () => {
      device.removeEventListener('disconnect', handleDisconnect);
    };
  }, [device]);

  if (!isWebHIDAvailable) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">WebHID no disponible</span>
        </div>
        <p className="text-sm text-yellow-700 mt-2">
          Tu navegador no soporta WebHID. Por favor, usa Chrome, Edge u otro navegador basado en Chromium.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Usb className="h-5 w-5 text-slate-600" />
          <span className="font-medium text-slate-900">Lector RFID</span>
        </div>
        <Badge 
          variant={
            status === 'connected' ? 'default' : 
            status === 'connecting' ? 'secondary' : 
            status === 'error' ? 'destructive' : 
            'outline'
          }
          className="flex items-center gap-1"
        >
          {status === 'connected' && (
            <>
              <Radio className="h-3 w-3" />
              <span>Conectado</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Conectando...</span>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-3 w-3" />
              <span>Error</span>
            </>
          )}
          {status === 'disconnected' && (
            <>
              <XCircle className="h-3 w-3" />
              <span>Desconectado</span>
            </>
          )}
        </Badge>
      </div>

      <div className="space-y-3">
        {status === 'disconnected' && (
          <Button 
            onClick={connectDevice}
            className="w-full"
            variant="default"
          >
            <Usb className="mr-2 h-4 w-4" />
            Conectar Dispositivo
          </Button>
        )}

        {status === 'connecting' && (
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Selecciona el dispositivo en la ventana del navegador...</span>
          </div>
        )}

        {status === 'connected' && (
          <>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'read' | 'write')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="read" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Leer
                </TabsTrigger>
                <TabsTrigger value="write" className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Escribir
                </TabsTrigger>
              </TabsList>

              <TabsContent value="read" className="space-y-3 mt-4">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Listo para leer tarjetas</span>
                </div>
                <p className="text-xs text-slate-500">
                  💡 Si el dispositivo funciona como teclado, simplemente pasa la tarjeta y se capturará automáticamente
                </p>
                {/* Input visible para capturar si el dispositivo funciona como teclado */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-600">
                    Si el dispositivo funciona como teclado, el UID aparecerá aquí:
                  </label>
                  <input
                    ref={keyboardInputRef}
                    type="text"
                    autoFocus={mode === 'read'}
                    placeholder="El UID aparecerá aquí cuando pases la tarjeta..."
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      const value = target.value;
                      console.log('[RFID] Input de teclado detectado (onInput):', value);
                      
                      if (value && value !== keyboardInputValueRef.current) {
                        keyboardInputValueRef.current = value;
                        setDebugInfo(`Input de teclado detectado: ${value}`);
                        setReadEmpty(false);
                        
                        // Si el valor parece un UID (más de 4 caracteres), procesarlo
                        if (value.length >= 4) {
                          console.log('[RFID] Procesando UID desde teclado:', value);
                          handleCardRead(value);
                          // Limpiar después de un momento
                          setTimeout(() => {
                            if (keyboardInputRef.current) {
                              keyboardInputRef.current.value = '';
                              keyboardInputValueRef.current = '';
                              keyboardInputRef.current.focus();
                            }
                          }, 500);
                        }
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('[RFID] Input de teclado detectado (onChange):', value);
                      
                      if (value && value !== keyboardInputValueRef.current) {
                        keyboardInputValueRef.current = value;
                        setDebugInfo(`Input de teclado detectado: ${value}`);
                        setReadEmpty(false);
                        
                        if (value.length >= 4) {
                          console.log('[RFID] Procesando UID desde teclado (onChange):', value);
                          handleCardRead(value);
                          setTimeout(() => {
                            if (keyboardInputRef.current) {
                              keyboardInputRef.current.value = '';
                              keyboardInputValueRef.current = '';
                              keyboardInputRef.current.focus();
                            }
                          }, 500);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && keyboardInputRef.current?.value) {
                        const value = keyboardInputRef.current.value;
                        handleCardRead(value);
                        keyboardInputRef.current.value = '';
                        keyboardInputValueRef.current = '';
                      }
                    }}
                  />
                </div>
                {readEmpty && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    ⚠️ Tarjeta detectada pero no contiene datos
                  </div>
                )}
              </TabsContent>

              <TabsContent value="write" className="space-y-3 mt-4">
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <PenTool className="h-4 w-4" />
                  <span>Listo para escribir en tarjetas</span>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-600">
                    ID a escribir (12 dígitos):
                  </label>
                  <Input
                    type="text"
                    value={writeId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setWriteId(value);
                    }}
                    placeholder={generateAutoId()}
                    className="font-mono text-sm"
                    maxLength={12}
                    disabled={isWriting}
                  />
                  <p className="text-xs text-slate-400">
                    Si no especificas un ID, se usará el propuesto automáticamente
                  </p>
                </div>
                <Button
                  onClick={writeToCard}
                  disabled={isWriting || !device}
                  className="w-full"
                  variant="default"
                >
                  {isWriting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Escribiendo...
                    </>
                  ) : (
                    <>
                      <PenTool className="mr-2 h-4 w-4" />
                      Escribir en Tarjeta
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500">
                  💡 Acerca la tarjeta al lector y haz clic en "Escribir en Tarjeta"
                </p>
              </TabsContent>
            </Tabs>

            <Button 
              onClick={disconnectDevice}
              variant="outline"
              className="w-full mt-3"
            >
              Desconectar
            </Button>
          </>
        )}

        {status === 'error' && (
          <Button 
            onClick={connectDevice}
            variant="outline"
            className="w-full"
          >
            Reintentar Conexión
          </Button>
        )}

        {lastUid && (
          <div className="mt-3 p-3 bg-slate-100 rounded border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Último UID leído:</p>
            <code className="text-sm font-mono text-slate-900">
              {lastUid.match(/.{1,2}/g)?.join(':') || lastUid}
            </code>
          </div>
        )}

        {status === 'connected' && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="w-full text-xs"
            >
              {showDebug ? 'Ocultar' : 'Mostrar'} Debug
            </Button>
            {showDebug && debugInfo && (
              <div className="mt-2 p-2 bg-slate-900 text-green-400 rounded text-xs font-mono overflow-auto max-h-32">
                <p className="text-slate-400 mb-1">Último report recibido:</p>
                <p>{debugInfo}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
