// app/rfid/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  User, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface CardData {
  id: string;
  uid: string;
  legajo: string;
  empresa: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

export default function RfidReaderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<'waiting' | 'reading' | 'found' | 'not_found' | 'error'>('waiting');
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [uid, setUid] = useState<string>('');
  const [lastReadUid, setLastReadUid] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadTimeRef = useRef<number>(0);

  // Anti-rebote: ignorar lecturas repetidas en menos de 500ms
  const DEBOUNCE_MS = 500;


  // Enfocar el input al cargar la página
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Manejar lectura de tarjeta con anti-rebote
  const handleCardRead = useCallback(async (readUid: string) => {
    const now = Date.now();
    
    // Normalizar UID
    const normalizedUid = readUid.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '');

    if (!normalizedUid) {
      return;
    }

    // Anti-rebote: ignorar si es el mismo UID leído recientemente
    if (normalizedUid === lastReadUid && (now - lastReadTimeRef.current) < DEBOUNCE_MS) {
      return;
    }

    setLastReadUid(normalizedUid);
    lastReadTimeRef.current = now;
    setUid(normalizedUid);
    setStatus('reading');

    try {
      const response = await fetch('/api/rfid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: normalizedUid })
      });

      const data = await response.json();

      if (data.found && data.card) {
        setCardData(data.card);
        setStatus('found');
        toast.success(`Tarjeta encontrada: ${data.card.nombre}`);
      } else {
        setCardData(null);
        setStatus('not_found');
        // Solo informar que no está registrada (no permitir asociar desde aquí)
        // La asociación solo se hace desde la ficha del empleado
      }
    } catch (error) {
      console.error('Error verificando tarjeta:', error);
      setStatus('error');
      toast.error('Error verificando tarjeta');
    }
  }, [lastReadUid]);

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Si el valor contiene Enter o es suficientemente largo, procesar inmediatamente
    if (value.includes('\n') || value.length >= 10) {
      const uidToProcess = value.replace(/\n/g, '').trim();
      if (uidToProcess) {
        handleCardRead(uidToProcess);
        // Limpiar el input después de procesar
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.focus();
          }
        }, 100);
      }
      return;
    }

    // Debounce para valores parciales
    debounceTimerRef.current = setTimeout(() => {
      if (value.trim()) {
        handleCardRead(value);
      }
    }, 300);
  };


  // Resetear estado después de un tiempo
  useEffect(() => {
    if (status === 'found' || status === 'not_found') {
      const timer = setTimeout(() => {
        setStatus('waiting');
        setCardData(null);
        setUid('');
        if (inputRef.current) {
          inputRef.current.value = '';
          inputRef.current.focus();
        }
      }, 5000); // Resetear después de 5 segundos

      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold mb-2">Verificar Tarjeta RFID</h1>
        <p className="text-muted-foreground">
          Escribe el código de la tarjeta o acerca la tarjeta al lector para verificar a qué empleado pertenece
        </p>
      </div>

      {/* Input para capturar la lectura (automática o manual) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lectura de Tarjeta</CardTitle>
          <CardDescription>
            Acerca la tarjeta al lector o escribe el UID manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Escribe el UID de la tarjeta o acerca la tarjeta al lector..."
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (inputRef.current?.value) {
                    handleCardRead(inputRef.current.value);
                    inputRef.current.value = '';
                  }
                }
              }}
              autoFocus
              className="text-lg font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Presiona Enter o espera a que el lector escriba automáticamente el UID
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Estado visual */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Estado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {status === 'waiting' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="text-lg">Esperando tarjeta...</span>
              </>
            )}
            {status === 'reading' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
                <span className="text-lg">Leyendo tarjeta...</span>
              </>
            )}
            {status === 'found' && (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-lg text-green-600">Tarjeta encontrada</span>
              </>
            )}
            {status === 'not_found' && (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                <span className="text-lg text-red-600">Tarjeta no registrada</span>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="h-6 w-6 text-red-500" />
                <span className="text-lg text-red-600">Error de lectura</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* UID leído */}
      {uid && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>UID Leído</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-lg font-mono bg-muted p-2 rounded block">
              {uid}
            </code>
          </CardContent>
        </Card>
      )}

      {/* Datos del empleado si la tarjeta está registrada */}
      {status === 'found' && cardData && (
        <Card className="mb-6 border-green-500 border-2">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Tarjeta Encontrada - Empleado Asociado
            </CardTitle>
            <CardDescription className="text-green-600">
              Esta tarjeta está registrada y activa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{cardData.nombre}</p>
                  <p className="text-sm text-muted-foreground">Legajo: {cardData.legajo}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Legajo</p>
                <p className="text-lg font-semibold">{cardData.legajo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Empresa</p>
                <p className="text-lg font-semibold">{cardData.empresa}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Estado de la Tarjeta</p>
                <Badge variant={cardData.activo ? 'default' : 'secondary'} className="text-sm">
                  {cardData.activo ? '✓ Activa' : '✗ Inactiva'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Fecha de Registro</p>
                <p className="text-sm font-medium">
                  {new Date(cardData.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si la tarjeta no está registrada */}
      {status === 'not_found' && (
        <Card className="mb-6 border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Tarjeta No Registrada
            </CardTitle>
            <CardDescription>
              Esta tarjeta no está vinculada a ningún empleado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para asociar esta tarjeta a un empleado, ve a la ficha del empleado y agrega la tarjeta desde allí.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

