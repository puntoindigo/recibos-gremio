'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Eye, Loader2, AlertTriangle, CheckCircle, X, Settings, Move, ExternalLink, Copy, EyeOff } from 'lucide-react';
import { parsePdfReceiptToRecord } from '@/lib/pdf-parser';
import { CONCEPT_MAPPINGS } from '@/lib/concept-mapping';

interface OCRConfigModalProps {
  open: boolean;
  onClose: () => void;
}

interface OCRResult {
  success: boolean;
  data?: any;
  error?: string;
  extractedText?: string;
}

export default function OCRConfigModal({ open, onClose }: OCRConfigModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfInSeparateWindow, setPdfInSeparateWindow] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [tempAlias, setTempAlias] = useState<string>('');
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});
  const [disabledFields, setDisabledFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setOcrResult(null);
    } else {
      alert('Por favor selecciona un archivo PDF válido');
    }
  };

  const handleProcessOCR = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setOcrResult(null);

    try {
      // Procesar el PDF con el parser existente (pasa el File directamente)
      const result = await parsePdfReceiptToRecord(selectedFile, true);
      
      setOcrResult({
        success: true,
        data: result.data,
        extractedText: result.data.textoCompleto || 'No se pudo extraer texto'
      });

    } catch (error) {
      console.error('Error procesando OCR:', error);
      setOcrResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al procesar el PDF'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setOcrResult(null);
    setShowPdf(false);
    setPdfInSeparateWindow(false);
    setShowColumnConfig(false);
    setSelectedColumn('');
    setTempAlias('');
    setColumnAliases({});
    onClose();
  };

  // Función para abrir el modal de configuración de columna
  const handleConfigureColumn = (columnKey: string) => {
    setSelectedColumn(columnKey);
    setTempAlias(columnAliases[columnKey] || columnKey);
    setShowColumnConfig(true);
  };

  // Función para guardar el alias de la columna
  const handleSaveColumnAlias = () => {
    if (!selectedColumn) return;

    const newAliases = {
      ...columnAliases,
      [selectedColumn]: tempAlias.trim() || selectedColumn
    };

    setColumnAliases(newAliases);
    setShowColumnConfig(false);
    setSelectedColumn('');
    setTempAlias('');
  };

  // Función para cancelar la configuración
  const handleCancelColumnConfig = () => {
    setShowColumnConfig(false);
    setSelectedColumn('');
    setTempAlias('');
  };

  const handleToggleField = (fieldKey: string) => {
    const newDisabledFields = new Set(disabledFields);
    if (newDisabledFields.has(fieldKey)) {
      newDisabledFields.delete(fieldKey);
    } else {
      newDisabledFields.add(fieldKey);
    }
    setDisabledFields(newDisabledFields);
  };

  // Función para abrir PDF en ventana separada
  const handleOpenPdfInSeparateWindow = () => {
    if (selectedFile) {
      const pdfUrl = URL.createObjectURL(selectedFile);
      const newWindow = window.open(pdfUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (newWindow) {
        setPdfInSeparateWindow(true);
        setShowPdf(false);
      }
    }
  };

  // Función para obtener el nombre a mostrar de una columna
  const getColumnDisplayName = (columnKey: string): string => {
    // Si ya tiene un alias personalizado, usarlo
    if (columnAliases[columnKey]) {
      return columnAliases[columnKey];
    }
    
    // Buscar en el sistema de unificación de conceptos
    const unifiedMapping = CONCEPT_MAPPINGS.find(mapping => 
      Object.values(mapping.companyMappings).includes(columnKey)
    );
    
    if (unifiedMapping) {
      return unifiedMapping.unifiedName;
    }
    
    // Debug: mostrar qué está pasando
    console.log('Buscando mapeo para:', columnKey, 'tipo:', typeof columnKey);
    console.log('Mapeos disponibles:', CONCEPT_MAPPINGS.map(m => ({ 
      name: m.unifiedName, 
      codes: Object.values(m.companyMappings),
      includes: Object.values(m.companyMappings).includes(columnKey)
    })));
    
    // Mapeo directo para códigos específicos (temporal para debug)
    const directCodeMap: Record<string, string> = {
      '20540': 'Contribución Solidaria',
      '20590': 'Gastos de Sepelio',
      '20595': 'Cuota Mutual',
      '20610': 'Resguardo Mutuo',
      '20620': 'Mutual 16 de Abril',
      '5310': 'ITEM 5.3.10'
    };
    
    if (directCodeMap[columnKey]) {
      return directCodeMap[columnKey];
    }
    
    // Mapeo directo para conceptos básicos que no están en el sistema de unificación
    const basicConceptMap: Record<string, string> = {
      'JORNAL': 'Jornal',
      'HORAS_EXTRAS': 'Horas Extras',
      'ANTIGUEDAD': 'Antigüedad',
      'ADICIONALES': 'Adicionales',
      'INASISTENCIAS': 'Inasistencias',
      'SUELDO_BASICO': 'Sueldo Básico',
      'SUELDO_BRUTO': 'Sueldo Bruto',
      'TOTAL': 'Total',
      'DESCUENTOS': 'Descuentos',
      'ARCHIVO': 'Archivo',
      'LEGAJO': 'Legajo',
      'PERIODO': 'Período',
      'EMPRESA': 'Empresa',
      'CUIL': 'CUIL'
    };
    
    if (basicConceptMap[columnKey]) {
      return basicConceptMap[columnKey];
    }
    
    // Si no se encuentra, usar el nombre original formateado
    return columnKey.replace(/_/g, ' ').toUpperCase();
  };

  // Función para obtener el nombre original de la columna (para el modal de configuración)
  const getOriginalColumnName = (columnKey: string): string => {
    return columnKey;
  };

  // Estado para el botón de copiar
  const [copyButtonText, setCopyButtonText] = useState('Copiar al Portapapeles');
  const [copyButtonIcon, setCopyButtonIcon] = useState(<Copy className="h-4 w-4" />);

  // Función para copiar todo el contenido del modal al portapapeles
  const handleCopyToClipboard = async () => {
    if (!ocrResult || !ocrResult.success) {
      alert('No hay datos para copiar');
      return;
    }

    let content = `=== CONFIGURACIÓN OCR - RESULTADOS ===\n\n`;
    content += `Archivo: ${selectedFile?.name || 'N/A'}\n`;
    content += `Fecha: ${new Date().toLocaleString()}\n\n`;
    
    content += `=== DATOS ESTRUCTURADOS ===\n`;
    if (ocrResult.data) {
      Object.entries(ocrResult.data).forEach(([key, value]) => {
        // Solo mostrar conceptos que tienen valores válidos (no "0.00", no vacíos, no "-")
        if (key !== 'textoCompleto' && 
            key !== 'primerasLineas' && 
            typeof value === 'string' && 
            value.trim() && 
            value !== '0.00' && 
            value !== '-' && 
            value !== '0' &&
            parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) > 0) {
          const displayName = getColumnDisplayName(key.replace(/_/g, ' ').toUpperCase());
          content += `${displayName}: ${value}\n`;
        }
      });
    }
    
    content += `\n=== TEXTO COMPLETO EXTRAÍDO ===\n`;
    content += `${ocrResult.extractedText || 'No disponible'}\n`;
    
    content += `\n=== INFORMACIÓN TÉCNICA ===\n`;
    content += `- Conceptos detectados: ${Object.keys(ocrResult.data || {}).length}\n`;
    content += `- Tamaño del archivo: ${selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}\n`;
    content += `- Tipo de archivo: PDF\n`;

    try {
      await navigator.clipboard.writeText(content);
      
      // Cambiar el botón a estado "copiado"
      setCopyButtonText('Copiado');
      setCopyButtonIcon(<CheckCircle className="h-4 w-4 text-green-600" />);
      
      // Volver al estado original después de 3 segundos
      setTimeout(() => {
        setCopyButtonText('Copiar al Portapapeles');
        setCopyButtonIcon(<Copy className="h-4 w-4" />);
      }, 3000);
      
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
      alert('Error al copiar al portapapeles');
    }
  };

  const createPdfUrl = () => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configurar OCR - Prueba de Lectura
              </DialogTitle>
              <DialogDescription>
                Sube un recibo PDF para probar el sistema de OCR y ver qué datos puede extraer
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 modal-content-fix">
          {/* Sección de subida de archivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Seleccionar Recibo PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar PDF
                </Button>
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">{selectedFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleProcessOCR}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {isProcessing ? 'Procesando...' : 'Procesar con OCR'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowPdf(!showPdf)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {showPdf ? 'Ocultar' : 'Mostrar'} PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visualización del PDF */}
          {selectedFile && showPdf && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">2. Vista del PDF</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenPdfInSeparateWindow}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir en ventana separada
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <iframe
                    src={createPdfUrl() || ''}
                    className="w-full h-96"
                    title={`PDF: ${selectedFile.name}`}
                    style={{ minHeight: '400px' }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados del OCR */}
          {ocrResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {ocrResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  3. Resultados del OCR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ocrResult.success ? (
                  <>
                    {/* Datos extraídos */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-700">Datos Extraídos:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ocrResult.data && Object.entries(ocrResult.data).map(([key, value]) => {
                          if (key === 'textoCompleto' || key === 'primerasLineas') return null;
                          
                          // Solo mostrar conceptos que tienen valores válidos (no "0.00", no vacíos, no "-")
                          if (typeof value === 'string' && 
                              value.trim() && 
                              value !== '0.00' && 
                              value !== '-' && 
                              value !== '0' &&
                              parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) > 0) {
                            return (
                              <div key={key} className={`space-y-1 ${disabledFields.has(key) ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <Label className={`text-sm font-medium text-gray-600 cursor-pointer hover:text-blue-600 transition-colors ${disabledFields.has(key) ? 'opacity-50' : ''}`}>
                                    {getOriginalColumnName(key.replace(/_/g, ' ').toUpperCase())}:
                                  </Label>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleField(key)}
                                      className={`h-6 w-6 p-0 ${disabledFields.has(key) ? 'text-gray-400' : 'text-green-600'}`}
                                    >
                                      {disabledFields.has(key) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleConfigureColumn(key)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Settings className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className={`p-2 bg-gray-50 rounded border text-sm ${disabledFields.has(key) ? 'opacity-50' : ''}`}>
                                  {value}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>

                    {/* Texto completo extraído - solo mostrar si hay texto */}
                    {ocrResult.extractedText && ocrResult.extractedText.trim() && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-blue-700">Texto Completo Extraído:</h4>
                        <div className="border rounded-md p-3 bg-gray-50 max-h-60 overflow-y-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {ocrResult.extractedText}
                          </pre>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error al procesar el PDF:</strong> {ocrResult.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleCopyToClipboard}
            disabled={!ocrResult || !ocrResult.success}
            className="flex items-center gap-2"
          >
            {copyButtonIcon}
            {copyButtonText}
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
          <Button onClick={handleCopyToClipboard} disabled={!ocrResult}>
            {copyButtonIcon}
            {copyButtonText}
          </Button>
        </div>
      </DialogContent>

      {/* Modal de configuración de columna */}
      <Dialog open={showColumnConfig} onOpenChange={setShowColumnConfig}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Columna
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelColumnConfig}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Cambia el nombre que se muestra para esta columna
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="column-key">Código de Columna</Label>
                <Input
                  id="column-key"
                  value={selectedColumn}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="column-alias">Nombre a Mostrar</Label>
                <Input
                  id="column-alias"
                  value={tempAlias}
                  onChange={(e) => setTempAlias(e.target.value)}
                  placeholder={`Nombre para ${selectedColumn}`}
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  Este nombre aparecerá en lugar del código de columna
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t -mx-6 px-6 flex-shrink-0">
            <Button variant="outline" onClick={handleCancelColumnConfig}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveColumnAlias}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
