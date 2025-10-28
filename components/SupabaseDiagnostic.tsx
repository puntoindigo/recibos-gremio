// components/SupabaseDiagnostic.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Activity,
  BarChart3
} from 'lucide-react';
import { LoadingButton } from '@/components/LoadingIndicator';
import { getSupabaseManager } from '@/lib/supabase-manager';

interface TableDiagnosis {
  receipts: { count: number; sample: any[] };
  consolidated: { count: number; sample: any[] };
  descuentos: { count: number; sample: any[] };
  pendingItems: { count: number; sample: any[] };
}

export default function SupabaseDiagnostic() {
  const [diagnosis, setDiagnosis] = useState<TableDiagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const runDiagnosis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const manager = getSupabaseManager();
      const result = await manager.diagnoseTables();
      setDiagnosis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    runDiagnosis();
  }, []);
  
  const getTableStatus = (count: number) => {
    if (count === 0) return 'empty';
    if (count < 5) return 'low';
    return 'good';
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'empty':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'low':
        return 'bg-yellow-50 border-yellow-200';
      case 'empty':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'good':
        return 'Datos suficientes';
      case 'low':
        return 'Pocos datos';
      case 'empty':
        return 'Sin datos';
      default:
        return 'Desconocido';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diagnóstico de Supabase</h2>
          <p className="text-gray-600">Estado de las tablas de datos</p>
        </div>
        
        <LoadingButton
          loading={loading}
          onClick={runDiagnosis}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Ejecutar Diagnóstico
        </LoadingButton>
      </div>
      
      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Error ejecutando diagnóstico: {error}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Diagnóstico */}
      {diagnosis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tabla Receipts */}
          <Card className={getStatusColor(getTableStatus(diagnosis.receipts.count))}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(getTableStatus(diagnosis.receipts.count))}
                Tabla Receipts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Registros:</span>
                  <Badge variant={diagnosis.receipts.count > 0 ? "default" : "destructive"}>
                    {diagnosis.receipts.count}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="text-sm">{getStatusText(getTableStatus(diagnosis.receipts.count))}</span>
                </div>
                {diagnosis.receipts.sample.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      Ver muestra
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(diagnosis.receipts.sample[0], null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Tabla Consolidated */}
          <Card className={getStatusColor(getTableStatus(diagnosis.consolidated.count))}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(getTableStatus(diagnosis.consolidated.count))}
                Tabla Consolidated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Registros:</span>
                  <Badge variant={diagnosis.consolidated.count > 0 ? "default" : "destructive"}>
                    {diagnosis.consolidated.count}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="text-sm">{getStatusText(getTableStatus(diagnosis.consolidated.count))}</span>
                </div>
                {diagnosis.consolidated.sample.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      Ver muestra
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(diagnosis.consolidated.sample[0], null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Tabla Descuentos */}
          <Card className={getStatusColor(getTableStatus(diagnosis.descuentos.count))}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(getTableStatus(diagnosis.descuentos.count))}
                Tabla Descuentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Registros:</span>
                  <Badge variant={diagnosis.descuentos.count > 0 ? "default" : "destructive"}>
                    {diagnosis.descuentos.count}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="text-sm">{getStatusText(getTableStatus(diagnosis.descuentos.count))}</span>
                </div>
                {diagnosis.descuentos.sample.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      Ver muestra
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(diagnosis.descuentos.sample[0], null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Tabla Pending Items */}
          <Card className={getStatusColor(getTableStatus(diagnosis.pendingItems.count))}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(getTableStatus(diagnosis.pendingItems.count))}
                Tabla Pending Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Registros:</span>
                  <Badge variant={diagnosis.pendingItems.count > 0 ? "default" : "destructive"}>
                    {diagnosis.pendingItems.count}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="text-sm">{getStatusText(getTableStatus(diagnosis.pendingItems.count))}</span>
                </div>
                {diagnosis.pendingItems.sample.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      Ver muestra
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(diagnosis.pendingItems.sample[0], null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Resumen */}
      {diagnosis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumen del Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {diagnosis.receipts.count}
                </p>
                <p className="text-sm text-gray-600">Recibos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {diagnosis.consolidated.count}
                </p>
                <p className="text-sm text-gray-600">Consolidados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {diagnosis.descuentos.count}
                </p>
                <p className="text-sm text-gray-600">Descuentos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {diagnosis.pendingItems.count}
                </p>
                <p className="text-sm text-gray-600">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
