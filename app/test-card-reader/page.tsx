// app/test-card-reader/page.tsx
// Página de prueba para lector de tarjetas NFC/RFID

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CardData {
  uid: string;
  timestamp: string;
}

export default function TestCardReaderPage() {
  const [lastCard, setLastCard] = useState<CardData | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling cada 500ms para obtener el último UID leído
  useEffect(() => {
    if (!isPolling) return;

    const fetchLastCard = async () => {
      try {
        const response = await fetch('/api/nfc-card');
        const data = await response.json();
        
        setPollCount(prev => prev + 1);
        
        if (data.card) {
          // Solo actualizar si es una tarjeta nueva (UID diferente)
          if (!lastCard || lastCard.uid !== data.card.uid) {
            setLastCard(data.card);
            setIsConnected(true);
            toast.success(`Tarjeta detectada: ${data.card.uid}`);
          }
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error obteniendo tarjeta:', error);
        setIsConnected(false);
      }
    };

    // Polling inicial inmediato
    fetchLastCard();

    // Polling cada 500ms
    pollingIntervalRef.current = setInterval(fetchLastCard, 500);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling, lastCard]);

  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/nfc-card');
      const data = await response.json();
      
      if (data.card) {
        setLastCard(data.card);
        setIsConnected(true);
        toast.success('Datos actualizados');
      } else {
        toast.info('No hay tarjeta detectada');
      }
    } catch (error) {
      toast.error('Error al obtener datos');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Prueba Lector de Tarjetas NFC
          </h1>
          <p className="text-gray-600">
            Pasa una tarjeta sobre el lector JD014 para ver su UID
          </p>
        </div>

        {/* Estado del sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Estado del Sistema
              {isPolling ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
            </CardTitle>
            <CardDescription>
              {isPolling 
                ? 'Monitoreando lecturas en tiempo real...' 
                : 'Monitoreo pausado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Lector conectado' : 'Esperando lector...'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Polls: {pollCount}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setIsPolling(!isPolling)}
                variant={isPolling ? 'destructive' : 'default'}
                size="sm"
              >
                {isPolling ? 'Pausar' : 'Reanudar'} Monitoreo
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Última tarjeta detectada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Última Tarjeta Detectada
            </CardTitle>
            <CardDescription>
              Información de la última tarjeta leída por el dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastCard ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Tarjeta detectada correctamente
                  </span>
                </div>
                
                <div className="bg-gray-100 p-4 rounded-lg space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      UID (Identificador Único)
                    </label>
                    <div className="mt-1">
                      <Badge variant="default" className="text-lg font-mono px-3 py-1">
                        {lastCard.uid}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      Timestamp
                    </label>
                    <div className="mt-1 text-sm text-gray-700">
                      {formatTimestamp(lastCard.timestamp)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    💡 Este UID puede ser usado para asociar la tarjeta con un empleado en el sistema
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  No se ha detectado ninguna tarjeta aún
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Asegúrate de que el script nfc-reader.js esté corriendo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Instala las dependencias: <code className="bg-gray-100 px-1 rounded">npm install nfc-pcsc</code></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Conecta el lector JD014 por USB a tu computadora</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Inicia el servidor Next.js: <code className="bg-gray-100 px-1 rounded">npm run dev</code></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>En otra terminal, ejecuta el script: <code className="bg-gray-100 px-1 rounded">node scripts/nfc-reader.js</code></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span>Pasa una tarjeta sobre el lector y observa el UID aquí</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

