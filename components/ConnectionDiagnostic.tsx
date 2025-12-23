// components/ConnectionDiagnostic.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Wifi,
  WifiOff,
  Clock,
  Activity
} from 'lucide-react';
import { LoadingButton, LoadingCard } from '@/components/LoadingIndicator';
import { getSupabaseManager } from '@/lib/supabase-manager';
import { useSupabaseConnection } from '@/hooks/useSupabaseData';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  duration: number;
  details?: any;
}

export default function ConnectionDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [overallStatus, setOverallStatus] = useState<'unknown' | 'healthy' | 'warning' | 'error'>('unknown');
  
  const manager = getSupabaseManager();
  const { isConnected, error: connectionError, testConnection } = useSupabaseConnection();
  
  const runDiagnostics = async () => {
    setRunning(true);
    setProgress(0);
    setDiagnostics([]);
    
    const results: DiagnosticResult[] = [];
    const totalTests = 6;
    
    try {
      // Test 1: Conexión básica
      setProgress(16);
      const start1 = Date.now();
      try {
        const connectionTest = await manager.testConnection();
        const duration = Date.now() - start1;
        
        results.push({
          test: 'Conexión básica',
          status: connectionTest.success ? 'success' : 'error',
          message: connectionTest.success 
            ? `Conexión establecida en ${duration}ms`
            : `Error de conexión: ${connectionTest.error}`,
          duration,
          details: connectionTest
        });
      } catch (error) {
        results.push({
          test: 'Conexión básica',
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          duration: Date.now() - start1
        });
      }
      
      // Test 2: Lectura de recibos
      setProgress(32);
      const start2 = Date.now();
      try {
        const receipts = await manager.getAllReceipts();
        const duration = Date.now() - start2;
        
        results.push({
          test: 'Lectura de recibos',
          status: 'success',
          message: `${receipts.length} recibos cargados en ${duration}ms`,
          duration,
          details: { count: receipts.length }
        });
      } catch (error) {
        results.push({
          test: 'Lectura de recibos',
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          duration: Date.now() - start2
        });
      }
      
      // Test 3: Lectura de datos consolidados
      setProgress(48);
      const start3 = Date.now();
      try {
        const consolidated = await manager.getConsolidated();
        const duration = Date.now() - start3;
        
        results.push({
          test: 'Datos consolidados',
          status: 'success',
          message: `${consolidated.length} registros consolidados en ${duration}ms`,
          duration,
          details: { count: consolidated.length }
        });
      } catch (error) {
        results.push({
          test: 'Datos consolidados',
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          duration: Date.now() - start3
        });
      }
      
      // Test 4: Lectura de descuentos
      setProgress(64);
      const start4 = Date.now();
      try {
        const descuentos = await manager.getAllDescuentos();
        const duration = Date.now() - start4;
        
        results.push({
          test: 'Descuentos',
          status: 'success',
          message: `${descuentos.length} descuentos cargados en ${duration}ms`,
          duration,
          details: { count: descuentos.length }
        });
      } catch (error) {
        results.push({
          test: 'Descuentos',
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          duration: Date.now() - start4
        });
      }
      
      // Test 5: Estadísticas
      setProgress(80);
      const start5 = Date.now();
      try {
        const stats = await manager.getStats();
        const duration = Date.now() - start5;
        
        results.push({
          test: 'Estadísticas del sistema',
          status: 'success',
          message: `Estadísticas obtenidas en ${duration}ms`,
          duration,
          details: stats
        });
      } catch (error) {
        results.push({
          test: 'Estadísticas del sistema',
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          duration: Date.now() - start5
        });
      }
      
      // Test 6: Configuración
      setProgress(96);
      const start6 = Date.now();
      try {
        const config = await manager.getAppConfig('enableSupabaseStorage');
        const duration = Date.now() - start6;
        
        results.push({
          test: 'Configuración de aplicación',
          status: 'success',
          message: `Configuración leída en ${duration}ms`,
          duration,
          details: { enableSupabaseStorage: config }
        });
      } catch (error) {
        results.push({
          test: 'Configuración de aplicación',
          status: 'warning',
          message: `Advertencia: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          duration: Date.now() - start6
        });
      }
      
      setProgress(100);
      
      // Determinar estado general
      const errorCount = results.filter(r => r.status === 'error').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      
      if (errorCount === 0 && warningCount === 0) {
        setOverallStatus('healthy');
      } else if (errorCount === 0) {
        setOverallStatus('warning');
      } else {
        setOverallStatus('error');
      }
      
    } catch (error) {
      results.push({
        test: 'Diagnóstico general',
        status: 'error',
        message: `Error fatal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        duration: 0
      });
      setOverallStatus('error');
    } finally {
      setDiagnostics(results);
      setRunning(false);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };
  
  const getOverallStatusBadge = () => {
    switch (overallStatus) {
      case 'healthy':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-4 w-4 mr-1" />
            Saludable
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="default" className="bg-yellow-500">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Advertencias
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-4 w-4 mr-1" />
            Errores
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-4 w-4 mr-1" />
            No evaluado
          </Badge>
        );
    }
  };
  
  useEffect(() => {
    if (isConnected !== null) {
      runDiagnostics();
    }
  }, [isConnected]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diagnóstico de Conexión</h2>
          <p className="text-gray-600">Verificación del estado de Supabase</p>
        </div>
        
        <div className="flex items-center gap-2">
          {getOverallStatusBadge()}
          <LoadingButton
            loading={running}
            onClick={runDiagnostics}
            disabled={running}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Ejecutar Diagnóstico
          </LoadingButton>
        </div>
      </div>
      
      {/* Estado de conexión */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Estado de Conexión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <Wifi className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium text-green-700">Conectado a Supabase</p>
                  <p className="text-sm text-gray-600">Conexión establecida correctamente</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-medium text-red-700">Desconectado</p>
                  <p className="text-sm text-gray-600">
                    {connectionError || 'No se pudo establecer conexión'}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Progreso */}
      {running && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Ejecutando diagnósticos...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}
      
      {/* Resultados de diagnóstico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Resultados del Diagnóstico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingCard loading={running} error={null}>
            {diagnostics.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Haz clic en "Ejecutar Diagnóstico" para comenzar
              </div>
            ) : (
              <div className="space-y-3">
                {diagnostics.map((diagnostic, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${getStatusColor(diagnostic.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(diagnostic.status)}
                        <div>
                          <p className="font-medium">{diagnostic.test}</p>
                          <p className="text-sm text-gray-600">{diagnostic.message}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">{diagnostic.duration}ms</p>
                      </div>
                    </div>
                    
                    {diagnostic.details && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-500 cursor-pointer">
                          Ver detalles
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(diagnostic.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </LoadingCard>
        </CardContent>
      </Card>
      
      {/* Resumen */}
      {diagnostics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {diagnostics.filter(d => d.status === 'success').length}
                </p>
                <p className="text-sm text-gray-600">Exitosos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {diagnostics.filter(d => d.status === 'warning').length}
                </p>
                <p className="text-sm text-gray-600">Advertencias</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {diagnostics.filter(d => d.status === 'error').length}
                </p>
                <p className="text-sm text-gray-600">Errores</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {diagnostics.reduce((sum, d) => sum + d.duration, 0)}ms
                </p>
                <p className="text-sm text-gray-600">Tiempo total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
