'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, X, Save, Plus, Trash2, MousePointer2, Square, List, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js
if (typeof window !== 'undefined') {
  // Usar unpkg que tiene todas las versiones, incluyendo la 5.4.296
  // unpkg es más completo que cdnjs para versiones específicas
  try {
    const version = pdfjsLib.version || '5.4.296';
    // unpkg tiene todas las versiones de npm
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    console.log(`✅ Worker de PDF.js configurado desde unpkg (versión ${version})`);
  } catch (error) {
    console.error('Error configurando worker de PDF.js:', error);
    // Fallback: usar archivo local
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    console.log('⚠️ Usando fallback: archivo local');
  }
}

interface MarkedField {
  id: string;
  fieldName: string;
  x: number; // Coordenada X (relativa 0-1)
  y: number; // Coordenada Y (relativa 0-1)
  width: number; // Ancho (relativo 0-1)
  height: number; // Alto (relativo 0-1)
  pageNumber: number; // Número de página (empezando en 1)
  detectedValue?: string; // Valor detectado del campo
}

interface FieldMarkerConfiguratorProps {
  open: boolean;
  onClose: () => void;
  empresa?: string;
}

// Función para limpiar texto extraído y eliminar duplicados/palabras redundantes
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  // Normalizar espacios
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Eliminar palabras comunes de encabezados que pueden aparecer en la extracción
  const headerWords = ['CATEGORIA', 'CATEGORÍA', 'CATEGOR', 'CATEG'];
  const words = cleaned.split(' ').filter(w => {
    const upperW = w.trim().toUpperCase();
    return !headerWords.some(hw => upperW.includes(hw) || hw.includes(upperW));
  });
  
  cleaned = words.join(' ').trim();
  
  // Si el campo es CATEGORIA, aplicar limpieza especial
  // Ejemplo: "CHOFE CHOFER" → "CHOFER"
  const wordsAfterHeader = cleaned.split(' ');
  const uniqueWords: string[] = [];
  
  for (let i = 0; i < wordsAfterHeader.length; i++) {
    const word = wordsAfterHeader[i].trim();
    if (!word) continue;
    
    // Verificar si esta palabra es una subcadena de otra palabra en la lista
    // o si otra palabra en la lista es una subcadena de esta
    let isRedundant = false;
    
    for (const existingWord of uniqueWords) {
      // Si la palabra actual contiene a la existente (o viceversa) y son similares
      if (word.length > existingWord.length) {
        // Si la palabra actual contiene la existente y son muy similares
        if (word.includes(existingWord) && word.length - existingWord.length <= 3) {
          // Reemplazar la palabra existente con la más larga
          const index = uniqueWords.indexOf(existingWord);
          if (index !== -1) {
            uniqueWords[index] = word;
          }
          isRedundant = true;
          break;
        }
      } else if (existingWord.length > word.length) {
        // Si la palabra existente contiene la actual
        if (existingWord.includes(word) && existingWord.length - word.length <= 3) {
          isRedundant = true;
          break;
        }
      } else if (word === existingWord) {
        // Palabras idénticas - duplicado
        isRedundant = true;
        break;
      }
    }
    
    if (!isRedundant) {
      uniqueWords.push(word);
    }
  }
  
  cleaned = uniqueWords.join(' ').trim();
  
  // Casos especiales conocidos de duplicados
  const specialCases: Record<string, string> = {
    'CHOFE CHOFER': 'CHOFER',
    'CHOFER CHOFE': 'CHOFER',
    'RECOLECTOR RECOLECTOR': 'RECOLECTOR',
    'PEON PEON': 'PEON',
  };
  
  for (const [pattern, replacement] of Object.entries(specialCases)) {
    if (cleaned.toUpperCase().includes(pattern)) {
      cleaned = replacement;
      break;
    }
  }
  
  // Eliminar labels comunes que pueden aparecer en el texto extraído
  // Estos suelen ser labels de campos que están cerca del valor
  const fieldLabels = [
    'CATEGORIA:', 'CATEGORÍA:', 'Categoría:', 'Categoria:',
    'CATEGORIA', 'CATEGORÍA', 'Categoría', 'Categoria',
    'CATEGORIA :', 'CATEGORÍA :', 'Categoría :', 'Categoria :'
  ];
  
  // Limpiar labels al inicio o final del texto
  let finalText = cleaned;
  for (const label of fieldLabels) {
    const upperLabel = label.toUpperCase();
    const upperText = finalText.toUpperCase();
    
    // Remover label al inicio
    if (upperText.startsWith(upperLabel)) {
      finalText = finalText.substring(label.length).trim();
    }
    
    // Remover label al final
    if (upperText.endsWith(upperLabel)) {
      finalText = finalText.substring(0, finalText.length - label.length).trim();
    }
    
    // Remover label con espacios alrededor
    const regex = new RegExp(`\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi');
    finalText = finalText.replace(regex, ' ').trim();
  }
  
  // Normalizar espacios nuevamente después de las eliminaciones
  finalText = finalText.replace(/\s+/g, ' ').trim();
  
  return finalText;
}

export default function FieldMarkerConfigurator({ 
  open, 
  onClose,
  empresa: empresaProp 
}: FieldMarkerConfiguratorProps) {
  const { dataManager } = useCentralizedDataManager();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [markedFields, setMarkedFields] = useState<MarkedField[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedFieldName, setSelectedFieldName] = useState<string>('CATEGORIA');
  const [newFieldName, setNewFieldName] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [empresa, setEmpresa] = useState<string>(empresaProp || '');
  const [savedRules, setSavedRules] = useState<Array<{empresa: string; createdAt: string; fieldsCount: number}>>([]);
  const [showSavedRules, setShowSavedRules] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Sincronizar empresaProp con estado
  useEffect(() => {
    if (empresaProp) {
      setEmpresa(empresaProp);
    }
  }, [empresaProp]);

  // Detectar empresa desde el archivo si no hay empresaProp ni empresa ya establecida
  useEffect(() => {
    if (selectedFile && !empresaProp) {
      // Solo detectar si no hay empresa establecida
      if (!empresa) {
        const filename = selectedFile.name.toUpperCase();
        // Intentar detectar también desde el contenido del PDF si está disponible
        let detected = '';
        
        if (filename.includes('LIME') && !filename.includes('LIMPAR')) {
          detected = 'LIME';
        } else if (filename.includes('LIMPAR') || filename.includes('LIMP AR')) {
          detected = 'LIMPAR';
        } else if (filename.includes('SUMAR')) {
          detected = 'SUMAR';
        } else if (filename.includes('TYSA')) {
          detected = 'TYSA';
        }
        
        if (detected) {
          setEmpresa(detected);
        }
      }
    }
  }, [selectedFile, empresa, empresaProp]);

  // Cargar PDF
  useEffect(() => {
    if (selectedFile && open) {
      const loadPdf = async () => {
        setIsLoadingPdf(true);
        setPdfError(null);
        try {
          console.log('📄 Iniciando carga de PDF:', selectedFile.name);
          const arrayBuffer = await selectedFile.arrayBuffer();
          console.log('📄 ArrayBuffer obtenido, tamaño:', arrayBuffer.byteLength);
          
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          console.log('✅ PDF cargado exitosamente, páginas:', pdf.numPages);
          
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          setPdfError(null);
          toast.success(`✅ PDF cargado: ${selectedFile.name} (${pdf.numPages} página${pdf.numPages > 1 ? 's' : ''})`);
        } catch (error) {
          console.error('❌ Error cargando PDF:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          setPdfError(errorMessage);
          toast.error(`Error cargando PDF: ${errorMessage}`);
          setPdfDocument(null);
          setTotalPages(0);
        } finally {
          setIsLoadingPdf(false);
        }
      };
      loadPdf();
    } else if (!open) {
      // Limpiar cuando se cierra el modal
      setSelectedFile(null);
      setPdfDocument(null);
      setTotalPages(0);
      setCurrentPage(1);
      setPdfError(null);
      setIsLoadingPdf(false);
    }
  }, [selectedFile, open]);

  // Renderizar página del PDF cuando cambia la página o el documento
  useEffect(() => {
    if (pdfDocument && canvasRef.current && open) {
      const render = async () => {
        await renderPdfPage();
      };
      render();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDocument, currentPage, open]);

  // Redibujar overlay cuando cambian los campos marcados o el rectángulo actual
  useEffect(() => {
    if (pdfDocument && open && canvasRef.current) {
      redrawOverlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markedFields, currentRect, isDrawing, currentPage]);

  // Renderizar solo el PDF en el canvas principal
  const renderPdfPage = async () => {
    if (!canvasRef.current || !pdfDocument) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Asegurar que el overlay tenga el mismo tamaño
      if (overlayRef.current) {
        overlayRef.current.height = viewport.height;
        overlayRef.current.width = viewport.width;
      }
    } catch (error) {
      console.error('Error renderizando página:', error);
    }
  };

  // Redibujar solo el overlay (campos marcados y rectángulo temporal)
  const redrawOverlay = () => {
    if (!overlayRef.current || !canvasRef.current) return;
    const overlay = overlayRef.current;
    const context = overlay.getContext('2d');
    if (!context) return;

    const pdfCanvas = canvasRef.current;
    overlay.height = pdfCanvas.height;
    overlay.width = pdfCanvas.width;

    // Limpiar overlay
    context.clearRect(0, 0, overlay.width, overlay.height);

    // Dibujar campos marcados
    const pageFields = markedFields.filter(f => f.pageNumber === currentPage);
    
    pageFields.forEach(field => {
      const x = field.x * overlay.width;
      const y = field.y * overlay.height;
      const width = field.width * overlay.width;
      const height = field.height * overlay.height;

      context.strokeStyle = '#3b82f6';
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);

      // Etiqueta
      context.fillStyle = '#3b82f6';
      context.fillRect(x, y - 18, Math.max(width, 80), 18);
      context.fillStyle = '#ffffff';
      context.font = '12px Arial';
      context.fillText(field.fieldName, x + 4, y - 4);
    });

    // Dibujar rectángulo actual si se está dibujando
    if (currentRect && isDrawing) {
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

  // Manejar inicio del dibujo
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayRef.current || !canvasRef.current) return;
    
    const overlay = overlayRef.current;
    const rect = overlay.getBoundingClientRect();
    
    // Calcular posición relativa (0-1) basada en las dimensiones reales del canvas
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    console.log('🖱️ Mouse down:', { 
      clientX: e.clientX, clientY: e.clientY,
      rectLeft: rect.left, rectTop: rect.top,
      rectWidth: rect.width, rectHeight: rect.height,
      overlayWidth: overlay.width, overlayHeight: overlay.height,
      x, y 
    });
    
    setIsDrawing(true);
    setStartPos({ x, y });
  };

  // Manejar movimiento durante el dibujo
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !overlayRef.current || !pdfDocument) return;
    
    const overlay = overlayRef.current;
    const rect = overlay.getBoundingClientRect();
    
    // Usar rect.width y rect.height en lugar de overlay.width/height para cálculos precisos
    const currentX = (e.clientX - rect.left) / rect.width;
    const currentY = (e.clientY - rect.top) / rect.height;
    
    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    
    setCurrentRect({ x, y, width, height });
    // El useEffect se encargará de redibujar el overlay
  };

  // Función auxiliar para extraer texto de una región - funciona con cualquier PDF document
  const extractTextFromRegionForPDF = async (
    pdfDoc: any,
    field: MarkedField,
    renderScale: number = 1.5
  ): Promise<string> => {
    try {
      const page = await pdfDoc.getPage(field.pageNumber);
      
      // Obtener viewports
      const originalViewport = page.getViewport({ scale: 1.0 });
      const renderViewport = page.getViewport({ scale: renderScale });
      const textContent = await page.getTextContent();
      
      // Calcular factor de escala
      const scaleFactor = renderViewport.width / originalViewport.width;
      
      // Las coordenadas del campo son relativas (0-1), convertirlas a píxeles del render
      const canvasWidth = renderViewport.width;
      const canvasHeight = renderViewport.height;
      const canvasX1 = field.x * canvasWidth;
      const canvasY1 = field.y * canvasHeight;
      const canvasX2 = (field.x + field.width) * canvasWidth;
      const canvasY2 = (field.y + field.height) * canvasHeight;
      
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
      
      // Extraer items en la región exacta - usar lógica mejorada
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
        
        // Calcular el centro de la región marcada
        const regionCenterX = (xMin + xMax) / 2;
        const regionCenterY = (yTop + yBottom) / 2;
        
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
      if (itemsInRegion.length === 0) {
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
      
      // Para extracción manual (cuando el usuario marca el área), mostrar TODO el texto
      // sin filtrar agresivamente, para que el usuario pueda ver qué se está detectando
      // El filtrado agresivo se aplica solo cuando se aplica a todos los recibos automáticamente
      
      // Filtrar SOLO palabras que sabemos que son headers de tabla (no categorías válidas)
      // NO filtrar "CHOFER", "CHOFE", "RECOLECTOR", etc. porque son categorías válidas
      const tableHeaderWords = ['FUNCIÓN', 'FUNCION', 'SECTOR', 'DEDUCCIONES', 'DEDUCCIÓN', 'DEDUCCION', 'SERV', 'HAB', 'DESC', 'UNIDADES', 'CONCEPTO', 'HABER'];
      
      // Solo filtrar items que son SOLO headers de tabla, pero permitir categorías
      const filteredItems = filteredForField.filter(item => {
        const upperStr = item.str.toUpperCase().trim();
        if (!upperStr) return false;
        
        // Excluir SOLO si es exclusivamente una palabra de encabezado de tabla
        // No excluir si contiene "CHOFER", "RECOLECTOR", etc. (estas son categorías válidas)
        if (tableHeaderWords.includes(upperStr) && upperStr.length <= 8) {
          // Solo excluir si es una palabra corta de encabezado (ej: "SERV", "HAB", "DESC")
          return false;
        }
        
        return true;
      });
      
      // Usar items filtrados si hay alguno, sino usar todos los filtrados por campo
      const finalItems = filteredItems.length > 0 ? filteredItems : filteredForField;
      
      const rawText = finalItems.map(item => item.str).join(' ').trim();
      
      // Limpiar el texto extraído: eliminar duplicados y palabras redundantes
      const cleaned = cleanExtractedText(rawText);
      
      return cleaned;
    } catch (error) {
      console.error(`Error extrayendo texto de región para ${field.fieldName}:`, error);
      return '';
    }
  };

  // Extraer texto de una región específica del PDF (usa el PDF cargado en el modal)
  const extractTextFromRegion = async (field: MarkedField): Promise<string> => {
    if (!pdfDocument) return '';
    
    return extractTextFromRegionForPDF(pdfDocument, field, 1.5);
  };

  // Manejar fin del dibujo - ahora solo guarda el rectángulo, no extrae automáticamente
  const handleMouseUp = async () => {
    if (isDrawing && startPos && currentRect) {
      // Solo mantener el rectángulo visible, la extracción se hace al hacer clic en "Agregar"
      setIsDrawing(false);
      // No resetear currentRect aquí - se mantiene visible hasta que el usuario haga clic en "Agregar"
      toast.info('Área marcada. Selecciona el campo y haz clic en "Agregar" para guardarlo');
    }
  };

  // Eliminar campo marcado
  const handleDeleteField = (fieldId: string) => {
    setMarkedFields(markedFields.filter(f => f.id !== fieldId));
    // El useEffect se encargará de redibujar el overlay
  };

  // Guardar configuración
  const handleSave = async () => {
    if (!empresa) {
      toast.error('Debes seleccionar una empresa');
      return;
    }

    if (markedFields.length === 0) {
      toast.error('Debes marcar al menos un campo');
      return;
    }

    try {
      // Guardar en la base de datos (por ahora en app_config)
      const config = {
        empresa,
        fields: markedFields.map(f => ({
          id: f.id,
          fieldName: f.fieldName,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          pageNumber: f.pageNumber
          // No guardar detectedValue, se recalculará cada vez
        })),
        createdAt: new Date().toISOString()
      };

      // Guardar en Supabase como app_config
      const manager = dataManager as any;
      if (manager.setAppConfig) {
        await manager.setAppConfig(`field_markers_${empresa}`, config);
        toast.success(`✅ Regla OCR guardada para ${empresa}. Ahora puedes aplicarla a todos los recibos.`);
        // Recargar lista de reglas guardadas
        await loadSavedRules();
      } else {
        // Fallback: guardar en localStorage
        localStorage.setItem(`field_markers_${empresa}`, JSON.stringify(config));
        toast.success(`✅ Regla OCR guardada para ${empresa} (localStorage)`);
        // Recargar lista de reglas guardadas
        await loadSavedRules();
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error guardando configuración');
    }
  };

  // Aplicar regla a todos los recibos de la empresa
  const handleApplyToAll = async () => {
    if (!empresa) {
      toast.error('Debes seleccionar una empresa');
      return;
    }

    // CARGAR LA REGLA GUARDADA desde la base de datos antes de aplicar
    // Esto asegura que usemos la regla real guardada, no solo los campos en memoria
    const manager = dataManager as any;
    let fieldsToApply = markedFields;
    
      try {
        let savedConfig = null;
        
        if (manager.getAppConfig) {
          savedConfig = await manager.getAppConfig(`field_markers_${empresa}`);
        } else {
          const stored = localStorage.getItem(`field_markers_${empresa}`);
          if (stored) {
            savedConfig = JSON.parse(stored);
          }
        }
        
        if (savedConfig && savedConfig.fields && Array.isArray(savedConfig.fields) && savedConfig.fields.length > 0) {
          fieldsToApply = savedConfig.fields;
        } else {
          if (markedFields.length === 0) {
            toast.error('No hay campos marcados para aplicar. Debes guardar la regla primero.');
            return;
          }
        }
      } catch (error) {
        if (markedFields.length === 0) {
          toast.error('Error cargando regla guardada y no hay campos en memoria. Guarda la regla primero.');
          return;
        }
      }

    const confirmed = window.confirm(
      `¿Aplicar esta regla OCR a TODOS los recibos de ${empresa}?\n\n` +
      `Esto procesará todos los PDFs y extraerá ${fieldsToApply.length} campo(s) marcado(s).\n\n` +
      `Esta operación puede tardar varios minutos.`
    );

    if (!confirmed) return;

    try {
      toast.info(`Procesando recibos... Esto puede tardar varios minutos.`);
      
      // Obtener todos los recibos consolidados de la empresa
      const allConsolidated = await dataManager.getConsolidated();
      const empresaRecibos = allConsolidated.filter(item => 
        item.data?.EMPRESA === empresa && 
        item.archivos && 
        item.archivos.length > 0
      );

      console.log(`📋 Aplicando regla OCR a ${empresaRecibos.length} recibos de ${empresa}`);

      let processed = 0;
      let updated = 0;
      let errors = 0;

      console.log(''); // Línea en blanco para separar
      for (const recibo of empresaRecibos) {
        try {
          // Obtener archivo desde múltiples fuentes posibles
          let archivo = recibo.archivos?.[0];
          if (!archivo) {
            archivo = recibo.data?.filename;
          }
          if (!archivo) {
            archivo = recibo.data?.ARCHIVO;
          }
          
          if (!archivo) {
            errors++;
            continue;
          }

          // Obtener el archivo PDF usando el endpoint API
          const pdfApiUrl = `/api/get-pdf?filename=${encodeURIComponent(archivo)}`;
          
          // Cargar el PDF
          const response = await fetch(pdfApiUrl);
          if (!response.ok) {
            console.error(`❌ Error cargando PDF: ${archivo} (${response.status})`);
            errors++;
            continue;
          }

          const blob = await response.blob();
          const file = new File([blob], archivo, { type: 'application/pdf' });

          // Cargar PDF con pdfjs
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDoc = await loadingTask.promise;

          // Extraer valores de cada campo marcado usando la función auxiliar
          // IMPORTANTE: Reiniciar en cada iteración para evitar reutilizar valores
          const extractedValues: Record<string, string> = {};

          for (const field of fieldsToApply) {
            try {
              // Extraer texto y obtener información de debug
              const page = await pdfDoc.getPage(field.pageNumber);
              const textContent = await page.getTextContent();
              
              // Obtener viewports para calcular coordenadas
              const originalViewport = page.getViewport({ scale: 1.0 });
              const renderViewport = page.getViewport({ scale: 1.5 });
              const scaleFactor = renderViewport.width / originalViewport.width;
              const canvasWidth = renderViewport.width;
              const canvasHeight = renderViewport.height;
              const canvasX1 = field.x * canvasWidth;
              const canvasY1 = field.y * canvasHeight;
              const canvasX2 = (field.x + field.width) * canvasWidth;
              const canvasY2 = (field.y + field.height) * canvasHeight;
              const originalX1 = canvasX1 / scaleFactor;
              const originalX2 = canvasX2 / scaleFactor;
              const originalY1 = originalViewport.height - (canvasY1 / scaleFactor);
              const originalY2 = originalViewport.height - (canvasY2 / scaleFactor);
              const xMin = Math.min(originalX1, originalX2);
              const xMax = Math.max(originalX1, originalX2);
              const yTop = Math.max(originalY1, originalY2);
              const yBottom = Math.min(originalY1, originalY2);
              
              // Recopilar TODOS los items de texto en la región (sin filtrar)
              const allItemsInRegion: string[] = [];
              for (const item of textContent.items) {
                if (!('transform' in item) || !item.str || item.str.trim() === '') continue;
                const itemX = item.transform[4];
                const itemY = item.transform[5];
                const itemWidth = Math.abs(item.transform[0]) * (item.str.length * 0.6);
                const itemHeight = Math.abs(item.transform[3]) * 1.2;
                const itemCenterX = itemX + (itemWidth / 2);
                const itemCenterY = itemY;
                const centerInRegion = itemCenterX >= xMin && itemCenterX <= xMax && 
                                       itemCenterY <= yTop && itemCenterY >= yBottom;
                const itemX1 = itemX;
                const itemX2 = itemX + itemWidth;
                const itemY1 = itemY;
                const itemY2 = itemY - itemHeight;
                const overlapsX = (itemX1 <= xMax && itemX2 >= xMin);
                const overlapsY = (itemY1 >= yBottom && itemY2 <= yTop);
                if (centerInRegion || (overlapsX && overlapsY && (itemX1 >= xMin * 0.9 && itemX2 <= xMax * 1.1))) {
                  allItemsInRegion.push(item.str.trim());
                }
              }
              
              const extractedText = await extractTextFromRegionForPDF(pdfDoc, field, 1.5);
              
              // Mostrar qué se encontró realmente en la región (para debug)
              const rawItemsText = allItemsInRegion.join(' ');
              console.log(`🔍 [${archivo}] ${field.fieldName}: items="${rawItemsText}" → extraído="${extractedText}"`);
              
              // Si todos los PDFs extraen el mismo texto, el área marcada está mal posicionada
              if (rawItemsText.includes('Categoría') && rawItemsText.includes('CHOFE') && rawItemsText.includes('CHOFER')) {
                console.warn(`⚠️ [${archivo}] El área marcada está capturando el encabezado "Categoría" + "CHOFE CHOFER". Deberías re-marcar el área solo sobre el valor real, sin incluir el encabezado.`);
              }
              
              if (extractedText && extractedText.trim()) {
                const upperText = extractedText.toUpperCase().trim();
                
                // Lista de palabras que son SOLO encabezados de tabla (no categorías válidas)
                const tableHeaderOnlyWords = ['FUNCIÓN', 'FUNCION', 'SECTOR', 'DEDUCCIONES', 'SERV', 'HAB', 'DESC', 'UNIDADES', 'CONCEPTO', 'HABER'];
                
                // Categorías válidas que NO deben ser rechazadas
                const validCategories = ['CHOFER', 'CHOFE', 'RECOLECTOR', 'REC', 'PEON', 'PEÓN', 'PEONES', 'PE', 'BARRIDO', 'MAESTRANZA', 'OPERARIO', 'AYUDANTE'];
                
                const words = upperText.split(/\s+/).filter(w => w.length > 0);
                
                // Verificar si contiene alguna categoría válida
                const hasValidCategory = words.some(w => validCategories.includes(w));
                
                // Si contiene una categoría válida, aceptarlo (incluso si tiene otras palabras)
                if (hasValidCategory) {
                  extractedValues[field.fieldName] = extractedText.trim();
                  console.log(`✅ [${archivo}] ${field.fieldName} detectado: "${extractedText.trim()}" → Aplicado`);
                  continue;
                }
                
                // Solo rechazar si es SOLO una palabra de encabezado de tabla (no categorías válidas)
                const isOnlyTableHeader = words.length === 1 && 
                                         tableHeaderOnlyWords.includes(words[0]) && 
                                         !validCategories.includes(words[0]);
                
                if (isOnlyTableHeader) {
                  continue;
                }
                
                // Verificar si contiene el patrón conocido "Función Sector Deducciones SERV"
                const isHeaderPattern = (upperText.includes('FUNCIÓN') || upperText.includes('FUNCION')) && 
                                       upperText.includes('SECTOR') && 
                                       upperText.includes('DEDUCCIONES');
                if (isHeaderPattern) {
                  continue;
                }
                
                // Verificar si contiene "SERV" junto con "FUNCIÓN" o "SECTOR" (otro patrón de encabezado)
                const hasServWithHeaders = upperText.includes('SERV') && 
                                           (upperText.includes('FUNCIÓN') || upperText.includes('FUNCION') || upperText.includes('SECTOR'));
                if (hasServWithHeaders) {
                  continue;
                }
                
                // Verificar si contiene principalmente palabras de encabezado de tabla (no categorías válidas)
                const headerWordCount = words.filter(w => 
                  tableHeaderOnlyWords.some(hw => w.includes(hw) || hw.includes(w)) &&
                  !validCategories.some(vc => w.includes(vc) || vc.includes(w))
                ).length;
                
                // Si contiene 3 o más palabras de encabezado de tabla, es muy probable que sea un encabezado
                if (headerWordCount >= 3) {
                  continue;
                }
                
                if (headerWordCount > 0 && headerWordCount / words.length > 0.5) {
                  continue;
                }
                
                // Si todas las palabras son encabezados de tabla (y no categorías válidas), no asignar
                if (headerWordCount === words.length && words.length > 0) {
                  continue;
                }
                
                // Si el texto empieza con una palabra de encabezado de tabla seguida de más palabras de encabezado, rechazar
                if (words.length >= 2 && 
                    tableHeaderOnlyWords.includes(words[0]) && 
                    !validCategories.includes(words[0]) &&
                    words.slice(1).some(w => tableHeaderOnlyWords.some(hw => w.includes(hw) || hw.includes(w)) && !validCategories.includes(w))) {
                  continue;
                }
                
                extractedValues[field.fieldName] = extractedText.trim();
                console.log(`✅ [${archivo}] ${field.fieldName} detectado: "${extractedText.trim()}" → Aplicado`);
              }
            } catch (fieldError) {
              console.error(`❌ [${archivo}] Error extrayendo ${field.fieldName}:`, fieldError);
            }
          }

          // Actualizar el registro consolidado si se extrajo algo Y si hay valores válidos
          if (Object.keys(extractedValues).length > 0) {
            const updateKey = recibo.key || recibo.id;
            try {
              const currentCategoria = recibo.data?.CATEGORIA || recibo.data?.CATEGORÍA || '';
              const upperCurrentCategoria = currentCategoria.toUpperCase();
              const isCurrentValueInvalid = (upperCurrentCategoria.includes('FUNCIÓN') || upperCurrentCategoria.includes('FUNCION')) && 
                                           upperCurrentCategoria.includes('SECTOR') && 
                                           upperCurrentCategoria.includes('DEDUCCIONES');
              
              const updatedData = {
                ...recibo.data,
              };
              
              if (isCurrentValueInvalid && !extractedValues.CATEGORIA && !extractedValues.CATEGORÍA) {
                delete updatedData.CATEGORIA;
                delete updatedData.CATEGORÍA;
              }
              
              Object.assign(updatedData, extractedValues);
              
              const updateResult = await dataManager.updateConsolidated(updateKey, {
                data: updatedData
              });
              
              if (updateResult) {
                updated++;
              } else {
                errors++;
              }
            } catch (updateError) {
              console.error(`❌ [${archivo}] Error actualizando:`, updateError);
              errors++;
            }
          } else {
            console.warn(`⚠️ [${archivo}] No se detectó valor válido`);
          }

          processed++;
          
          // Actualizar progreso cada 10 registros
          if (processed % 10 === 0) {
            toast.info(`Procesados ${processed}/${empresaRecibos.length} recibos...`);
          }
        } catch (error) {
          console.error(`Error procesando recibo ${recibo.archivos?.[0]}:`, error);
          errors++;
        }
      }

      console.log('');
      console.log(`📊 Resumen: ${updated} recibos actualizados de ${processed} procesados`);

      // Recargar datos frescos
      await dataManager.getConsolidated(true);
      
      // Disparar evento para que el componente padre recargue
      window.dispatchEvent(new CustomEvent('ocr-rule-applied', { 
        detail: { empresa, updated, processed, errors } 
      }));
      
      // Forzar recarga de datos en el componente padre
      if (updated > 0) {
        toast.success(`✅ Regla OCR aplicada: ${updated} recibos actualizados de ${processed} procesados`);
      } else {
        toast.warning(`⚠️ Regla OCR aplicada pero ningún recibo fue actualizado. Revisa los logs en consola.`);
      }
      
    } catch (error) {
      console.error('Error aplicando regla:', error);
      toast.error('Error aplicando regla a todos los recibos');
    }
  };

  // Limpiar valores inválidos de CATEGORIA en todos los recibos de una empresa
  const handleCleanInvalidValues = useCallback(async () => {
    if (!empresa) {
      toast.error('Debes seleccionar una empresa');
      return;
    }

    const confirmed = window.confirm(
      `¿Limpiar valores inválidos de CATEGORIA en TODOS los recibos de ${empresa}?\n\n` +
      `Esto eliminará valores como "Función Sector Deducciones SERV" y otros valores inválidos.\n\n` +
      `Esta operación no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      toast.info(`Limpiando valores inválidos en recibos de ${empresa}...`);
      
      // Obtener todos los recibos consolidados de la empresa
      const allConsolidated = await dataManager.getConsolidated();
      const empresaRecibos = allConsolidated.filter(item => item.data?.EMPRESA === empresa);
      
      console.log(`🧹 Encontrados ${empresaRecibos.length} recibos para limpiar en ${empresa}`);

      let cleaned = 0;
      let errors = 0;

      for (const recibo of empresaRecibos) {
        try {
          const currentCategoria = recibo.data?.CATEGORIA || recibo.data?.CATEGORÍA || '';
          const upperCurrentCategoria = currentCategoria.toUpperCase();
          
          // Detectar valores inválidos
          const isCurrentValueInvalid = (upperCurrentCategoria.includes('FUNCIÓN') || upperCurrentCategoria.includes('FUNCION')) && 
                                       upperCurrentCategoria.includes('SECTOR') && 
                                       upperCurrentCategoria.includes('DEDUCCIONES');
          
          if (isCurrentValueInvalid) {
            console.log(`🧹 Limpiando valor inválido de CATEGORIA: "${currentCategoria}" en recibo ${recibo.key || recibo.id}`);
            
            const updatedData = {
              ...recibo.data,
            };
            delete updatedData.CATEGORIA;
            delete updatedData.CATEGORÍA;
            
            const updateKey = recibo.key || recibo.id;
            const updateResult = await dataManager.updateConsolidated(updateKey, {
              data: updatedData
            });
            
            if (updateResult) {
              cleaned++;
              console.log(`✅ Valor inválido limpiado en ${updateKey}`);
            } else {
              console.warn(`⚠️ No se pudo limpiar valor en ${updateKey}`);
              errors++;
            }
          }
        } catch (error) {
          console.error(`❌ Error limpiando recibo ${recibo.key || recibo.id}:`, error);
          errors++;
        }
      }

      // Forzar recarga sin cache
      const newConsolidated = await dataManager.getConsolidated(true);
      console.log(`📊 Datos recargados después de limpiar: ${newConsolidated.length} registros consolidados`);
      
      // Disparar evento para que el componente padre recargue
      window.dispatchEvent(new CustomEvent('ocr-rule-applied', { 
        detail: { empresa, cleaned, errors } 
      }));
      
      if (cleaned > 0) {
        toast.success(`✅ Limpieza completada: ${cleaned} valores inválidos eliminados de ${empresaRecibos.length} recibos`);
      } else {
        toast.info(`ℹ️ No se encontraron valores inválidos para limpiar en ${empresa}`);
      }
      
      if (errors > 0) {
        toast.warning(`⚠️ Se encontraron ${errors} errores durante la limpieza`);
      }
    } catch (error) {
      console.error('Error limpiando valores inválidos:', error);
      toast.error('Error limpiando valores inválidos');
    }
  }, [empresa, dataManager]);

  // Cargar todas las reglas guardadas
  const loadSavedRules = useCallback(async () => {
    try {
      const manager = dataManager as any;
      const rules: Array<{empresa: string; createdAt: string; fieldsCount: number}> = [];
      let useAlternativeMethod = false;
      
      // Intentar obtener todas las configs si existe el método
      if (manager.getAllAppConfigs) {
        try {
          const allConfigs = await manager.getAllAppConfigs();
          if (Array.isArray(allConfigs)) {
            allConfigs.forEach((config: any) => {
              if (config.key && config.key.startsWith('field_markers_')) {
                const empresaName = config.key.replace('field_markers_', '');
                const value = config.value || (typeof config === 'object' && !Array.isArray(config) ? config : null);
                if (value && value.fields && Array.isArray(value.fields) && value.fields.length > 0) {
                  rules.push({
                    empresa: empresaName,
                    createdAt: value.createdAt || config.created_at || 'Desconocido',
                    fieldsCount: value.fields.length
                  });
                }
              }
            });
          }
          // Si getAllAppConfigs funcionó (aunque devolvió 0 resultados), no usar método alternativo
          useAlternativeMethod = false;
        } catch (error) {
          console.warn('Error obteniendo todas las configs, usando método alternativo:', error);
          useAlternativeMethod = true;
        }
      } else {
        useAlternativeMethod = true;
      }
      
      // Solo usar método alternativo si getAllAppConfigs no está disponible o falló
      if (useAlternativeMethod) {
        // Buscar en todas las empresas conocidas
        const empresasConocidas = ['LIME', 'LIMPAR', 'SUMAR', 'TYSA'];
        
        for (const emp of empresasConocidas) {
          try {
            if (manager.getAppConfig) {
              const config = await manager.getAppConfig(`field_markers_${emp}`);
              if (config && config.fields && Array.isArray(config.fields) && config.fields.length > 0) {
                rules.push({
                  empresa: emp,
                  createdAt: config.createdAt || 'Desconocido',
                  fieldsCount: config.fields.length
                });
              }
            } else {
              // Fallback: localStorage
              const stored = localStorage.getItem(`field_markers_${emp}`);
              if (stored) {
                try {
                  const config = JSON.parse(stored);
                  if (config && config.fields && Array.isArray(config.fields) && config.fields.length > 0) {
                    rules.push({
                      empresa: emp,
                      createdAt: config.createdAt || 'Desconocido',
                      fieldsCount: config.fields.length
                    });
                  }
                } catch (parseError) {
                  // Ignorar errores de parseo
                }
              }
            }
          } catch (error) {
            // Ignorar errores al buscar reglas individuales
            // getAppConfig ahora retorna null si no encuentra nada, así que no debería lanzar errores
          }
        }
      }
      
      setSavedRules(rules);
    } catch (error) {
      console.error('Error cargando reglas guardadas:', error);
      setSavedRules([]); // Establecer array vacío en caso de error
    }
  }, [dataManager]);

  // Cargar configuración guardada cuando cambia la empresa
  useEffect(() => {
    if (!empresa || !open) return;
    
    const loadConfig = async () => {
      try {
        const manager = dataManager as any;
        let config = null;
        
        if (manager.getAppConfig) {
          config = await manager.getAppConfig(`field_markers_${empresa}`);
        } else {
          // Fallback: cargar de localStorage
          const stored = localStorage.getItem(`field_markers_${empresa}`);
          if (stored) {
            config = JSON.parse(stored);
          }
        }
        
        if (config && config.fields && Array.isArray(config.fields)) {
          // Si hay PDF cargado, re-extraer valores detectados
          if (pdfDocument) {
            const fieldsWithValues = await Promise.all(
              config.fields.map(async (field: MarkedField) => {
                try {
                  const detectedValue = await extractTextFromRegion(field);
                  return {
                    ...field,
                    detectedValue
                  };
                } catch (error) {
                  console.error(`Error re-extrayendo ${field.fieldName}:`, error);
                  return field;
                }
              })
            );
            
            setMarkedFields(fieldsWithValues);
            toast.info(`✅ Regla OCR cargada para ${empresa} (${config.fields.length} campos)`);
          } else {
            // Si no hay PDF, solo cargar los campos
            setMarkedFields(config.fields);
            toast.info(`✅ Regla OCR cargada para ${empresa} (${config.fields.length} campos). Carga un PDF para ver valores detectados.`);
          }
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    };
    
    loadConfig();
  }, [empresa, open, pdfDocument, dataManager]);

  // Cargar reglas guardadas cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadSavedRules();
    }
  }, [open, loadSavedRules]);

  const handleClose = () => {
    setSelectedFile(null);
    setPdfDocument(null);
    setMarkedFields([]);
    setCurrentPage(1);
    setTotalPages(0);
    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Square className="h-5 w-5" />
                Configurar Marcado de Campos
              </DialogTitle>
              <DialogDescription>
                Marca visualmente dónde están los campos en los recibos para que el sistema los extraiga automáticamente
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

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Panel izquierdo: Configuración */}
          <div className="w-80 flex-shrink-0 border-r p-4 space-y-4 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">1. Seleccionar Archivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      toast.info(`📄 Archivo seleccionado: ${file.name}`);
                    }
                  }}
                />
                {selectedFile && (
                  <div className="space-y-1">
                    <Badge variant="outline" className="w-full justify-start">
                      {selectedFile.name}
                    </Badge>
                    {isLoadingPdf && (
                      <p className="text-xs text-muted-foreground">
                        ⏳ Cargando PDF...
                      </p>
                    )}
                    {pdfError && (
                      <p className="text-xs text-red-600 font-medium">
                        ❌ Error: {pdfError}
                      </p>
                    )}
                    {pdfDocument && !isLoadingPdf && !pdfError && (
                      <p className="text-xs text-green-600 font-medium">
                        ✅ PDF cargado correctamente ({totalPages} página{totalPages > 1 ? 's' : ''})
                      </p>
                    )}
                  </div>
                )}
                {!selectedFile && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center py-2">
                      💡 Selecciona un archivo PDF para comenzar
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={async () => {
                        // Cargar un PDF de ejemplo de los recibos subidos
                        try {
                          const allConsolidated = await dataManager.getConsolidated();
                          const empresaRecibos = empresa 
                            ? allConsolidated.filter(item => item.data?.EMPRESA === empresa && (item.archivos && item.archivos.length > 0))
                            : allConsolidated.filter(item => item.archivos && item.archivos.length > 0);
                          
                          if (empresaRecibos.length === 0) {
                            toast.error('No hay recibos subidos para esta empresa');
                            return;
                          }
                          
                          // Tomar el primer recibo con archivo
                          const recibo = empresaRecibos[0];
                          const archivo = recibo.archivos?.[0] || recibo.data?.filename || recibo.data?.ARCHIVO;
                          
                          if (!archivo) {
                            toast.error('No se encontró archivo asociado');
                            return;
                          }
                          
                          toast.info(`Cargando PDF: ${archivo}...`);
                          
                          // Cargar desde el endpoint API
                          const pdfApiUrl = `/api/get-pdf?filename=${encodeURIComponent(archivo)}`;
                          const response = await fetch(pdfApiUrl);
                          
                          if (!response.ok) {
                            toast.error(`Error cargando PDF (${response.status})`);
                            return;
                          }
                          
                          const blob = await response.blob();
                          const file = new File([blob], archivo, { type: 'application/pdf' });
                          setSelectedFile(file);
                          toast.success(`PDF cargado: ${archivo}`);
                        } catch (error) {
                          console.error('Error cargando PDF de recibos:', error);
                          toast.error('Error cargando PDF desde recibos subidos');
                        }
                      }}
                      disabled={!empresa}
                      title={!empresa ? 'Selecciona una empresa primero' : 'Cargar un PDF de ejemplo de los recibos ya subidos'}
                    >
                      📄 Cargar PDF de ejemplo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">2. Empresa</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSavedRules(!showSavedRules);
                      if (!showSavedRules) {
                        loadSavedRules();
                      }
                    }}
                    className="h-7 text-xs"
                  >
                    <List className="h-3 w-3 mr-1" />
                    Reglas ({savedRules.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value.toUpperCase())}
                    placeholder="Ej: LIME, LIMPAR, SUMAR"
                  />
                  {empresa && selectedFile && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Empresa {empresaProp ? 'seleccionada' : 'detectada automáticamente'}
                    </p>
                  )}
                  {selectedFile && !empresa && (
                    <p className="text-xs text-muted-foreground">
                      💡 Ingresa el nombre de la empresa o será detectada automáticamente
                    </p>
                  )}
                </div>
                
                {/* Lista de reglas guardadas */}
                {showSavedRules && (
                  <div className="mt-4 pt-4 border-t space-y-2 max-h-48 overflow-y-auto">
                    <Label className="text-xs font-semibold">Reglas Guardadas:</Label>
                    {savedRules.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No hay reglas guardadas
                      </p>
                    ) : (
                      savedRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="p-2 border rounded bg-gray-50 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {rule.empresa}
                              </Badge>
                              <span className="text-muted-foreground">
                                {rule.fieldsCount} campos
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  // Cargar esta regla
                                  setEmpresa(rule.empresa);
                                  const manager = dataManager as any;
                                  try {
                                    let config;
                                    if (manager.getAppConfig) {
                                      config = await manager.getAppConfig(`field_markers_${rule.empresa}`);
                                    } else {
                                      const stored = localStorage.getItem(`field_markers_${rule.empresa}`);
                                      if (stored) {
                                        config = JSON.parse(stored);
                                      }
                                    }
                                    if (config && config.fields && Array.isArray(config.fields)) {
                                      // Si hay PDF cargado, re-extraer valores
                                      if (pdfDocument) {
                                        const fieldsWithValues = await Promise.all(
                                          config.fields.map(async (field: MarkedField) => {
                                            try {
                                              const detectedValue = await extractTextFromRegion(field);
                                              return {
                                                ...field,
                                                detectedValue
                                              };
                                            } catch (error) {
                                              console.error(`Error re-extrayendo ${field.fieldName}:`, error);
                                              return field;
                                            }
                                          })
                                        );
                                        setMarkedFields(fieldsWithValues);
                                        toast.success(`✅ Regla cargada: ${rule.fieldsCount} campos para ${rule.empresa}. Valores re-extraídos.`);
                                      } else {
                                        setMarkedFields(config.fields);
                                        toast.success(`✅ Regla cargada: ${rule.fieldsCount} campos para ${rule.empresa}`);
                                      }
                                    }
                                  } catch (error) {
                                    toast.error('Error cargando regla');
                                  }
                                }}
                                className="h-6 w-6 p-0"
                                title="Cargar regla"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!window.confirm(`¿Eliminar regla OCR para ${rule.empresa}?`)) return;
                                  
                                  const manager = dataManager as any;
                                  try {
                                    if (manager.deleteAppConfig) {
                                      await manager.deleteAppConfig(`field_markers_${rule.empresa}`);
                                    } else {
                                      localStorage.removeItem(`field_markers_${rule.empresa}`);
                                    }
                                    toast.success(`✅ Regla eliminada para ${rule.empresa}`);
                                    loadSavedRules(); // Recargar lista
                                    // Si la regla eliminada es la actual, limpiar campos marcados
                                    if (empresa === rule.empresa) {
                                      setMarkedFields([]);
                                    }
                                  } catch (error) {
                                    toast.error('Error eliminando regla');
                                  }
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                title="Eliminar regla"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(rule.createdAt).toLocaleDateString('es-AR')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">3. Campos</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Validaciones previas
                      if (!selectedFile) {
                        toast.error('Primero selecciona un archivo PDF');
                        return;
                      }
                      
                      if (!pdfDocument) {
                        toast.error('Esperando a que cargue el PDF...');
                        return;
                      }
                      
                      if (!empresa) {
                        toast.error('Primero selecciona una empresa');
                        return;
                      }
                      
                      if (!selectedFieldName) {
                        toast.error('Primero selecciona el nombre del campo a marcar');
                        return;
                      }
                      
                      // Si hay un rectángulo dibujado, marcarlo como campo
                      if (currentRect && selectedFieldName) {
                        const fieldName = selectedFieldName === 'OTRO' && newFieldName 
                          ? newFieldName.toUpperCase() 
                          : selectedFieldName;
                        
                        const newField: MarkedField = {
                          id: `field_${Date.now()}`,
                          fieldName: fieldName,
                          x: currentRect.x,
                          y: currentRect.y,
                          width: currentRect.width,
                          height: currentRect.height,
                          pageNumber: currentPage
                        };
                        
                        setIsDrawing(false);
                        setStartPos(null);
                        setCurrentRect(null);
                        
                        toast.info('Extrayendo valor del campo...');
                        try {
                          const detectedValue = await extractTextFromRegion(newField);
                          newField.detectedValue = detectedValue;
                          
                          setMarkedFields([...markedFields, newField]);
                          
                          if (detectedValue) {
                            toast.success(`✅ Campo "${fieldName}" agregado. Valor detectado: "${detectedValue}"`);
                          } else {
                            toast.warning(`⚠️ Campo "${fieldName}" agregado, pero no se detectó valor. Verifica que el área marcada sea correcta.`);
                          }
                        } catch (error) {
                          console.error('Error extrayendo valor:', error);
                          // Agregar el campo de todas formas
                          setMarkedFields([...markedFields, newField]);
                          toast.warning(`⚠️ Campo "${fieldName}" agregado, pero hubo un error al extraer el valor`);
                        }
                        
                        // Resetear selector de campo
                        setSelectedFieldName('CATEGORIA');
                        setNewFieldName('');
                      } else {
                        if (!currentRect) {
                          toast.info('💡 Primero arrastra en el PDF para marcar un área, luego haz clic en "Agregar"');
                        } else {
                          toast.info('Primero marca un área en el PDF arrastrando el mouse');
                        }
                      }
                    }}
                    disabled={!selectedFile || !pdfDocument || !empresa || !selectedFieldName}
                    className="h-7 text-xs"
                    title={
                      !selectedFile ? 'Selecciona un archivo PDF primero' :
                      !pdfDocument ? 'Esperando a que cargue el PDF' :
                      !empresa ? 'Selecciona una empresa primero' :
                      !selectedFieldName ? 'Selecciona el nombre del campo primero' :
                      currentRect ? 'Haz clic para agregar el campo marcado' :
                      'Primero marca un área arrastrando en el PDF'
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Selector de campo */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Campo a marcar:</Label>
                  <Select value={selectedFieldName} onValueChange={setSelectedFieldName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CATEGORIA">CATEGORIA</SelectItem>
                      <SelectItem value="LEGAJO">LEGAJO</SelectItem>
                      <SelectItem value="NOMBRE">NOMBRE</SelectItem>
                      <SelectItem value="PERIODO">PERIODO</SelectItem>
                      <SelectItem value="CUIL">CUIL</SelectItem>
                      <SelectItem value="SUELDO_BASICO">SUELDO_BASICO</SelectItem>
                      <SelectItem value="TOTAL">TOTAL</SelectItem>
                      <SelectItem value="OTRO">OTRO (especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedFieldName === 'OTRO' && (
                    <Input
                      placeholder="Nombre del nuevo campo"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value.toUpperCase())}
                      className="text-sm"
                    />
                  )}
                </div>

                {/* Lista de campos marcados */}
                <div className="border-t pt-2">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Campos marcados en esta página ({markedFields.filter(f => f.pageNumber === currentPage).length}):
                  </Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {markedFields.filter(f => f.pageNumber === currentPage).length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4 space-y-2">
                        <p className="font-medium">No hay campos marcados en esta página</p>
                        {!selectedFile || !pdfDocument ? (
                          <p>💡 Primero selecciona y carga un archivo PDF</p>
                        ) : !empresa ? (
                          <p>💡 Primero selecciona una empresa</p>
                        ) : (
                          <div className="space-y-1">
                            <p>1️⃣ Selecciona el campo (ej: CATEGORIA)</p>
                            <p>2️⃣ Arrastra en el PDF para marcar el área</p>
                            <p>3️⃣ Haz clic en "Agregar"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      markedFields
                        .filter(f => f.pageNumber === currentPage)
                        .map(field => (
                          <div
                            key={field.id}
                            className="p-2 border rounded bg-gray-50 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{field.fieldName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteField(field.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                            {field.detectedValue ? (
                              <div className="text-xs bg-green-50 border border-green-200 p-2 rounded">
                                <div className="font-semibold text-green-700 mb-1">✓ Valor detectado:</div>
                                <div className="text-green-900 font-mono break-words">{field.detectedValue}</div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">
                                Sin valor detectado
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="border-t pt-4 space-y-2 sticky bottom-0 bg-white pb-4">
              <Button 
                onClick={handleSave} 
                className="w-full" 
                disabled={!empresa || markedFields.length === 0}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Regla OCR
              </Button>
              <Button 
                onClick={handleApplyToAll} 
                className="w-full" 
                variant="default"
                disabled={!empresa || markedFields.length === 0}
                size="lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                Aplicar a Todos los Recibos
              </Button>
              <Button 
                onClick={handleCleanInvalidValues} 
                className="w-full" 
                variant="secondary"
                disabled={!empresa}
                size="lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Valores Inválidos
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="w-full"
                size="lg"
              >
                <X className="h-4 w-4 mr-2" />
                Cerrar
              </Button>
            </div>
          </div>

          {/* Panel derecho: Vista del PDF */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedFile && pdfDocument ? (
              <>
                {/* Controles de página */}
                <div className="flex items-center justify-between p-2 border-b bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <MousePointer2 className="h-3 w-3" />
                    Arrastra para marcar campos
                  </Badge>
                </div>

                {/* Canvas con PDF y overlay */}
                <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 p-4">
                  <div className="relative inline-block">
                    <canvas
                      ref={canvasRef}
                      className="border shadow-lg bg-white"
                    />
                    <canvas
                      ref={overlayRef}
                      className="absolute top-0 left-0 cursor-crosshair pointer-events-auto"
                      style={{ border: '1px solid transparent' }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                  <FileText className="h-16 w-16 mx-auto text-gray-400" />
                  <p className="text-gray-500">Selecciona un archivo PDF para comenzar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

