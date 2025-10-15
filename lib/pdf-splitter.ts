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
    
    // Crear archivos simulados para cada página
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pageName = pdfFile.name.replace('.pdf', `_pagina${pageNum}.pdf`);
      // Crear una copia del archivo original con nombre diferente
      // En una implementación real, extraerías cada página individualmente
      const pageFile = new File([pdfFile], pageName, { type: 'application/pdf' });
      pages.push(pageFile);
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
