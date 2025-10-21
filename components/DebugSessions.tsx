'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UploadSessionManager } from '@/lib/upload-session-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, RefreshCw, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { toast } from 'sonner';

export default function DebugSessions() {
  const { data: session } = useSession();
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAllSessions = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      console.log('🔍 Loading all sessions for debug...');
      const sessions = await UploadSessionManager.getAllSessions();
      console.log('📊 All sessions loaded:', sessions);
      setAllSessions(sessions);
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllDatabases = async () => {
    if (!window.confirm('¿Estás seguro de que quieres limpiar TODA la base de datos? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('🧹 Limpiando completamente la base de datos...');
      
      // Verificar estado antes de limpiar
      const receiptsBefore = await db.receipts.count();
      const consolidatedBefore = await db.consolidated.count();
      const uploadSessionsBefore = await db.uploadSessions.count();
      const descuentosBefore = await db.descuentos.count();
      const columnConfigsBefore = await db.columnConfigs.count();
      const userActivitiesBefore = await db.userActivities.count();
      const savedControlsBefore = await db.savedControls.count();
      const controlBefore = await db.control.count();
      
      console.log('📊 Estado ANTES de limpiar:');
      console.log('- Receipts:', receiptsBefore);
      console.log('- Consolidated:', consolidatedBefore);
      console.log('- Upload Sessions:', uploadSessionsBefore);
      console.log('- Descuentos:', descuentosBefore);
      console.log('- Column Configs:', columnConfigsBefore);
      console.log('- User Activities:', userActivitiesBefore);
      console.log('- Saved Controls:', savedControlsBefore);
      console.log('- Control:', controlBefore);
      
      // Limpiar todas las tablas
      await db.receipts.clear();
      await db.consolidated.clear();
      await db.uploadSessions.clear();
      await db.descuentos.clear();
      await db.columnConfigs.clear();
      await db.userActivities.clear();
      await db.savedControls.clear();
      await db.control.clear();
      
      // Verificar estado después de limpiar
      const receiptsAfter = await db.receipts.count();
      const consolidatedAfter = await db.consolidated.count();
      const uploadSessionsAfter = await db.uploadSessions.count();
      const descuentosAfter = await db.descuentos.count();
      const columnConfigsAfter = await db.columnConfigs.count();
      const userActivitiesAfter = await db.userActivities.count();
      const savedControlsAfter = await db.savedControls.count();
      const controlAfter = await db.control.count();
      
      console.log('📊 Estado DESPUÉS de limpiar:');
      console.log('- Receipts:', receiptsAfter);
      console.log('- Consolidated:', consolidatedAfter);
      console.log('- Upload Sessions:', uploadSessionsAfter);
      console.log('- Descuentos:', descuentosAfter);
      console.log('- Column Configs:', columnConfigsAfter);
      console.log('- User Activities:', userActivitiesAfter);
      console.log('- Saved Controls:', savedControlsAfter);
      console.log('- Control:', controlAfter);
      
      const totalAfter = receiptsAfter + consolidatedAfter + uploadSessionsAfter + 
                        descuentosAfter + columnConfigsAfter + userActivitiesAfter + 
                        savedControlsAfter + controlAfter;
      
      if (totalAfter === 0) {
        console.log('✅ Base de datos limpiada completamente');
        toast.success('Base de datos limpiada completamente. Todas las tablas están vacías.');
      } else {
        console.log('❌ Error: Algunas tablas no se limpiaron correctamente');
        console.log('❌ Total de registros restantes:', totalAfter);
        toast.error(`Error: Algunas tablas no se limpiaron correctamente. Registros restantes: ${totalAfter}`);
      }
      
      // Recargar sesiones
      await loadAllSessions();
      
      // Forzar recarga de la página para actualizar el tablero
      console.log('🔄 Recargando página para actualizar el tablero...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error limpiando base de datos:', error);
      toast.error('Error limpiando base de datos: ' + error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      loadAllSessions();
    }
  }, [session?.user?.id]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Debug: Todas las Sesiones de Subida
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={loadAllSessions}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
            
            <Button
              onClick={clearAllDatabases}
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Todo
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            Total de sesiones: {allSessions.length}
          </div>

          {loading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Cargando sesiones...</p>
            </div>
          ) : allSessions.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No hay sesiones en la base de datos</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allSessions.map((session, index) => (
                <Card key={session.id || index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>ID:</strong> {session.id}
                      </div>
                      <div>
                        <strong>Session ID:</strong> {session.sessionId}
                      </div>
                      <div>
                        <strong>User ID:</strong> {session.userId}
                      </div>
                      <div>
                        <strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          session.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <div>
                        <strong>Total Files:</strong> {session.totalFiles}
                      </div>
                      <div>
                        <strong>Completed:</strong> {session.completedFiles}
                      </div>
                      <div>
                        <strong>Pending:</strong> {session.pendingFiles}
                      </div>
                      <div>
                        <strong>Failed:</strong> {session.failedFiles}
                      </div>
                      <div>
                        <strong>Started:</strong> {new Date(session.startedAt).toLocaleString()}
                      </div>
                      <div>
                        <strong>Last Updated:</strong> {new Date(session.lastUpdatedAt).toLocaleString()}
                      </div>
                    </div>
                    
                    {session.files && session.files.length > 0 && (
                      <div className="mt-3">
                        <strong>Files:</strong>
                        <div className="mt-1 space-y-1">
                          {session.files.slice(0, 5).map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="text-xs bg-gray-50 p-2 rounded">
                              {file.fileName} - {file.status}
                            </div>
                          ))}
                          {session.files.length > 5 && (
                            <div className="text-xs text-gray-500">
                              ... y {session.files.length - 5} archivos más
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
