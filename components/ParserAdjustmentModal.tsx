// components/ParserAdjustmentModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, FileText, ChevronRight, ChevronLeft, Plus, X } from 'lucide-react';
import { EmpresaSelector } from './EmpresaSelector';

interface ParserAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (adjustedData: Record<string, string>) => void;
  originalData: Record<string, string>;
  fileName: string;
  file?: File; // Archivo PDF para mostrar en la barra lateral
  showDescuentos?: boolean; // Si debe mostrar la sección de descuentos
  onDescuentosConfirm?: (descuentos: Record<string, string>) => void; // Callback para confirmar descuentos
}

export default function ParserAdjustmentModal({ 
  open, 
  onClose, 
  onConfirm, 
  originalData, 
  fileName,
  file,
  showDescuentos = false,
  onDescuentosConfirm
}: ParserAdjustmentModalProps) {
  const [adjustedData, setAdjustedData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [showPdfSidebar, setShowPdfSidebar] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [descuentos, setDescuentos] = useState<Record<string, string>>({});
  const [newDescuento, setNewDescuento] = useState({ concepto: '', monto: '' });

  useEffect(() => {
    if (open) {
      setAdjustedData({ ...originalData });
      setErrors([]);
      
      // Inicializar descuentos si se muestran
      if (showDescuentos) {
        const descuentosIniciales: Record<string, string> = {};
        // Extraer descuentos del originalData
        Object.keys(originalData).forEach(key => {
          const keyUpper = key.toUpperCase();
          if (keyUpper.includes('DESCUENTO') || 
              keyUpper.includes('DEDUCCION') || 
              keyUpper.includes('DEDUCC') ||
              keyUpper.includes('OBRA_SOCIAL') ||
              keyUpper.includes('JUBILACION') ||
              keyUpper.includes('PAMI') ||
              keyUpper.includes('SINDICATO') ||
              keyUpper.includes('SEGURO') ||
              keyUpper.includes('ADELANTO') ||
              keyUpper.includes('PRESTAMO')) {
            descuentosIniciales[key] = originalData[key];
          }
        });
        
        // Si no se encontraron descuentos específicos, agregar algunos ejemplos
        if (Object.keys(descuentosIniciales).length === 0) {
          descuentosIniciales['OBRA_SOCIAL'] = '';
          descuentosIniciales['JUBILACION'] = '';
          descuentosIniciales['SINDICATO'] = '';
        }
        
        console.log('Descuentos iniciales detectados:', descuentosIniciales);
        setDescuentos(descuentosIniciales);
      }
      
      // Crear URL del PDF si hay archivo
      if (file) {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      }
    } else {
      // Limpiar URL cuando se cierra el modal
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
  }, [open, originalData, file, showDescuentos]);

  // Limpiar URL al desmontar
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleFieldChange = (field: string, value: string) => {
    console.log('🔧 ParserAdjustmentModal - handleFieldChange called:', { field, value });
    console.log('🔧 ParserAdjustmentModal - current adjustedData:', adjustedData);
    setAdjustedData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log('🔧 ParserAdjustmentModal - new adjustedData:', newData);
      return newData;
    });
  };

  const validateData = (): string[] => {
    const newErrors: string[] = [];
    
    if (!adjustedData.LEGAJO || adjustedData.LEGAJO.trim() === '') {
      newErrors.push('El legajo es obligatorio');
    }
    
    if (!adjustedData.NOMBRE || adjustedData.NOMBRE.trim() === '') {
      newErrors.push('El nombre es obligatorio');
    }
    
    if (!adjustedData.PERIODO || adjustedData.PERIODO.trim() === '') {
      newErrors.push('El período es obligatorio');
    }
    
    if (!adjustedData.EMPRESA || adjustedData.EMPRESA === 'DESCONOCIDA') {
      newErrors.push('La empresa es obligatoria');
    }
    
    // Validar formato de período
    if (adjustedData.PERIODO && !/^\d{2}\/\d{4}$/.test(adjustedData.PERIODO)) {
      newErrors.push('El período debe tener formato MM/YYYY (ej: 09/2025)');
    }
    
    return newErrors;
  };

  const handleConfirm = () => {
    const validationErrors = validateData();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Si hay descuentos y callback, confirmar descuentos también
    if (showDescuentos && onDescuentosConfirm) {
      onDescuentosConfirm(descuentos);
    }
    
    onConfirm(adjustedData);
    onClose();
  };

  // Funciones para manejar descuentos
  const handleDescuentoChange = (concepto: string, monto: string) => {
    setDescuentos(prev => ({
      ...prev,
      [concepto]: monto
    }));
  };

  const handleAddDescuento = () => {
    if (newDescuento.concepto && newDescuento.monto) {
      setDescuentos(prev => ({
        ...prev,
        [newDescuento.concepto]: newDescuento.monto
      }));
      setNewDescuento({ concepto: '', monto: '' });
    }
  };

  const handleRemoveDescuento = (concepto: string) => {
    setDescuentos(prev => {
      const newDescuentos = { ...prev };
      delete newDescuentos[concepto];
      return newDescuentos;
    });
  };

  const empresasDisponibles = [
    'LIME',
    'LIMPAR', 
    'SUMAR',
    'TYSA',
    'ESTRATEGIA AMBIENTAL',
    'ESTRATEGIA URBANA'
  ];

  const getFieldStatus = (field: string, originalValue: string, currentValue: string) => {
    if (!originalValue || originalValue === 'NO DETECTADO' || originalValue === 'DESCONOCIDA') {
      return 'missing';
    }
    if (originalValue !== currentValue) {
      return 'modified';
    }
    return 'ok';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'modified':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-6xl max-h-[90vh] overflow-hidden ${showPdfSidebar ? 'w-[90vw]' : 'w-auto'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {showDescuentos ? 'Ajustar Datos y Descuentos' : 'Ajustar Datos del Parser'}
            </div>
            {file && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPdfSidebar(!showPdfSidebar)}
                className="flex items-center gap-2"
              >
                {showPdfSidebar ? (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    Ocultar PDF
                  </>
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    Ver PDF
                  </>
                )}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {showDescuentos 
              ? `Corrige los datos y descuentos detectados automáticamente para el archivo: ${fileName}`
              : `Corrige los datos detectados automáticamente para el archivo: ${fileName}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[70vh]">
          {/* Panel principal de ajustes */}
          <div className={`space-y-6 overflow-y-auto ${showPdfSidebar ? 'flex-1' : 'w-full'}`}>
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Legajo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {getStatusIcon(getFieldStatus('LEGAJO', originalData.LEGAJO || '', adjustedData.LEGAJO || ''))}
                Legajo *
              </Label>
              <Input
                value={adjustedData.LEGAJO || ''}
                onChange={(e) => handleFieldChange('LEGAJO', e.target.value)}
                placeholder="Ej: 12345"
              />
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {getStatusIcon(getFieldStatus('NOMBRE', originalData.NOMBRE || '', adjustedData.NOMBRE || ''))}
                Nombre *
              </Label>
              <Input
                value={adjustedData.NOMBRE || ''}
                onChange={(e) => handleFieldChange('NOMBRE', e.target.value)}
                placeholder="Ej: APELLIDO, NOMBRE"
              />
            </div>

            {/* Período */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {getStatusIcon(getFieldStatus('PERIODO', originalData.PERIODO || '', adjustedData.PERIODO || ''))}
                Período *
              </Label>
              <Input
                value={adjustedData.PERIODO || ''}
                onChange={(e) => handleFieldChange('PERIODO', e.target.value)}
                placeholder="Ej: 09/2025"
              />
            </div>

            {/* Empresa */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {getStatusIcon(getFieldStatus('EMPRESA', originalData.EMPRESA || '', adjustedData.EMPRESA || ''))}
                Empresa *
              </Label>
              <EmpresaSelector
                value={adjustedData.EMPRESA || ''}
                onValueChange={(value) => handleFieldChange('EMPRESA', value)}
                placeholder="Seleccionar o ingresar empresa"
              />
            </div>

            {/* CUIL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {getStatusIcon(getFieldStatus('CUIL', originalData.CUIL || '', adjustedData.CUIL || ''))}
                CUIL
              </Label>
              <Input
                value={adjustedData.CUIL || ''}
                onChange={(e) => handleFieldChange('CUIL', e.target.value)}
                placeholder="Ej: 12345678901"
              />
            </div>
          </div>

          {/* Sección de Descuentos */}
          {showDescuentos && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Descuentos Detectados</h3>
                
                {/* Lista de descuentos existentes */}
                {Object.keys(descuentos).length > 0 && (
                  <div className="space-y-2 mb-4">
                    {Object.entries(descuentos).map(([concepto, monto]) => (
                      <div key={concepto} className="flex items-center gap-2 p-2 border rounded-md">
                        <Input
                          value={concepto}
                          onChange={(e) => {
                            const newConcepto = e.target.value;
                            const newDescuentos = { ...descuentos };
                            delete newDescuentos[concepto];
                            newDescuentos[newConcepto] = monto;
                            setDescuentos(newDescuentos);
                          }}
                          className="flex-1"
                          placeholder="Concepto del descuento"
                        />
                        <Input
                          value={monto}
                          onChange={(e) => handleDescuentoChange(concepto, e.target.value)}
                          className="w-24"
                          placeholder="Monto"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveDescuento(concepto)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar nuevo descuento */}
                <div className="flex items-center gap-2 p-2 border-2 border-dashed border-gray-300 rounded-md">
                  <Input
                    value={newDescuento.concepto}
                    onChange={(e) => setNewDescuento(prev => ({ ...prev, concepto: e.target.value }))}
                    placeholder="Nuevo concepto"
                    className="flex-1"
                  />
                  <Input
                    value={newDescuento.monto}
                    onChange={(e) => setNewDescuento(prev => ({ ...prev, monto: e.target.value }))}
                    placeholder="Monto"
                    className="w-24"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddDescuento}
                    disabled={!newDescuento.concepto || !newDescuento.monto}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="space-y-2">
            <Label>Información del archivo</Label>
            <div className="p-3 bg-gray-50 rounded-md text-sm space-y-2">
              <p><strong>Archivo:</strong> {fileName}</p>
              <p><strong>Texto extraído:</strong> {originalData.TEXTO_COMPLETO?.length || 0} caracteres</p>
            </div>
            
            {/* Texto extraído completo */}
            <div className="space-y-2">
              <Label>Texto extraído del PDF</Label>
              <div className="border rounded-md">
                <div className="p-2 bg-gray-100 border-b text-sm font-medium">
                  Contenido completo ({originalData.TEXTO_COMPLETO?.length || 0} caracteres)
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all bg-white">
                    {originalData.TEXTO_COMPLETO || 'No hay texto disponible'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Barra lateral del PDF */}
          {showPdfSidebar && pdfUrl && (
            <div className="w-1/2 border-l border-gray-200 pl-4">
              <div className="h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-2">Vista previa del PDF</h3>
                <div className="flex-1 border border-gray-300 rounded-md overflow-hidden">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full"
                    title={`Vista previa de ${fileName}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar Ajustes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
