// lib/pdf-processor.ts
import { sha256OfFile } from './hash';
import { repoDexie } from './repo-dexie';
import { parsePdfReceiptToRecord } from './pdf-parser';
import { validateReceiptData, normalizeReceiptData, generateValidationSummary, type ValidationResult } from './pdf-validation';

export interface ProcessingResult {
  success: boolean;
  fileName: string;
  hash: string;
  validation: ValidationResult;
  data?: Record<string, string>;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export interface ProcessingOptions {
  debug?: boolean;
  skipDuplicates?: boolean;
  validateData?: boolean;
  normalizeData?: boolean;
  maxFileSize?: number; // en bytes
  allowedExtensions?: string[];
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  debug: false,
  skipDuplicates: true,
  validateData: true,
  normalizeData: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.pdf']
};

// Función principal para procesar un archivo PDF
export async function processPdfFile(
  file: File, 
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const result: ProcessingResult = {
    success: false,
    fileName: file.name,
    hash: '',
    validation: { isValid: false, errors: [], warnings: [], data: {} }
  };

  try {
    // Validar archivo
    const fileValidation = validateFile(file, opts);
    if (!fileValidation.isValid) {
      result.error = fileValidation.error;
      return result;
    }

    // Generar hash
    result.hash = await sha256OfFile(file);
    if (!result.hash) {
      result.error = 'Error generando hash del archivo';
      return result;
    }

    if (opts.debug) {
      console.log(`🔍 Procesando archivo: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
    }

    // Verificar duplicados
    if (opts.skipDuplicates) {
      const existing = await repoDexie.findReceiptByHash(result.hash);
      if (existing) {
        result.skipped = true;
        result.reason = 'Archivo duplicado (ya existe en la base de datos)';
        result.success = true; // No es un error, es un skip válido
        return result;
      }
    }

    // Parsear PDF
    const parsed = await parsePdfReceiptToRecord(file, opts.debug);
    
    if (opts.debug) {
      console.log(`📄 PDF parseado para ${file.name}:`, {
        campos: Object.keys(parsed.data).length,
        empresa: parsed.data.EMPRESA,
        legajo: parsed.data.LEGAJO,
        periodo: parsed.data.PERIODO
      });
    }

    // Validar datos
    if (opts.validateData) {
      result.validation = validateReceiptData(parsed);
      
      if (!result.validation.isValid) {
        result.error = `Datos inválidos: ${result.validation.errors.join(', ')}`;
        return result;
      }
    }

    // Normalizar datos
    if (opts.normalizeData) {
      result.data = normalizeReceiptData(parsed.data);
    } else {
      result.data = parsed.data;
    }

    // Guardar en base de datos
    const saveResult = await repoDexie.addReceipt({
      legajo: result.data.LEGAJO || '',
      periodo: result.data.PERIODO || '',
      nombre: result.data.NOMBRE || '',
      cuil: result.data.CUIL || '',
      data: result.data,
      filename: file.name,
      fileHash: result.hash
    });

    if (opts.debug) {
      console.log(`💾 Archivo guardado: ${file.name}`, saveResult);
    }

    result.success = true;
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    result.error = `Error procesando archivo: ${errorMessage}`;
    
    if (opts.debug) {
      console.error(`❌ Error procesando ${file.name}:`, error);
    }
    
    return result;
  }
}

// Función para procesar múltiples archivos
export async function processMultipleFiles(
  files: FileList | File[],
  options: ProcessingOptions = {},
  onProgress?: (current: number, total: number, result: ProcessingResult) => void
): Promise<ProcessingResult[]> {
  const fileArray = Array.from(files);
  const results: ProcessingResult[] = [];
  
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const result = await processPdfFile(file, options);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, fileArray.length, result);
    }
  }
  
  return results;
}

// Validación de archivo
function validateFile(file: File, options: ProcessingOptions): { isValid: boolean; error?: string } {
  // Verificar tamaño
  if (options.maxFileSize && file.size > options.maxFileSize) {
    return {
      isValid: false,
      error: `Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(1)}MB (máximo: ${(options.maxFileSize / 1024 / 1024).toFixed(1)}MB)`
    };
  }

  // Verificar extensión
  if (options.allowedExtensions) {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!options.allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `Extensión no permitida: ${extension}. Extensiones permitidas: ${options.allowedExtensions.join(', ')}`
      };
    }
  }

  // Verificar que no esté vacío
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'El archivo está vacío'
    };
  }

  return { isValid: true };
}

// Función para generar estadísticas de procesamiento
export function generateProcessingStats(results: ProcessingResult[]): {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
  warnings: string[];
} {
  const stats = {
    total: results.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };

  results.forEach(result => {
    if (result.skipped) {
      stats.skipped++;
    } else if (result.success) {
      stats.successful++;
    } else {
      stats.failed++;
      if (result.error) {
        stats.errors.push(`${result.fileName}: ${result.error}`);
      }
    }

    // Agregar advertencias de validación
    if (result.validation.warnings.length > 0) {
      stats.warnings.push(`${result.fileName}: ${result.validation.warnings.join(', ')}`);
    }
  });

  return stats;
}

// Función para generar resumen de procesamiento
export function generateProcessingSummary(results: ProcessingResult[]): string {
  const stats = generateProcessingStats(results);
  
  let summary = `📊 Resumen de Procesamiento\n`;
  summary += `Total archivos: ${stats.total}\n`;
  summary += `✅ Exitosos: ${stats.successful}\n`;
  summary += `⏭️ Omitidos: ${stats.skipped}\n`;
  summary += `❌ Fallidos: ${stats.failed}\n`;
  
  if (stats.errors.length > 0) {
    summary += `\nErrores:\n${stats.errors.map(e => `• ${e}`).join('\n')}`;
  }
  
  if (stats.warnings.length > 0) {
    summary += `\nAdvertencias:\n${stats.warnings.map(w => `• ${w}`).join('\n')}`;
  }
  
  return summary;
}
