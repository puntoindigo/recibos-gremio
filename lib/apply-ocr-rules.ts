/**
 * Módulo para aplicar reglas OCR automáticamente a recibos
 */

import { getSupabaseManager } from './supabase-manager';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Usar el build legacy de pdfjs-dist para Node.js
let pdfjsLib: any = null;

const getPdfjsLib = async () => {
  if (pdfjsLib) {
    console.log(`📚 PDF.js ya cargado (reutilizando)`);
    return pdfjsLib;
  }
  
  console.log(`📚 Cargando PDF.js para ${typeof window === 'undefined' ? 'Node.js' : 'navegador'}...`);
  
  try {
    // En Node.js, usar el build que funciona en servidor
    if (typeof window === 'undefined') {
      // Usar el build legacy que funciona mejor en Node.js
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      console.log(`📚 PDF.js legacy build cargado`);
      
      // En Node.js, configurar el workerSrc para que apunte al worker correcto
      // El legacy build necesita el worker para funcionar correctamente
      if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        // Buscar el worker en múltiples ubicaciones posibles
        const possiblePaths = [
          path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
          path.join(process.cwd(), 'public', 'pdf.worker.min.mjs'),
          path.join(process.cwd(), '.next', 'server', 'chunks', 'pdf.worker.mjs'),
        ];
        
        let workerPath = '';
        for (const testPath of possiblePaths) {
          try {
            await fs.access(testPath);
            workerPath = testPath;
            break;
          } catch {
            // Continuar buscando
          }
        }
        
        if (workerPath) {
          // En Node.js, el legacy build necesita una ruta de archivo válida
          // Convertir la ruta a URL file:// absoluta
          const absolutePath = path.resolve(workerPath);
          // IMPORTANTE: En Node.js, usar file:// con ruta absoluta
          // Pero Turbopack busca el worker como módulo ES6, así que intentamos ambas cosas
          const workerUrl = `file://${absolutePath}`;
          
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          console.log(`✅ Worker configurado para Node.js: ${workerUrl}`);
          
          // También intentar copiar el worker a donde Turbopack lo busca
          try {
            const turbopackWorkerPath = path.join(process.cwd(), '.next', 'server', 'chunks', 'pdf.worker.mjs');
            const turbopackDir = path.dirname(turbopackWorkerPath);
            await fs.mkdir(turbopackDir, { recursive: true });
            await fs.copyFile(workerPath, turbopackWorkerPath);
            console.log(`✅ Worker también copiado a ubicación de Turbopack: ${turbopackWorkerPath}`);
          } catch (copyError) {
            console.log(`⚠️ No se pudo copiar worker a ubicación de Turbopack: ${copyError instanceof Error ? copyError.message : String(copyError)}`);
          }
        } else {
          // Si no encontramos el worker, usar una ruta absoluta directa a node_modules
          const fallbackWorker = path.resolve(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
          try {
            await fs.access(fallbackWorker);
            pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${fallbackWorker}`;
            console.log(`✅ Worker configurado (fallback): ${fallbackWorker}`);
          } catch {
            console.log(`⚠️ Worker no encontrado. El legacy build intentará funcionar sin worker (puede fallar).`);
          }
        }
      }
    } else {
      // En el navegador, usar el build normal
      pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
    }
    return pdfjsLib;
  } catch (error) {
    throw error;
  }
};

interface MarkedField {
  id: string;
  fieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

interface OCRRule {
  empresa: string;
  fields: MarkedField[];
  createdAt: string;
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
  
  const uniqueWords: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    if (!word) continue;
    
    // Verificar si esta palabra es una subcadena de otra palabra en la lista
    let isRedundant = false;
    
    for (const existingWord of uniqueWords) {
      if (word.length > existingWord.length) {
        if (word.includes(existingWord) && word.length - existingWord.length <= 3) {
          const index = uniqueWords.indexOf(existingWord);
          if (index !== -1) {
            uniqueWords[index] = word;
          }
          isRedundant = true;
          break;
        }
      } else if (existingWord.length > word.length) {
        if (existingWord.includes(word) && existingWord.length - word.length <= 3) {
          isRedundant = true;
          break;
        }
      } else if (word === existingWord) {
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
  
  // Limpieza específica para CUIL/DNI: eliminar palabras "Cuil", "CUIL", "DNI", etc. al final
  // Patrón: número con formato XX-XXXXXXXX-X seguido de palabras como "Cuil", "CUIL", "DNI"
  const cuilPattern = /^(\d{2}-\d{8}-\d{1})\s*(?:cuil|cui|dni|DNI|CUIL|CUI|DNI)\s*$/i;
  const cuilMatch = finalText.match(cuilPattern);
  if (cuilMatch) {
    finalText = cuilMatch[1]; // Solo el número del CUIL
  } else {
    // Si no coincide exactamente, intentar remover "Cuil", "CUIL", "DNI" al final
    finalText = finalText.replace(/\s*(?:cuil|cui|dni|CUIL|CUI|DNI)\s*$/i, '').trim();
  }
  
  // Normalizar espacios nuevamente después de las eliminaciones
  finalText = finalText.replace(/\s+/g, ' ').trim();
  
  return finalText;
}

/**
 * Extraer texto de una región específica del PDF
 * Si no encuentra texto, intenta expandir la región en 2-3mm equivalentes
 */
async function extractTextFromRegionForPDF(
  pdfDoc: any,
  field: MarkedField,
  renderScale: number = 1.5,
  expanded: boolean = false,
  empresa?: string
): Promise<string> {
  try {
    const page = await pdfDoc.getPage(field.pageNumber);
    
    // Obtener viewports
    const originalViewport = page.getViewport({ scale: 1.0 });
    const renderViewport = page.getViewport({ scale: renderScale });
    const textContent = await page.getTextContent();
    
    // Calcular factor de escala
    const scaleFactor = renderViewport.width / originalViewport.width;
    
    // Si estamos expandiendo, aumentar la región en ~2-3mm equivalentes
    // 2-3mm ≈ 1.5-2% del ancho/alto del PDF (para un PDF A4 típico)
    const expansionFactor = expanded ? 0.02 : 0; // 2% de expansión (equivale a ~2-3mm)
    
    // Calcular coordenadas expandidas
    let adjustedX = field.x;
    let adjustedY = field.y;
    let adjustedWidth = field.width;
    let adjustedHeight = field.height;
    
    if (expanded) {
      // Expandir hacia todos los lados: reducir x,y y aumentar width,height
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
    
    // Extraer items en la región exacta - usar la misma lógica mejorada que FieldMarkerConfigurator
    const itemsInRegion: Array<{str: string, x: number, y: number, width?: number, height?: number}> = [];
    
    // Obtener la matriz de transformación para calcular el bounding box completo
    for (const item of textContent.items) {
      if (!('transform' in item) || !item.str || item.str.trim() === '') continue;
      
      const transform = item.transform;
      const itemX = transform[4]; // X posición
      const itemY = transform[5]; // Y posición
      
      // Calcular dimensiones aproximadas del texto basándose en la matriz de transformación
      const itemWidth = Math.abs(transform[0]) * (item.str.length * 0.6);
      const itemHeight = Math.abs(transform[3]) * 1.2;
      
      // Calcular el centro del elemento de texto
      const itemCenterX = itemX + (itemWidth / 2);
      const itemCenterY = itemY;
      
      // Verificar si el CENTRO del elemento está dentro de la región (más estricto)
      const centerInRegion = itemCenterX >= xMin && itemCenterX <= xMax && 
                             itemCenterY <= yTop && itemCenterY >= yBottom;
      
      // Verificar si el elemento está al menos parcialmente dentro
      const itemX1 = itemX;
      const itemX2 = itemX + itemWidth;
      const itemY1 = itemY;
      const itemY2 = itemY - itemHeight; // Y decrece hacia arriba en PDF.js
      
      const overlapsX = (itemX1 <= xMax && itemX2 >= xMin);
      const overlapsY = (itemY1 >= yBottom && itemY2 <= yTop);
      
      // Solo incluir si el centro está dentro O si está mayormente dentro de la región
      if (centerInRegion || (overlapsX && overlapsY && (itemX1 >= xMin * 0.9 && itemX2 <= xMax * 1.1))) {
        itemsInRegion.push({
          str: item.str.trim(),
          x: itemCenterX,
          y: itemCenterY,
          width: itemWidth,
          height: itemHeight
        });
      }
    }
    
    // Si no encontramos nada, usar tolerancia mínima
    if (itemsInRegion.length === 0) {
      const minTolerance = 3;
      for (const item of textContent.items) {
        if (!('transform' in item) || !item.str || item.str.trim() === '') continue;
        
        const itemX = item.transform[4];
        const itemY = item.transform[5];
        
        const inX = itemX >= (xMin - minTolerance) && itemX <= (xMax + minTolerance);
        const inY = itemY <= (yTop + minTolerance) && itemY >= (yBottom - minTolerance);
        
        if (inX && inY) {
          itemsInRegion.push({
            str: item.str.trim(),
            x: itemX,
            y: itemY
          });
        }
      }
    }
    
    // Filtrar palabras comunes de encabezados que pueden estar cerca
    const headerWords = ['FUNCIÓN', 'FUNCION', 'SECTOR', 'DEDUCCIONES', 'DEDUCCIÓN', 'DEDUCCION', 'SERV', 'HAB', 'DESC', 'UNIDADES', 'CONCEPTO', 'HABER', 'CHOFER', 'CHOFE', 'LIQUIDACION', 'LIQUIDACIÓN'];
    
    // Si el texto extraído contiene principalmente palabras de encabezado, filtrarlas agresivamente
    const allText = itemsInRegion.map(item => item.str.toUpperCase().trim()).join(' ');
    const allWords = allText.split(/\s+/).filter(w => w.length > 0);
    const headerWordCount = allWords.filter(w => headerWords.some(hw => w.includes(hw) || hw.includes(w))).length;
    const totalWords = allWords.length;
    
    // Si más del 50% de las palabras son de encabezado, filtrar agresivamente
    // O si solo hay 1 palabra y es un encabezado común, filtrar
    const shouldFilterAggressively = totalWords > 0 && (
      (headerWordCount / totalWords) > 0.5 || 
      (totalWords === 1 && headerWords.includes(allWords[0]))
    );
    
    const filteredItems = itemsInRegion.filter(item => {
      const upperStr = item.str.toUpperCase().trim();
      if (!upperStr) return false;
      
      // Excluir si es SOLO una palabra de encabezado
      if (headerWords.includes(upperStr)) {
        return false;
      }
      
      // Si estamos filtrando agresivamente, excluir si contiene palabras de encabezado prominentes
      if (shouldFilterAggressively) {
        const words = upperStr.split(/\s+/);
        const hasOnlyHeaderWords = words.every(w => headerWords.some(hw => w.includes(hw)));
        if (hasOnlyHeaderWords && words.length <= 3) {
          return false;
        }
      }
      
      return true;
    });
    
    // Si después del filtrado tenemos items, usar esos; si no, usar los originales
    const finalItems = (shouldFilterAggressively && filteredItems.length > 0) 
      ? filteredItems 
      : (filteredItems.length > 0 ? filteredItems : itemsInRegion);
    
    // Filtrar palabras no deseadas según el campo
    const filteredForField = finalItems.filter(item => {
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
    
    // Ordenar: primero por Y (arriba a abajo), luego por X (izq a der)
    filteredForField.sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff > 5) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });
    
    // Priorizar elementos que están más centrados en la región
    const regionCenterX = (xMin + xMax) / 2;
    const regionCenterY = (yTop + yBottom) / 2;
    
    filteredForField.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.x - regionCenterX, 2) + Math.pow(a.y - regionCenterY, 2));
      const distB = Math.sqrt(Math.pow(b.x - regionCenterX, 2) + Math.pow(b.y - regionCenterY, 2));
      return distA - distB; // Más cercanos al centro primero
    });
    
    const rawText = filteredForField.map(item => item.str).join(' ').trim();
    
    // Limpiar el texto extraído: eliminar duplicados y palabras redundantes
    const cleanedText = cleanExtractedText(rawText);
    
    // Aplicar reglas de reemplazo por empresa si existen
    let finalText = cleanedText;
    if (finalText && empresa) {
      try {
        const manager = getSupabaseManager();
        const replacementRules = await manager.getAppConfig(`ocr_replacements_${empresa}`);
        if (replacementRules && typeof replacementRules === 'object' && Array.isArray(replacementRules.rules)) {
          for (const rule of replacementRules.rules) {
            if (rule.fieldName === field.fieldName && rule.from && rule.to) {
              // Aplicar reemplazo (case-insensitive)
              const regex = new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              if (regex.test(finalText)) {
                finalText = finalText.replace(regex, rule.to);
                console.log(`  🔄 Reemplazo aplicado: "${rule.from}" -> "${rule.to}" en ${field.fieldName}`);
              }
            }
          }
        }
      } catch (replacementError) {
        // Si falla cargar reglas de reemplazo, continuar sin ellas
        console.log(`  ⚠️ No se pudieron cargar reglas de reemplazo: ${replacementError instanceof Error ? replacementError.message : String(replacementError)}`);
      }
    }
    
    // Si no encontramos texto Y no estamos en modo expandido, intentar con región expandida
    if (!finalText && !expanded) {
      console.log(`  🔍 No se encontró texto en región original, intentando con región expandida (~2-3mm)...`);
      const expandedText = await extractTextFromRegionForPDF(pdfDoc, field, renderScale, true, empresa);
      if (expandedText) {
        console.log(`  ✅ Texto encontrado en región expandida: "${expandedText}"`);
      }
      return expandedText;
    }
    
    return finalText;
  } catch (error) {
    console.error(`Error extrayendo texto de región para ${field.fieldName}:`, error);
    return '';
  }
}

/**
 * Aplicar reglas OCR a un recibo específico
 */
export async function applyOCRRulesToReceipt(
  empresa: string,
  archivo: string,
  reciboKey: string
): Promise<Record<string, string> | { extractedValues: Record<string, string>; debugInfo?: any }> {
  // Asegurarse de que el worker se configure ANTES de usarlo
  await getPdfjsLib();
  
  const debugInfo: any = {
    empresa,
    archivo,
    reglaEncontrada: false,
    camposConfigurados: 0,
    camposProcesados: 0,
    textosExtraidos: [] as Array<{ campo: string; texto: string | null; razonRechazo?: string; aceptado?: boolean }>,
    errores: [] as string[]
  };
  
  try {
    // Obtener regla OCR para la empresa (forzar refresh para asegurar que se use la versión más reciente)
    const manager = getSupabaseManager();
    const config = await manager.getAppConfig(`field_markers_${empresa}`, true); // forceRefresh = true
    
    if (!config || !config.fields || !Array.isArray(config.fields) || config.fields.length === 0) {
      // No hay regla OCR para esta empresa
      debugInfo.razon = `No se encontró regla OCR para la empresa "${empresa}". Buscando: "field_markers_${empresa}"`;
      console.log(`⚠️ OCR [${archivo}]: ${debugInfo.razon}`);
      return { extractedValues: {}, debugInfo };
    }
    
    const rule: OCRRule = config;
    debugInfo.reglaEncontrada = true;
    debugInfo.camposConfigurados = rule.fields.length;
    console.log(`📋 OCR [${archivo}]: Regla encontrada (${rule.fields.length} campo(s))`);
    console.log(`🔍 OCR: Procesando ${archivo} con regla para ${empresa}...`);
    
    // Leer el archivo PDF desde el filesystem
    const RECIBOS_DIR = path.join(process.cwd(), 'public/recibos');
    const filePath = path.join(RECIBOS_DIR, archivo);
    
    // Verificar que el archivo existe
    let actualFilePath = filePath;
    try {
      await fs.access(filePath);
    } catch {
      // Buscar archivo con búsqueda flexible (similar a get-pdf)
      const files = await fs.readdir(RECIBOS_DIR);
      
      // Normalizar nombres para comparación
      const normalizedSearch = archivo.toLowerCase().replace(/\s+/g, ' ');
      
      // Buscar coincidencias exactas primero
      let matchingFile = files.find(f => 
        f.toLowerCase() === archivo.toLowerCase() ||
        decodeURIComponent(f) === archivo ||
        f === archivo
      );
      
      // Si no encontramos exacto, buscar por coincidencia parcial
      // Esto maneja casos como "SUMAR_recibos sueldos 09.2025 -3.pdf" buscando "SUMAR_recibos sueldos 09.2025 (MAESTRANZA)-3.pdf"
      if (!matchingFile) {
        const searchName = normalizedSearch.replace(/\.pdf$/, '');
        
        // Extraer el número final si existe (ej: "-3" de "sumar_recibos sueldos 09.2025 -3")
        const numberMatch = searchName.match(/\s*-(\d+)$/);
        
        if (numberMatch) {
          const targetNumber = numberMatch[1];
          // Base sin el número final (ej: "sumar_recibos sueldos 09.2025")
          const baseWithoutNumber = searchName.replace(/\s*-\d+$/, '').trim();
          
          // Buscar archivos que:
          // 1. Empiecen con la base (puede tener paréntesis u otros caracteres)
          // 2. Terminen con "-número.pdf" o "-número-sufijo.pdf"
          matchingFile = files.find(f => {
            const fLower = f.toLowerCase().replace(/\.pdf$/, '');
            
            // Debe empezar con la base (ignorando diferencias por paréntesis)
            const baseNormalized = baseWithoutNumber.replace(/[().-]/g, '');
            const fBaseNormalized = fLower.substring(0, baseWithoutNumber.length).replace(/[().-]/g, '');
            
            if (!fBaseNormalized.startsWith(baseNormalized)) return false;
            
            // Debe terminar con el número buscado (puede tener sufijo)
            const pattern = new RegExp(`-${targetNumber}(-\\d+)?$`);
            return pattern.test(fLower);
          });
        }
        
        // Si aún no encontramos, buscar archivos que empiecen con el nombre buscado
        if (!matchingFile) {
          matchingFile = files.find(f => {
            const fLower = f.toLowerCase();
            return fLower.startsWith(searchName) && fLower.endsWith('.pdf');
          });
        }
      }
      
      if (!matchingFile) {
        // No loguear error para mantener consola limpia - solo retornar vacío
        return {};
      }
      
      actualFilePath = path.join(RECIBOS_DIR, matchingFile);
    }
    
    // Leer el archivo
    const fileBuffer = await fs.readFile(actualFilePath);
    
    // Convertir Buffer a Uint8Array (pdfjs-dist legacy build requiere Uint8Array)
    const uint8Array = new Uint8Array(fileBuffer);
    
    // Cargar PDF con pdfjs (usar legacy build para Node.js)
    const pdfjs = await getPdfjsLib();
    
    // Cargar el documento
    let pdfDoc;
    try {
      // Intentar cargar el PDF - el worker debería estar configurado en getPdfjsLib()
      const loadingTask = pdfjs.getDocument({ 
        data: uint8Array,
        verbosity: 0,
        // Evitar usar el worker si es posible (modo síncrono)
        useWorkerFetch: false,
        isEvalSupported: false
      });
      pdfDoc = await loadingTask.promise;
      console.log(`📄 OCR: PDF cargado exitosamente para ${archivo}`);
    } catch (error: any) {
      // Si falla, puede ser por el worker - intentar sin opciones especiales
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('worker') || errorMsg.includes('GlobalWorkerOptions') || errorMsg.includes('Cannot find module')) {
        console.log(`⚠️ OCR: Error de worker (${errorMsg.substring(0, 100)}...), intentando cargar sin opciones especiales...`);
        try {
          // Intentar cargar sin opciones que requieran worker
          const loadingTask = pdfjs.getDocument({ data: uint8Array });
          pdfDoc = await loadingTask.promise;
          console.log(`📄 OCR: PDF cargado exitosamente (sin worker) para ${archivo}`);
        } catch (secondError: any) {
          const secondErrorMsg = secondError?.message || String(secondError);
          console.log(`❌ OCR: Error definitivo cargando PDF: ${secondErrorMsg.substring(0, 200)}`);
          throw new Error(`Error cargando PDF para OCR: ${secondErrorMsg}`);
        }
      } else {
        throw error;
      }
    }
    
    // Extraer valores de cada campo marcado
    const extractedValues: Record<string, string> = {};
    
    console.log(`🔍 Aplicando regla OCR a ${archivo}...`);
    
    for (const field of rule.fields) {
      debugInfo.camposProcesados++;
      try {
        console.log(`  📍 Extrayendo ${field.fieldName} de región (x:${field.x.toFixed(2)}, y:${field.y.toFixed(2)}, w:${field.width.toFixed(2)}, h:${field.height.toFixed(2)})...`);
        let extractedText = await extractTextFromRegionForPDF(pdfDoc, field, 1.5, false, empresa);
        
        // Limpieza específica para CUIL/DNI: eliminar "Cuil", "CUIL", "DNI" al final
        if (field.fieldName === 'CUIL/DNI' || field.fieldName === 'CUIL' || field.fieldName === 'DNI') {
          // Patrón: número con formato XX-XXXXXXXX-X seguido de palabras como "Cuil", "CUIL", "DNI"
          const cuilPattern = /^(\d{2}-\d{8}-\d{1})\s*(?:cuil|cui|dni|DNI|CUIL|CUI|DNI)\s*$/i;
          const cuilMatch = extractedText.match(cuilPattern);
          if (cuilMatch) {
            extractedText = cuilMatch[1]; // Solo el número del CUIL
            console.log(`  🧹 CUIL limpiado: "${extractedText}"`);
          } else {
            // Si no coincide exactamente, intentar remover "Cuil", "CUIL", "DNI" al final
            const cleaned = extractedText.replace(/\s*(?:cuil|cui|dni|DNI|CUIL|CUI|DNI)\s*$/i, '').trim();
            if (cleaned !== extractedText) {
              extractedText = cleaned;
              console.log(`  🧹 CUIL limpiado (removido texto al final): "${extractedText}"`);
            }
          }
        }
        
        if (extractedText) {
          console.log(`  📝 Texto crudo extraído: "${extractedText}"`);
          const upperText = extractedText.toUpperCase().trim();
          
          // Guardar el texto extraído para debug (incluso si se rechaza)
          const textoInfo: any = {
            campo: field.fieldName,
            texto: extractedText.trim(),
            textoCrudo: extractedText
          };
          
          // Lista de palabras que son SOLO encabezados de tabla (no categorías válidas)
          const tableHeaderOnlyWords = ['FUNCIÓN', 'FUNCION', 'SECTOR', 'DEDUCCIONES', 'DEDUCCIÓN', 'DEDUCCION', 'SERV', 'HAB', 'DESC', 'UNIDADES', 'CONCEPTO', 'HABER', 'LIQUIDACION', 'LIQUIDACIÓN'];
          
          // Categorías válidas que NO deben ser rechazadas
          const validCategories = ['CHOFER', 'CHOFE', 'RECOLECTOR', 'REC', 'PEON', 'PEÓN', 'PEONES', 'PE', 'BARRIDO', 'MAESTRANZA', 'OPERARIO', 'AYUDANTE', 'ADMINISTRATIVO', 'ADMI'];
          
          const words = upperText.split(/\s+/).filter(w => w.length > 0);
          
          // PRIMERO: Rechazar "LIQUIDACION" - es un encabezado de sección, no una categoría
          if (upperText === 'LIQUIDACION' || upperText === 'LIQUIDACIÓN' || 
              (words.length === 1 && (words[0] === 'LIQUIDACION' || words[0] === 'LIQUIDACIÓN'))) {
            textoInfo.razonRechazo = 'Es "LIQUIDACION" (encabezado de sección, no una categoría válida)';
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (LIQUIDACION es encabezado - omitido)`);
            continue;
          }
          
          // Verificar si contiene alguna categoría válida
          const hasValidCategory = words.some(w => validCategories.includes(w));
          
          // Si contiene una categoría válida, aceptarlo (incluso si tiene otras palabras)
          if (hasValidCategory) {
            extractedValues[field.fieldName] = extractedText.trim();
            textoInfo.aceptado = true;
            textoInfo.valorFinal = extractedText.trim();
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ✅ ${field.fieldName}: "${extractedText.trim()}"`);
            continue;
          }
          
          // Patrón específico conocido: "Función Sector Deducciones SERV"
          const knownInvalidPatterns = [
            /FUNCI[ÓO]N.*SECTOR.*DEDUCCI[ÓO]N.*SERV/i,
            /FUNCION.*SECTOR.*DEDUCCIONES.*SERV/i,
            /FUNCI[ÓO]N.*SECTOR.*DEDUCCIONES/i,
            /SERV.*FUNCI[ÓO]N.*SECTOR/i,
          ];
          
          // Verificar si coincide con algún patrón inválido conocido
          const matchesInvalidPattern = knownInvalidPatterns.some(pattern => pattern.test(upperText));
          
          if (matchesInvalidPattern) {
            textoInfo.razonRechazo = 'Coincide con patrón inválido conocido (ej: "Función Sector Deducciones SERV")';
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (patrón inválido - omitido)`);
            continue;
          }
          
          // Solo rechazar si es SOLO una palabra de encabezado de tabla (no categorías válidas)
          const isOnlyTableHeader = words.length === 1 && 
                                   tableHeaderOnlyWords.includes(words[0]) && 
                                   !validCategories.includes(words[0]);
          
          if (isOnlyTableHeader) {
            textoInfo.razonRechazo = `Es solo una palabra de encabezado de tabla: "${words[0]}"`;
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (solo encabezado - omitido)`);
            continue;
          }
          
          // Verificar si contiene el patrón conocido "Función Sector Deducciones SERV"
          const isHeaderPattern = (upperText.includes('FUNCIÓN') || upperText.includes('FUNCION')) && 
                                   upperText.includes('SECTOR') && 
                                   upperText.includes('DEDUCCIONES');
          if (isHeaderPattern) {
            textoInfo.razonRechazo = 'Contiene patrón de encabezado completo ("Función Sector Deducciones")';
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (encabezado completo - omitido)`);
            continue;
          }
          
          // Verificar si contiene "SERV" junto con "FUNCIÓN" o "SECTOR" (otro patrón de encabezado)
          const hasServWithHeaders = upperText.includes('SERV') && 
                                     (upperText.includes('FUNCIÓN') || upperText.includes('FUNCION') || upperText.includes('SECTOR'));
          if (hasServWithHeaders) {
            textoInfo.razonRechazo = 'Contiene "SERV" junto con encabezados de tabla';
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (SERV con encabezados - omitido)`);
            continue;
          }
          
          // Validación adicional: si el texto contiene "FUNCIÓN", "SECTOR" y "DEDUCCIONES" juntos, rechazar
          const hasFullHeader = (upperText.includes('FUNCIÓN') || upperText.includes('FUNCION')) &&
                                 upperText.includes('SECTOR') &&
                                 (upperText.includes('DEDUCCIONES') || upperText.includes('DEDUCCIÓN') || upperText.includes('DEDUCCION'));
          if (hasFullHeader) {
            textoInfo.razonRechazo = 'Contiene "Función", "Sector" y "Deducciones" juntos (encabezado completo)';
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (encabezado completo "Función Sector Deducciones" - omitido)`);
            continue;
          }
          
          // Verificar si contiene principalmente palabras de encabezado de tabla (no categorías válidas)
          const headerWordCount = words.filter(w => 
            tableHeaderOnlyWords.some(hw => w.includes(hw) || hw.includes(w)) &&
            !validCategories.some(vc => w.includes(vc) || vc.includes(w))
          ).length;
          
          // Si contiene 3 o más palabras de encabezado de tabla, es muy probable que sea un encabezado
          if (headerWordCount >= 3) {
            textoInfo.razonRechazo = `Contiene ${headerWordCount} palabras de encabezado (muy probable que sea encabezado de tabla)`;
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (muchos encabezados - omitido)`);
            continue;
          }
          
          if (headerWordCount > 0 && headerWordCount / words.length > 0.5) {
            textoInfo.razonRechazo = `${Math.round((headerWordCount / words.length) * 100)}% de las palabras son encabezados`;
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (principalmente encabezados - omitido)`);
            continue;
          }
          
          // Si todas las palabras son encabezados de tabla (y no categorías válidas), no asignar
          if (headerWordCount === words.length && words.length > 0) {
            textoInfo.razonRechazo = 'Todas las palabras son encabezados de tabla';
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (solo encabezados - omitido)`);
            continue;
          }
          
          // Si el texto empieza con una palabra de encabezado de tabla seguida de más palabras de encabezado, rechazar
          if (words.length >= 2 && 
              tableHeaderOnlyWords.includes(words[0]) && 
              !validCategories.includes(words[0]) &&
              words.slice(1).some(w => tableHeaderOnlyWords.some(hw => w.includes(hw) || hw.includes(w)) && !validCategories.includes(w))) {
            textoInfo.razonRechazo = `Empieza con encabezado "${words[0]}" seguido de más encabezados`;
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (empieza con encabezado - omitido)`);
            continue;
          }
          
          // Validación adicional: si el texto contiene exactamente "SERV" solo
          if (upperText === 'SERV') {
            textoInfo.razonRechazo = 'Es solo "SERV" (no es una categoría válida)';
            debugInfo.textosExtraidos.push(textoInfo);
            console.log(`  ⚠️ ${field.fieldName}: "${extractedText}" (solo SERV - omitido)`);
            continue;
          }
          
          extractedValues[field.fieldName] = extractedText.trim();
          textoInfo.aceptado = true;
          textoInfo.valorFinal = extractedText.trim();
          debugInfo.textosExtraidos.push(textoInfo);
          console.log(`  ✅ ${field.fieldName}: "${extractedText.trim()}"`);
        } else {
          debugInfo.textosExtraidos.push({
            campo: field.fieldName,
            texto: null,
            razonRechazo: 'No se extrajo texto de la región marcada (región vacía o fuera de rango)'
          });
          console.log(`  ⚠️ ${field.fieldName}: (sin texto extraído)`);
        }
      } catch (fieldError) {
        const errorMsg = fieldError instanceof Error ? fieldError.message : String(fieldError);
        debugInfo.textosExtraidos.push({
          campo: field.fieldName,
          texto: null,
          razonRechazo: `Error extrayendo texto: ${errorMsg}`
        });
        debugInfo.errores.push(`${field.fieldName}: ${errorMsg}`);
        console.log(`  ❌ ${field.fieldName}: Error - ${errorMsg}`);
      }
    }
    
    debugInfo.valoresAplicados = Object.keys(extractedValues).length;
    
    if (Object.keys(extractedValues).length > 0) {
      console.log(`✅ OCR: ${Object.keys(extractedValues).length} valor(es) aplicado(s) a ${archivo}`);
    } else {
      // Si no se extrajeron valores, dar más información sobre por qué
      const textosRechazados = debugInfo.textosExtraidos.filter((t: any) => !t.aceptado);
      const textosConRechazo = textosRechazados.filter((t: any) => t.razonRechazo);
      
      console.log(`⚠️ OCR: No se aplicaron valores a ${archivo}`);
      if (textosConRechazo.length > 0) {
        console.log(`   Razones de rechazo:`);
        textosConRechazo.forEach((t: any) => {
          console.log(`   - ${t.campo}: "${t.texto || '(vacío)'}" → ${t.razonRechazo}`);
        });
      } else if (debugInfo.textosExtraidos.length === 0) {
        console.log(`   No se encontró texto en ninguna de las ${debugInfo.camposConfigurados} región(es) marcada(s)`);
      }
    }
    
    // Actualizar el registro consolidado si se extrajo algo Y si hay valores válidos
    // No actualizar si todos los valores fueron rechazados
    if (Object.keys(extractedValues).length > 0) {
      try {
        const existingRecibo = await manager.getConsolidatedByKey(reciboKey);
        if (existingRecibo) {
          // IMPORTANTE: Crear un nuevo objeto data que sobrescriba los valores extraídos
          // No usar spread de existingRecibo.data primero porque puede tener valores viejos inválidos
          // Limpiar valores incorrectos de CATEGORIA antes de actualizar
          // Si el valor actual contiene el patrón de encabezado conocido, limpiarlo
          const currentCategoria = existingRecibo.data?.CATEGORIA || existingRecibo.data?.CATEGORÍA || '';
          const upperCurrentCategoria = currentCategoria.toUpperCase();
          const isCurrentValueInvalid = (upperCurrentCategoria.includes('FUNCIÓN') || upperCurrentCategoria.includes('FUNCION')) && 
                                       upperCurrentCategoria.includes('SECTOR') && 
                                       upperCurrentCategoria.includes('DEDUCCIONES');
          
          // Crear el objeto data actualizado
          const updatedData = {
            ...existingRecibo.data, // Mantener otros campos
          };
          
          // Si el valor actual es inválido Y no tenemos un valor nuevo válido, limpiarlo
          if (isCurrentValueInvalid && !extractedValues.CATEGORIA && !extractedValues.CATEGORÍA) {
            console.log(`🧹 Limpiando valor inválido de CATEGORIA: "${currentCategoria}"`);
            delete updatedData.CATEGORIA;
            delete updatedData.CATEGORÍA;
          }
          
          // Campos con coordenadas variables (no deberían sobrescribirse con OCR si ya tienen valor del parser válido)
          // Estos campos están en la parte inferior del recibo y sus coordenadas X varían
          const fieldsWithVariableCoordinates = ['JORNAL', 'HORAS_EXTRAS', 'ANTIGUEDAD', 'JUBILACION', 'OBRA SOCIAL', 
                                                 'SEG. SEPELIO', 'RESG. MUTU', 'RESG. MUTUAL', 'CUOTA GREMIAL', 
                                                 'ADICIONALES', 'INASISTENCIAS'];
          
          // Función para detectar si un valor parece ser incorrecto (días/cantidad o valor sin formato monetario)
          const isLikelyIncorrectValue = (value: string): boolean => {
            if (!value || value === '0.00' || value === '0' || value === '-' || value.trim() === '') return false;
            
            // Remover espacios y caracteres no numéricos excepto punto y coma
            const cleanValue = value.trim().replace(/[^0-9.,]/g, '');
            
            // Si no tiene números, no es válido
            if (!/\d/.test(cleanValue)) return false;
            
            // Normalizar: remover comas y convertir a número
            const normalized = cleanValue.replace(/,/g, '');
            const numValue = parseFloat(normalized);
            
            // Si no es un número válido, no es incorrecto
            if (isNaN(numValue) || !isFinite(numValue)) return false;
            
            // Verificar si tiene formato monetario (comas como separador de miles)
            const hasMonetaryFormat = cleanValue.includes(',');
            
            // Si tiene formato monetario (ej: "1,234.56"), probablemente es válido
            if (hasMonetaryFormat) return false;
            
            // CRÍTICO: Valores sin formato monetario (sin comas) son sospechosos
            // Valores como "103204.00", "002501.00" son incorrectos porque no tienen formato monetario
            // Los valores monetarios argentinos siempre tienen comas como separador de miles
            // Si el valor no tiene comas Y es >= 1000, probablemente es incorrecto
            if (!hasMonetaryFormat && numValue >= 1000) {
              // Cualquier valor >= 1000 sin formato monetario es incorrecto
              // Los valores monetarios argentinos siempre tienen comas (ej: "103,204.00")
              return true; // Es incorrecto - debería tener formato monetario
            }
            
            // Si es menor a 1000, probablemente es días/cantidad
            // Valores como "29.00", "26.00", "50.00", "76.50", "8.00", "16.00", "9.00", "24.00" son días/cantidad
            if (numValue < 1000) {
              // Verificar el formato: si tiene formato de decimal (ej: "29.00", "76.50")
              if (normalized.match(/^\d+\.\d{2}$/)) {
                return true;
              }
              // También valores enteros pequeños
              if (normalized.match(/^\d+$/)) {
                return true;
              }
            }
            
            return false;
          };
          
          // IMPORTANTE: Aplicar TODOS los valores extraídos por OCR
          // El OCR es la fuente de verdad cuando se aplica una regla guardada manualmente
          // Los campos principales (SUELDO_BASICO, TOTAL, DESCUENTOS, CATEGORIA) siempre se aplican
          // Para campos con coordenadas variables (JORNAL, HORAS_EXTRAS), también se aplican si fueron extraídos por OCR
          // porque el usuario ha marcado manualmente estas regiones y confía en ellas
          const filteredExtractedValues: Record<string, string> = {};
          Object.keys(extractedValues).forEach(key => {
            const isVariableCoordinateField = fieldsWithVariableCoordinates.some(f => 
              key.toUpperCase().includes(f.toUpperCase()) || f.toUpperCase().includes(key.toUpperCase())
            );
            
            const currentValue = updatedData[key] || '';
            const extractedValue = extractedValues[key];
            
            // Campos que NO tienen coordenadas variables (SUELDO_BASICO, TOTAL, DESCUENTOS, CATEGORIA, etc.)
            // SIEMPRE se aplican si fueron extraídos por OCR
            if (!isVariableCoordinateField) {
              filteredExtractedValues[key] = extractedValue;
              console.log(`✅ OCR: Aplicando ${key} (sin coordenadas variables): "${extractedValue}"`);
            } else {
              // Campos con coordenadas variables: 
              // Si el OCR extrajo un valor, generalmente deberíamos aplicarlo porque el usuario marcó la región manualmente
              // PERO aún verificamos si el valor actual es claramente incorrecto para priorizar OCR
              if (!currentValue || currentValue === '0.00' || currentValue === '0' || currentValue === '-') {
                // Campo vacío o cero, aplicar valor OCR
                filteredExtractedValues[key] = extractedValue;
                console.log(`✅ OCR: Aplicando ${key} (campo vacío): "${extractedValue}"`);
              } else if (isLikelyIncorrectValue(currentValue)) {
                // Valor actual es incorrecto, sobrescribir con OCR
                console.log(`✅ OCR: Sobrescribiendo ${key} - valor actual incorrecto: "${currentValue}", OCR: "${extractedValue}"`);
                filteredExtractedValues[key] = extractedValue;
              } else {
                // Si el valor actual parece válido, AÚN ASÍ aplicamos el valor OCR
                // porque el usuario marcó manualmente la región y confía en ella
                // El OCR es la fuente de verdad cuando se aplica una regla guardada
                filteredExtractedValues[key] = extractedValue;
                console.log(`✅ OCR: Aplicando ${key} (coordenadas variables, valor OCR de regla guardada): "${extractedValue}" (valor anterior: "${currentValue}")`);
              }
            }
          });
          
          // Aplicar los valores filtrados (que ahora incluyen TODOS los valores extraídos)
          Object.assign(updatedData, filteredExtractedValues);
          
          console.log(`📝 Actualizando recibo ${reciboKey} con valores OCR:`, {
            valoresExtraidos: extractedValues,
            valoresFiltrados: filteredExtractedValues,
            dataAnterior: Object.keys(existingRecibo.data || {}).slice(0, 10),
            dataNueva: Object.keys(updatedData).slice(0, 10)
          });
          
          if (isCurrentValueInvalid) {
            console.log(`   Valor anterior inválido detectado y limpiado: "${currentCategoria}"`);
          }
          
          const updateResult = await manager.updateConsolidated(reciboKey, {
            data: updatedData
          });
          
          if (updateResult) {
            console.log(`✅ OCR: Valores guardados en BD para ${reciboKey}:`, Object.keys(filteredExtractedValues));
            console.log(`📊 OCR: Valores guardados:`, filteredExtractedValues);
            console.log(`📊 OCR: Todos los campos en data después de actualizar:`, Object.keys(updatedData).filter(k => !k.startsWith('_')).slice(0, 20));
            // El cache ya se limpia en updateConsolidated, no es necesario hacerlo aquí
          } else {
            console.warn(`⚠️ updateConsolidated retornó null/undefined para ${reciboKey}`);
          }
        } else {
          console.warn(`⚠️ No se encontró recibo consolidado con key: ${reciboKey}`);
        }
      } catch (updateError) {
        console.error(`❌ Error actualizando recibo ${reciboKey} con valores OCR:`, updateError);
        console.error(`   Detalles:`, {
          message: updateError instanceof Error ? updateError.message : String(updateError),
          stack: updateError instanceof Error ? updateError.stack : undefined
        });
      }
    } else {
      // Ya se logueó arriba, no duplicar
      
      // Incluso si no se extrajo nada, limpiar el valor inválido actual si existe
      try {
        const existingRecibo = await manager.getConsolidatedByKey(reciboKey);
        if (existingRecibo) {
          const currentCategoria = existingRecibo.data?.CATEGORIA || existingRecibo.data?.CATEGORÍA || '';
          const upperCurrentCategoria = currentCategoria.toUpperCase();
          const isCurrentValueInvalid = (upperCurrentCategoria.includes('FUNCIÓN') || upperCurrentCategoria.includes('FUNCION')) && 
                                       upperCurrentCategoria.includes('SECTOR') && 
                                       upperCurrentCategoria.includes('DEDUCCIONES');
          
          if (isCurrentValueInvalid) {
            console.log(`🧹 Limpiando valor inválido de CATEGORIA (no se extrajo valor válido): "${currentCategoria}"`);
            
            const updatedData = {
              ...existingRecibo.data,
            };
            delete updatedData.CATEGORIA;
            delete updatedData.CATEGORÍA;
            
            const updateResult = await manager.updateConsolidated(reciboKey, {
              data: updatedData
            });
            
            if (updateResult) {
              console.log(`✅ Valor inválido de CATEGORIA limpiado en ${reciboKey}`);
            }
          }
        }
      } catch (cleanupError) {
        console.error(`❌ Error limpiando valor inválido:`, cleanupError);
      }
    }
    
    return { extractedValues, debugInfo };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    debugInfo.errores.push(errorMsg);
    debugInfo.razon = `Error general: ${errorMsg}`;
    console.log(`❌ OCR: Error aplicando regla a ${archivo} - ${errorMsg}`);
    return { extractedValues: {}, debugInfo };
  }
}

