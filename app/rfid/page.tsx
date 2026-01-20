// app/rfid/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  User, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowLeft,
  AlertCircle,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import RFIDReader from '@/components/RFIDReader';
import { EmployeeSelector } from '@/components/EmployeeSelector';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

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
  const { dataManager } = useCentralizedDataManager();
  const [status, setStatus] = useState<'waiting' | 'reading' | 'found' | 'not_found' | 'error'>('waiting');
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [uid, setUid] = useState<string>('');
  const [lastReadUid, setLastReadUid] = useState<string>('');
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [selectedLegajo, setSelectedLegajo] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [isAssociating, setIsAssociating] = useState(false);
  const lastReadTimeRef = useRef<number>(0);

  // Anti-rebote: ignorar lecturas repetidas en menos de 500ms
  const DEBOUNCE_MS = 500;

  // Cargar empleados
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const empleadosData = await dataManager.getConsolidated();
        setEmployees(empleadosData || []);
      } catch (error) {
        console.error('Error cargando empleados:', error);
      }
    };
    loadEmployees();
  }, [dataManager]);

  // Manejar lectura de tarjeta con anti-rebote
  const handleCardRead = useCallback(async (readUid: string) => {
    const now = Date.now();
    
    // Normalizar UID
    const normalizedUid = readUid.trim().replace(/\s+/g, '').replace(/:/g, '').toUpperCase();

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
        // Abrir modal para asociar
        setShowAssociateModal(true);
      }
    } catch (error) {
      console.error('Error verificando tarjeta:', error);
      setStatus('error');
      toast.error('Error verificando tarjeta');
    }
  }, [lastReadUid]);

  // Asociar tarjeta al empleado seleccionado
  const handleAssociate = async () => {
    if (!uid || !selectedLegajo) {
      toast.error('Selecciona un empleado para asociar la tarjeta');
      return;
    }

    // Buscar datos del empleado seleccionado
    const selectedEmployee = employees.find(emp => emp.legajo === selectedLegajo);
    if (!selectedEmployee) {
      toast.error('Empleado no encontrado');
      return;
    }

    const employeeEmpresa = selectedEmployee.data?.EMPRESA || 'Sin empresa';
    const employeeNombre = selectedEmployee.nombre || 'Sin nombre';

    setIsAssociating(true);
    try {
      const response = await fetch('/api/rfid/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid,
          legajo: selectedLegajo,
          empresa: employeeEmpresa,
          nombre: employeeNombre
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Tarjeta asociada correctamente');
        setShowAssociateModal(false);
        setSelectedLegajo('');
        // Verificar la tarjeta nuevamente para mostrar los datos
        await handleCardRead(uid);
      } else {
        if (data.error && data.details) {
          toast.error(`${data.error}: ${data.details.nombre} (${data.details.legajo})`);
        } else {
          toast.error(data.error || 'Error asociando tarjeta');
        }
      }
    } catch (error) {
      console.error('Error asociando tarjeta:', error);
      toast.error('Error asociando tarjeta');
    } finally {
      setIsAssociating(false);
    }
  };

  // Resetear estado después de un tiempo
  useEffect(() => {
    if (status === 'found' || status === 'not_found') {
      const timer = setTimeout(() => {
        setStatus('waiting');
        setCardData(null);
        setUid('');
        setLastReadUid('');
      }, 10000); // Resetear después de 10 segundos

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
        <h1 className="text-3xl font-bold mb-2">Asignar Tarjetas RFID</h1>
        <p className="text-muted-foreground">
          Conecta el lector RFID y acerca una tarjeta para asignarla a un empleado
        </p>
      </div>

      {/* Componente WebHID para lectura directa del hardware */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lector RFID Hardware</CardTitle>
          <CardDescription>
            Conecta el lector NSCCN Smart Reader para escanear tarjetas automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RFIDReader onCardRead={handleCardRead} />
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
                <XCircle className="h-6 w-6 text-yellow-500" />
                <span className="text-lg text-yellow-600">Tarjeta no registrada - Lista para asignar</span>
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
              {uid.match(/.{1,2}/g)?.join(':') || uid}
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

      {/* Modal para asociar tarjeta */}
      <Dialog open={showAssociateModal} onOpenChange={setShowAssociateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Asociar Tarjeta RFID</DialogTitle>
            <DialogDescription>
              Selecciona el empleado al que quieres asignar esta tarjeta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uid && (
              <div className="p-3 bg-slate-100 rounded border">
                <p className="text-xs text-slate-500 mb-1">UID de la tarjeta:</p>
                <code className="text-sm font-mono text-slate-900">
                  {uid.match(/.{1,2}/g)?.join(':') || uid}
                </code>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Empleado *</label>
              <EmployeeSelector
                employees={employees}
                value={selectedLegajo}
                onValueChange={setSelectedLegajo}
                placeholder="Buscar por legajo o nombre..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssociateModal(false);
                  setSelectedLegajo('');
                }}
                disabled={isAssociating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssociate}
                disabled={!selectedLegajo || isAssociating}
              >
                {isAssociating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Asociando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Asociar Tarjeta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
