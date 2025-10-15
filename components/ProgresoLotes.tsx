import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { LoteInfo } from '@/lib/pdf-splitter';

interface ProgresoLotesProps {
  lotes: LoteInfo[];
  totalRecibos: number;
  recibosProcesados: number;
  originalName: string;
  isVisible: boolean;
}

export function ProgresoLotes({ 
  lotes, 
  totalRecibos, 
  recibosProcesados, 
  originalName, 
  isVisible 
}: ProgresoLotesProps) {
  if (!isVisible || lotes.length === 0) {
    return null;
  }

  const lotesCompletados = lotes.filter(l => l.estado === 'completado').length;
  const lotesProcesando = lotes.filter(l => l.estado === 'procesando').length;
  const lotesConError = lotes.filter(l => l.estado === 'error').length;
  const lotesPendientes = lotes.filter(l => l.estado === 'pendiente').length;

  const porcentajeTotal = totalRecibos > 0 ? (recibosProcesados / totalRecibos) * 100 : 0;
  const porcentajeLotes = lotes.length > 0 ? (lotesCompletados / lotes.length) * 100 : 0;

  const getEstadoIcon = (estado: LoteInfo['estado']) => {
    switch (estado) {
      case 'completado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'procesando':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pendiente':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEstadoColor = (estado: LoteInfo['estado']) => {
    switch (estado) {
      case 'completado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'procesando':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pendiente':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 shadow-lg z-50 bg-white dark:bg-gray-800 border rounded-lg p-4 min-w-[400px] max-w-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Procesando PDF en cascada
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {originalName} → {lotes.length} lotes → {totalRecibos} recibos
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progreso total */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progreso total</span>
            <span>{recibosProcesados}/{totalRecibos} recibos ({porcentajeTotal.toFixed(1)}%)</span>
          </div>
          <Progress value={porcentajeTotal} className="h-2" />
        </div>

        {/* Progreso por lotes */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progreso por lotes</span>
            <span>{lotesCompletados}/{lotes.length} lotes ({porcentajeLotes.toFixed(1)}%)</span>
          </div>
          <Progress value={porcentajeLotes} className="h-2" />
        </div>

        {/* Resumen de estados */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            ✅ {lotesCompletados} completados
          </Badge>
          <Badge variant="outline" className="text-xs">
            🔄 {lotesProcesando} procesando
          </Badge>
          {lotesPendientes > 0 && (
            <Badge variant="outline" className="text-xs">
              ⏳ {lotesPendientes} pendientes
            </Badge>
          )}
          {lotesConError > 0 && (
            <Badge variant="outline" className="text-xs">
              ❌ {lotesConError} errores
            </Badge>
          )}
        </div>

        {/* Lista de lotes */}
        <div className="max-h-[200px] overflow-y-auto space-y-2">
          {lotes.map((lote) => (
            <div key={lote.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="flex items-center gap-2">
                {getEstadoIcon(lote.estado)}
                <span className="font-medium">Lote {lote.id}/{lote.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${getEstadoColor(lote.estado)}`}>
                  {lote.estado}
                </Badge>
                <span className="text-muted-foreground">
                  {lote.recibosProcesados}/{lote.recibosTotal}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tiempo estimado */}
        {lotesProcesando > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            ⏱️ Procesando {lotesProcesando} lote{lotesProcesando > 1 ? 's' : ''} en paralelo
          </div>
        )}
      </CardContent>
    </div>
  );
}
