// lib/simple-pdf-processor.ts
import { sha256OfFile } from './hash';
// import { repoDexie } from './repo-dexie'; // ELIMINADO
import { parsePdfReceiptToRecord } from './pdf-parser';
import { getSupabaseManager } from './supabase-manager';

// Función para normalizar nombres de archivos (remover paréntesis)
export function normalizeFileName(filename: string): string {
  return filename.replace(/\([^)]*\)/g, '').trim();
}

// Función para verificar duplicados por nombre de archivo
async function checkForDuplicateByName(filename: string, dataManager: any): Promise<any> {
  try {
    // Buscar en la tabla consolidated por filename
    const { data, error } = await getSupabaseManager().supabase
      .from('consolidated')
      .select('*')
      .eq('data->>filename', filename)
      .limit(1);
    
    if (error) {
      console.error('Error verificando duplicados por nombre:', error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error en checkForDuplicateByName:', error);
    return null;
  }
}

// Función para verificar duplicados por hash
async function checkForDuplicateFile(hash: string, dataManager: any): Promise<any> {
  try {
    // Buscar en la tabla consolidated por fileHash
    const { data, error } = await getSupabaseManager().supabase
      .from('consolidated')
      .select('*')
      .eq('data->>fileHash', hash)
      .limit(1);
    
    if (error) {
      console.error('Error verificando duplicados por hash:', error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error en checkForDuplicateFile:', error);
    return null;
  }
}

export interface SimpleProcessingResult {
  success: boolean;
  fileName: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
  needsEmpresaInput?: boolean; // Flag para indicar que necesita input manual de empresa
  needsParserAdjustment?: boolean; // Flag para indicar que necesita ajustes del parser
  parsedData?: Record<string, string>; // Datos parseados para mostrar en el modal de ajustes
}

// Función simplificada para procesar un solo archivo
export async function processSingleFile(
  file: File, 
  dataManager: DataManager,
  debug: boolean = false,
  learnedRules?: { empresa?: string; periodo?: string }
): Promise<SimpleProcessingResult> {
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

    // Verificar duplicados por nombre de archivo ANTES de procesar
    const normalizedFilename = normalizeFileName(file.name);
    if (debug) {
      console.log(`🔍 Verificando duplicados por nombre: ${file.name} → ${normalizedFilename}`);
    }

    // Verificar si ya existe un archivo con el mismo nombre
    const existingByName = await checkForDuplicateByName(normalizedFilename, dataManager);
    if (existingByName) {
      if (debug) {
        console.log(`⚠️ Archivo duplicado por nombre encontrado: ${file.name}`);
      }
      return {
        success: true,
        fileName: file.name,
        skipped: true,
        reason: `Archivo ya existe: ${existingByName.filename || 'archivo duplicado'}`
      };
    }

    // Verificar duplicados por hash
    const existing = await checkForDuplicateFile(hash, dataManager);
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
        console.log(`⏭️ Archivo duplicado por contenido: ${file.name} (hash: ${hash.substring(0, 10)}...)`);
      }
      return { 
        success: true, 
        fileName: file.name, 
        skipped: true, 
        reason: `Archivo duplicado: ${existing.filename || 'archivo duplicado'}` 
      };
    }

    // Parsear PDF
    if (debug) {
      console.log(`🔍 Parseando PDF: ${file.name}`);
    }
    const parsed = await parsePdfReceiptToRecord(file, debug);
    
    // Aplicar reglas aprendidas si están disponibles
    if (learnedRules) {
      if (learnedRules.empresa && (!parsed.data.EMPRESA || parsed.data.EMPRESA === 'DESCONOCIDA')) {
        parsed.data.EMPRESA = learnedRules.empresa;
        if (debug) {
          console.log(`🧠 Aplicando empresa aprendida: ${learnedRules.empresa}`);
        }
      }
      if (learnedRules.periodo && (!parsed.data.PERIODO || parsed.data.PERIODO === 'FALTANTE')) {
        parsed.data.PERIODO = learnedRules.periodo;
        if (debug) {
          console.log(`🧠 Aplicando período aprendido: ${learnedRules.periodo}`);
        }
      }
    }
    
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
    
    // Si la empresa es LIMPAR (fallback), procesar normalmente sin marcar como needsEmpresaInput
    if (empresa === 'LIMPAR') {
      if (debug) {
        console.log(`📄 Procesando archivo con empresa LIMPAR (fallback): ${file.name}`);
      }
    }

    // Verificar si faltan datos básicos y necesita ajustes del parser
    const legajo = parsed.data.LEGAJO;
    const nombre = parsed.data.NOMBRE;
    const periodo = parsed.data.PERIODO;
    
    if (!legajo || !nombre || !periodo) {
      if (debug) {
        console.log(`⚠️ Datos incompletos en ${file.name}:`, {
          legajo: legajo || 'FALTANTE',
          nombre: nombre || 'FALTANTE', 
          periodo: periodo || 'FALTANTE',
          empresa: empresa
        });
      }
      return {
        success: true,
        fileName: file.name,
        skipped: true,
        reason: 'Datos incompletos - necesita ajustes del parser',
        needsParserAdjustment: true,
        parsedData: parsed.data
      };
    }

    // Guardar en base de datos
    if (debug) {
      console.log(`💾 Guardando en base de datos: ${file.name}`);
    }
    
    // Usar el nombre normalizado ya calculado
    if (debug && file.name !== normalizedFilename) {
      console.log(`📝 Normalizando nombre: ${file.name} → ${normalizedFilename}`);
    }
    
    // Guardar recibo en Supabase usando dataManager
    try {
      const reciboData = {
        id: `${parsed.data.LEGAJO || ''}-${parsed.data.PERIODO || ''}-${parsed.data.EMPRESA || ''}-${Date.now()}`,
        key: `${parsed.data.LEGAJO || ''}-${parsed.data.PERIODO || ''}-${parsed.data.EMPRESA || ''}`,
        legajo: parsed.data.LEGAJO || '',
        nombre: parsed.data.NOMBRE || '',
        periodo: parsed.data.PERIODO || '',
        archivos: [normalizedFilename],
        data: {
          ...parsed.data,
          filename: normalizedFilename,
          fileHash: hash,
          EMPRESA: parsed.data.EMPRESA || ''
        }
      };

      console.log('💾 Guardando recibo en Supabase:', {
        legajo: reciboData.legajo,
        periodo: reciboData.periodo,
        nombre: reciboData.nombre,
        empresa: reciboData.data.EMPRESA,
        filename: normalizedFilename
      });

      await getSupabaseManager().createRecibo(reciboData);
      
      console.log('✅ Recibo guardado exitosamente en Supabase');
    } catch (error) {
      console.error('❌ Error guardando recibo en Supabase:', error);
      throw error;
    }

    if (debug) {
      console.log(`✅ Archivo guardado exitosamente: ${file.name}`);
    }

    return { success: true, fileName: file.name, parsedData: parsed.data };

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
// Función para enviar archivo al servidor
async function uploadFileToServer(
  file: File, 
  parsedData: Record<string, string>,
  debug: boolean = false
): Promise<{ success: boolean; error?: string; serverResponse?: any }> {
  try {
    // Normalizar nombre del archivo
    const normalizedName = normalizeFileName(file.name);
    const normalizedFile = new File([file], normalizedName, { type: file.type });
    
    if (debug) {
      console.log(`📤 Enviando archivo al servidor: ${file.name} → ${normalizedName}`);
    }

    const formData = new FormData();
    formData.append('file', normalizedFile);
    
    // Agregar metadatos del parsing
    if (parsedData.legajo) formData.append('legajo', parsedData.legajo);
    if (parsedData.periodo) formData.append('periodo', parsedData.periodo);
    if (parsedData.key) formData.append('key', parsedData.key);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      
      // Manejar archivos duplicados (409) como éxito pero omitido
      if (response.status === 409 && errorData.duplicate) {
        if (debug) {
          console.log(`⚠️ Archivo duplicado omitido: ${file.name}`, errorData);
        }
        return { 
          success: true, 
          serverResponse: errorData,
          skipped: true,
          reason: `Archivo ya existe: ${errorData.existingFile}`
        };
      }
      
      // Otros errores se manejan como fallos
      throw new Error(`Error del servidor: ${response.status} - ${errorData.error || 'Error desconocido'}`);
    }

    const serverResponse = await response.json();
    
    if (debug) {
      console.log(`✅ Archivo enviado al servidor: ${file.name}`, serverResponse);
    }

    return { success: true, serverResponse };
  } catch (error) {
    console.error(`❌ Error enviando archivo al servidor: ${file.name}`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

export async function processFiles(
  files: FileList | File[], 
  debug: boolean = false,
  learnedRules?: { empresa?: string; periodo?: string }
): Promise<SimpleProcessingResult[]> {
  const results: SimpleProcessingResult[] = [];
  
  if (debug) {
    console.log(`🔍 Procesando ${files.length} archivos...`);
  }
  
  for (const file of files) {
    const result = await processSingleFile(file, debug, learnedRules);
    
    // Si el archivo se procesó exitosamente, enviarlo al servidor
    if (result.success && result.parsedData && !result.skipped) {
      if (debug) {
        console.log(`📤 Enviando archivo al servidor: ${file.name}`);
      }
      
      const uploadResult = await uploadFileToServer(file, result.parsedData, debug);
      
      if (!uploadResult.success) {
        result.success = false;
        result.error = uploadResult.error;
      }
    } else if (debug) {
      console.log(`⏭️ No enviando archivo al servidor: ${file.name} (success: ${result.success}, parsedData: ${!!result.parsedData}, skipped: ${result.skipped})`);
    }
    
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

// Función para procesar un archivo con datos ajustados manualmente
export async function processSingleFileWithData(
  file: File, 
  adjustedData: Record<string, string>, 
  dataManager: DataManager,
  debug: boolean = false
): Promise<SimpleProcessingResult> {
  try {
    if (debug) {
      console.log(`🔍 Procesando archivo con datos ajustados: ${file.name}`);
    }

    // Generar hash del archivo
    const hash = await sha256OfFile(file);
    if (!hash) {
      return {
        success: false,
        fileName: file.name,
        error: 'Error generando hash del archivo'
      };
    }

    // Verificar duplicados
    // const existing = await repoDexie.findReceiptByHash(hash); // ELIMINADO
    const existing = null; // TODO: Implementar búsqueda por hash
    if (existing) {
      if (debug) {
        console.log(`⏭️ Archivo duplicado: ${file.name}`);
      }
      return {
        success: true,
        fileName: file.name,
        skipped: true,
        reason: 'Archivo duplicado'
      };
    }

    // Validar datos ajustados
    if (!adjustedData.LEGAJO || !adjustedData.NOMBRE || !adjustedData.PERIODO || !adjustedData.EMPRESA) {
      return {
        success: false,
        fileName: file.name,
        error: 'Datos ajustados incompletos'
      };
    }

    // Guardar en base de datos con los datos ajustados
    if (debug) {
      console.log(`💾 Guardando archivo con datos ajustados: ${file.name}`);
    }
    
    // Usar el nombre normalizado ya calculado
    if (debug && file.name !== normalizedFilename) {
      console.log(`📝 Normalizando nombre: ${file.name} → ${normalizedFilename}`);
    }
    
    // Guardar recibo ajustado en Supabase usando dataManager
    try {
      const reciboData = {
        id: `${adjustedData.LEGAJO}-${adjustedData.PERIODO}-${adjustedData.EMPRESA || ''}-${Date.now()}`,
        key: `${adjustedData.LEGAJO}-${adjustedData.PERIODO}-${adjustedData.EMPRESA || ''}`,
        legajo: adjustedData.LEGAJO,
        nombre: adjustedData.NOMBRE,
        periodo: adjustedData.PERIODO,
        archivos: [normalizedFilename],
        data: {
          ...adjustedData,
          filename: normalizedFilename,
          fileHash: hash,
          EMPRESA: adjustedData.EMPRESA || ''
        }
      };

      console.log('💾 Guardando recibo ajustado en Supabase:', {
        legajo: reciboData.legajo,
        periodo: reciboData.periodo,
        nombre: reciboData.nombre,
        empresa: reciboData.data.EMPRESA,
        filename: normalizedFilename
      });

      await getSupabaseManager().createRecibo(reciboData);
      
      console.log('✅ Recibo ajustado guardado exitosamente en Supabase');
    } catch (error) {
      console.error('❌ Error guardando recibo ajustado en Supabase:', error);
      throw error;
    }

    if (debug) {
      console.log(`✅ Archivo guardado exitosamente con datos ajustados: ${file.name}`);
    }

    return { 
      success: true, 
      fileName: file.name 
    };

  } catch (error) {
    if (debug) {
      console.error(`❌ Error procesando archivo con datos ajustados ${file.name}:`, error);
    }
    
    return {
      success: false,
      fileName: file.name,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
