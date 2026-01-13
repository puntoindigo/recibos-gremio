// components/RfidCardsPanel.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { EmployeeSelector } from './EmployeeSelector';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

interface RfidCard {
  id: string;
  uid: string;
  legajo: string;
  empresa: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface RfidCardsPanelProps {
  legajo: string;
  empresa: string;
  nombre: string;
  collapsed?: boolean;
}

export default function RfidCardsPanel({ legajo, empresa, nombre, collapsed = false }: RfidCardsPanelProps) {
  const { dataManager } = useCentralizedDataManager();
  const [cards, setCards] = useState<RfidCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [currentUid, setCurrentUid] = useState('');
  const [selectedLegajo, setSelectedLegajo] = useState(legajo);
  const [employees, setEmployees] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadUidRef = useRef<string>('');
  const lastReadTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

  // Cargar empleados para el selector
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

  // Cargar tarjetas del empleado
  const loadCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rfid/employee/${legajo}?empresa=${encodeURIComponent(empresa)}`);
      const data = await response.json();
      
      if (data.success) {
        setCards(data.cards || []);
      } else {
        throw new Error(data.error || 'Error cargando tarjetas');
      }
    } catch (error) {
      console.error('Error cargando tarjetas:', error);
      toast.error('Error cargando tarjetas RFID');
    } finally {
      setIsLoading(false);
    }
  }, [legajo, empresa]);

  useEffect(() => {
    if (isExpanded) {
      loadCards();
    }
  }, [isExpanded, loadCards]);

  // Manejar lectura de tarjeta con anti-rebote
  const handleCardRead = useCallback(async (readUid: string) => {
    const now = Date.now();
    const normalizedUid = readUid.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '');

    if (!normalizedUid) return;

    // Anti-rebote
    if (normalizedUid === lastReadUidRef.current && (now - lastReadTimeRef.current) < DEBOUNCE_MS) {
      return;
    }

    lastReadUidRef.current = normalizedUid;
    lastReadTimeRef.current = now;
    setCurrentUid(normalizedUid);

    // Verificar si la tarjeta ya existe
    try {
      const response = await fetch('/api/rfid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: normalizedUid })
      });

      const data = await response.json();

      if (data.found) {
        toast.error(`Esta tarjeta ya está asociada a ${data.card.nombre} (${data.card.legajo})`);
        setCurrentUid('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }

      // Si no existe, abrir modal para asociar
      // Inicializar con el legajo del empleado actual del componente
      setSelectedLegajo(legajo);
      setShowAssociateModal(true);
    } catch (error) {
      console.error('Error verificando tarjeta:', error);
      toast.error('Error verificando tarjeta');
    }
  }, []);

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.includes('\n') || value.length >= 10) {
      const uidToProcess = value.replace(/\n/g, '').trim();
      if (uidToProcess) {
        handleCardRead(uidToProcess);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.value = '';
          }
        }, 100);
      }
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      if (value.trim()) {
        handleCardRead(value);
      }
    }, 300);
  };

  // Asociar tarjeta al empleado seleccionado
  const handleAssociate = async () => {
    if (!currentUid || !selectedLegajo) {
      toast.error('UID y empleado son requeridos');
      return;
    }

    // Buscar datos del empleado seleccionado
    const selectedEmployee = employees.find(emp => emp.legajo === selectedLegajo);
    if (!selectedEmployee) {
      toast.error('Empleado no encontrado');
      return;
    }

    const employeeEmpresa = selectedEmployee.data?.EMPRESA || empresa;
    const employeeNombre = selectedEmployee.nombre || nombre;

    setIsLoading(true);
    try {
      const response = await fetch('/api/rfid/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUid,
          legajo: selectedLegajo,
          empresa: employeeEmpresa,
          nombre: employeeNombre
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Tarjeta asociada correctamente');
        setShowAssociateModal(false);
        setCurrentUid('');
        const associatedLegajo = selectedLegajo;
        setSelectedLegajo(legajo);
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        // Recargar tarjetas si se asoció al empleado actual
        // Siempre recargar porque estamos en el componente del empleado actual
        if (associatedLegajo === legajo) {
          await loadCards();
        } else {
          // Si se asoció a otro empleado, también recargar por si acaso
          // (aunque no debería pasar si el modal se abre desde este componente)
          console.log(`Tarjeta asociada a ${associatedLegajo}, pero componente es para ${legajo}`);
        }
      } else {
        throw new Error(data.error || 'Error asociando tarjeta');
      }
    } catch (error) {
      console.error('Error asociando tarjeta:', error);
      toast.error(error instanceof Error ? error.message : 'Error asociando tarjeta');
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar tarjeta
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('¿Estás seguro de desactivar esta tarjeta?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/rfid/${cardId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Tarjeta desactivada');
        await loadCards();
      } else {
        throw new Error(data.error || 'Error eliminando tarjeta');
      }
    } catch (error) {
      console.error('Error eliminando tarjeta:', error);
      toast.error('Error eliminando tarjeta');
    } finally {
      setIsLoading(false);
    }
  };

  const hasCards = cards.length > 0;
  const activeCards = cards.filter(c => c.activo);

  return (
    <>
      <Card className={!hasCards && !isExpanded ? 'pb-5' : ''}>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Tarjetas RFID</CardTitle>
              {hasCards && (
                <Badge variant="secondary">
                  {activeCards.length} {activeCards.length === 1 ? 'activa' : 'activas'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>
          {!isExpanded && hasCards && (
            <CardDescription>
              {activeCards.length} {activeCards.length === 1 ? 'tarjeta activa' : 'tarjetas activas'}
            </CardDescription>
          )}
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {isLoading && cards.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Input para leer nueva tarjeta */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agregar Nueva Tarjeta</label>
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Escribe el UID manualmente o acerca la tarjeta al lector..."
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
                      disabled={isLoading}
                      className="flex-1 font-mono"
                    />
                    {isAddingCard && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddingCard(false);
                          if (inputRef.current) {
                            inputRef.current.value = '';
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escribe el UID manualmente o acerca la tarjeta RFID al lector para registrarla automáticamente
                  </p>
                </div>

                {/* Lista de tarjetas */}
                {hasCards ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Tarjetas Asociadas</h4>
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <code className="text-sm font-mono">{card.uid}</code>
                            <p className="text-xs text-muted-foreground">
                              Registrada el {new Date(card.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={card.activo ? 'default' : 'secondary'}>
                            {card.activo ? 'Activa' : 'Inactiva'}
                          </Badge>
                          {card.activo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCard(card.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay tarjetas asociadas</p>
                    <p className="text-sm">Acerca una tarjeta al lector para agregarla</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal para asociar tarjeta */}
      <Dialog open={showAssociateModal} onOpenChange={setShowAssociateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asociar Tarjeta RFID</DialogTitle>
            <DialogDescription>
              Asocia la tarjeta leída a un empleado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">UID de la Tarjeta</label>
              <code className="block mt-1 p-2 bg-muted rounded text-sm font-mono">
                {currentUid}
              </code>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Empleado</label>
              <EmployeeSelector
                employees={employees}
                value={selectedLegajo}
                onValueChange={setSelectedLegajo}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssociateModal(false);
                  setCurrentUid('');
                  setSelectedLegajo(legajo);
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssociate}
                disabled={isLoading || !selectedLegajo || !currentUid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Asociar Tarjeta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

