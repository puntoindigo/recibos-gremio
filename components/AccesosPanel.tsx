'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, LogIn, LogOut, UserPlus, Trash2, Loader2, MapPin, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export default function AccesosPanel() {
  const router = useRouter();
  const { dataManager } = useCentralizedDataManager();
  const { data: session } = useSession();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Verificar si el usuario puede eliminar registros
  const canDelete = session?.user?.permissions?.includes('accesos') || session?.user?.permissions?.includes('*');

  const loadRegistros = async () => {
    try {
      setLoading(true);
      const registrosData = await dataManager.getAllRegistros();
      setRegistros(registrosData || []);
    } catch (error: any) {
      console.error('❌ Error cargando registros en Accesos:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        fullError: JSON.stringify(error, null, 2)
      });
      toast.error('Error cargando registros');
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistros();
  }, []);

  const handleDeleteRegistro = async (id: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar registros');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      return;
    }

    try {
      setDeletingId(id);
      await dataManager.deleteRegistro(id);
      toast.success('Registro eliminado exitosamente');
      await loadRegistros();
    } catch (error: any) {
      console.error('Error eliminando registro:', error);
      toast.error('Error eliminando registro');
    } finally {
      setDeletingId(null);
    }
  };

  const getActionIcon = (accion: string) => {
    switch (accion) {
      case 'entrada':
        return <LogIn className="h-4 w-4" />;
      case 'salida':
        return <LogOut className="h-4 w-4" />;
      case 'alta':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionBadgeColor = (accion: string) => {
    switch (accion) {
      case 'entrada':
        return 'bg-green-100 text-green-800';
      case 'salida':
        return 'bg-red-100 text-red-800';
      case 'alta':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accesos</CardTitle>
          <CardDescription>Cargando registros...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registros de Accesos
            </CardTitle>
            <CardDescription>
              Historial de entradas, salidas y altas de empleados
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/rfid')}
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Verificar Tarjeta RFID
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {registros.length > 0 ? (
            registros.map((registro) => (
              <div
                key={registro.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  registro.accion === 'entrada' 
                    ? 'bg-green-50 border-green-200' 
                    : registro.accion === 'salida'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    registro.accion === 'entrada' 
                      ? 'bg-green-200' 
                      : registro.accion === 'salida'
                      ? 'bg-red-200'
                      : 'bg-blue-200'
                  }`}>
                    {getActionIcon(registro.accion)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{registro.nombre}</span>
                      <Badge className={getActionBadgeColor(registro.accion)}>
                        {registro.accion.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span><strong>Legajo:</strong> {registro.legajo}</span>
                        <span><strong>Empresa:</strong> {registro.empresa}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(registro.fecha_hora)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {registro.sede || 'CENTRAL'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 ml-2"
                    onClick={() => handleDeleteRegistro(registro.id)}
                    disabled={deletingId === registro.id}
                  >
                    {deletingId === registro.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay registros disponibles</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

