// components/ProcessingProgress.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import type { SimpleProcessingResult } from '@/lib/simple-pdf-processor';

interface ProcessingProgressProps {
  files: Array<{
    name: string;
    status: "pending" | "ok" | "error" | "skipped";
    reason?: string;
    processingResult?: SimpleProcessingResult;
  }>;
  currentIndex: number;
  onStop: () => void;
  showDetails?: boolean;
}

export default function ProcessingProgress({ 
  files, 
  currentIndex, 
  onStop, 
  showDetails = false 
}: ProcessingProgressProps) {
  const [expandedDetails, setExpandedDetails] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'skipped':
        return <Badge className="bg-yellow-100 text-yellow-800">Omitido</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Procesando</Badge>;
    }
  };

  const completedCount = files.filter(f => f.status === 'ok').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const skippedCount = files.filter(f => f.status === 'skipped').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  const progressPercentage = files.length > 0 ? ((completedCount + errorCount + skippedCount) / files.length) * 100 : 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Procesando Archivos
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {currentIndex + 1} de {files.length} archivos procesados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setExpandedDetails(!expandedDetails)}
              variant="outline"
              size="sm"
            >
              {expandedDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expandedDetails ? 'Ocultar' : 'Detalles'}
            </Button>
            {pendingCount > 0 && (
              <Button onClick={onStop} variant="outline" size="sm">
                Parar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-xs text-gray-600">Completados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-xs text-gray-600">Errores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{skippedCount}</div>
            <div className="text-xs text-gray-600">Omitidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
            <div className="text-xs text-gray-600">Pendientes</div>
          </div>
        </div>

        {/* Archivo actual */}
        {currentIndex < files.length && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Procesando: {files[currentIndex]?.name}
              </span>
            </div>
          </div>
        )}

        {/* Lista detallada */}
        {expandedDetails && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <div className="text-sm font-medium text-gray-700 mb-2">Detalles por archivo:</div>
            {files.map((file, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  index === currentIndex ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    {file.reason && (
                      <div className="text-xs text-gray-600 truncate">{file.reason}</div>
                    )}
                    {file.processingResult?.validation && (
                      <div className="text-xs text-gray-500">
                        {file.processingResult.validation.warnings.length > 0 && (
                          <span className="text-yellow-600">
                            {file.processingResult.validation.warnings.length} advertencias
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(file.status)}
                  {index === currentIndex && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        {showDetails && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-gray-600 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Información del procesamiento:</p>
                <ul className="space-y-1">
                  <li>• Los archivos duplicados se omiten automáticamente</li>
                  <li>• Se validan los datos antes de guardar</li>
                  <li>• Los errores se muestran en la columna de detalles</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
