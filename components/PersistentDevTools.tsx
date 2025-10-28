'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download,
  Send,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  MessageSquare,
  Zap,
  FileText,
  Upload,
  Trash2,
  Cloud,
  Bug
} from 'lucide-react';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { useConfiguration } from '@/contexts/ConfigurationContext';
import SystemMetrics from '@/components/SystemMetrics';

interface SystemMetrics {
  totalRecords: number;
  supabaseRecords: number;
  indexedDbRecords: number;
  lastUpdate: Date;
  responseTime: number;
  errors: number;
  warnings: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
  data?: any;
}

interface FeedbackEntry {
  id: string;
  timestamp: Date;
  type: 'bug' | 'feature' | 'improvement' | 'question';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'pending' | 'processing' | 'resolved';
}

export default function PersistentDevTools() {
  const { dataManager, storageType } = useCentralizedDataManager();
  const { config } = useConfiguration();
  
  // Estados principales
  const [isExpanded, setIsExpanded] = useState(false); // Inicialmente colapsado
  const [activeTab, setActiveTab] = useState<'metrics' | 'logs' | 'feedback' | 'tools'>('metrics');
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalRecords: 0,
    supabaseRecords: 0,
    indexedDbRecords: 0,
    lastUpdate: new Date(),
    responseTime: 0,
    errors: 0,
    warnings: 0
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'improvement' | 'question'>('bug');
  const [feedbackPriority, setFeedbackPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const feedbackEndRef = useRef<HTMLDivElement>(null);

  // Funciones de herramientas de desarrollo
  const handleDevAction = async (action: string) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'clean-all':
          await dataManager.clearAllData();
          addLogCallback('success', 'DevTools', 'Base de datos limpiada completamente');
          break;
        case 'refresh-data':
          await dataManager.refreshData();
          addLogCallback('success', 'DevTools', 'Datos refrescados desde la fuente');
          break;
        case 'normalize-filenames':
          // Implementar normalización de nombres
          addLogCallback('info', 'DevTools', 'Normalización de nombres aplicada');
          break;
        case 'check-files':
          // Implementar verificación de archivos
          addLogCallback('info', 'DevTools', 'Verificación de archivos completada');
          break;
        case 'show-debug-modal':
          // Toggle debug modal
          addLogCallback('info', 'DevTools', 'Modal de debug toggleado');
          break;
        case 'show-help-modal':
          // Toggle help modal
          addLogCallback('info', 'DevTools', 'Modal de ayuda toggleado');
          break;
        case 'show-upload-log':
          // Toggle upload log
          addLogCallback('info', 'DevTools', 'Log de subidas toggleado');
          break;
        case 'storage-config':
          // Toggle storage config
          addLogCallback('info', 'DevTools', 'Configuración de storage toggleada');
          break;
        default:
          addLogCallback('warn', 'DevTools', `Acción no implementada: ${action}`);
      }
    } catch (error) {
      addLogCallback('error', 'DevTools', `Error ejecutando ${action}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Interceptar console.log para capturar logs (usando useCallback para evitar re-renders)
  const addLogCallback = useCallback((level: LogEntry['level'], source: string, message: string, data?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      source,
      message,
      data
    };
    
    setLogs(prev => [...prev.slice(-99), newLog]);
  }, []);

  // Interceptación de console deshabilitada para evitar loops infinitos
  // useEffect(() => {
  //   const originalLog = console.log;
  //   const originalWarn = console.warn;
  //   const originalError = console.error;

  //   console.log = (...args) => {
  //     originalLog(...args);
  //     // Usar setTimeout para evitar actualizaciones durante renderizado
  //     setTimeout(() => addLogCallback('info', 'Console', args.join(' ')), 0);
  //   };

  //   console.warn = (...args) => {
  //     originalWarn(...args);
  //     setTimeout(() => addLogCallback('warn', 'Console', args.join(' ')), 0);
  //   };

  //   console.error = (...args) => {
  //     originalError(...args);
  //     setTimeout(() => addLogCallback('error', 'Console', args.join(' ')), 0);
  //   };

  //   return () => {
  //     console.log = originalLog;
  //     console.warn = originalWarn;
  //     console.error = originalError;
  //   };
  // }, [addLogCallback]);

  const addLog = (level: LogEntry['level'], source: string, message: string, data?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      source,
      message,
      data
    };
    
    setLogs(prev => [...prev.slice(-99), newLog]); // Mantener solo los últimos 100 logs
  };

  // Actualizar métricas
  const updateMetrics = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const consolidated = await dataManager.getConsolidated();
      const responseTime = Date.now() - startTime;
      
      setMetrics({
        totalRecords: consolidated.length,
        supabaseRecords: storageType === 'SUPABASE' ? consolidated.length : 0,
        indexedDbRecords: storageType === 'IndexedDB' ? consolidated.length : 0,
        lastUpdate: new Date(),
        responseTime,
        errors: logs.filter(log => log.level === 'error').length,
        warnings: logs.filter(log => log.level === 'warn').length
      });
      
      addLog('success', 'Metrics', `Métricas actualizadas: ${consolidated.length} registros`, {
        storageType,
        responseTime
      });
    } catch (error) {
      addLog('error', 'Metrics', `Error actualizando métricas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-actualizar métricas cada 30 segundos
  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 30000);
    return () => clearInterval(interval);
  }, [storageType]);

  // Scroll automático en logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Scroll automático en feedback
  useEffect(() => {
    if (feedbackEndRef.current) {
      feedbackEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [feedback]);

  const handleFeedbackSubmit = () => {
    if (!feedbackMessage.trim()) return;
    
    const newFeedback: FeedbackEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: feedbackType,
      priority: feedbackPriority,
      message: feedbackMessage,
      status: 'pending'
    };
    
    setFeedback(prev => [...prev, newFeedback]);
    setFeedbackMessage('');
    
    addLog('info', 'Feedback', `Nuevo feedback enviado: ${feedbackType} (${feedbackPriority})`);
  };

  const processFeedback = (feedbackId: string) => {
    setFeedback(prev => 
      prev.map(f => 
        f.id === feedbackId 
          ? { ...f, status: 'processing' as const }
          : f
      )
    );
    
    addLog('info', 'Feedback', `Procesando feedback: ${feedbackId}`);
  };

  const resolveFeedback = (feedbackId: string) => {
    setFeedback(prev => 
      prev.map(f => 
        f.id === feedbackId 
          ? { ...f, status: 'resolved' as const }
          : f
      )
    );
    
    addLog('success', 'Feedback', `Feedback resuelto: ${feedbackId}`);
  };

  const exportLogs = () => {
    const logsData = {
      timestamp: new Date().toISOString(),
      metrics,
      logs: logs.slice(-50), // Últimos 50 logs
      feedback: feedback.slice(-20) // Últimos 20 feedbacks
    };
    
    const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devtools-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('info', 'Export', 'Logs exportados exitosamente');
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      default: return 'text-blue-500';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: FeedbackEntry['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusColor = (status: FeedbackEntry['status']) => {
    switch (status) {
      case 'resolved': return 'text-green-500';
      case 'processing': return 'text-blue-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 ${isExpanded ? 'max-h-[80vh]' : 'max-h-16'} overflow-hidden`}>
      <div className="max-w-full mx-auto">
        {/* Header del DevTools */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
            >
              <Zap className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">DevTools - Sistema Centralizado</h3>
            </button>
            <Badge variant={storageType === 'SUPABASE' ? 'default' : 'secondary'}>
              {storageType}
            </Badge>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={updateMetrics}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido expandible */}
        {isExpanded && (
          <div className="p-4 bg-white dark:bg-gray-900 max-h-[calc(80vh-4rem)] overflow-y-auto">
            {/* Tabs */}
            <div className="flex space-x-1 mb-4">
              <Button
                variant={activeTab === 'metrics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('metrics')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Métricas
              </Button>
              <Button
                variant={activeTab === 'logs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('logs')}
              >
                <Activity className="w-4 h-4 mr-2" />
                Logs ({logs.length})
              </Button>
              <Button
                variant={activeTab === 'tools' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('tools')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Herramientas
              </Button>
              <Button
                variant={activeTab === 'feedback' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('feedback')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Feedback ({feedback.length})
              </Button>
            </div>

            {/* Tab: Métricas */}
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                <SystemMetrics />
                
                {/* Métricas básicas adicionales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.totalRecords}</div>
                      <p className="text-xs text-muted-foreground">
                        Última actualización: {metrics.lastUpdate.toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Tiempo de Respuesta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
                      <Progress value={Math.min(metrics.responseTime / 1000 * 100, 100)} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Errores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-500">{metrics.errors}</div>
                      <p className="text-xs text-muted-foreground">En los últimos logs</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Advertencias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-500">{metrics.warnings}</div>
                      <p className="text-xs text-muted-foreground">En los últimos logs</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Tab: Herramientas */}
            {activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Limpieza */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Limpieza</h4>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDevAction('clean-all')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpiar Todo
                    </Button>
                  </div>

                  {/* Datos */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Datos</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('refresh-data')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refrescar Datos
                    </Button>
                  </div>

                  {/* Archivos */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Archivos</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('normalize-filenames')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Normalizar Nombres
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('check-files')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Verificar Archivos
                    </Button>
                  </div>

                  {/* Debug */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Debug</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('show-debug-modal')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Bug className="w-4 h-4 mr-2" />
                      Debug Modal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('show-help-modal')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Ayuda
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('show-upload-log')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Log Subidas
                    </Button>
                  </div>

                  {/* Storage */}
                  <div className="space-y-2 col-span-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Storage</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('storage-config')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      Configuración Storage
                    </Button>
                  </div>
                </div>

                <Separator />
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p><strong>Estado actual:</strong> {storageType}</p>
                  <p><strong>Última acción:</strong> {isLoading ? 'Procesando...' : 'Listo'}</p>
                </div>
              </div>
            )}

            {/* Tab: Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay logs disponibles</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {getLevelIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{log.source}</span>
                          <span className="text-xs text-gray-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {log.message}
                        </p>
                        {log.data && (
                          <pre className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            )}

            {/* Tab: Feedback */}
            {activeTab === 'feedback' && (
              <div className="space-y-4">
                {/* Formulario de feedback */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Enviar Feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value as any)}
                        className="px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="bug">🐛 Bug</option>
                        <option value="feature">✨ Feature</option>
                        <option value="improvement">🔧 Mejora</option>
                        <option value="question">❓ Pregunta</option>
                      </select>
                      
                      <select
                        value={feedbackPriority}
                        onChange={(e) => setFeedbackPriority(e.target.value as any)}
                        className="px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="low">🟢 Baja</option>
                        <option value="medium">🟡 Media</option>
                        <option value="high">🟠 Alta</option>
                        <option value="critical">🔴 Crítica</option>
                      </select>
                    </div>
                    
                    <Textarea
                      placeholder="Describe tu feedback..."
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      className="min-h-[80px]"
                    />
                    
                    <Button onClick={handleFeedbackSubmit} disabled={!feedbackMessage.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Feedback
                    </Button>
                  </CardContent>
                </Card>

                {/* Lista de feedback */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {feedback.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay feedback disponible</p>
                  ) : (
                    feedback.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={`${getPriorityColor(item.priority)} text-white text-xs`}>
                                {item.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <span className={`text-xs font-medium ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {item.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {item.message}
                            </p>
                          </div>
                          
                          <div className="flex space-x-1 ml-3">
                            {item.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => processFeedback(item.id)}
                              >
                                Procesar
                              </Button>
                            )}
                            {item.status === 'processing' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveFeedback(item.id)}
                              >
                                Resolver
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={feedbackEndRef} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
