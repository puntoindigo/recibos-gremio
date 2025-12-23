// components/EditDataModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Save, X, FileText, Eye, EyeOff, Settings, Loader2 } from 'lucide-react';
import { EmpresaSelector } from './EmpresaSelector';
// import { ColumnConfigManager } from '@/lib/column-config-manager'; // ELIMINADO
import { useSession } from 'next-auth/react';

interface EditDataModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (updatedData: Record<string, string>) => void;
  originalData: Record<string, string>;
  fileName: string;
  pdfText?: string;
  pdfUrl?: string; // URL del PDF para visualización
  ocrDebugInfo?: any; // Información de debug del OCR
  onMarkFieldInPDF?: (field: string, fileName: string) => void; // Callback para abrir marcador OCR
}

export default function EditDataModal({ 
  open, 
  onClose, 
  onSave, 
  originalData, 
  fileName,
  pdfText,
  pdfUrl,
  ocrDebugInfo,
  onMarkFieldInPDF
}: EditDataModalProps) {
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [showPdfText, setShowPdfText] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [showOcrDebug, setShowOcrDebug] = useState(false);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [tempAlias, setTempAlias] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { data: session } = useSession();

  // Cargar alias de columnas cuando se abre el modal
  useEffect(() => {
    const loadColumnAliases = async () => {
      if (session?.user?.id) {
        try {
          // const config = await ColumnConfigManager.getConfig(session.user.id, 'recibos'); // ELIMINADO
          // setColumnAliases(config?.columnAliases || {}); // ELIMINADO
          setColumnAliases({}); // Por ahora no cargamos alias
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
      // Verificar si hay datos válidos antes de mostrar el modal
      // Considerar que hay datos si al menos hay NOMBRE, LEGAJO o PERIODO
      const hasData = originalData && (
        Object.keys(originalData).length > 0 && 
        (originalData.NOMBRE || originalData.LEGAJO || originalData.PERIODO || originalData.EMPRESA)
      );
      
      if (!hasData) {
        // Si no hay datos, mostrar preloader
        setIsLoadingData(true);
        // Esperar un momento y verificar de nuevo (por si los datos están llegando)
        const timeout = setTimeout(() => {
          const stillNoData = !originalData || Object.keys(originalData).length === 0 || 
            (!originalData.NOMBRE && !originalData.LEGAJO && !originalData.PERIODO && !originalData.EMPRESA);
          if (stillNoData) {
            setIsLoadingData(false); // Si después de un momento sigue sin datos, mostrar el modal vacío
          }
        }, 500);
        return () => clearTimeout(timeout);
      }
      
      setIsLoadingData(false);
      
      // Asegurar que CATEGORIA siempre esté presente (como campo obligatorio)
      const initialData = { ...originalData };
      if (!initialData.CATEGORIA && !initialData.CATEGORÍA) {
        initialData.CATEGORIA = '';
      } else if (initialData.CATEGORÍA && !initialData.CATEGORIA) {
        initialData.CATEGORIA = initialData.CATEGORÍA;
      }
      setEditedData(initialData);
      setErrors([]);
    } else {
      // Resetear estado cuando se cierra
      setIsLoadingData(false);
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
        'JORNAL', 'SUELDO_BRUTO', 'TOTAL', 'DESCUENTOS', 'HORAS_EXTRAS', 'INASISTENCIAS', 'ARCHIVO', 
        'TEXTO_COMPLETO', 'PRIMERAS_LINEAS', 'VALIDATION_ERRORS', 
        'NRO. DE CUIL', 'CUIL_NORM', 'CATEGORIA', 'CATEGORÍA', 'PUESTO', 
        'CLASIFICACION', 'CARGO', 'FUNCION'
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

  // Función para abrir el modal de configuración de columna
  const handleConfigureColumn = (columnKey: string) => {
    setSelectedColumn(columnKey);
    setTempAlias(columnAliases[columnKey] || columnKey);
    setShowColumnConfig(true);
  };

  // Función para guardar el alias de la columna
  const handleSaveColumnAlias = async () => {
    if (!selectedColumn) return;

    const newAliases = {
      ...columnAliases,
      [selectedColumn]: tempAlias.trim() || selectedColumn
    };

    setColumnAliases(newAliases);

    // Guardar en la base de datos
    if (session?.user?.id) {
      try {
        // const config = await ColumnConfigManager.getConfig(session.user.id, 'recibos'); // ELIMINADO
        // await ColumnConfigManager.saveConfig( // ELIMINADO
        //   session.user.id,
        //   'recibos',
        //   config?.visibleColumns || [],
        //   newAliases
        // );
        // Por ahora no guardamos alias
      } catch (error) {
        console.error('Error guardando alias de columna:', error);
      }
    }

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
        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Cargando datos del recibo...</p>
            </div>
          </div>
        ) : (
          <>
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

        <div className="space-y-4 modal-content-fix">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="nombre" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('NOMBRE')} *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfigureColumn('NOMBRE')}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="legajo" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('LEGAJO')} *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfigureColumn('LEGAJO')}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="periodo" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('PERIODO')} *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfigureColumn('PERIODO')}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="empresa" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('EMPRESA')} *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfigureColumn('EMPRESA')}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
              <EmpresaSelector
                value={editedData.EMPRESA || ''}
                onValueChange={(value) => handleFieldChange('EMPRESA', value)}
                placeholder="Seleccionar empresa..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cuil" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('CUIL')}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfigureColumn('CUIL')}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
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
                       <div className="flex items-center justify-between">
                         <Label htmlFor="categoria" className="cursor-pointer hover:text-blue-600 transition-colors">
                           {getColumnDisplayName('CATEGORIA')} *
                         </Label>
                         <div className="flex gap-1">
                           {(pdfUrl || fileName) && (
                             <>
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                   if (onMarkFieldInPDF) {
                                     onMarkFieldInPDF('CATEGORIA', fileName);
                                   }
                                 }}
                                 className="h-6 px-2 text-xs whitespace-nowrap"
                                 title="Marcar región en PDF para extraer CATEGORIA"
                               >
                                 📍 Marcar en PDF
                               </Button>
                               {(editedData.CATEGORIA || editedData.CATEGORÍA) && (
                                 <Button
                                   type="button"
                                   variant="outline"
                                   size="sm"
                                   onClick={() => {
                                     if (onMarkFieldInPDF) {
                                       onMarkFieldInPDF('CATEGORIA', fileName);
                                     }
                                   }}
                                   className="h-6 px-2 text-xs whitespace-nowrap"
                                   title="Ajustar selección de CATEGORIA en PDF"
                                 >
                                   🔧 Ajustar
                                 </Button>
                               )}
                             </>
                           )}
                           <Button
                             type="button"
                             variant="ghost"
                             size="sm"
                             onClick={() => handleConfigureColumn('CATEGORIA')}
                             className="h-6 w-6 p-0"
                           >
                             <Settings className="h-3 w-3" />
                           </Button>
                         </div>
                       </div>
                       <Input
                         id="categoria"
                         value={editedData.CATEGORIA || editedData.CATEGORÍA || ''}
                         onChange={(e) => handleFieldChange('CATEGORIA', e.target.value)}
                         onFocus={() => handleFieldFocus('CATEGORIA')}
                         onBlur={() => handleFieldBlur('CATEGORIA')}
                         placeholder="Ej: CHOFER, RECOLECTOR, PEONES, etc."
                       />
                       {(!editedData.CATEGORIA && !editedData.CATEGORÍA) && ocrDebugInfo?.textosExtraidos && ocrDebugInfo.textosExtraidos.some((t: any) => t.campo === 'CATEGORIA' && !t.aceptado) && (
                         <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                           ⚠️ No se pudo extraer CATEGORIA automáticamente. Usa el botón "📍 Marcar en PDF" arriba para marcar la región manualmente.
                         </div>
                       )}
                     </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sueldo" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('SUELDO_BASICO')}
                </Label>
                <div className="flex gap-1">
                  {(pdfUrl || fileName) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onMarkFieldInPDF) {
                          onMarkFieldInPDF('SUELDO_BASICO', fileName);
                        }
                      }}
                      className="h-6 px-2 text-xs whitespace-nowrap"
                      title="Marcar región en PDF para extraer SUELDO_BASICO"
                    >
                      📍 Marcar en PDF
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConfigureColumn('SUELDO_BASICO')}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="jornal" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('JORNAL')}
                </Label>
                <div className="flex gap-1">
                  {(pdfUrl || fileName) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onMarkFieldInPDF) {
                          onMarkFieldInPDF('JORNAL', fileName);
                        }
                      }}
                      className="h-6 px-2 text-xs whitespace-nowrap"
                      title="Marcar región en PDF para extraer JORNAL"
                    >
                      📍 Marcar en PDF
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConfigureColumn('JORNAL')}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Input
                id="jornal"
                value={editedData.JORNAL || ''}
                onChange={(e) => handleFieldChange('JORNAL', e.target.value)}
                onFocus={() => handleFieldFocus('JORNAL')}
                onBlur={() => handleFieldBlur('JORNAL')}
                placeholder="Monto del jornal"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="horasExtras" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('HORAS_EXTRAS')}
                </Label>
                <div className="flex gap-1">
                  {(pdfUrl || fileName) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onMarkFieldInPDF) {
                          onMarkFieldInPDF('HORAS_EXTRAS', fileName);
                        }
                      }}
                      className="h-6 px-2 text-xs whitespace-nowrap"
                      title="Marcar región en PDF para extraer HORAS_EXTRAS (tercera columna)"
                    >
                      📍 Marcar en PDF
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConfigureColumn('HORAS_EXTRAS')}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Input
                id="horasExtras"
                value={editedData.HORAS_EXTRAS || ''}
                onChange={(e) => handleFieldChange('HORAS_EXTRAS', e.target.value)}
                onFocus={() => handleFieldFocus('HORAS_EXTRAS')}
                onBlur={() => handleFieldBlur('HORAS_EXTRAS')}
                placeholder="Horas extras (tercera columna)"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="total" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('TOTAL')}
                </Label>
                <div className="flex gap-1">
                  {(pdfUrl || fileName) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onMarkFieldInPDF) {
                          onMarkFieldInPDF('TOTAL', fileName);
                        }
                      }}
                      className="h-6 px-2 text-xs whitespace-nowrap"
                      title="Marcar región en PDF para extraer TOTAL"
                    >
                      📍 Marcar en PDF
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConfigureColumn('TOTAL')}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="descuentos" className="cursor-pointer hover:text-blue-600 transition-colors">
                  {getColumnDisplayName('DESCUENTOS')}
                </Label>
                <div className="flex gap-1">
                  {(pdfUrl || fileName) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onMarkFieldInPDF) {
                          onMarkFieldInPDF('DESCUENTOS', fileName);
                        }
                      }}
                      className="h-6 px-2 text-xs whitespace-nowrap"
                      title="Marcar región en PDF para extraer DESCUENTOS"
                    >
                      📍 Marcar en PDF
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConfigureColumn('DESCUENTOS')}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>
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

          {/* Sección de campos de texto adicionales (CATEGORIA, etc.) */}
          {(() => {
            const textFields = ['CATEGORIA', 'CATEGORÍA', 'PUESTO', 'CLASIFICACION', 'CARGO', 'FUNCION'];
            // Campos principales que NO deben aparecer en adicionales
            const mainFields = ['NOMBRE', 'LEGAJO', 'PERIODO', 'EMPRESA', 'CUIL', 'CATEGORIA', 'CATEGORÍA'];
            const additionalTextFields = textFields.filter(field => 
              originalData[field] !== undefined && 
              editedData[field] !== undefined &&
              !mainFields.includes(field)
            );
            
            if (additionalTextFields.length === 0) return null;
            
            return (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Campos Adicionales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {additionalTextFields.map((fieldKey) => (
                      <div key={fieldKey} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={fieldKey} className="cursor-pointer hover:text-blue-600 transition-colors">
                            {getColumnDisplayName(fieldKey)}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfigureColumn(fieldKey)}
                            className="h-6 w-6 p-0"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          id={fieldKey}
                          value={editedData[fieldKey] || ''}
                          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                          onFocus={() => handleFieldFocus(fieldKey)}
                          onBlur={() => handleFieldBlur(fieldKey)}
                          placeholder={`Valor de ${fieldKey}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

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
                      <div className="flex items-center justify-between">
                        <Label htmlFor={columnKey} className="cursor-pointer hover:text-blue-600 transition-colors">
                        {getColumnDisplayName(columnKey)}
                        <span className="text-xs text-gray-500 ml-2">({columnKey})</span>
                      </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConfigureColumn(columnKey)}
                          className="h-6 w-6 p-0"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
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

        {/* Visualización del PDF si está disponible */}
        {pdfUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Visualización del PDF
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPdf(!showPdf)}
              >
                {showPdf ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPdf ? 'Ocultar' : 'Mostrar'} PDF
              </Button>
            </div>
            {showPdf && (
              <div className="border rounded-md overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-96"
                  title={`PDF: ${fileName}`}
                  style={{ minHeight: '400px' }}
                   />
                 </div>
               )}
          </div>
        )}

        {/* Información de debug OCR */}
        {ocrDebugInfo && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Información de Debug OCR</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOcrDebug(!showOcrDebug)}
              >
                {showOcrDebug ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showOcrDebug ? 'Ocultar' : 'Mostrar'} Debug OCR
              </Button>
            </div>
            {showOcrDebug && (
              <div className="space-y-2">
                <textarea
                  readOnly
                  value={JSON.stringify(ocrDebugInfo, null, 2)}
                  className="w-full h-40 p-3 text-xs font-mono bg-gray-50 border rounded resize-none"
                  placeholder="Información de debug del OCR..."
                />
                <div className="text-xs text-gray-500 space-y-1">
                  {ocrDebugInfo.reglaEncontrada ? (
                    <div className="text-green-600">✅ Regla encontrada</div>
                  ) : (
                    <div className="text-red-600">❌ Regla no encontrada: {ocrDebugInfo.razon || 'Razón no especificada'}</div>
                  )}
                  {ocrDebugInfo.camposConfigurados !== undefined && (
                    <div>Campos configurados: {ocrDebugInfo.camposConfigurados}</div>
                  )}
                  {ocrDebugInfo.camposProcesados !== undefined && (
                    <div>Campos procesados: {ocrDebugInfo.camposProcesados}</div>
                  )}
                </div>
                {ocrDebugInfo.textosExtraidos && ocrDebugInfo.textosExtraidos.length > 0 && (
                  <div className="text-xs space-y-1">
                    <div className="font-medium">Textos extraídos:</div>
                    {ocrDebugInfo.textosExtraidos.map((t: any, idx: number) => (
                      <div key={idx} className="pl-4 border-l-2 border-gray-300">
                        <div className="font-medium">{t.campo}:</div>
                        <div className="text-gray-600">Texto: "{t.texto || t.textoCrudo || '(vacío)'}"</div>
                        {t.aceptado ? (
                          <div className="text-green-600">✅ Aceptado: "{t.valorFinal}"</div>
                        ) : (
                          <div className="text-red-600">❌ Rechazado: {t.razonRechazo || 'Sin razón especificada'}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {ocrDebugInfo.errores && ocrDebugInfo.errores.length > 0 && (
                  <div className="text-xs text-red-600">
                    <div className="font-medium">Errores:</div>
                    {ocrDebugInfo.errores.map((err: string, idx: number) => (
                      <div key={idx} className="pl-4">• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>

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
          </>
        )}
      </DialogContent>

      {/* Modal de configuración de columna */}
      <Dialog open={showColumnConfig} onOpenChange={setShowColumnConfig}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Columna
            </DialogTitle>
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
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
