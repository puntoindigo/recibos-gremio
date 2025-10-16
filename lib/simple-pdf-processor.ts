// lib/simple-pdf-processor.ts
import { sha256OfFile } from './hash';
import { repoDexie } from './repo-dexie';
import { parsePdfReceiptToRecord } from './pdf-parser';

export interface SimpleProcessingResult {
  success: boolean;
  fileName: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
  needsEmpresaInput?: boolean; // Flag para indicar que necesita input manual de empresa
}

// Función simplificada para procesar un solo archivo
export async function processSingleFile(file: File, debug: boolean = false): Promise<SimpleProcessingResult> {
  try {
    if (debug) {
      console.log(`🔍 Procesando archivo: ${file.name}`);
    }

    // Generar hash
    const hash = await sha256OfFile(file);
    if (!hash) {
      if (debug) console.log(`❌ Error generando hash para: ${file.name}`);
      return { success: false, fileName: file.name, error: "Error generando hash" };
    }

    if (debug) {
      console.log(`✅ Hash generado para ${file.name}: ${hash.substring(0, 10)}...`);
    }

    // Verificar duplicados
    const existing = await repoDexie.findReceiptByHash(hash);
    if (debug) {
      console.log(`🔍 Verificando duplicados para ${file.name}:`, {
        hash: hash.substring(0, 10) + "...",
        existing: existing ? "ENCONTRADO" : "NO ENCONTRADO",
        existingData: existing ? {
          legajo: existing.legajo,
          periodo: existing.periodo,
          filename: existing.filename
        } : null
      });
    }
    
    if (existing) {
      if (debug) {
        console.log(`⏭️ Archivo duplicado: ${file.name} (hash: ${hash.substring(0, 10)}...)`);
      }
      return { 
        success: true, 
        fileName: file.name, 
        skipped: true, 
        reason: "Archivo duplicado" 
      };
    }

    // Parsear PDF
    if (debug) {
      console.log(`🔍 Parseando PDF: ${file.name}`);
    }
    const parsed = await parsePdfReceiptToRecord(file, debug);
    
    if (debug) {
      console.log(`📊 Resultado del parsing para ${file.name}:`, {
        empresa: parsed.data.EMPRESA,
        legajo: parsed.data.LEGAJO,
        periodo: parsed.data.PERIODO,
        nombre: parsed.data.NOMBRE,
        guardar: parsed.data.GUARDAR,
        error: parsed.data.ERROR
      });
    }
    
    // Verificar si debe guardarse
    if (parsed.data.GUARDAR === 'false') {
      if (debug) {
        console.log(`⏭️ No guardar archivo: ${file.name}, razón: ${parsed.data.GUARDAR_REASON || "No guardar"}`);
      }
      return { 
        success: true, 
        fileName: file.name, 
        skipped: true, 
        reason: parsed.data.GUARDAR_REASON || parsed.data.ERROR || "No guardar" 
      };
    }

    // Verificar que se detectó una empresa válida
    const empresa = parsed.data.EMPRESA;
    if (debug) {
      console.log(`🔍 Verificando empresa para ${file.name}:`, {
        empresa,
        dataEMPRESA: parsed.data.EMPRESA,
        allData: parsed.data
      });
    }
    
    if (!empresa || empresa === 'DESCONOCIDA' || empresa === 'N/A') {
      if (debug) {
        console.log(`⏭️ No guardar archivo: ${file.name}, razón: Empresa no detectada (${empresa})`);
        console.log(`🔍 Datos completos del archivo:`, parsed.data);
      }
      return { 
        success: true, 
        fileName: file.name, 
        skipped: true, 
        reason: `Empresa no detectada (${empresa})`,
        needsEmpresaInput: true // Flag para indicar que necesita input manual
      };
    }

    // Guardar en base de datos
    if (debug) {
      console.log(`💾 Guardando en base de datos: ${file.name}`);
    }
    await repoDexie.addReceipt({
      legajo: parsed.data.LEGAJO || '',
      periodo: parsed.data.PERIODO || '',
      nombre: parsed.data.NOMBRE || '',
      cuil: parsed.data.CUIL || '',
      data: parsed.data,
      filename: file.name,
      fileHash: hash
    });

    if (debug) {
      console.log(`✅ Archivo guardado exitosamente: ${file.name}`);
    }

    return { success: true, fileName: file.name };

  } catch (error) {
    if (debug) {
      console.error(`❌ Error procesando archivo ${file.name}:`, error);
    }
    return { 
      success: false, 
      fileName: file.name, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// Función para procesar múltiples archivos de forma simple
export async function processFiles(files: FileList | File[], debug: boolean = false): Promise<SimpleProcessingResult[]> {
  const results: SimpleProcessingResult[] = [];
  
  if (debug) {
    console.log(`🔍 Procesando ${files.length} archivos...`);
  }
  
  for (const file of files) {
    const result = await processSingleFile(file, debug);
    results.push(result);
  }
  
  if (debug) {
    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`📊 Resumen del procesamiento: ${successful} exitosos, ${skipped} omitidos, ${failed} fallidos`);
  }
  
  return results;
}
