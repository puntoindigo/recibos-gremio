// components/EditDataModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Save, X } from 'lucide-react';
import { EmpresaSelector } from './EmpresaSelector';
import { ColumnConfigManager } from '@/lib/column-config-manager';
import { useSession } from 'next-auth/react';

interface EditDataModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (updatedData: Record<string, string>) => void;
  originalData: Record<string, string>;
  fileName: string;
  pdfText?: string;
}

export default function EditDataModal({ 
  open, 
  onClose, 
  onSave, 
  originalData, 
  fileName,
  pdfText 
}: EditDataModalProps) {
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [showPdfText, setShowPdfText] = useState(false);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});
  const { data: session } = useSession();

  // Cargar alias de columnas cuando se abre el modal
  useEffect(() => {
    const loadColumnAliases = async () => {
      if (session?.user?.id) {
        try {
          const config = await ColumnConfigManager.getConfig(session.user.id, 'recibos');
          setColumnAliases(config.columnAliases || {});
        } catch (error) {
          console.error('Error cargando alias de columnas:', error);
        }
      }
    };
    
    if (open) {
      loadColumnAliases();
    }
  }, [open, session?.user?.id]);

  useEffect(() => {
    if (open) {
      setEditedData({ ...originalData });
      setErrors([]);
    }
  }, [open, originalData]);

  const handleFieldChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFieldFocus = (field: string) => {
    const currentValue = editedData[field as keyof typeof editedData];
    if (currentValue === 'NO DETECTADO') {
      setEditedData(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFieldBlur = (field: string) => {
    const currentValue = editedData[field as keyof typeof editedData];
    if (!currentValue || currentValue.trim() === '') {
      setEditedData(prev => ({
        ...prev,
        [field]: 'NO DETECTADO'
      }));
    }
  };

  // Detectar columnas numéricas (códigos de concepto como 20500, 20510, etc.)
  const numericColumns = useMemo(() => {
    return Object.keys(originalData).filter(key => {
      // Excluir campos de texto y metadatos
      const excludeFields = [
        'NOMBRE', 'LEGAJO', 'PERIODO', 'EMPRESA', 'CUIL', 'SUELDO_BASICO', 
        'TOTAL', 'DESCUENTOS', 'ARCHIVO', 'TEXTO_COMPLETO', 'PRIMERAS_LINEAS',
        'VALIDATION_ERRORS', 'NRO. DE CUIL'
      ];
      
      if (excludeFields.includes(key)) return false;
      
      // Incluir solo campos que parecen códigos numéricos (5 dígitos)
      return /^\d{5}$/.test(key);
    }).sort();
  }, [originalData]);

  // Función para obtener el nombre a mostrar de una columna (alias o nombre original)
  const getColumnDisplayName = (columnKey: string): string => {
    return columnAliases[columnKey] || columnKey;
  };

  const validateData = (): string[] => {
    const validationErrors: string[] = [];
    
    // Validar nombre
    if (!editedData.NOMBRE || editedData.NOMBRE.trim() === '') {
      validationErrors.push('El nombre es requerido');
    } else if (editedData.NOMBRE === 'INGRESO EGRESO') {
      validationErrors.push('El nombre no puede ser "INGRESO EGRESO"');
    }
    
    // Validar legajo
    if (!editedData.LEGAJO || editedData.LEGAJO.trim() === '') {
      validationErrors.push('El legajo es requerido');
    }
    
    // Validar período
    if (!editedData.PERIODO || editedData.PERIODO.trim() === '') {
      validationErrors.push('El período es requerido');
    } else {
      const periodoMatch = editedData.PERIODO.match(/^(\d{2})\/(\d{4})$/);
      if (!periodoMatch) {
        validationErrors.push('El período debe tener formato mm/yyyy (ej: 09/2025)');
      } else {
        const mes = parseInt(periodoMatch[1]);
        const año = parseInt(periodoMatch[2]);
        const ahora = new Date();
        const añoActual = ahora.getFullYear();
        const mesActual = ahora.getMonth() + 1;
        
        if (mes < 1 || mes > 12) {
          validationErrors.push('El mes debe estar entre 01 y 12');
        }
        
        if (año > añoActual) {
          validationErrors.push(`El año no puede ser mayor al actual (${añoActual})`);
        }
        
        if (año === añoActual && mes > mesActual) {
          validationErrors.push(`El período no puede ser mayor al actual (${mesActual.toString().padStart(2, '0')}/${añoActual})`);
        }
      }
    }
    
    // Validar empresa
    if (!editedData.EMPRESA || editedData.EMPRESA.trim() === '') {
      validationErrors.push('La empresa es requerida');
    }
    
    return validationErrors;
  };

  const handleSave = () => {
    const validationErrors = validateData();
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    onSave(editedData);
    onClose();
  };

  const handleCancel = () => {
    setEditedData({ ...originalData });
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Editar Datos del Recibo
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Corrige manualmente los datos del archivo: <strong>{fileName}</strong>
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={editedData.NOMBRE || ''}
                onChange={(e) => handleFieldChange('NOMBRE', e.target.value)}
                onFocus={() => handleFieldFocus('NOMBRE')}
                onBlur={() => handleFieldBlur('NOMBRE')}
                placeholder="Apellido, Nombre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legajo">Legajo *</Label>
              <Input
                id="legajo"
                value={editedData.LEGAJO || ''}
                onChange={(e) => handleFieldChange('LEGAJO', e.target.value)}
                onFocus={() => handleFieldFocus('LEGAJO')}
                onBlur={() => handleFieldBlur('LEGAJO')}
                placeholder="Número de legajo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodo">Período *</Label>
              <Input
                id="periodo"
                value={editedData.PERIODO || ''}
                onChange={(e) => handleFieldChange('PERIODO', e.target.value)}
                onFocus={() => handleFieldFocus('PERIODO')}
                onBlur={() => handleFieldBlur('PERIODO')}
                placeholder="mm/yyyy (ej: 09/2025)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <EmpresaSelector
                value={editedData.EMPRESA || ''}
                onValueChange={(value) => handleFieldChange('EMPRESA', value)}
                placeholder="Seleccionar empresa..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuil">CUIL</Label>
              <Input
                id="cuil"
                value={editedData.CUIL || ''}
                onChange={(e) => handleFieldChange('CUIL', e.target.value)}
                onFocus={() => handleFieldFocus('CUIL')}
                onBlur={() => handleFieldBlur('CUIL')}
                placeholder="XX-XXXXXXXX-X"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sueldo">Sueldo Básico</Label>
              <Input
                id="sueldo"
                value={editedData.SUELDO_BASICO || ''}
                onChange={(e) => handleFieldChange('SUELDO_BASICO', e.target.value)}
                onFocus={() => handleFieldFocus('SUELDO_BASICO')}
                onBlur={() => handleFieldBlur('SUELDO_BASICO')}
                placeholder="Monto del sueldo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                value={editedData.TOTAL || ''}
                onChange={(e) => handleFieldChange('TOTAL', e.target.value)}
                onFocus={() => handleFieldFocus('TOTAL')}
                onBlur={() => handleFieldBlur('TOTAL')}
                placeholder="Total a cobrar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descuentos">Descuentos</Label>
              <Input
                id="descuentos"
                value={editedData.DESCUENTOS || ''}
                onChange={(e) => handleFieldChange('DESCUENTOS', e.target.value)}
                onFocus={() => handleFieldFocus('DESCUENTOS')}
                onBlur={() => handleFieldBlur('DESCUENTOS')}
                placeholder="Total de descuentos"
              />
            </div>
          </div>

          {/* Sección de columnas numéricas (códigos de concepto) */}
          {numericColumns.length > 0 && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Conceptos y Montos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {numericColumns.map((columnKey) => (
                    <div key={columnKey} className="space-y-2">
                      <Label htmlFor={columnKey}>
                        {getColumnDisplayName(columnKey)}
                        <span className="text-xs text-gray-500 ml-2">({columnKey})</span>
                      </Label>
                      <Input
                        id={columnKey}
                        value={editedData[columnKey] || ''}
                        onChange={(e) => handleFieldChange(columnKey, e.target.value)}
                        onFocus={() => handleFieldFocus(columnKey)}
                        onBlur={() => handleFieldBlur(columnKey)}
                        placeholder="Monto del concepto"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {pdfText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Texto extraído del PDF</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPdfText(!showPdfText)}
              >
                {showPdfText ? 'Ocultar' : 'Mostrar'} texto
              </Button>
            </div>
               {showPdfText && (
                 <div className="border rounded-md p-3 bg-gray-50 max-h-60 overflow-y-auto">
                   <textarea
                     className="w-full h-full text-xs font-mono bg-transparent border-none outline-none resize-none"
                     value={pdfText}
                     readOnly={true}
                     placeholder="Texto extraído del PDF..."
                     style={{ minHeight: '200px' }}
                   />
                 </div>
               )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
