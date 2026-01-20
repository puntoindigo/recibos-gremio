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
  const inputReportListenerRef = useRef<((event: HIDInputReportEvent) => void) | null>(null);
  const lastReadTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

  // Verificar si WebHID está disponible
  const isWebHIDAvailable = typeof navigator !== 'undefined' && 'hid' in navigator;

  // Formatear buffer a UID hexadecimal
  const formatUidFromBuffer = useCallback((buffer: DataView): string => {
    const bytes: string[] = [];
    // Leer los bytes del buffer (generalmente los primeros bytes contienen el UID)
    // Para el NSCCN Smart Reader, el UID suele estar en los primeros 4-8 bytes
    const maxBytes = Math.min(buffer.byteLength, 16);
    
    for (let i = 0; i < maxBytes; i++) {
      const byte = buffer.getUint8(i);
      // Ignorar bytes nulos al final, pero incluir ceros válidos en el medio
      bytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
    }
    
    // Eliminar ceros al final si existen
    while (bytes.length > 0 && bytes[bytes.length - 1] === '00') {
      bytes.pop();
    }
    
    // Unir sin separadores (se formateará después)
    return bytes.join('');
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
    if (!event.data) return;

    try {
      const buffer = new DataView(event.data.buffer);
      const uid = formatUidFromBuffer(buffer);
      
      if (uid) {
        handleCardRead(uid);
      }
    } catch (error) {
      console.error('Error procesando input report:', error);
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
      </div>
    </div>
  );
}
