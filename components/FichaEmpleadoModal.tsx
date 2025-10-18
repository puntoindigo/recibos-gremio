// components/FichaEmpleadoModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Wallet, 
  Calendar, 
  CreditCard, 
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { getFichaEmpleado } from '@/lib/descuentos-manager';
import { db } from '@/lib/db';
import { formatTimestampForDisplay } from '@/lib/date-utils';

interface FichaEmpleadoModalProps {
  legajo: string;
  empresa: string;
  onClose: () => void;
}

interface FichaData {
  legajo: string;
  nombre: string;
  empresa: string;
  descuentosActivos: any[];
  descuentosPagados: any[];
  totalDescontar: number;
  totalPagado: number;
  saldoPendiente: number;
  cuotasRestantes: number;
}

export default function FichaEmpleadoModal({ legajo, empresa, onClose }: FichaEmpleadoModalProps) {
  const [fichaData, setFichaData] = useState<FichaData | null>(null);
  const [recibos, setRecibos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFichaData();
  }, [legajo, empresa]);

  const loadFichaData = async () => {
    setIsLoading(true);
    try {
      const ficha = await getFichaEmpleado(legajo, empresa);
      setFichaData(ficha);

      // Cargar recibos del empleado
      const recibosData = await db.consolidated
        .where('legajo')
        .equals(legajo)
        .toArray();
      setRecibos(recibosData);
    } catch (error) {
      console.error('Error cargando ficha del empleado:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'SUSPENDIDO': return 'bg-yellow-100 text-yellow-800';
      case 'FINALIZADO': return 'bg-blue-100 text-blue-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'PRESTAMO': return 'bg-purple-100 text-purple-800';
      case 'ADELANTO': return 'bg-orange-100 text-orange-800';
      case 'DESCUENTO_VARIO': return 'bg-gray-100 text-gray-800';
      case 'JUDICIAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando ficha del empleado...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!fichaData) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center p-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Empleado no encontrado</h3>
            <p className="text-gray-600">No se encontraron datos para el legajo {legajo}</p>
            <Button onClick={onClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Ficha del Empleado</span>
          </DialogTitle>
          <DialogDescription>
            Información completa de {fichaData.nombre} (Legajo: {fichaData.legajo})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen financiero */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total a Descontar</p>
                    <p className="text-2xl font-bold text-red-600">
                      ${fichaData.totalDescontar.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pagado</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${fichaData.totalPagado.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Saldo Pendiente</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${fichaData.saldoPendiente.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cuotas Restantes</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {fichaData.cuotasRestantes}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Descuentos activos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Descuentos Activos</span>
              </CardTitle>
              <CardDescription>
                Descuentos pendientes de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fichaData.descuentosActivos.length > 0 ? (
                <div className="space-y-3">
                  {fichaData.descuentosActivos.map((descuento) => (
                    <div key={descuento.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getTipoBadgeColor(descuento.tipoDescuento)}>
                            {descuento.tipoDescuento.replace('_', ' ')}
                          </Badge>
                          <Badge className={getEstadoBadgeColor(descuento.estado)}>
                            {descuento.estado}
                          </Badge>
                        </div>
                        <span className="text-lg font-semibold">
                          ${descuento.monto.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{descuento.descripcion}</p>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Cuotas: {descuento.cuotaActual}/{descuento.cantidadCuotas}</span>
                        <span>Inicio: {descuento.fechaInicio ? formatTimestampForDisplay(descuento.fechaInicio) : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay descuentos activos</p>
              )}
            </CardContent>
          </Card>

          {/* Descuentos pagados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Descuentos Pagados</span>
              </CardTitle>
              <CardDescription>
                Descuentos finalizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fichaData.descuentosPagados.length > 0 ? (
                <div className="space-y-3">
                  {fichaData.descuentosPagados.map((descuento) => (
                    <div key={descuento.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getTipoBadgeColor(descuento.tipoDescuento)}>
                            {descuento.tipoDescuento.replace('_', ' ')}
                          </Badge>
                          <Badge className={getEstadoBadgeColor(descuento.estado)}>
                            {descuento.estado}
                          </Badge>
                        </div>
                        <span className="text-lg font-semibold text-green-600">
                          ${descuento.monto.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{descuento.descripcion}</p>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Cuotas: {descuento.cuotaActual}/{descuento.cantidadCuotas}</span>
                        <span>Finalizado: {(descuento.fechaFin || descuento.fechaModificacion) ? formatTimestampForDisplay(descuento.fechaFin || descuento.fechaModificacion) : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay descuentos pagados</p>
              )}
            </CardContent>
          </Card>

          {/* Recibos de sueldo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Recibos de Sueldo</span>
              </CardTitle>
              <CardDescription>
                Historial de recibos procesados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recibos.length > 0 ? (
                <div className="space-y-2">
                  {recibos.map((recibo) => (
                    <div key={recibo.key} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Período: {recibo.periodo}</span>
                          <p className="text-sm text-gray-600">
                            Archivos: {recibo.archivos.join(', ')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {recibo.empresa || 'Sin empresa'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay recibos procesados</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { FichaEmpleadoModal };
