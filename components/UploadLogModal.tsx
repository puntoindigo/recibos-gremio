'use client';

import React, { useState, useEffect } from 'react';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  X,
  Download,
  RefreshCw
} from 'lucide-react';

interface UploadSession {
  sessionId: string;
  userId: string;
  fileNames: string[];
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  pendingFiles: number;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

interface UploadLogModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadLogModal({ open, onClose }: UploadLogModalProps) {
  const { dataManager } = useCentralizedDataManager();
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const allSessions = await dataManager.getUploadSessions();
      const formattedSessions = allSessions.map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        fileNames: session.fileNames,
        totalFiles: session.totalFiles,
        completedFiles: session.completedFiles,
        failedFiles: session.failedFiles,
        pendingFiles: session.pendingFiles,
        status: session.status as 'active' | 'completed' | 'failed',
        createdAt: new Date(session.createdAt).toLocaleString(),
        completedAt: session.completedAt ? new Date(session.completedAt).toLocaleString() : undefined
      }));
      setSessions(formattedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error cargando sesiones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSessions();
    }
  }, [open]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completada</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fallida</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Activa</Badge>;
      default:
        return <Badge variant="outline">Desconocida</Badge>;
    }
  };

  const exportLog = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        totalFiles: session.totalFiles,
        completedFiles: session.completedFiles,
        failedFiles: session.failedFiles,
        pendingFiles: session.pendingFiles,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        fileNames: session.fileNames
      }))
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Log de Subidas
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Historial de sesiones de subida de archivos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Cargando sesiones...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay sesiones de subida registradas</p>
            </div>
          ) : (
            sessions.map((session) => (
              <Card key={session.sessionId} className="border-l-4 border-l-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Sesión {session.sessionId.split('_')[1]?.substring(0, 8) || 'N/A'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(session.status)}
                      {getStatusBadge(session.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{session.totalFiles}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{session.completedFiles}</div>
                      <div className="text-xs text-gray-500">Completados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{session.failedFiles}</div>
                      <div className="text-xs text-gray-500">Fallidos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{session.pendingFiles}</div>
                      <div className="text-xs text-gray-500">Pendientes</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><strong>Creada:</strong> {session.createdAt}</div>
                    {session.completedAt && (
                      <div><strong>Completada:</strong> {session.completedAt}</div>
                    )}
                    <div><strong>Archivos:</strong> {session.fileNames?.slice(0, 3).join(', ') || 'N/A'}{session.fileNames && session.fileNames.length > 3 && ` y ${session.fileNames.length - 3} más...`}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {sessions.length} sesión(es) encontrada(s)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportLog}
              disabled={sessions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Log
            </Button>
            <Button
              variant="outline"
              onClick={loadSessions}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
