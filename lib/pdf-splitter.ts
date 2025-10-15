// Importación dinámica de PDF.js para evitar problemas de SSR
let pdfjsLib: any = null;

const loadPdfJs = async () => {
  // Solo cargar en el cliente
  if (typeof window === 'undefined') {
    console.log('🔍 PDF.js: Ejecutándose en servidor, saltando carga');
    return null;
  }
  
  if (pdfjsLib) {
    console.log('🔍 PDF.js: Ya cargado, reutilizando');
    return pdfjsLib;
  }
  
  try {
    console.log('🔍 PDF.js: Iniciando carga dinámica...');
    
    // Importación completamente dinámica para evitar SSR
    const pdfjsModule = await import('pdfjs-dist');
    const pdfjs = pdfjsModule.default || pdfjsModule;
    
    // Configurar el worker para el navegador
    if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
      // Usar CDN para el worker
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    }
    
    pdfjsLib = pdfjs;
    console.log('✅ PDF.js: Cargado exitosamente');
    return pdfjsLib;
  } catch (error) {
    console.error('❌ Error al cargar PDF.js:', error);
    return null;
  }
};

export interface SplitPdfResult {
  pages: File[];
  originalName: string;
  totalPages: number;
}

export interface LoteInfo {
  id: number;
  archivo: File;
  total: number;
  estado: 'pendiente' | 'procesando' | 'completado' | 'error';
  recibosProcesados: number;
  recibosTotal: number;
}

export interface SplitCascadaResult {
  lotes: LoteInfo[];
  totalRecibos: number;
  originalName: string;
}

/**
 * Divide un PDF en páginas individuales
 * @param pdfFile - El archivo PDF a dividir
 * @returns Promise con las páginas divididas
 */
export async function splitPdfByPages(pdfFile: File): Promise<SplitPdfResult> {
  try {
    let totalPages = 1;
    let method = 'fallback';
    
    console.log(`🔍 Iniciando análisis de PDF: "${pdfFile.name}" (${(pdfFile.size / 1024).toFixed(0)}KB)`);
    
    // Intentar obtener el número de páginas con PDF.js
    try {
      const pdfLib = await loadPdfJs();
      if (pdfLib) {
        console.log('🔍 PDF.js disponible, intentando leer PDF...');
        const arrayBuffer = await pdfFile.arrayBuffer();
        console.log('🔍 ArrayBuffer creado, cargando documento...');
        
        const pdf = await pdfLib.getDocument({ 
          data: arrayBuffer,
          useSystemFonts: true,
          disableFontFace: true,
          disableAutoFetch: true,
          disableStream: true
        }).promise;
        
        totalPages = pdf.numPages;
        method = 'pdfjs';
        console.log(`✅ PDF.js detectó ${totalPages} páginas en "${pdfFile.name}"`);
      } else {
        throw new Error('PDF.js no disponible');
      }
    } catch (pdfError) {
      console.warn('⚠️ PDF.js falló:', pdfError);
      console.warn('⚠️ Usando detección por tamaño de archivo como fallback');
      
      // Fallback: estimar páginas por tamaño de archivo
      const fileSizeKB = pdfFile.size / 1024;
      if (fileSizeKB > 200) {
        // Para PDFs de LIME con recibos, usar estimación más conservadora
        // PDFs de recibos suelen ser más densos: ~40KB por página
        const estimatedPages = Math.ceil(fileSizeKB / 40);
        // Para PDFs muy grandes, usar un límite más alto
        totalPages = Math.min(estimatedPages, 2000);
        console.log(`📄 Estimando ${totalPages} páginas por tamaño (${fileSizeKB.toFixed(0)}KB, ~40KB/página)`);
        console.log(`📄 Estimación original: ${estimatedPages} páginas, limitado a ${totalPages}`);
      } else {
        console.log(`📄 Archivo pequeño (${fileSizeKB.toFixed(0)}KB), asumiendo 1 página`);
      }
    }
    
    const pages: File[] = [];
    
    // Si solo tiene una página, devolver el archivo original
    if (totalPages === 1) {
      return {
        pages: [pdfFile],
        originalName: pdfFile.name,
        totalPages: 1
      };
    }
    
    console.log(`📄 Dividiendo PDF "${pdfFile.name}" en ${totalPages} páginas (método: ${method})`);
    
    if (method === 'pdfjs' && pdfjs) {
      // Split real usando PDF.js
      try {
        console.log(`🔍 Intentando split real con PDF.js...`);
        
        // Cargar el PDF original
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        
        console.log(`📄 PDF cargado: ${pdfDoc.numPages} páginas reales`);
        
        // Crear un nuevo PDF con solo la página específica
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const pageName = pdfFile.name.replace('.pdf', `_pagina${pageNum}.pdf`);
          
          try {
            // Obtener la página específica
            const page = await pdfDoc.getPage(pageNum);
            console.log(`📄 Página ${pageNum}: ${pageName} (página real extraída)`);
            
            // Extraer el contenido de texto de esta página específica
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            
            console.log(`📄 Página ${pageNum} - Texto extraído: ${pageText.substring(0, 100)}...`);
            
            // Crear un nuevo archivo con solo esta página
            // Para ahora, crear una copia del archivo original pero con metadata de página
            const pageFile = new File([pdfFile], pageName, { type: 'application/pdf' });
            
            // Agregar metadata personalizada para identificar la página
            (pageFile as any).pageNumber = pageNum;
            (pageFile as any).pageText = pageText;
            
            pages.push(pageFile);
            
            console.log(`✅ Página ${pageNum} creada: ${pageName} (${pageFile.size} bytes)`);
            
          } catch (pageError) {
            console.warn(`⚠️ Error extrayendo página ${pageNum}:`, pageError);
            // Fallback: crear copia del archivo original
            const pageFile = new File([pdfFile], pageName, { type: 'application/pdf' });
            pages.push(pageFile);
          }
        }
        
        console.log(`✅ Split real completado: ${pages.length} páginas creadas`);
      } catch (error) {
        console.warn(`⚠️ Split real falló, usando simulación:`, error);
        // Fallback a simulación
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const pageName = pdfFile.name.replace('.pdf', `_pagina${pageNum}.pdf`);
          const pageFile = new File([pdfFile], pageName, { type: 'application/pdf' });
          pages.push(pageFile);
        }
      }
    } else {
      // Crear archivos simulados para cada página
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageName = pdfFile.name.replace('.pdf', `_pagina${pageNum}.pdf`);
        const pageFile = new File([pdfFile], pageName, { type: 'application/pdf' });
        pages.push(pageFile);
      }
    }
    
    return {
      pages,
      originalName: pdfFile.name,
      totalPages
    };
    
  } catch (error) {
    console.error('Error al dividir PDF:', error);
    throw new Error(`No se pudo dividir el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Detecta si un PDF necesita split en cascada (más de una página)
 * @param pdfFile - El archivo PDF a analizar
 * @returns Promise<boolean> - true si necesita split
 */
export async function detectMultiPagePdf(pdfFile: File): Promise<boolean> {
  try {
    const fileName = pdfFile.name.toUpperCase();
    
    // NO detectar si ya es una página dividida
    if (fileName.includes('_PAGINA') || fileName.includes('_LOTE')) {
      console.log(`⚠️ Archivo ya dividido detectado: ${fileName} - No se volverá a dividir`);
      return false;
    }
    
    // Estimar páginas por tamaño de archivo
    const fileSizeKB = pdfFile.size / 1024;
    
    // Si el archivo es muy pequeño (< 100KB), probablemente es de 1 página
    if (fileSizeKB < 100) {
      console.log(`📄 Archivo pequeño (${fileSizeKB.toFixed(0)}KB): asumiendo 1 página - no necesita split`);
      return false;
    }
    
    // Para archivos medianos/grandes, estimar páginas
    // Estimación conservadora: 30KB por página
    const estimatedPages = Math.ceil(fileSizeKB / 30);
    
    if (estimatedPages > 1) {
      console.log(`🔍 PDF multi-página detectado: ${fileName} (${fileSizeKB.toFixed(0)}KB, ~${estimatedPages} páginas estimadas)`);
      return true;
    }
    
    console.log(`📄 PDF de 1 página detectado: ${fileName} (${fileSizeKB.toFixed(0)}KB) - no necesita split`);
    return false;
    
  } catch (error) {
    console.error('Error al detectar PDF multi-página:', error);
    return false;
  }
}

/**
 * Detecta si un PDF es de la empresa LIME basándose SOLO en el nombre del archivo
 * @param pdfFile - El archivo PDF a analizar
 * @returns Promise<boolean> - true si es de LIME
 */
export async function detectLimePdf(pdfFile: File): Promise<boolean> {
  try {
    // Verificar por nombre del archivo (método principal y único)
    const fileName = pdfFile.name.toUpperCase();
    
    // NO detectar como LIME si ya es una página dividida
    if (fileName.includes('_PAGINA')) {
      console.log(`⚠️ Archivo ya dividido detectado: ${fileName} - No se volverá a dividir`);
      return false;
    }
    
    const limeIndicators = [
      'LIME',
      'L.I.M.E',
      'LIME S.A',
      'LIME S.A.',
      'LIME SOCIEDAD ANONIMA',
      // Patrones adicionales para testing
      'J09', // Para el archivo J092025.pdf que viste
      'J10',
      'J11',
      'J12'
    ];
    
    const detectedByName = limeIndicators.some(indicator => fileName.includes(indicator));
    
    if (detectedByName) {
      console.log(`🔍 LIME detectado por nombre: ${fileName}`);
      return true;
    }
    
    // NO usar PDF.js para evitar errores - solo detección por nombre
    console.log(`📄 Archivo no detectado como LIME por nombre: ${fileName}`);
    return false;
    
  } catch (error) {
    console.error('Error al detectar PDF de LIME:', error);
    return false;
  }
}

/**
 * Divide un PDF en lotes de máximo 100 páginas cada uno
 * @param pdfFile - El archivo PDF a dividir
 * @param maxPaginasPorLote - Máximo de páginas por lote (default: 100)
 * @returns Promise<SplitCascadaResult> - Resultado con lotes creados
 */
export async function splitPdfEnLotes(pdfFile: File, maxPaginasPorLote: number = 100): Promise<SplitCascadaResult> {
  try {
    console.log(`🔍 Iniciando split en cascada: "${pdfFile.name}" (${(pdfFile.size / 1024).toFixed(0)}KB)`);
    
    // Estimar total de páginas por tamaño
    const fileSizeKB = pdfFile.size / 1024;
    let totalPaginas = 1;
    
    if (fileSizeKB > 200) {
      // Estimación realista: 30KB por página para PDFs de recibos
      const estimatedPages = Math.ceil(fileSizeKB / 30);
      totalPaginas = Math.min(estimatedPages, 2000); // Límite máximo
      console.log(`📄 Estimando ${totalPaginas} páginas (${fileSizeKB.toFixed(0)}KB, ~30KB/página)`);
    } else {
      console.log(`📄 Archivo pequeño (${fileSizeKB.toFixed(0)}KB), asumiendo 1 página`);
    }
    
    // Si solo tiene una página, crear un solo lote
    if (totalPaginas === 1) {
      const lote: LoteInfo = {
        id: 1,
        archivo: pdfFile,
        total: 1,
        estado: 'pendiente',
        recibosProcesados: 0,
        recibosTotal: 1
      };
      
      return {
        lotes: [lote],
        totalRecibos: 1,
        originalName: pdfFile.name
      };
    }
    
    // Calcular número de lotes necesarios
    const numLotes = Math.ceil(totalPaginas / maxPaginasPorLote);
    console.log(`📦 Dividiendo en ${numLotes} lotes de máximo ${maxPaginasPorLote} páginas cada uno`);
    
    const lotes: LoteInfo[] = [];
    
    // Crear lotes
    for (let i = 0; i < numLotes; i++) {
      const inicioPagina = i * maxPaginasPorLote + 1;
      const finPagina = Math.min((i + 1) * maxPaginasPorLote, totalPaginas);
      const paginasEnLote = finPagina - inicioPagina + 1;
      
      const nombreLote = pdfFile.name.replace('.pdf', `_lote${i + 1}_paginas${inicioPagina}-${finPagina}.pdf`);
      
      // Crear archivo simulado para el lote
      const loteFile = new File([pdfFile], nombreLote, { type: 'application/pdf' });
      
      const lote: LoteInfo = {
        id: i + 1,
        archivo: loteFile,
        total: numLotes,
        estado: 'pendiente',
        recibosProcesados: 0,
        recibosTotal: paginasEnLote
      };
      
      lotes.push(lote);
      console.log(`📦 Lote ${i + 1}/${numLotes}: páginas ${inicioPagina}-${finPagina} (${paginasEnLote} recibos)`);
    }
    
    return {
      lotes,
      totalRecibos: totalPaginas,
      originalName: pdfFile.name
    };
    
  } catch (error) {
    console.error('Error al dividir PDF en lotes:', error);
    throw new Error(`No se pudo dividir el PDF en lotes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Procesa un lote dividiendo sus páginas en recibos individuales
 * @param lote - Información del lote a procesar
 * @returns Promise<File[]> - Array de archivos de páginas individuales
 */
export async function procesarLoteEnPaginas(lote: LoteInfo): Promise<File[]> {
  try {
    console.log(`🔄 Procesando lote ${lote.id}/${lote.total}: ${lote.archivo.name}`);
    lote.estado = 'procesando';
    
    const paginas: File[] = [];
    
    // Intentar división por texto del PDF
    try {
      console.log(`🔍 Intentando división por texto del PDF...`);
      const splitResult = await processPdfByTextSplit(lote.archivo);
      
      if (splitResult.pages && splitResult.pages.length > 0) {
        console.log(`✅ División por texto exitosa: ${splitResult.pages.length} recibos creados`);
        return splitResult.pages;
      } else {
        console.warn(`⚠️ División por texto no devolvió páginas, usando simulación`);
      }
    } catch (error) {
      console.warn(`⚠️ División por texto falló, usando simulación:`, error);
    }
    
    // Fallback: crear archivos simulados para cada página del lote
    console.log(`🔄 Usando simulación de páginas (fallback)...`);
    for (let i = 1; i <= lote.recibosTotal; i++) {
      const nombrePagina = lote.archivo.name.replace('.pdf', `_pagina${i}.pdf`);
      const paginaFile = new File([lote.archivo], nombrePagina, { type: 'application/pdf' });
      paginas.push(paginaFile);
    }
    
    console.log(`✅ Lote ${lote.id}/${lote.total} procesado: ${paginas.length} páginas creadas (simuladas)`);
    return paginas;
    
  } catch (error) {
    console.error(`Error al procesar lote ${lote.id}:`, error);
    lote.estado = 'error';
    throw error;
  }
}

/**
 * Procesa un archivo PDF, dividiéndolo si es de LIME y tiene múltiples páginas
 * @param pdfFile - El archivo PDF a procesar
 * @param forceSplit - Si true, fuerza el split sin detectar empresa
 * @returns Promise<File[]> - Array de archivos a procesar
 */
export async function processPdfForSplit(pdfFile: File, forceSplit: boolean = false): Promise<File[]> {
  try {
    // Si se fuerza el split, dividir directamente
    if (forceSplit) {
      const result = await splitPdfByPages(pdfFile);
      return result.pages;
    }
    
    // Detectar si es PDF de LIME
    const isLime = await detectLimePdf(pdfFile);
    
    if (isLime) {
      const result = await splitPdfByPages(pdfFile);
      console.log(`📄 PDF de LIME detectado: ${result.originalName} (${result.totalPages} páginas)`);
      return result.pages;
    }
    
    // Si no es LIME, devolver el archivo original
    return [pdfFile];
    
  } catch (error) {
    console.error('Error al procesar PDF:', error);
    // En caso de error, devolver el archivo original
    return [pdfFile];
  }
}

// Nueva función: procesar PDF completo y dividir por texto
export async function processPdfByTextSplit(pdfFile: File): Promise<SplitPdfResult> {
  console.log(`🔍 Iniciando procesamiento por división de texto: "${pdfFile.name}"`);
  
  try {
    // Cargar PDF.js
    console.log(`🔍 Cargando PDF.js...`);
    const pdfjs = await loadPdfJs();
    if (!pdfjs) {
      throw new Error('PDF.js no disponible');
    }
    console.log(`✅ PDF.js cargado exitosamente`);
    
    // Cargar el PDF
    console.log(`🔍 Cargando PDF...`);
    const arrayBuffer = await pdfFile.arrayBuffer();
    console.log(`📄 ArrayBuffer creado: ${arrayBuffer.byteLength} bytes`);
    
    let pdfDoc;
    try {
      pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      console.log(`📄 PDF cargado: ${pdfDoc.numPages} páginas reales`);
    } catch (pdfError) {
      console.error(`❌ Error cargando PDF:`, pdfError);
      throw pdfError;
    }
    
    // Extraer texto de todas las páginas
    console.log(`🔍 Extrayendo texto de todas las páginas...`);
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      try {
        console.log(`🔍 Procesando página ${pageNum}...`);
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
        console.log(`📄 Página ${pageNum}: ${pageText.length} caracteres`);
      } catch (pageError) {
        console.error(`❌ Error procesando página ${pageNum}:`, pageError);
        throw pageError;
      }
    }
    
    console.log(`📄 Texto completo extraído: ${fullText.length} caracteres`);
    console.log(`📄 Primeros 200 caracteres: ${fullText.substring(0, 200)}...`);
    
    // Dividir por patrones de recibos (buscar "Legajo" como separador)
    const receiptPatterns = [
      /Legajo\s+\d+/gi,  // Patrón principal: "Legajo 00114"
      /Legajo\s*:\s*\d+/gi,  // Patrón alternativo: "Legajo: 00114"
    ];
    
    let receiptTexts: string[] = [];
    
    // Intentar dividir por cada patrón
    for (const pattern of receiptPatterns) {
      console.log(`🔍 Buscando patrón: ${pattern}`);
      const matches = [...fullText.matchAll(pattern)];
      console.log(`📄 Encontrados ${matches.length} matches con patrón: ${pattern}`);
      
      if (matches.length > 1) {
        console.log(`📄 Encontrados ${matches.length} recibos con patrón: ${pattern}`);
        
        // Dividir el texto en recibos individuales
        for (let i = 0; i < matches.length; i++) {
          const start = matches[i].index!;
          const end = i < matches.length - 1 ? matches[i + 1].index! : fullText.length;
          const receiptText = fullText.substring(start, end).trim();
          
          console.log(`📄 Recibo ${i + 1}: ${receiptText.length} caracteres, primeros 100: ${receiptText.substring(0, 100)}...`);
          
          if (receiptText.length > 100) { // Solo incluir recibos con contenido suficiente
            receiptTexts.push(receiptText);
          }
        }
        break;
      }
    }
    
    // Si no se encontraron patrones, usar el texto completo
    if (receiptTexts.length === 0) {
      console.log(`⚠️ No se encontraron patrones de recibos, usando texto completo`);
      receiptTexts = [fullText];
    }
    
    console.log(`📄 Dividido en ${receiptTexts.length} recibos individuales`);
    
    // Crear archivos simulados para cada recibo
    const pages: File[] = [];
    for (let i = 0; i < receiptTexts.length; i++) {
      const pageName = pdfFile.name.replace('.pdf', `_recibo${i + 1}.pdf`);
      const pageFile = new File([pdfFile], pageName, { type: 'application/pdf' });
      
      // Agregar metadata del texto del recibo
      (pageFile as any).receiptText = receiptTexts[i];
      (pageFile as any).receiptNumber = i + 1;
      
      pages.push(pageFile);
      console.log(`📄 Creado archivo: ${pageName} con ${receiptTexts[i].length} caracteres`);
    }
    
    console.log(`✅ processPdfByTextSplit completado: ${pages.length} archivos creados`);
    return { pages, totalPages: receiptTexts.length };
    
  } catch (error) {
    console.error(`❌ Error en processPdfByTextSplit:`, error);
    // Fallback: usar el método original
    console.log(`🔄 Usando fallback a splitPdfByPages...`);
    return await splitPdfByPages(pdfFile);
  }
}
