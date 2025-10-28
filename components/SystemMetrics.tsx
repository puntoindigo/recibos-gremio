'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

interface DetailedMetrics {
  storageType: 'IndexedDB' | 'SUPABASE';
  totalRecords: number;
  responseTime: number;
  lastUpdate: Date;
  errors: number;
  warnings: number;
  successRate: number;
  averageResponseTime: number;
  peakResponseTime: number;
  dataIntegrity: 'excellent' | 'good' | 'warning' | 'critical';
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export default function SystemMetrics() {
  const { dataManager, storageType } = useCentralizedDataManager();
  const [metrics, setMetrics] = useState<DetailedMetrics>({
    storageType,
    totalRecords: 0,
    responseTime: 0,
    lastUpdate: new Date(),
    errors: 0,
    warnings: 0,
    successRate: 100,
    averageResponseTime: 0,
    peakResponseTime: 0,
    dataIntegrity: 'excellent',
    systemHealth: 'healthy'
  });

  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const updateMetrics = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const consolidated = await dataManager.getConsolidated();
      const responseTime = Date.now() - startTime;
      
      // Actualizar historial de tiempos de respuesta
      const newResponseTimes = [...responseTimes, responseTime].slice(-10); // Últimos 10
      setResponseTimes(newResponseTimes);
      
      const averageResponseTime = newResponseTimes.reduce((a, b) => a + b, 0) / newResponseTimes.length;
      const peakResponseTime = Math.max(...newResponseTimes);
      
      // Calcular integridad de datos
      let dataIntegrity: DetailedMetrics['dataIntegrity'] = 'excellent';
      if (consolidated.length === 0) {
        dataIntegrity = 'critical';
      } else if (consolidated.length < 10) {
        dataIntegrity = 'warning';
      } else if (consolidated.length < 50) {
        dataIntegrity = 'good';
      }
      
      // Calcular salud del sistema
      let systemHealth: DetailedMetrics['systemHealth'] = 'healthy';
      if (responseTime > 5000) {
        systemHealth = 'critical';
      } else if (responseTime > 2000) {
        systemHealth = 'degraded';
      }
      
      setMetrics({
        storageType,
        totalRecords: consolidated.length,
        responseTime,
        lastUpdate: new Date(),
        errors: 0, // Se actualizará desde los logs
        warnings: 0, // Se actualizará desde los logs
        successRate: 100, // Se calculará desde los logs
        averageResponseTime: Math.round(averageResponseTime),
        peakResponseTime,
        dataIntegrity,
        systemHealth
      });
    } catch (error) {
      console.error('Error actualizando métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 10000); // Cada 10 segundos
    return () => clearInterval(interval);
  }, [storageType]);

  const getHealthColor = (health: DetailedMetrics['systemHealth']) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
    }
  };

  const getHealthIcon = (health: DetailedMetrics['systemHealth']) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getIntegrityColor = (integrity: DetailedMetrics['dataIntegrity']) => {
    switch (integrity) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
    }
  };

  const getIntegrityIcon = (integrity: DetailedMetrics['dataIntegrity']) => {
    switch (integrity) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'good': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Estado del Sistema */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Estado del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-2">
            {getHealthIcon(metrics.systemHealth)}
            <span className={`font-medium ${getHealthColor(metrics.systemHealth)}`}>
              {metrics.systemHealth.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">
              {metrics.storageType}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Registros Totales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Registros Totales</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalRecords}</div>
          <div className="flex items-center space-x-2 mt-2">
            {getIntegrityIcon(metrics.dataIntegrity)}
            <span className={`text-xs ${getIntegrityColor(metrics.dataIntegrity)}`}>
              {metrics.dataIntegrity.toUpperCase()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tiempo de Respuesta */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Tiempo de Respuesta</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
          <div className="text-xs text-gray-600 mt-1">
            Promedio: {metrics.averageResponseTime}ms
          </div>
          <div className="text-xs text-gray-600">
            Pico: {metrics.peakResponseTime}ms
          </div>
          <Progress 
            value={Math.min(metrics.responseTime / 1000 * 100, 100)} 
            className="mt-2" 
          />
        </CardContent>
      </Card>

      {/* Rendimiento */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tasa de Éxito</span>
              <span className="font-medium">{metrics.successRate}%</span>
            </div>
            <Progress value={metrics.successRate} className="mt-1" />
            
            <div className="flex justify-between text-sm mt-3">
              <span>Errores</span>
              <span className="font-medium text-red-500">{metrics.errors}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Advertencias</span>
              <span className="font-medium text-yellow-500">{metrics.warnings}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Respuesta */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Historial de Respuesta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {responseTimes.slice(-5).map((time, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>#{responseTimes.length - 5 + index + 1}</span>
                <span className={time > 2000 ? 'text-red-500' : time > 1000 ? 'text-yellow-500' : 'text-green-500'}>
                  {time}ms
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Última Actualización */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            {metrics.lastUpdate.toLocaleTimeString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isLoading ? 'Actualizando...' : 'Sincronizado'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




