import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Database, Upload } from 'lucide-react';

type UploadItem = { 
  name: string; 
  status: "pending" | "ok" | "error" | "skipped";
  reason?: string;
};

type Props = {
  uploads: UploadItem[];
};

export function UnifiedStatusPanel({ uploads }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Si no hay uploads, no mostrar nada
  if (uploads.length === 0) return null;

  const pendingUploads = uploads.filter(u => u.status === "pending");
  const completedUploads = uploads.filter(u => u.status === "ok");
  const skippedUploads = uploads.filter(u => u.status === "skipped");
  const errorUploads = uploads.filter(u => u.status === "error");

  const totalProcessed = completedUploads.length + skippedUploads.length;
  const progressPercentage = uploads.length > 0 ? (totalProcessed / uploads.length) * 100 : 0;

  return (
    <div className="status-panel">
      {/* Header - siempre visible */}
      <div
        className="status-panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Indicador de estado principal */}
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
          <span className="text-sm font-medium">Procesando</span>
        </div>

        {/* Barra de progreso en modo cerrado */}
        <div className="flex items-center space-x-3 flex-1 mx-4">
          <div className="status-panel-progress">
            <div
              className="status-panel-progress-fill"
              style={{
                width: `${progressPercentage}%`
              }}
            />
          </div>
          <span className="text-xs text-blue-200 font-medium min-w-8 text-right">
            {Math.round(progressPercentage)}%
          </span>
        </div>

        {/* Botón expandir/contraer */}
        <div className="ml-2 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="border-t border-blue-500 px-4 py-3 max-h-56 overflow-y-auto">
          {/* Sumario de archivos */}
          <div className="mb-3">
            <div className="flex items-center space-x-2 text-sm font-medium mb-2">
              <Upload className="h-4 w-4" />
              <span>Sumario</span>
            </div>
            <div className="space-y-1 text-sm">
                             <div className="flex items-center space-x-2">
                 <CheckCircle2 className="h-3 w-3 status-success" />
                 <span className="status-success">OK:</span>
                 <span className="font-medium">{completedUploads.length}</span>
               </div>
               <div className="flex items-center space-x-2">
                 <div className="h-3 w-3 rounded-full status-skipped" />
                 <span className="status-skipped">Omitidos:</span>
                 <span className="font-medium">{skippedUploads.length}</span>
               </div>
               <div className="flex items-center space-x-2">
                 <Loader2 className="h-3 w-3 animate-spin status-warning" />
                 <span className="status-warning">Pendientes:</span>
                 <span className="font-medium">{pendingUploads.length}</span>
               </div>
               {errorUploads.length > 0 && (
                 <div className="flex items-center space-x-2">
                   <XCircle className="h-3 w-3 status-error" />
                   <span className="status-error">Errores:</span>
                   <span className="font-medium">{errorUploads.length}</span>
                 </div>
               )}
            </div>
          </div>

          {/* Lista detallada de archivos */}
          <div>
            <div className="flex items-center space-x-2 text-sm font-medium mb-2">
              <span>Archivos ({uploads.length})</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {uploads.map((upload, index) => (
                <div key={`${upload.name}-${index}`} className="flex items-center space-x-2 text-sm">
                                   {upload.status === "pending" && <Loader2 className="h-2.5 w-2.5 animate-spin status-warning" />}
                 {upload.status === "ok" && <CheckCircle2 className="h-2.5 w-2.5 status-success" />}
                 {upload.status === "skipped" && <div className="h-2.5 w-2.5 rounded-full status-skipped" />}
                 {upload.status === "error" && <XCircle className="h-2.5 w-2.5 status-error" />}
                  <span className="truncate flex-1 text-xs">{upload.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
