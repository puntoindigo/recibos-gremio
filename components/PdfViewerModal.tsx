'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ExternalLink, 
  Download, 
  FileText, 
  User, 
  Calendar,
  Building,
  Hash,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl?: string;
  receiptData?: {
    legajo: string;
    nombre: string;
    periodo: string;
    empresa?: string;
    archivo: string;
  };
  onNavigateToReceipt?: () => void;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  open,
  onClose,
  pdfUrl,
  receiptData,
  onNavigateToReceipt
}) => {
  const [pdfError, setPdfError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && pdfUrl) {
      setIsLoading(true);
      setPdfError(false);
    }
  }, [open, pdfUrl]);

  const handlePdfLoad = () => {
    setIsLoading(false);
    setPdfError(false);
  };

  const handlePdfError = () => {
    setIsLoading(false);
    setPdfError(true);
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = receiptData?.archivo || 'recibo.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Descarga iniciada');
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Visualizador de PDF
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Información del recibo */}
          {receiptData && (
            <div className="bg-gray-50 p-4 rounded-lg border flex-shrink-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Legajo</p>
                    <p className="font-medium">{receiptData.legajo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Empleado</p>
                    <p className="font-medium truncate">{receiptData.nombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Período</p>
                    <p className="font-medium">{receiptData.periodo}</p>
                  </div>
                </div>
                {receiptData.empresa && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Empresa</p>
                      <p className="font-medium">{receiptData.empresa}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{receiptData.archivo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenInNewTab}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Nueva pestaña
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contenedor del PDF */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-gray-100">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Cargando PDF...</p>
                </div>
              </div>
            )}
            
            {pdfError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar el PDF</h3>
                  <p className="text-gray-600 mb-4">El archivo no se pudo cargar o no existe</p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={handleOpenInNewTab}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Intentar en nueva pestaña
                    </Button>
                    {onNavigateToReceipt && (
                      <Button
                        variant="outline"
                        onClick={onNavigateToReceipt}
                        className="flex items-center gap-2 ml-2"
                      >
                        <FileText className="h-4 w-4" />
                        Ver en lista
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              pdfUrl && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  onLoad={handlePdfLoad}
                  onError={handlePdfError}
                  title={`PDF: ${receiptData?.archivo || 'Recibo'}`}
                />
              )
            )}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
          <div className="flex items-center gap-2">
            {receiptData && (
              <Badge variant="outline" className="text-xs">
                {receiptData.legajo} - {receiptData.periodo}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToReceipt && (
              <Button
                variant="outline"
                onClick={onNavigateToReceipt}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver en lista
              </Button>
            )}
            <Button onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;


