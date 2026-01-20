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
  Radio
} from 'lucide-react';
import { toast } from 'sonner';

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
  const inputReportListenerRef = useRef<((event: HIDInputReportEvent) => void) | null>(null);
  const lastReadTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

  // Verificar si WebHID está disponible
  const isWebHIDAvailable = typeof navigator !== 'undefined' && 'hid' in navigator;

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
    if (!event.data) {
      console.log('[RFID] Input report sin datos');
      return;
    }

    try {
      // Log para debug
      const rawData = Array.from(new Uint8Array(event.data.buffer))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      
      const debugMsg = `Report ID: ${event.reportId || 'N/A'}, Length: ${event.data.byteLength}, Data: ${rawData}`;
      setDebugInfo(debugMsg);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[RFID] Input report recibido:', {
          reportId: event.reportId,
          dataLength: event.data.byteLength,
          data: rawData
        });
      }

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
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[RFID] UID no válido o muy corto:', uid);
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

      // Log información del dispositivo (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('[RFID] Dispositivo conectado:', {
          vendorId: selectedDevice.vendorId.toString(16),
          productId: selectedDevice.productId.toString(16),
          productName: selectedDevice.productName,
          collections: selectedDevice.collections
        });
      }

      // Configurar listener para input reports
      if (inputReportListenerRef.current) {
        selectedDevice.removeEventListener('inputreport', inputReportListenerRef.current);
      }

      inputReportListenerRef.current = handleInputReport;
      selectedDevice.addEventListener('inputreport', handleInputReport);

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
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Listo para escanear tarjetas</span>
            </div>
            <Button 
              onClick={disconnectDevice}
              variant="outline"
              className="w-full"
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
