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
import { useUploadResume } from '@/hooks/useUploadResume';
import SystemMetrics from '@/components/SystemMetrics';
import { ConfirmModal } from '@/components/ConfirmModal';
import { toast } from 'sonner';

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
  const { resumeUpload, isResuming } = useUploadResume();
  const [sessions, setSessions] = useState<any[]>([]);
  
  // Cargar sesiones al montar
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const allSessions = await dataManager.getUploadSessions();
        setSessions(allSessions || []);
      } catch (error) {
        console.error('Error cargando sesiones:', error);
        setSessions([]);
      }
    };
    loadSessions();
  }, [dataManager]);
  
  const clearSessions = useCallback(async () => {
    try {
      await dataManager.clearUploadSessions();
      setSessions([]);
    } catch (error) {
      console.error('Error limpiando sesiones:', error);
    }
  }, [dataManager]);
  
  const resumeSession = useCallback(async (sessionId: string) => {
    try {
      await resumeUpload(sessionId);
      // Recargar sesiones después de reanudar
      const allSessions = await dataManager.getUploadSessions();
      setSessions(allSessions || []);
    } catch (error) {
      console.error('Error reanudando sesión:', error);
    }
  }, [dataManager, resumeUpload]);
  
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
  
  // Estados para modales de confirmación
  const [showDeleteVisibleModal, setShowDeleteVisibleModal] = useState(false);
  const [showDeleteControlModal, setShowDeleteControlModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showClearSessionsModal, setShowClearSessionsModal] = useState(false);
  const [deleteVisibleData, setDeleteVisibleData] = useState<{consolidatedCount: number, receiptsCount: number} | null>(null);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const feedbackEndRef = useRef<HTMLDivElement>(null);

  // Funciones de herramientas de desarrollo
  const handleDevAction = async (action: string) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'clean-all':
          setShowClearAllModal(true);
          break;
        case 'delete-visible':
          await handleDeleteVisible();
          break;
        case 'delete-control':
          await handleDeleteControl();
          break;
        case 'clear-sessions':
          setShowClearSessionsModal(true);
          break;
        case 'refresh-data':
          await dataManager.refreshData();
          addLogCallback('success', 'DevTools', 'Datos refrescados desde la fuente');
          break;
        case 'check-database':
          await checkDatabase();
          break;
        case 'check-pending-uploads':
          await checkPendingUploads();
          break;
        case 'normalize-filenames':
          // Implementar normalización de nombres
          addLogCallback('info', 'DevTools', 'Normalización de nombres aplicada');
          break;
        case 'check-files':
          // Implementar verificación de archivos
          addLogCallback('info', 'DevTools', 'Verificación de archivos completada');
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

  // Funciones específicas de limpieza
  const handleDeleteVisible = async () => {
    try {
      // Obtener datos directamente SIN cache para contar correctamente
      // Usar getConsolidated() y getReceipts() que ya limpian cache cuando es necesario
      const allConsolidated = await dataManager.getConsolidated();
      const allReceipts = await dataManager.getReceipts();
      
      const consolidatedCount = allConsolidated?.length || 0;
      const receiptsCount = allReceipts?.length || 0;
      
      console.log('🔍 Debug - Conteo de registros:', {
        consolidatedCount,
        receiptsCount,
        total: consolidatedCount + receiptsCount,
        consolidatedSample: allConsolidated?.slice(0, 3)?.map(r => ({ key: r.key, legajo: r.legajo, empresa: r.data?.EMPRESA }))
      });
      
      if (consolidatedCount === 0 && receiptsCount === 0) {
        toast.info('No hay registros para eliminar');
        addLogCallback('info', 'DevTools', 'No hay registros para eliminar');
        return;
      }
      
      setDeleteVisibleData({ consolidatedCount, receiptsCount });
      setShowDeleteVisibleModal(true);
      addLogCallback('info', 'DevTools', `Preparado para eliminar ${consolidatedCount} consolidados y ${receiptsCount} recibos`);
    } catch (error) {
      console.error('❌ Error obteniendo información de registros:', error);
      toast.error('Error obteniendo información de registros');
      addLogCallback('error', 'DevTools', `Error obteniendo información: ${error}`);
    }
  };

  const confirmDeleteVisible = async () => {
    if (!deleteVisibleData) return;
    
    try {
      console.log('🗑️ Eliminando registros visibles...', deleteVisibleData);
      
      await dataManager.clearConsolidated();
      await dataManager.clearReceipts();
      
      // Verificar que realmente se eliminaron
      const verifyConsolidated = await dataManager.getConsolidated();
      const verifyReceipts = await dataManager.getReceipts();
      
      console.log('🔍 Verificación después de eliminar:', {
        consolidatedRestantes: verifyConsolidated?.length || 0,
        receiptsRestantes: verifyReceipts?.length || 0
      });
      
      // Disparar evento para notificar al componente padre y recargar datos
      window.dispatchEvent(new CustomEvent('data-cleared', { 
        detail: { type: 'visible' } 
      }));
      
      toast.success(`✅ Eliminados ${deleteVisibleData.consolidatedCount + deleteVisibleData.receiptsCount} registros correctamente`);
      addLogCallback('success', 'DevTools', `Eliminados ${deleteVisibleData.consolidatedCount} consolidados y ${deleteVisibleData.receiptsCount} recibos`);
      setShowDeleteVisibleModal(false);
      setDeleteVisibleData(null);
      await updateMetrics();
    } catch (error) {
      toast.error('Error eliminando registros');
      addLogCallback('error', 'DevTools', `Error eliminando registros: ${error}`);
    }
  };

  const handleDeleteControl = async () => {
    try {
      const controlCount = await dataManager.countSavedControls();
      
      if (controlCount === 0) {
        toast.info('No hay controles guardados para eliminar');
        return;
      }
      
      setShowDeleteControlModal(true);
    } catch (error) {
      toast.error('Error obteniendo información de controles');
      addLogCallback('error', 'DevTools', `Error obteniendo información de controles: ${error}`);
    }
  };

  const confirmDeleteControl = async () => {
    try {
      await dataManager.clearSavedControls();
      toast.success('✅ Controles guardados eliminados correctamente');
      addLogCallback('success', 'DevTools', 'Controles guardados eliminados');
      setShowDeleteControlModal(false);
      await updateMetrics();
    } catch (error) {
      toast.error('Error eliminando controles');
      addLogCallback('error', 'DevTools', `Error eliminando controles: ${error}`);
    }
  };

  const confirmClearAllData = async () => {
    try {
      await dataManager.clearAllData();
      toast.success('✅ Base de datos limpiada completamente');
      addLogCallback('success', 'DevTools', 'Base de datos limpiada completamente');
      setShowClearAllModal(false);
      await updateMetrics();
    } catch (error) {
      toast.error('Error limpiando base de datos');
      addLogCallback('error', 'DevTools', `Error limpiando base de datos: ${error}`);
    }
  };

  const confirmClearSessions = async () => {
    try {
      clearSessions();
      toast.success('✅ Sesiones de subida limpiadas');
      addLogCallback('success', 'DevTools', 'Sesiones de subida limpiadas');
      setShowClearSessionsModal(false);
    } catch (error) {
      toast.error('Error limpiando sesiones');
      addLogCallback('error', 'DevTools', `Error limpiando sesiones: ${error}`);
    }
  };

  // Funciones de verificación
  const checkDatabase = async () => {
    try {
      const consolidated = await dataManager.getConsolidated();
      const receipts = await dataManager.getReceipts();
      const descuentos = await dataManager.getDescuentos();
      const empresas = await dataManager.getEmpresas();
      
      addLogCallback('info', 'DevTools', `Verificación de BD: ${consolidated?.length || 0} consolidados, ${receipts?.length || 0} recibos, ${descuentos?.length || 0} descuentos, ${empresas?.length || 0} empresas`);
    } catch (error) {
      addLogCallback('error', 'DevTools', `Error verificando BD: ${error}`);
    }
  };

  const checkPendingUploads = async () => {
    try {
      addLogCallback('info', 'DevTools', `Sesiones pendientes: ${sessions?.length || 0}`);
      sessions?.forEach(session => {
        addLogCallback('info', 'DevTools', `Sesión ${session.id}: ${session.files?.length || 0} archivos`);
      });
    } catch (error) {
      addLogCallback('error', 'DevTools', `Error verificando subidas: ${error}`);
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
        totalRecords: consolidated?.length || 0,
        supabaseRecords: storageType === 'SUPABASE' ? (consolidated?.length || 0) : 0,
        indexedDbRecords: storageType === 'IndexedDB' ? (consolidated?.length || 0) : 0,
        lastUpdate: new Date(),
        responseTime,
        errors: logs.filter(log => log.level === 'error').length,
        warnings: logs.filter(log => log.level === 'warn').length
      });
      
      addLog('success', 'Metrics', `Métricas actualizadas: ${consolidated?.length || 0} registros`, {
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
                Logs ({logs?.length || 0})
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
                Feedback ({feedback?.length || 0})
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
                  {/* Limpieza Específica */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Limpieza Específica</h4>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDevAction('delete-visible')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Registros Visibles
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDevAction('delete-control')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Control Actual
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDevAction('clear-sessions')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpiar Sesiones ({(sessions?.length || 0)})
                    </Button>
                  </div>

                  {/* Limpieza Total */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Limpieza Total</h4>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDevAction('clean-all')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpiar TODO
                    </Button>
                  </div>

                  {/* Verificaciones */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Verificaciones</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('check-database')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Verificar BD
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDevAction('check-pending-uploads')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Verificar Subidas
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
                </div>

                <Separator />
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p><strong>Estado actual:</strong> {storageType}</p>
                  <p><strong>Sesiones pendientes:</strong> {sessions?.length || 0}</p>
                  <p><strong>Última acción:</strong> {isLoading ? 'Procesando...' : 'Listo'}</p>
                </div>
              </div>
            )}

            {/* Tab: Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(logs?.length || 0) === 0 ? (
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
                  {(feedback?.length || 0) === 0 ? (
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

      {/* Modales de confirmación */}
      {showDeleteVisibleModal && deleteVisibleData && (
        <ConfirmModal
          open={showDeleteVisibleModal}
          onClose={() => {
            setShowDeleteVisibleModal(false);
            setDeleteVisibleData(null);
          }}
          onConfirm={confirmDeleteVisible}
          title="Eliminar Registros Visibles"
          description={`¿Estás seguro de que quieres eliminar todos los recibos visibles?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
          details={[
            `${deleteVisibleData.consolidatedCount} recibos procesados`,
            `${deleteVisibleData.receiptsCount} recibos originales`,
            'Esta acción es IRREVERSIBLE'
          ]}
        />
      )}

      {showDeleteControlModal && (
        <ConfirmModal
          open={showDeleteControlModal}
          onClose={() => setShowDeleteControlModal(false)}
          onConfirm={confirmDeleteControl}
          title="Eliminar Control Actual"
          description="¿Estás seguro de que quieres eliminar todos los controles guardados?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
          details={[
            'Todos los controles guardados',
            'Esta acción es IRREVERSIBLE'
          ]}
        />
      )}

      {showClearAllModal && (
        <ConfirmModal
          open={showClearAllModal}
          onClose={() => setShowClearAllModal(false)}
          onConfirm={confirmClearAllData}
          title="Limpiar TODA la Base de Datos"
          description="¿Estás seguro de que quieres eliminar TODOS los datos de la base de datos?"
          confirmText="Limpiar TODO"
          cancelText="Cancelar"
          variant="destructive"
          details={[
            'Todos los recibos procesados',
            'Todos los datos consolidados',
            'Todos los descuentos',
            'Todas las empresas',
            'Todos los controles guardados',
            'Todos los items pendientes',
            'Esta acción es IRREVERSIBLE'
          ]}
        />
      )}

      {showClearSessionsModal && (
        <ConfirmModal
          open={showClearSessionsModal}
          onClose={() => setShowClearSessionsModal(false)}
          onConfirm={confirmClearSessions}
          title="Limpiar Sesiones de Subida"
          description={`¿Estás seguro de que quieres eliminar todas las sesiones de subida pendientes?`}
          confirmText="Limpiar"
          cancelText="Cancelar"
          variant="destructive"
          details={[
            `${sessions?.length || 0} sesiones pendientes`,
            'Se perderá el progreso de subidas incompletas',
            'Esta acción es IRREVERSIBLE'
          ]}
        />
      )}
    </div>
  );
}

