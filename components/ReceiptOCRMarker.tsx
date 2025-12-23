o'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, MousePointer2, Square, Eye, Move, Maximize2, Pencil, Check, Zap } from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

// Configurar el worker de PDF.js
if (typeof window !== 'undefined') {
  try {
    const version = pdfjsLib.version || '5.4.296';
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  } catch (error) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
}

interface MarkedField {
  id: string;
  fieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  detectedValue?: string;
  originalDetectedValue?: string; // Valor original detectado por OCR (antes de editar)
  columnIndex?: number; // Índice de columna (0=primera, 1=segunda, 2=tercera, etc.)
  conceptCode?: string; // Código del concepto (ej: "0003", "0158", etc.)
}

interface ReceiptOCRMarkerProps {
  open: boolean;
  onClose: () => void;
  onSave: (extractedValues: Record<string, string>, markedFields?: MarkedField[]) => void;
  receipt: {
    key: string;
    archivos: string[];
    data?: Record<string, any>;
  };
  requiredFields: string[]; // Campos obligatorios faltantes
  allowedFields?: string[]; // Campos adicionales permitidos (ej: JORNAL, HORAS_EXTRAS)
}

const REQUIRED_FIELD_NAMES: Record<string, string> = {
  'LEGAJO': 'Legajo',
  'EMPRESA': 'Empresa',
  'CUIL/DNI': 'CUIL/DNI',
  'NOMBRE': 'Nombre',
  'CATEGORIA': 'Categoría',
  'JORNAL': 'Jornal',
  'HORAS_EXTRAS': 'Horas Extras',
  'SUELDO_BASICO': 'Sueldo Básico',
  'SUELDO_BRUTO': 'Sueldo Bruto',
  'TOTAL': 'Total',
  'DESCUENTOS': 'Descuentos'
};

type DragMode = 'none' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-w' | 'resize-e';

export default function ReceiptOCRMarker({ 
  open, 
  onClose, 
  onSave,
  receipt,
  requiredFields,
  allowedFields = []
}: ReceiptOCRMarkerProps) {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [markedFields, setMarkedFields] = useState<MarkedField[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedFieldName, setSelectedFieldName] = useState<string>('');
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // Estados para mover/redimensionar
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragStartField, setDragStartField] = useState<MarkedField | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasMounted, setCanvasMounted] = useState(false);
  const { dataManager } = useCentralizedDataManager();
  
  // Función para detectar automáticamente conceptos en la tabla del PDF
  const detectConceptsInTable = async (pdf: any, empresa: string) => {
    try {
      // Conceptos comunes a detectar con sus códigos
      // Agregar más conceptos y patrones más flexibles
      const conceptsToDetect = [
        { name: 'JORNAL BASICO', fieldName: 'JORNAL', code: '0003', patterns: [/JORNAL\s+BASICO/i, /JORNAL\s+BÁSICO/i, /0003\s+JORNAL/i, /JORNAL/i], defaultColumn: 0 },
        { name: 'ADICIONAL 15%', fieldName: 'ADICIONALES', code: '0058', patterns: [/ADICIONAL\s+15%/i, /0058\s+ADICIONAL/i, /ADICIONAL\s+18%/i], defaultColumn: 0 },
        { name: 'ADICIONAL 18%', fieldName: 'ADICIONALES', code: '0058', patterns: [/ADICIONAL\s+18%/i, /ADICIONAL\s+15%/i], defaultColumn: 0 },
        { name: 'CODIGO 5.3.4', fieldName: 'ADICIONALES', code: '0119', patterns: [/CODIGO\s+5\.3\.4/i, /0119\s+CODIGO/i, /5\.3\.4/i], defaultColumn: 0 },
        { name: 'CODIGO 5.3.10', fieldName: 'ADICIONALES', code: '0112', patterns: [/CODIGO\s+5\.3\.10/i, /0112\s+CODIGO/i, /5\.3\.10/i, /ITEM\s+5\.3\.10/i], defaultColumn: 0 },
        { name: 'HORAS EXTRAS 50%', fieldName: 'HORAS_EXTRAS_50', code: '0158', patterns: [/HORAS\s+EXTRAS\s+50%/i, /0158\s+HORAS/i, /HORAS.*50%/i], defaultColumn: 0 },
        { name: 'HORAS EXTRAS 100%', fieldName: 'HORAS_EXTRAS_100', code: '0159', patterns: [/HORAS\s+EXTRAS\s+100%/i, /0159\s+HORAS/i, /HORAS.*100%/i], defaultColumn: 0 },
        { name: 'ANTIGUEDAD', fieldName: 'ANTIGUEDAD', code: '0200', patterns: [/ANTIGUEDAD/i, /0200\s+ANTIGUEDAD/i], defaultColumn: 0 },
        { name: 'JUBILACION', fieldName: 'JUBILACION', code: '0300', patterns: [/JUBILACION/i, /0300\s+JUBILACION/i], defaultColumn: 2 },
        { name: 'OBRA SOCIAL', fieldName: 'OBRA_SOCIAL', code: '0310', patterns: [/OBRA\s+SOCIAL/i, /0310\s+OBRA/i, /O\.S\./i], defaultColumn: 2 },
        { name: 'CUOTA GREMIAL', fieldName: 'CUOTA_GREMIAL', code: '0323', patterns: [/CUOTA\s+GREMIAL/i, /0323\s+CUOTA/i], defaultColumn: 2 },
        { name: 'LEY 19032', fieldName: 'LEY_19032', code: '0302', patterns: [/LEY\s+19032/i, /0302\s+LEY/i, /19032/i], defaultColumn: 2 },
        { name: 'SEG. SEPELIO', fieldName: 'SEG_SEPELIO', code: '0324', patterns: [/SEG\.\s+SEPELIO/i, /SEGURO\s+SEPELIO/i, /0324\s+SEG/i, /SEPELIO/i], defaultColumn: 2 },
        { name: 'FRANCOS TRABAJADOS', fieldName: 'FRANCOS_TRABAJADOS', code: null, patterns: [/FRANCOS\s+TRABAJADOS/i], defaultColumn: 0 },
        { name: 'DIAS TRABAJADOS', fieldName: 'DIAS_TRABAJADOS', code: null, patterns: [/D[ÍI]AS\s+TRABAJADOS/i], defaultColumn: 0 },
      ];
      
      const detectedFields: MarkedField[] = [];
      
      // Procesar cada página
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const textContent = await page.getTextContent();
        const originalViewport = page.getViewport({ scale: 1.0 });
        
        // Primero, identificar las columnas de la tabla buscando los headers
        let jornalHeaderX: number | null = null;
        let habDescHeaderX: number | null = null;
        let deduccionesHeaderX: number | null = null;
        
        for (const item of textContent.items as any[]) {
          if (!('transform' in item) || !item.str) continue;
          const itemText = item.str.toUpperCase().trim();
          const itemX = item.transform[4];
          
          if (itemText === 'JORNAL' && !jornalHeaderX) {
            jornalHeaderX = itemX;
          } else if ((itemText.includes('HAB') || itemText.includes('HABER')) && !habDescHeaderX) {
            habDescHeaderX = itemX;
          } else if ((itemText.includes('DEDUCCION') || itemText.includes('DEDUCCIÓN')) && !deduccionesHeaderX) {
            deduccionesHeaderX = itemX;
          }
        }
        
        // Si no encontramos headers, usar posiciones aproximadas basadas en el ancho de página
        if (!jornalHeaderX) jornalHeaderX = originalViewport.width * 0.5;
        if (!habDescHeaderX) habDescHeaderX = originalViewport.width * 0.65;
        if (!deduccionesHeaderX) deduccionesHeaderX = originalViewport.width * 0.8;
        
        // Agrupar items por Y (líneas) para encontrar la tabla
        const lines: Array<{ y: number; items: any[] }> = [];
        for (const item of textContent.items as any[]) {
          if (!('transform' in item) || !item.str || item.str.trim() === '') continue;
          
          const itemY = item.transform[5];
          const existingLine = lines.find(l => Math.abs(l.y - itemY) < 5);
          
          if (existingLine) {
            existingLine.items.push(item);
          } else {
            lines.push({ y: itemY, items: [item] });
          }
        }
        
        // Ordenar líneas por Y (de arriba a abajo)
        lines.sort((a, b) => b.y - a.y);
        
        // Buscar cada concepto
        for (const concept of conceptsToDetect) {
          for (const pattern of concept.patterns) {
            // Buscar en cada línea
            for (const line of lines) {
              const lineText = line.items.map((item: any) => item.str).join(' ');
              
              if (pattern.test(lineText)) {
                // Encontrar el item del concepto (puede ser el código o el nombre)
                const conceptItem = line.items.find((item: any) => {
                  const itemText = item.str.trim();
                  return pattern.test(itemText) || 
                         (concept.code && itemText === concept.code) ||
                         (concept.code && itemText.startsWith(concept.code));
                });
                
                if (conceptItem) {
                  const conceptX = conceptItem.transform[4];
                  const conceptY = conceptItem.transform[5];
                  
                  // Determinar qué columna usar según el tipo de concepto
                  let targetColumnX = jornalHeaderX;
                  let columnIndex = concept.defaultColumn;
                  
                  if (concept.defaultColumn === 0 && jornalHeaderX) {
                    targetColumnX = jornalHeaderX;
                  } else if (concept.defaultColumn === 1 && habDescHeaderX) {
                    targetColumnX = habDescHeaderX;
                    columnIndex = 1;
                  } else if (concept.defaultColumn === 2 && deduccionesHeaderX) {
                    targetColumnX = deduccionesHeaderX;
                    columnIndex = 2;
                  }
                  
                  // Buscar el valor monetario en la columna objetivo
                  // Buscar en un rango más amplio de líneas (hasta 3 líneas arriba y abajo)
                  let valueFound = false;
                  const searchRange = Math.max(0, lines.indexOf(line) - 2);
                  const searchEnd = Math.min(lines.length, lines.indexOf(line) + 3);
                  
                  for (const searchLine of lines.slice(searchRange, searchEnd)) {
                    for (const searchItem of searchLine.items) {
                      const searchX = searchItem.transform[4];
                      const searchY = searchItem.transform[5];
                      
                      // Ampliar el rango de búsqueda en X (hasta 120px) y Y (hasta 30px)
                      if (Math.abs(searchX - targetColumnX) < 120 && Math.abs(searchY - conceptY) < 30) {
                        const valueText = searchItem.str.trim();
                        // Verificar si es un valor monetario (formato argentino con comas y puntos)
                        // Aceptar valores como: 761.375,05 o 761375,05 o 761.375
                        const cleanValue = valueText.replace(/[^\d,.]/g, '');
                        // Patrón más flexible: acepta números con comas y puntos en cualquier orden razonable
                        const isMonetaryValue = cleanValue && (
                          /^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/.test(cleanValue) || // Formato: 761.375,05 o 761,375.05
                          /^\d{1,3}(?:\.\d{3})+(?:,\d{2})?$/.test(cleanValue) || // Formato: 761.375,05
                          /^\d{4,}$/.test(cleanValue.replace(/[.,]/g, '')) // Números grandes sin formato (>= 1000)
                        );
                        
                        if (isMonetaryValue) {
                          // Verificar que no sea un valor muy pequeño (probablemente días/cantidad)
                          const numericValue = parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
                          if (numericValue >= 100 || concept.fieldName.includes('JORNAL') || concept.fieldName.includes('HORAS_EXTRAS')) {
                            // Crear campo marcado con un área más amplia para capturar el valor completo
                            const x = Math.max(0, Math.min(1, (targetColumnX - 80) / originalViewport.width));
                            const y = Math.max(0, Math.min(1, (originalViewport.height - searchY - 15) / originalViewport.height));
                            const width = Math.min(1 - x, 200 / originalViewport.width);
                            const height = Math.min(1 - y, 25 / originalViewport.height);
                            
                            // Verificar si ya existe un campo para este concepto
                            // Para conceptos múltiples (HORAS EXTRAS), permitir múltiples instancias por código
                            const isMultipleConcept = concept.fieldName.includes('HORAS_EXTRAS');
                            const existingField = detectedFields.find(f => 
                              f.fieldName === concept.fieldName && 
                              f.pageNumber === pageNum &&
                              (!isMultipleConcept || f.conceptCode === concept.code)
                            );
                            
                            if (!existingField) {
                              detectedFields.push({
                                id: `${concept.fieldName}-${pageNum}-${Date.now()}-${concept.code || ''}`,
                                fieldName: concept.fieldName,
                                x,
                                y,
                                width,
                                height,
                                pageNumber: pageNum,
                                detectedValue: valueText,
                                columnIndex,
                                conceptCode: concept.code || undefined
                              });
                              valueFound = true;
                              break;
                            }
                          }
                        }
                      }
                    }
                    if (valueFound) break;
                  }
                  
                  if (valueFound) break;
                }
              }
            }
          }
        }
      }
      
      // Detección genérica: buscar TODAS las filas de la tabla y extraer conceptos y valores
      // Esto complementa la detección específica de arriba
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const originalViewport = page.getViewport({ scale: 1.0 });
        
        // Buscar la sección de la tabla (después de "CONCEPTO" o "LIQUIDACION")
        let inTableSection = false;
        let tableStartY = 0;
        let tableEndY = 0;
        
        // Identificar headers de tabla
        let jornalHeaderX: number | null = null;
        let habDescHeaderX: number | null = null;
        let deduccionesHeaderX: number | null = null;
        
        for (const item of textContent.items as any[]) {
          if (!('transform' in item) || !item.str) continue;
          const itemText = item.str.toUpperCase().trim();
          const itemX = item.transform[4];
          const itemY = item.transform[5];
          
          if (itemText === 'CONCEPTO' || itemText.includes('LIQUIDACION')) {
            inTableSection = true;
            tableStartY = itemY;
          }
          
          if (itemText === 'JORNAL' && !jornalHeaderX) {
            jornalHeaderX = itemX;
          } else if ((itemText.includes('HAB') || itemText.includes('HABER')) && !habDescHeaderX) {
            habDescHeaderX = itemX;
          } else if ((itemText.includes('DEDUCCION') || itemText.includes('DEDUCCIÓN')) && !deduccionesHeaderX) {
            deduccionesHeaderX = itemX;
            tableEndY = itemY - 200; // Asumir que la tabla termina 200px antes de los totales
          }
        }
        
        if (inTableSection && jornalHeaderX) {
          // Agrupar items por Y (líneas)
          const lines: Array<{ y: number; items: any[] }> = [];
          for (const item of textContent.items as any[]) {
            if (!('transform' in item) || !item.str || item.str.trim() === '') continue;
            
            const itemY = item.transform[5];
            // Solo procesar líneas dentro de la sección de tabla
            if (itemY < tableStartY && itemY > tableEndY) {
              const existingLine = lines.find(l => Math.abs(l.y - itemY) < 5);
              if (existingLine) {
                existingLine.items.push(item);
              } else {
                lines.push({ y: itemY, items: [item] });
              }
            }
          }
          
          // Ordenar líneas por Y
          lines.sort((a, b) => b.y - a.y);
          
          // Para cada línea, buscar códigos de concepto (4 dígitos) y sus valores
          for (const line of lines) {
            const lineText = line.items.map((item: any) => item.str).join(' ');
            
            // Buscar código de concepto (4 dígitos al inicio de la línea)
            const codeMatch = lineText.match(/^(\d{4})\s+/);
            if (codeMatch) {
              const code = codeMatch[1];
              const conceptText = lineText.substring(codeMatch[0].length).trim();
              
              // Buscar valores monetarios en las columnas
              const conceptItem = line.items.find((item: any) => item.str.trim() === code);
              if (conceptItem) {
                const conceptX = conceptItem.transform[4];
                const conceptY = conceptItem.transform[5];
                
                // Buscar valores en todas las columnas
                const columns = [
                  { x: jornalHeaderX, name: 'JORNAL', index: 0 },
                  { x: habDescHeaderX, name: 'HAB_S_DESC', index: 1 },
                  { x: deduccionesHeaderX, name: 'DEDUCCIONES', index: 2 }
                ].filter(col => col.x !== null);
                
                for (const column of columns) {
                  // Buscar valor en esta columna
                  for (const searchItem of line.items) {
                    const searchX = searchItem.transform[4];
                    const searchY = searchItem.transform[5];
                    
                    if (Math.abs(searchX - column.x!) < 100 && Math.abs(searchY - conceptY) < 15) {
                      const valueText = searchItem.str.trim();
                      const cleanValue = valueText.replace(/[^\d,.]/g, '');
                      
                      // Verificar si es un valor monetario
                      if (cleanValue && /^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/.test(cleanValue)) {
                        const numericValue = parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
                        
                        // Solo agregar si es un valor monetario significativo (>= 100)
                        if (numericValue >= 100) {
                          // Mapear código a nombre de campo conocido
                          const codeToFieldMap: Record<string, string> = {
                            '0003': 'JORNAL',
                            '0058': 'ADICIONALES',
                            '0112': 'ADICIONALES',
                            '0119': 'ADICIONALES',
                            '0158': 'HORAS_EXTRAS_50',
                            '0159': 'HORAS_EXTRAS_100',
                            '0200': 'ANTIGUEDAD',
                            '0300': 'JUBILACION',
                            '0302': 'LEY_19032',
                            '0310': 'OBRA_SOCIAL',
                            '0323': 'CUOTA_GREMIAL',
                            '0324': 'SEG_SEPELIO'
                          };
                          
                          // Usar nombre de campo conocido o crear uno genérico
                          const fieldName = codeToFieldMap[code] || `CONCEPTO_${code}`;
                          
                          // Verificar si ya existe
                          const isMultipleConcept = fieldName.includes('HORAS_EXTRAS');
                          const existing = detectedFields.find(f => 
                            f.fieldName === fieldName && 
                            f.pageNumber === pageNum &&
                            (!isMultipleConcept || f.conceptCode === code) &&
                            f.columnIndex === column.index
                          );
                          
                          if (!existing) {
                            const x = Math.max(0, Math.min(1, (column.x! - 80) / originalViewport.width));
                            const y = Math.max(0, Math.min(1, (originalViewport.height - searchY - 15) / originalViewport.height));
                            const width = Math.min(1 - x, 200 / originalViewport.width);
                            const height = Math.min(1 - y, 25 / originalViewport.height);
                            
                            detectedFields.push({
                              id: `${fieldName}-${pageNum}-${Date.now()}-${column.index}-${code}`,
                              fieldName,
                              x,
                              y,
                              width,
                              height,
                              pageNumber: pageNum,
                              detectedValue: valueText,
                              columnIndex: column.index,
                              conceptCode: code
                            });
                            break; // Solo un valor por columna por concepto
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // Agregar campos detectados
      if (detectedFields.length > 0) {
        setMarkedFields(prev => {
          // Combinar con campos existentes, evitando duplicados
          // Para campos que ya existen (mismo fieldName y mismo conceptCode), mantener el existente
          const existingFieldKeys = new Set(prev.map(f => {
            const key = `${f.fieldName}-${f.pageNumber}`;
            // Para conceptos con código, incluir el código en la clave
            if (f.conceptCode) {
              return `${key}-${f.conceptCode}-${f.columnIndex || 0}`;
            }
            return `${key}-${f.columnIndex || 0}`;
          }));
          
          const newFields = detectedFields.filter(f => {
            const key = `${f.fieldName}-${f.pageNumber}`;
            const fullKey = f.conceptCode ? `${key}-${f.conceptCode}-${f.columnIndex || 0}` : `${key}-${f.columnIndex || 0}`;
            return !existingFieldKeys.has(fullKey);
          });
          
          if (newFields.length > 0) {
            return [...prev, ...newFields];
          }
          return prev;
        });
        if (detectedFields.length > 0) {
          toast.success(`✅ ${detectedFields.length} concepto(s) detectado(s) automáticamente en la tabla`);
        }
      }
    } catch (error) {
      console.error('Error detectando conceptos:', error);
    }
  };
  
  // Callback ref para detectar cuando el canvas se monta
  const canvasRefCallback = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      canvasRef.current = node;

      setCanvasMounted(true);
    } else {
      setCanvasMounted(false);
    }
  }, []);

  // Campos disponibles (obligatorios + permitidos)
  const availableFields = [...new Set([...requiredFields, ...allowedFields])];

  // Inicializar con el primer campo faltante
  useEffect(() => {
    if (open && availableFields.length > 0 && !selectedFieldName) {
      setSelectedFieldName(availableFields[0]);
    }
  }, [open, availableFields, selectedFieldName]);

  // Cargar PDF cuando se abre el modal
  useEffect(() => {
    
    if (open && receipt?.archivos && receipt.archivos.length > 0) {
      const loadPdf = async () => {
        setIsLoadingPdf(true);
        setPdfError(null);
        try {
          const filename = receipt.archivos?.[0];
          if (!filename) {
            throw new Error('No hay nombre de archivo disponible');
          }
          const response = await fetch(`/api/get-pdf?filename=${encodeURIComponent(filename)}`);
          
          if (!response.ok) {
            throw new Error(`No se pudo cargar el PDF: ${response.status}`);
          }
          
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          
          // Cargar reglas OCR existentes para esta empresa
          const empresa = receipt.data?.EMPRESA || '';
          let ocrRule: any = null;
          if (empresa) {
            try {
              ocrRule = await dataManager.getAppConfig(`field_markers_${empresa}`);
              if (ocrRule && ocrRule.fields && Array.isArray(ocrRule.fields) && ocrRule.fields.length > 0) {
                // Función auxiliar para extraer texto de una región en un PDF ya cargado
                const extractTextForField = async (field: MarkedField) => {
                  try {
                    const page = await pdf.getPage(field.pageNumber);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const textContent = await page.getTextContent();
                    
                    const scaleFactor = viewport.width / (await pdf.getPage(field.pageNumber)).getViewport({ scale: 1.0 }).width;
                    const canvasX1 = field.x * viewport.width;
                    const canvasY1 = field.y * viewport.height;
                    const canvasX2 = (field.x + field.width) * viewport.width;
                    const canvasY2 = (field.y + field.height) * viewport.height;
                    
                    const originalViewport = (await pdf.getPage(field.pageNumber)).getViewport({ scale: 1.0 });
                    const originalX1 = canvasX1 / scaleFactor;
                    const originalX2 = canvasX2 / scaleFactor;
                    const originalY1 = originalViewport.height - (canvasY1 / scaleFactor);
                    const originalY2 = originalViewport.height - (canvasY2 / scaleFactor);
                    
                    const xMin = Math.min(originalX1, originalX2);
                    const xMax = Math.max(originalX1, originalX2);
                    const yTop = Math.max(originalY1, originalY2);
                    const yBottom = Math.min(originalY1, originalY2);
                    
                    const itemsInRegion: string[] = [];
                    for (const item of textContent.items as any[]) {
                      const itemX = item.transform[4];
                      const itemY = item.transform[5];
                      const itemWidth = item.width || 0;
                      const itemHeight = item.height || 0;
                      
                      if (itemX >= xMin && itemX + itemWidth <= xMax && 
                          itemY <= yTop && itemY - itemHeight >= yBottom) {
                        itemsInRegion.push(item.str);
                      }
                    }
                    
                    return itemsInRegion.join(' ').trim();
                  } catch (error) {
                    console.error(`Error extrayendo ${field.fieldName}:`, error);
                    return '';
                  }
                };
                
                // Re-extraer valores detectados para mostrar lo que actualmente está marcado
                const fieldsWithValues = await Promise.all(
                  ocrRule.fields.map(async (field: MarkedField) => {
                    const detectedValue = await extractTextForField(field);
                    return {
                      ...field,
                      detectedValue,
                      originalDetectedValue: detectedValue // Guardar valor original
                    };
                  })
                );
                setMarkedFields(fieldsWithValues);
                toast.success(`✅ Regla OCR cargada para ${empresa} (${fieldsWithValues.length} campo(s)). Valores detectados mostrados.`);
              } else {
                setMarkedFields([]);
              }
            } catch (error) {
              console.error('Error cargando regla OCR:', error);
              setMarkedFields([]);
            }
          } else {
            setMarkedFields([]);
          }
          
          // Detectar automáticamente conceptos en la tabla (siempre, incluso si hay reglas guardadas)
          // Esto permite detectar conceptos adicionales que no están marcados manualmente
          if (empresa) {
            try {
              await detectConceptsInTable(pdf, empresa);
            } catch (detectError) {
              console.error('Error detectando conceptos automáticamente:', detectError);
            }
          }
          
          toast.success(`PDF cargado: ${filename}`);
        } catch (error) {
          console.error('Error cargando PDF:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          setPdfError(errorMessage);
          toast.error(`Error cargando PDF: ${errorMessage}`);
        } finally {
          setIsLoadingPdf(false);
        }
      };
      
      loadPdf();
    }
    
    return () => {
      if (!open) {
        setPdfDocument(null);
        setTotalPages(0);
        setCurrentPage(1);
        setMarkedFields([]);
        setPdfError(null);
        setSelectedFieldId(null);
        setDragMode('none');
        setCanvasMounted(false);
      }
    };
  }, [open, receipt.archivos, dataManager]);

  // Renderizar página del PDF - esperar a que tanto pdfDocument como canvas estén montados
  useEffect(() => {
    if (!pdfDocument || !open || !canvasMounted || !canvasRef.current) {
      return;
    }
    
    // Usar un pequeño delay para asegurar que el DOM esté completamente listo
    const timer = setTimeout(() => {
      console.log('⏰ Timer ejecutado, llamando renderPdfPage...');
      renderPdfPage();
    }, 200);
    
    return () => {
      clearTimeout(timer);
    };
  }, [pdfDocument, currentPage, open, canvasMounted]);

  // Redibujar overlay
  useEffect(() => {
    if (pdfDocument && open && canvasRef.current) {
      redrawOverlay();
    }
  }, [markedFields, currentRect, isDrawing, currentPage, pdfDocument, open, selectedFieldId]);

  const renderPdfPage = async () => {
    if (!canvasRef.current || !pdfDocument) {
      console.warn('⚠️ No se puede renderizar: canvasRef.current =', !!canvasRef.current, 'pdfDocument =', !!pdfDocument);
      return;
    }
    
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('❌ No se pudo obtener contexto 2D del canvas');
      return;
    }

    try {

      const page = await pdfDocument.getPage(currentPage);

      const viewport = page.getViewport({ scale: 1.5 });

      // Establecer dimensiones del canvas ANTES de renderizar
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Limpiar canvas primero
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Renderizar la página del PDF directamente
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport
      });
      
      await renderTask.promise;

      // Asegurar que el overlay tenga el mismo tamaño
      if (overlayRef.current) {
        overlayRef.current.height = viewport.height;
        overlayRef.current.width = viewport.width;

        // Redibujar el overlay después de renderizar el PDF
        setTimeout(() => {

          redrawOverlay();
        }, 50);
      } else {
        console.warn('⚠️ overlayRef.current no está disponible');
      }
    } catch (error) {
      console.error('❌ Error renderizando página:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message, error.stack);
      }
      toast.error(`Error renderizando PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getResizeHandle = (field: MarkedField, handle: string): { x: number; y: number } => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const x = field.x * overlayRef.current.width;
    const y = field.y * overlayRef.current.height;
    const width = field.width * overlayRef.current.width;
    const height = field.height * overlayRef.current.height;
    const handleSize = 8;
    
    switch (handle) {
      case 'nw': return { x: x - handleSize/2, y: y - handleSize/2 };
      case 'ne': return { x: x + width - handleSize/2, y: y - handleSize/2 };
      case 'sw': return { x: x - handleSize/2, y: y + height - handleSize/2 };
      case 'se': return { x: x + width - handleSize/2, y: y + height - handleSize/2 };
      case 'n': return { x: x + width/2 - handleSize/2, y: y - handleSize/2 };
      case 's': return { x: x + width/2 - handleSize/2, y: y + height - handleSize/2 };
      case 'w': return { x: x - handleSize/2, y: y + height/2 - handleSize/2 };
      case 'e': return { x: x + width - handleSize/2, y: y + height/2 - handleSize/2 };
      default: return { x: 0, y: 0 };
    }
  };

  const getCursorForMode = (mode: DragMode): string => {
    switch (mode) {
      case 'move': return 'move';
      case 'resize-nw': case 'resize-se': return 'nwse-resize';
      case 'resize-ne': case 'resize-sw': return 'nesw-resize';
      case 'resize-n': case 'resize-s': return 'ns-resize';
      case 'resize-w': case 'resize-e': return 'ew-resize';
      default: return 'default';
    }
  };

  const getDragModeAtPosition = (x: number, y: number, field: MarkedField): DragMode => {
    if (!overlayRef.current) return 'none';
    
    const handleSize = 8;
    const fieldX = field.x * overlayRef.current.width;
    const fieldY = field.y * overlayRef.current.height;
    const fieldWidth = field.width * overlayRef.current.width;
    const fieldHeight = field.height * overlayRef.current.height;
    
    // Verificar esquinas
    const nw = getResizeHandle(field, 'nw');
    if (x >= nw.x && x <= nw.x + handleSize && y >= nw.y && y <= nw.y + handleSize) return 'resize-nw';
    const ne = getResizeHandle(field, 'ne');
    if (x >= ne.x && x <= ne.x + handleSize && y >= ne.y && y <= ne.y + handleSize) return 'resize-ne';
    const sw = getResizeHandle(field, 'sw');
    if (x >= sw.x && x <= sw.x + handleSize && y >= sw.y && y <= sw.y + handleSize) return 'resize-sw';
    const se = getResizeHandle(field, 'se');
    if (x >= se.x && x <= se.x + handleSize && y >= se.y && y <= se.y + handleSize) return 'resize-se';
    
    // Verificar bordes
    const n = getResizeHandle(field, 'n');
    if (x >= n.x && x <= n.x + handleSize && y >= n.y && y <= n.y + handleSize) return 'resize-n';
    const s = getResizeHandle(field, 's');
    if (x >= s.x && x <= s.x + handleSize && y >= s.y && y <= s.y + handleSize) return 'resize-s';
    const w = getResizeHandle(field, 'w');
    if (x >= w.x && x <= w.x + handleSize && y >= w.y && y <= w.y + handleSize) return 'resize-w';
    const e = getResizeHandle(field, 'e');
    if (x >= e.x && x <= e.x + handleSize && y >= e.y && y <= e.y + handleSize) return 'resize-e';
    
    // Verificar si está dentro del rectángulo (para mover)
    if (x >= fieldX && x <= fieldX + fieldWidth && y >= fieldY && y <= fieldY + fieldHeight) {
      return 'move';
    }
    
    return 'none';
  };

  const redrawOverlay = () => {
    if (!overlayRef.current || !canvasRef.current) return;
    const overlay = overlayRef.current;
    const context = overlay.getContext('2d');
    if (!context) return;

    const pdfCanvas = canvasRef.current;
    
    // Asegurar que el overlay tenga el mismo tamaño que el canvas del PDF
    if (pdfCanvas.width > 0 && pdfCanvas.height > 0) {
      overlay.height = pdfCanvas.height;
      overlay.width = pdfCanvas.width;
    } else {
      return;
    }

    // Limpiar overlay
    context.clearRect(0, 0, overlay.width, overlay.height);

    const pageFields = markedFields.filter(f => f.pageNumber === currentPage);
    
    pageFields.forEach(field => {
      const isSelected = field.id === selectedFieldId;
      const x = field.x * overlay.width;
      const y = field.y * overlay.height;
      const width = field.width * overlay.width;
      const height = field.height * overlay.height;

      // Color según si está seleccionado
      const strokeColor = isSelected ? '#ef4444' : '#3b82f6';
      const lineWidth = isSelected ? 3 : 2;

      context.strokeStyle = strokeColor;
      context.lineWidth = lineWidth;
      context.strokeRect(x, y, width, height);

      // Etiqueta
      context.fillStyle = strokeColor;
      context.fillRect(x, y - 18, Math.max(width, 80), 18);
      context.fillStyle = '#ffffff';
      context.font = '12px Arial';
      context.fillText(field.fieldName, x + 4, y - 4);

      // Mostrar handles de redimensionamiento si está seleccionado
      if (isSelected) {
        const handleSize = 8;
        context.fillStyle = '#ffffff';
        context.strokeStyle = strokeColor;
        context.lineWidth = 2;
        
        const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];
        handles.forEach(handle => {
          const pos = getResizeHandle(field, handle);
          context.fillRect(pos.x, pos.y, handleSize, handleSize);
          context.strokeRect(pos.x, pos.y, handleSize, handleSize);
        });
      }
    });

    if (currentRect && isDrawing && overlay.width > 0 && overlay.height > 0) {
      context.strokeStyle = '#ef4444';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(
        currentRect.x * overlay.width,
        currentRect.y * overlay.height,
        currentRect.width * overlay.width,
        currentRect.height * overlay.height
      );
      context.setLineDash([]);
    }
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const extractTextFromRegion = async (field: MarkedField, expanded: boolean = false): Promise<string> => {
    if (!pdfDocument || !overlayRef.current) return '';
    
    try {
      const page = await pdfDocument.getPage(field.pageNumber);
      
      // Obtener viewports
      const originalViewport = page.getViewport({ scale: 1.0 });
      const renderViewport = page.getViewport({ scale: 1.5 });
      const textContent = await page.getTextContent();
      
      // Calcular factor de escala
      const scaleFactor = renderViewport.width / originalViewport.width;
      
      // Si estamos expandiendo, aumentar la región en ~5% para capturar texto cercano
      const expansionFactor = expanded ? 0.05 : 0;
      
      // Calcular coordenadas expandidas
      let adjustedX = field.x;
      let adjustedY = field.y;
      let adjustedWidth = field.width;
      let adjustedHeight = field.height;
      
      if (expanded) {
        adjustedX = Math.max(0, field.x - expansionFactor);
        adjustedY = Math.max(0, field.y - expansionFactor);
        adjustedWidth = Math.min(1 - adjustedX, field.width + (expansionFactor * 2));
        adjustedHeight = Math.min(1 - adjustedY, field.height + (expansionFactor * 2));
      }
      
      // Las coordenadas del campo son relativas (0-1), convertirlas a píxeles del render
      const canvasWidth = renderViewport.width;
      const canvasHeight = renderViewport.height;
      const canvasX1 = adjustedX * canvasWidth;
      const canvasY1 = adjustedY * canvasHeight;
      const canvasX2 = (adjustedX + adjustedWidth) * canvasWidth;
      const canvasY2 = (adjustedY + adjustedHeight) * canvasHeight;
      
      // Convertir al viewport original (escala 1.0)
      const originalX1 = canvasX1 / scaleFactor;
      const originalX2 = canvasX2 / scaleFactor;
      const originalY1 = originalViewport.height - (canvasY1 / scaleFactor);
      const originalY2 = originalViewport.height - (canvasY2 / scaleFactor);
      
      // Calcular región
      const xMin = Math.min(originalX1, originalX2);
      const xMax = Math.max(originalX1, originalX2);
      const yTop = Math.max(originalY1, originalY2);
      const yBottom = Math.min(originalY1, originalY2);
      
      // Extraer items en la región - usar lógica mejorada
      const itemsInRegion: Array<{str: string, x: number, y: number, width?: number, height?: number, distance?: number}> = [];
      
      // Obtener la matriz de transformación para calcular el bounding box completo
      for (const item of textContent.items) {
        if (!('transform' in item) || !item.str || item.str.trim() === '') continue;
        
        const transform = item.transform;
        const itemX = transform[4]; // X posición
        const itemY = transform[5]; // Y posición
        
        // Calcular dimensiones del texto usando la matriz de transformación
        // transform[0] = escala X, transform[3] = escala Y
        const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 12;
        const itemWidth = fontSize * (item.str.length * 0.6); // Aproximación del ancho
        const itemHeight = Math.abs(transform[3]) * 1.2 || fontSize * 1.2; // Alto aproximado
        
        // Calcular el centro del elemento de texto
        const itemCenterX = itemX + (itemWidth / 2);
        const itemCenterY = itemY;
        
        // Calcular bounding box del texto
        const itemX1 = itemX;
        const itemX2 = itemX + itemWidth;
        const itemY1 = itemY; // Y base (línea de base del texto)
        const itemY2 = itemY - itemHeight; // Y superior (el texto crece hacia abajo en PDF.js)
        
        // Verificar si el CENTRO del elemento está dentro de la región
        const centerInRegion = itemCenterX >= xMin && itemCenterX <= xMax && 
                               itemCenterY <= yTop && itemCenterY >= yBottom;
        
        // Verificar si el elemento se superpone con la región (más flexible)
        const overlapsX = (itemX1 <= xMax && itemX2 >= xMin);
        const overlapsY = (itemY1 >= yBottom && itemY2 <= yTop);
        
        // Verificar si cualquier parte del texto está dentro
        const partiallyInRegion = (itemX1 >= xMin && itemX1 <= xMax) || 
                                  (itemX2 >= xMin && itemX2 <= xMax) ||
                                  (itemCenterX >= xMin && itemCenterX <= xMax);
        const partiallyInY = (itemY1 >= yBottom && itemY1 <= yTop) || 
                             (itemY2 >= yBottom && itemY2 <= yTop) ||
                             (itemCenterY >= yBottom && itemCenterY <= yTop);
        
        // Incluir si:
        // 1. El centro está dentro, O
        // 2. Se superpone significativamente (más del 30% del texto), O
        // 3. Cualquier parte está dentro y está cerca del centro de la región
        const regionCenterX = (xMin + xMax) / 2;
        const regionCenterY = (yTop + yBottom) / 2;
        const distanceFromCenter = Math.sqrt(
          Math.pow(itemCenterX - regionCenterX, 2) + 
          Math.pow(itemCenterY - regionCenterY, 2)
        );
        const maxDistance = Math.sqrt(Math.pow(xMax - xMin, 2) + Math.pow(yTop - yBottom, 2)) * 0.6;
        
        if (centerInRegion || 
            (overlapsX && overlapsY && (itemX1 >= xMin * 0.7 && itemX2 <= xMax * 1.3)) ||
            (partiallyInRegion && partiallyInY && distanceFromCenter <= maxDistance)) {
          
          itemsInRegion.push({
            str: item.str.trim(),
            x: itemCenterX,
            y: itemCenterY,
            width: itemWidth,
            height: itemHeight,
            distance: distanceFromCenter
          });
        }
      }
      
      // Si no encontramos nada, usar tolerancia más amplia
      if (itemsInRegion.length === 0 && !expanded) {
        const tolerance = Math.max((xMax - xMin) * 0.1, (yTop - yBottom) * 0.1, 10);
        for (const item of textContent.items) {
          if (!('transform' in item) || !item.str || item.str.trim() === '') continue;
          
        const itemX = item.transform[4];
        const itemY = item.transform[5];
          
          const inX = itemX >= (xMin - tolerance) && itemX <= (xMax + tolerance);
          const inY = itemY <= (yTop + tolerance) && itemY >= (yBottom - tolerance);
          
          if (inX && inY) {
            itemsInRegion.push({
              str: item.str.trim(),
              x: itemX,
              y: itemY,
              distance: Math.sqrt(Math.pow(itemX - (xMin + xMax) / 2, 2) + Math.pow(itemY - (yTop + yBottom) / 2, 2))
            });
          }
        }
      }
      
      // Ordenar por distancia al centro (más cercanos primero)
      itemsInRegion.sort((a, b) => {
        const distA = a.distance || 0;
        const distB = b.distance || 0;
        if (Math.abs(distA - distB) > 1) {
          return distA - distB;
        }
        // Si están a la misma distancia, ordenar por Y (arriba a abajo), luego por X (izq a der)
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff > 5) {
          return b.y - a.y; // Y decrece hacia arriba
        }
        return a.x - b.x;
      });
      
      // Filtrar duplicados cercanos (mismo texto en posición similar)
      const uniqueItems: typeof itemsInRegion = [];
      for (const item of itemsInRegion) {
        const isDuplicate = uniqueItems.some(existing => 
          existing.str === item.str && 
          Math.abs(existing.x - item.x) < 5 && 
          Math.abs(existing.y - item.y) < 5
        );
        if (!isDuplicate) {
          uniqueItems.push(item);
        }
      }
      
      // Filtrar palabras no deseadas según el campo
      const filteredForField = uniqueItems.filter(item => {
        const upperStr = item.str.toUpperCase().trim();
        
        // Si el campo es CATEGORIA o CATEGORÍA, excluir la palabra "CATEGORIA" y variantes
        if (field.fieldName === 'CATEGORIA' || field.fieldName === 'CATEGORÍA') {
          const excludeWords = ['CATEGORIA', 'CATEGORÍA', 'CATEGOR', 'CATEG'];
          if (excludeWords.some(word => upperStr === word || upperStr.includes(word))) {
            return false;
          }
        }
        
        return true;
      });
      
      let rawText = filteredForField.map(item => item.str).join(' ').trim();
      
      // Aplicar reglas de reemplazo por empresa si existen
      if (rawText && receipt?.data?.EMPRESA) {
        try {
          const replacementRules = await dataManager.getAppConfig(`ocr_replacements_${receipt.data.EMPRESA}`);
          if (replacementRules && typeof replacementRules === 'object' && Array.isArray(replacementRules.rules)) {
            for (const rule of replacementRules.rules) {
              if (rule.fieldName === field.fieldName && rule.from && rule.to) {
                // Aplicar reemplazo (case-insensitive)
                const regex = new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                if (regex.test(rawText)) {
                  rawText = rawText.replace(regex, rule.to);
                }
              }
            }
          }
        } catch (replacementError) {
          // Si falla cargar reglas de reemplazo, continuar sin ellas
          console.log('No se pudieron cargar reglas de reemplazo:', replacementError);
        }
      }
      
      // Si no encontramos texto Y no estamos en modo expandido, intentar con región expandida
      if (!rawText && !expanded) {
        return await extractTextFromRegion(field, true);
      }
      
      return rawText;
    } catch (error) {
      console.error('Error extrayendo texto:', error);
      return '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayRef.current) return;
    
    const pos = getMousePos(e);
    
    // Primero verificar si hay un campo marcado en esta posición
    const pageFields = markedFields.filter(f => f.pageNumber === currentPage);
    let foundField: MarkedField | null = null;
    let foundMode: DragMode = 'none';
    
    for (const field of pageFields) {
      const mode = getDragModeAtPosition(pos.x, pos.y, field);
      if (mode !== 'none') {
        foundField = field;
        foundMode = mode;
        break;
      }
    }
    
    if (foundField && foundMode !== 'none') {
      // Modo edición: mover o redimensionar
      setSelectedFieldId(foundField.id);
      setDragMode(foundMode);
      setDragStartPos(pos); // Guardar posición inicial del mouse
      setDragStartField({ ...foundField }); // Guardar estado inicial del campo
      setIsDrawing(false);
      
      // Prevenir eventos de selección de texto
      e.preventDefault();
    } else if (selectedFieldName) {
      // Modo dibujo: crear nuevo rectángulo
      setIsDrawing(true);
      setStartPos(pos);
      setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      setSelectedFieldId(null);
    }
  };

  const handleMouseMove = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayRef.current) return;
    
    const pos = getMousePos(e);
    
    // Si estamos en modo de edición (mover/redimensionar)
    if (dragMode !== 'none' && dragStartPos && dragStartField && selectedFieldId) {
      const overlay = overlayRef.current;
      
      // Calcular delta desde la posición inicial del mouse
      const deltaX = pos.x - dragStartPos.x;
      const deltaY = pos.y - dragStartPos.y;
      
      // Limitar el delta máximo para evitar saltos extremos si el mouse sale y vuelve
      // Usar un límite más conservador: 20% del canvas en lugar de 50%
      const maxDeltaX = overlay.width * 0.2;
      const maxDeltaY = overlay.height * 0.2;
      const clampedDeltaX = Math.max(-maxDeltaX, Math.min(maxDeltaX, deltaX));
      const clampedDeltaY = Math.max(-maxDeltaY, Math.min(maxDeltaY, deltaY));
      
      // Normalizar deltas
      const normalizedDeltaX = clampedDeltaX / overlay.width;
      const normalizedDeltaY = clampedDeltaY / overlay.height;
      
      setMarkedFields(prev => prev.map(field => {
        if (field.id !== selectedFieldId) return field;
        
        let newField = { ...field };
        
        if (dragMode === 'move') {
          // Calcular nueva posición basada en la posición inicial del campo + delta
          newField.x = Math.max(0, Math.min(1 - dragStartField.width, dragStartField.x + normalizedDeltaX));
          newField.y = Math.max(0, Math.min(1 - dragStartField.height, dragStartField.y + normalizedDeltaY));
        } else {
          // Redimensionar basado en la posición inicial
          const startX = dragStartField.x;
          const startY = dragStartField.y;
          const startWidth = dragStartField.width;
          const startHeight = dragStartField.height;
          
          if (dragMode.includes('w')) {
            newField.x = Math.max(0, Math.min(startX + startWidth - 0.01, startX + normalizedDeltaX));
            newField.width = Math.max(0.01, startWidth - normalizedDeltaX);
          }
          if (dragMode.includes('e')) {
            newField.width = Math.max(0.01, Math.min(1 - startX, startWidth + normalizedDeltaX));
          }
          if (dragMode.includes('n')) {
            newField.y = Math.max(0, Math.min(startY + startHeight - 0.01, startY + normalizedDeltaY));
            newField.height = Math.max(0.01, startHeight - normalizedDeltaY);
          }
          if (dragMode.includes('s')) {
            newField.height = Math.max(0.01, Math.min(1 - startY, startHeight + normalizedDeltaY));
          }
        }
        
        return newField;
      }));
      
      // NO actualizar dragStartPos durante el movimiento - siempre calcular desde la posición inicial
      // Esto evita saltos cuando el mouse sale y vuelve al canvas
    } else if (isDrawing && startPos) {
      // Modo dibujo: actualizar rectángulo temporal
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;
      
      setCurrentRect({
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(width),
        height: Math.abs(height)
      });
    } else {
      // Actualizar cursor según la posición
      const pageFields = markedFields.filter(f => f.pageNumber === currentPage);
      let cursor = 'default';
      
      if (selectedFieldName) {
        cursor = 'crosshair';
      } else {
        for (const field of pageFields) {
          const mode = getDragModeAtPosition(pos.x, pos.y, field);
          if (mode !== 'none') {
            cursor = getCursorForMode(mode);
            break;
          }
        }
      }
      
      if (overlayRef.current) {
        overlayRef.current.style.cursor = cursor;
      }
    }
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Si estábamos en modo edición, finalizar y re-extraer texto
    if (dragMode !== 'none' && selectedFieldId && dragStartField) {
      const updatedField = markedFields.find(f => f.id === selectedFieldId);
      if (updatedField) {
        const extractedText = await extractTextFromRegion(updatedField);
        setMarkedFields(prev => {
          const updated = prev.map(f => 
          f.id === selectedFieldId 
              ? { ...f, detectedValue: extractedText, originalDetectedValue: f.originalDetectedValue || extractedText }
              : f
          );
          
          // Guardar automáticamente después de ajustar
          const extractedValues: Record<string, string> = {};
          updated.forEach(field => {
            if (field.detectedValue) {
              extractedValues[field.fieldName] = field.detectedValue;
            }
          });
          // NO guardar automáticamente - el usuario debe guardar manualmente
          
          return updated;
        });
        toast.success(`Campo "${updatedField.fieldName}" ajustado. Texto detectado: "${extractedText || '(vacío)'}"`);
      }
      
      setDragMode('none');
      setDragStartPos(null);
      setDragStartField(null);
      return;
    }
    
    // Modo dibujo: crear nuevo campo
    if (!isDrawing || !startPos || !selectedFieldName || !overlayRef.current || !pdfDocument) return;
    
    const pos = getMousePos(e);
    const width = Math.abs(pos.x - startPos.x);
    const height = Math.abs(pos.y - startPos.y);
    
    if (width < 10 || height < 10) {
      setIsDrawing(false);
      setStartPos(null);
      setCurrentRect(null);
      return;
    }

    const overlay = overlayRef.current;
    const x = Math.min(startPos.x, pos.x) / overlay.width;
    const y = Math.min(startPos.y, pos.y) / overlay.height;
    const w = width / overlay.width;
    const h = height / overlay.height;

    // Extraer texto de la región
    try {
      const newField: MarkedField = {
        id: `${selectedFieldName}-${Date.now()}`,
        fieldName: selectedFieldName,
        x,
        y,
        width: w,
        height: h,
        pageNumber: currentPage
      };
      
      const extractedText = await extractTextFromRegion(newField);
      newField.detectedValue = extractedText;
      newField.originalDetectedValue = extractedText; // Guardar valor original
      
      // Eliminar marcado anterior del mismo campo si existe y actualizar
      setMarkedFields(prev => {
        const updated = prev.filter(f => f.fieldName !== selectedFieldName).concat(newField);
        
        // NO guardar automáticamente - el usuario debe guardar manualmente
        
        return updated;
      });
      setSelectedFieldId(newField.id);
      
      toast.success(`Campo "${REQUIRED_FIELD_NAMES[selectedFieldName] || selectedFieldName}" marcado. Texto: "${extractedText || '(vacío)'}"`);
    } catch (error) {
      console.error('Error extrayendo texto:', error);
      toast.error('Error extrayendo texto de la región');
    }
    
    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  // Esta función ya no se usa, se reemplazó por handleSaveRules
  // Se mantiene por compatibilidad pero no se llama

  const handleRemoveField = (fieldName: string) => {
    setMarkedFields(prev => prev.filter(f => f.fieldName !== fieldName));
    if (selectedFieldId && markedFields.find(f => f.id === selectedFieldId)?.fieldName === fieldName) {
      setSelectedFieldId(null);
    }
  };

  const handleSelectField = (fieldId: string) => {
    setSelectedFieldId(fieldId === selectedFieldId ? null : fieldId);
  };

  const handleStartEdit = (field: MarkedField, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFieldId(field.id);
    setEditingValue(field.detectedValue || '');
  };

  const handleSaveEdit = async (fieldId: string) => {
    const field = markedFields.find(f => f.id === fieldId);
    if (!field) return;

    // Actualizar el valor del campo (NO guardar automáticamente)
    setMarkedFields(prev => {
      return prev.map(f => 
        f.id === fieldId ? { ...f, detectedValue: editingValue } : f
      );
    });

    setEditingFieldId(null);
    setEditingValue('');
    toast.info('Valor editado. Recuerda guardar las reglas cuando termines.');
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditingValue('');
  };

  // Función para ajustar la columna de un campo (cambiar entre JORNAL, Hab.S/Desc., Deducciones)
  const adjustFieldColumn = async (field: MarkedField, newColumnIndex: number) => {
    if (!pdfDocument) return;
    
    try {
      const page = await pdfDocument.getPage(field.pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const textContent = await page.getTextContent();
      const originalViewport = page.getViewport({ scale: 1.0 });
      
      // Encontrar la línea del concepto
      const conceptItem = Array.from(textContent.items as any[]).find((item: any) => {
        if (!('transform' in item) || !item.str) return false;
        const itemY = item.transform[5];
        // Buscar cerca de la Y del campo
        const fieldY = originalViewport.height - (field.y * originalViewport.height);
        return Math.abs(itemY - fieldY) < 10 && field.conceptCode && item.str.includes(field.conceptCode);
      });
      
      if (!conceptItem) {
        toast.error('No se pudo encontrar el concepto en el PDF');
      return;
    }
    
      const conceptX = conceptItem.transform[4];
      const conceptY = conceptItem.transform[5];
      
      // Definir posiciones X aproximadas de las columnas
      // Columna 0: JORNAL (primera columna numérica)
      // Columna 1: Hab.S/Desc. (segunda columna numérica)
      // Columna 2: Deducciones (tercera columna numérica)
      const columnOffsets = [200, 350, 500]; // Offset desde el concepto
      const targetX = conceptX + columnOffsets[newColumnIndex];
      
      // Buscar el valor en la columna objetivo
      let valueFound = false;
      for (const item of textContent.items as any[]) {
        if (!('transform' in item) || !item.str) continue;
        
        const itemX = item.transform[4];
        const itemY = item.transform[5];
        
        // Si está en la columna objetivo y cerca de la Y del concepto
        if (Math.abs(itemX - targetX) < 80 && Math.abs(itemY - conceptY) < 20) {
          const valueText = item.str.trim();
          // Verificar si es un valor monetario
          if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(valueText.replace(/[^\d,.]/g, ''))) {
            // Actualizar el campo con la nueva posición y valor
            const newX = Math.max(0, Math.min(1, (targetX - 50) / originalViewport.width));
            const newY = Math.max(0, Math.min(1, (originalViewport.height - itemY - 10) / originalViewport.height));
            
            setMarkedFields(prev => prev.map(f => 
              f.id === field.id 
                ? { 
                    ...f, 
                    x: newX, 
                    y: newY,
                    detectedValue: valueText,
                    columnIndex: newColumnIndex
                  }
                : f
            ));
            
            // Re-extraer el texto para actualizar el valor
            const updatedField = { ...field, x: newX, y: newY, columnIndex: newColumnIndex };
            const extractedText = await extractTextFromRegion(updatedField);
            
            setMarkedFields(prev => prev.map(f => 
              f.id === field.id 
                ? { ...f, detectedValue: extractedText || valueText }
                : f
            ));
            
            const columnNames = ['JORNAL', 'Hab.S/Desc.', 'Deducciones'];
            toast.success(`✅ Columna cambiada a ${columnNames[newColumnIndex]}`);
            valueFound = true;
            break;
          }
        }
      }
      
      if (!valueFound) {
        toast.error(`No se encontró un valor válido en la columna ${newColumnIndex + 1}`);
      }
    } catch (error) {
      console.error('Error ajustando columna:', error);
      toast.error('Error ajustando la columna');
    }
  };

  // Función para guardar reglas OCR (sin aplicarlas automáticamente)
  const handleSaveRules = () => {
    if (markedFields.length === 0) {
      toast.error('No hay campos marcados para guardar');
      return;
    }
    
    // Preparar valores extraídos para mostrar en el callback
    const extractedValues: Record<string, string> = {};
    markedFields.forEach(field => {
      if (field.detectedValue) {
        extractedValues[field.fieldName] = field.detectedValue;
      }
    });
    
    // Guardar reglas OCR (sin aplicarlas automáticamente)
    onSave(extractedValues, markedFields);
    toast.success('✅ Reglas OCR guardadas. Puedes aplicarlas manualmente cuando estés listo.');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              Marcar Campos - Recibo {receipt.key}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Marca las áreas en el PDF. Haz clic en un rectángulo para moverlo o redimensionarlo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Panel izquierdo: Controles */}
          <div className="w-80 flex flex-col gap-4 overflow-y-auto">
            <Card>
              <CardContent className="p-4">
                <Label className="mb-2 block">Campos Disponibles</Label>
                <div className="space-y-2">
                  {availableFields.map(field => (
                    <Button
                      key={field}
                      variant={selectedFieldName === field ? "default" : "outline"}
                      className={`w-full justify-between ${
                        markedFields.some(f => f.fieldName === field) ? 'bg-green-50 border-green-300' : ''
                      }`}
                      onClick={() => setSelectedFieldName(field)}
                    >
                      <span>{REQUIRED_FIELD_NAMES[field] || field}</span>
                      {markedFields.some(f => f.fieldName === field) && (
                        <span className="ml-2 text-green-600 font-bold">✓</span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <Label className="mb-2 block">Seleccionar Campo</Label>
                <Select value={selectedFieldName} onValueChange={setSelectedFieldName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field} value={field}>
                        {REQUIRED_FIELD_NAMES[field] || field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Selecciona un campo y luego dibuja un rectángulo en el PDF para marcarlo
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <Label className="mb-2 block">Campos Marcados</Label>
                <div className="space-y-2">
                  {markedFields.map(field => (
                    <div 
                      key={field.id} 
                      className={`flex items-center gap-2 p-2 rounded transition-colors ${
                        selectedFieldId === field.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {REQUIRED_FIELD_NAMES[field.fieldName] || field.fieldName}
                          {field.conceptCode && (
                            <span className="ml-1 text-xs text-gray-500">({field.conceptCode})</span>
                          )}
                          {field.columnIndex !== undefined && (
                            <span className="ml-1 text-xs text-gray-400">
                              [{field.columnIndex === 0 ? 'JORNAL' : field.columnIndex === 1 ? 'Hab.S/Desc.' : 'Deducciones'}]
                            </span>
                          )}
                        </div>
                        {editingFieldId === field.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(field.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              className="h-7 text-xs"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(field.id);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="text-xs text-gray-600 truncate cursor-pointer hover:text-gray-800"
                            onClick={() => handleSelectField(field.id)}
                          >
                          {field.detectedValue || 'Sin texto detectado'}
                        </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {editingFieldId !== field.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Seleccionar el campo para ajustar su posición
                                setSelectedFieldId(field.id);
                                setSelectedFieldName(field.fieldName);
                                // Cambiar a la página del campo
                                if (field.pageNumber !== currentPage) {
                                  setCurrentPage(field.pageNumber);
                                }
                                toast.info(`Ajusta la posición del campo ${REQUIRED_FIELD_NAMES[field.fieldName] || field.fieldName} en el PDF`);
                              }}
                              className="h-6 w-6 p-0"
                              title="Ajustar selección en PDF"
                            >
                              <Maximize2 className="h-3 w-3 text-purple-600" />
                            </Button>
                            {/* Botón para cambiar de columna si es un concepto de tabla */}
                            {field.columnIndex !== undefined && field.conceptCode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Cambiar a la siguiente columna
                                  const nextColumnIndex = ((field.columnIndex || 0) + 1) % 3; // 0, 1, 2 (JORNAL, Hab.S/Desc., Deducciones)
                                  await adjustFieldColumn(field, nextColumnIndex);
                                }}
                                className="h-6 w-6 p-0"
                                title={`Cambiar columna (actual: ${field.columnIndex === 0 ? 'JORNAL' : field.columnIndex === 1 ? 'Hab.S/Desc.' : 'Deducciones'})`}
                              >
                                <Square className="h-3 w-3 text-orange-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleStartEdit(field, e)}
                              className="h-6 w-6 p-0"
                              title="Editar valor"
                            >
                              <Pencil className="h-3 w-3 text-blue-600" />
                            </Button>
                          </>
                        )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveField(field.fieldName);
                        }}
                        className="h-6 w-6 p-0"
                          title="Eliminar campo"
                      >
                          <X className="h-3 w-3 text-red-600" />
                      </Button>
                      </div>
                    </div>
                  ))}
                  {markedFields.length === 0 && (
                    <p className="text-sm text-gray-500">No hay campos marcados</p>
                  )}
                </div>
                {markedFields.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Haz clic en un rectángulo en el PDF para moverlo o redimensionarlo
                  </p>
                )}
              </CardContent>
            </Card>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={async () => {
                  if (!pdfDocument) {
                    toast.error('PDF no cargado');
                    return;
                  }
                  const empresa = receipt.data?.EMPRESA || '';
                  if (!empresa) {
                    toast.error('No se puede detectar la empresa');
                    return;
                  }
                  toast.info('Detectando conceptos en la tabla...');
                  try {
                    await detectConceptsInTable(pdfDocument, empresa);
                  } catch (error) {
                    console.error('Error detectando conceptos:', error);
                    toast.error('Error detectando conceptos');
                  }
                }}
                variant="outline"
                className="w-full"
                disabled={!pdfDocument}
              >
                <Zap className="h-4 w-4 mr-2" />
                Detectar Conceptos Automáticamente
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
                <Button 
                  onClick={handleSaveRules} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={markedFields.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Reglas
              </Button>
              </div>
            </div>
          </div>
          
          {/* Panel derecho: Visualizador PDF */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoadingPdf && (
              <div className="flex items-center justify-center h-full">
                <p>Cargando PDF...</p>
              </div>
            )}
            
            {pdfError && (
              <div className="flex items-center justify-center h-full">
                <p className="text-red-600">Error: {pdfError}</p>
              </div>
            )}
            
            {pdfDocument && !isLoadingPdf && !pdfError && (
              <>
                <div className="flex items-center justify-between p-2 border-b">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      ←
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      →
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer2 className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {selectedFieldName ? `Marcando: ${REQUIRED_FIELD_NAMES[selectedFieldName] || selectedFieldName}` : 'Selecciona un campo o ajusta un rectángulo'}
                    </span>
                  </div>
                </div>
                
                <div 
                  ref={containerRef}
                  className="flex-1 overflow-auto bg-gray-100 p-4"
                  style={{ position: 'relative' }}
                >
                  <div style={{ position: 'relative', display: 'inline-block', minWidth: '100%', minHeight: '400px' }}>
                    <canvas
                      ref={canvasRefCallback}
                      style={{ 
                        display: 'block', 
                        border: '1px solid #ccc',
                        backgroundColor: '#ffffff',
                        minWidth: '100%'
                      }}
                    />
                    <canvas
                      ref={overlayRef}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        cursor: selectedFieldName ? 'crosshair' : 'default',
                        pointerEvents: 'auto',
                        backgroundColor: 'transparent'
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={(e) => {
                        // Si estamos arrastrando, cancelar el drag pero mantener la posición actual
                        if (dragMode !== 'none') {
                          setDragMode('none');
                          setDragStartPos(null);
                          setDragStartField(null);
                        }
                        setIsDrawing(false);
                        setStartPos(null);
                        setCurrentRect(null);
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

