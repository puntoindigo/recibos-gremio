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
    // Usar el manager directamente para buscar
    const manager = getSupabaseManager();
    const allConsolidated = await manager.getConsolidated();
    
    // Buscar en los datos consolidados por filename
    const found = allConsolidated.find(item => {
      const itemFilename = item.data?.filename || item.archivos?.[0];
      return itemFilename === filename || itemFilename === normalizeFileName(filename);
    });
    
    return found || null;
  } catch (error) {
    console.error('Error en checkForDuplicateByName:', error);
    return null;
  }
}

// Función para verificar duplicados por hash
async function checkForDuplicateFile(hash: string, dataManager: any): Promise<any> {
  try {
    // Usar el manager directamente para buscar
    const manager = getSupabaseManager();
    const allConsolidated = await manager.getConsolidated();
    
    // Buscar en los datos consolidados por fileHash
    const found = allConsolidated.find(item => {
      const itemHash = item.data?.fileHash;
      return itemHash === hash;
    });
    
    return found || null;
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
    // Generar hash
    const hash = await sha256OfFile(file);
    if (!hash) {
      return { success: false, fileName: file.name, error: "Error generando hash" };
    }

    // Verificar duplicados por nombre de archivo ANTES de procesar
    const normalizedFilename = normalizeFileName(file.name);

    // Verificar si ya existe un archivo con el mismo nombre
    const existingByName = await checkForDuplicateByName(normalizedFilename, dataManager);
    if (existingByName) {
      return {
        success: true,
        fileName: file.name,
        skipped: true,
        reason: `Archivo ya existe: ${existingByName.filename || 'archivo duplicado'}`
      };
    }

    // Verificar duplicados por hash
    const existing = await checkForDuplicateFile(hash, dataManager);
    
    if (existing) {
      return { 
        success: true, 
        fileName: file.name, 
        skipped: true, 
        reason: `Archivo duplicado: ${existing.filename || 'archivo duplicado'}` 
      };
    }

    // Parsear PDF
    if (debug) {
    }
    const parsed = await parsePdfReceiptToRecord(file, debug);
    
    // Aplicar reglas aprendidas si están disponibles
    if (learnedRules) {
      if (learnedRules.empresa && (!parsed.data.EMPRESA || parsed.data.EMPRESA === 'DESCONOCIDA')) {
        parsed.data.EMPRESA = learnedRules.empresa;
        if (debug) {
        }
      }
      if (learnedRules.periodo && (!parsed.data.PERIODO || parsed.data.PERIODO === 'FALTANTE')) {
        parsed.data.PERIODO = learnedRules.periodo;
        if (debug) {
        }
      }
    }
    
    // Aplicar reglas de reemplazo por empresa si existen
    if (parsed.data.EMPRESA && typeof window === 'undefined') {
      try {
        const manager = getSupabaseManager();
        const replacementRules = await manager.getAppConfig(`ocr_replacements_${parsed.data.EMPRESA}`);
        if (replacementRules && typeof replacementRules === 'object' && Array.isArray(replacementRules.rules)) {
          for (const rule of replacementRules.rules) {
            if (rule.fieldName && rule.from && rule.to && parsed.data[rule.fieldName]) {
              const currentValue = parsed.data[rule.fieldName];
              // Aplicar reemplazo (case-insensitive)
              const regex = new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              if (regex.test(currentValue)) {
                parsed.data[rule.fieldName] = currentValue.replace(regex, rule.to);
                if (debug) {
                  console.log(`  🔄 Reemplazo aplicado en parsing: "${rule.from}" -> "${rule.to}" en ${rule.fieldName}`);
                }
              }
            }
          }
        }
      } catch (replacementError) {
        // Si falla cargar reglas de reemplazo, continuar sin ellas
        if (debug) {
          console.log(`  ⚠️ No se pudieron cargar reglas de reemplazo: ${replacementError instanceof Error ? replacementError.message : String(replacementError)}`);
        }
      }
    }
    
    if (debug) {
    }
    
    // Verificar si debe guardarse
    if (parsed.data.GUARDAR === 'false') {
      if (debug) {
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
    }
    
    if (!empresa || empresa === 'DESCONOCIDA' || empresa === 'N/A') {
      if (debug) {
      }
      return { 
        success: true, 
        fileName: file.name, 
        skipped: true, 
        reason: `Empresa no detectada (${empresa})`,
        needsEmpresaInput: true, // Flag para indicar que necesita input manual
        missingFields: ['EMPRESA'],
        hasAllRequiredFields: false
      };
    }
    
    // Si la empresa es LIMPAR (fallback), procesar normalmente sin marcar como needsEmpresaInput
    if (empresa === 'LIMPAR') {
      if (debug) {
      }
    }

    // Verificar campos obligatorios: legajo, empresa, DNI/CUIL, nombre, categoria
    const legajo = parsed.data.LEGAJO || '';
    const nombre = parsed.data.NOMBRE || '';
    const periodo = parsed.data.PERIODO || '';
    const cuil = parsed.data.CUIL || parsed.data.DNI || '';
    const categoria = parsed.data.CATEGORIA || parsed.data.CATEGORÍA || '';
    
    // Determinar qué campos faltan
    const missingFields: string[] = [];
    if (!legajo.trim()) missingFields.push('LEGAJO');
    if (!empresa.trim() || empresa === 'DESCONOCIDA' || empresa === 'N/A') missingFields.push('EMPRESA');
    if (!cuil.trim()) missingFields.push('CUIL/DNI');
    if (!nombre.trim()) missingFields.push('NOMBRE');
    if (!categoria.trim()) missingFields.push('CATEGORIA');
    
    // Si faltan campos obligatorios, marcar como incompleto
    const hasAllRequiredFields = missingFields.length === 0;
    
    if (!legajo || !nombre || !periodo) {
      if (debug) {
      }
      return {
        success: true,
        fileName: file.name,
        skipped: true,
        reason: `Datos incompletos - campos faltantes: ${missingFields.join(', ')}`,
        needsParserAdjustment: true,
        parsedData: parsed.data,
        missingFields,
        hasAllRequiredFields: false
      };
    }
    
    // Si falta CUIL/DNI o EMPRESA pero tiene legajo y nombre, marcar como incompleto pero permitir guardar
    if (!hasAllRequiredFields) {
      if (debug) {
      }
      // Continuar con el guardado pero marcar como incompleto
    }

    // Guardar en base de datos
    if (debug) {
    }
    
    // Usar el nombre normalizado ya calculado
    
    // Guardar recibo en Supabase usando dataManager
    try {
      // Según el schema SQL, recibos solo tiene: id, key, legajo, nombre, periodo, archivos, data
      // NO tiene empresa, filename, ni cuil como columnas separadas - todo va en data
      const reciboData = {
        id: `${parsed.data.LEGAJO || ''}-${parsed.data.PERIODO || ''}-${parsed.data.EMPRESA || ''}-${Date.now()}`,
        key: `${parsed.data.LEGAJO || ''}-${parsed.data.PERIODO || ''}-${parsed.data.EMPRESA || ''}`,
        legajo: parsed.data.LEGAJO || '',
        nombre: parsed.data.NOMBRE || '',
        periodo: parsed.data.PERIODO || '',
        archivos: [normalizedFilename], // JSONB array
        data: {
          ...parsed.data,
          filename: normalizedFilename,
          fileHash: hash,
          EMPRESA: parsed.data.EMPRESA || '',
          CUIL: parsed.data.CUIL || '',
          empresa: parsed.data.EMPRESA || '' // También dentro de data para compatibilidad
        }
      };

      const createdRecibo = await getSupabaseManager().createRecibo(reciboData);
      
      // También crear el registro consolidado
      try {
        const consolidatedData = {
          id: `${parsed.data.LEGAJO || ''}-${parsed.data.PERIODO || ''}-${parsed.data.EMPRESA || ''}`,
          key: `${parsed.data.LEGAJO || ''}-${parsed.data.PERIODO || ''}-${parsed.data.EMPRESA || ''}`,
          legajo: parsed.data.LEGAJO || '',
          nombre: parsed.data.NOMBRE || '',
          periodo: parsed.data.PERIODO || '',
          cuil: parsed.data.CUIL || '',
          cuil_norm: parsed.data.CUIL_NORM || '',
          archivos: [normalizedFilename], // IMPORTANTE: Incluir archivos en consolidated también
          data: {
            ...parsed.data,
            filename: normalizedFilename,
            fileHash: hash,
            // Marcar si tiene todos los campos obligatorios
            _hasAllRequiredFields: hasAllRequiredFields,
            _missingFields: missingFields
          }
        };
        
        const createdConsolidated = await getSupabaseManager().createConsolidated(consolidatedData);
        
        // Aplicar reglas OCR automáticamente si hay una regla guardada para esta empresa
        if (parsed.data.EMPRESA && typeof window === 'undefined') {
          // Solo aplicar en el servidor (Node.js), no en el cliente
          try {
            const { applyOCRRulesToReceipt } = await import('./apply-ocr-rules');
            const extractedValues = await applyOCRRulesToReceipt(
              parsed.data.EMPRESA,
              normalizedFilename,
              consolidatedData.key
            );
            
            // Los logs de OCR se muestran en el servidor (terminal)
            // Los valores extraídos se guardan en la BD y se verán en la tabla
          } catch (ocrError) {
            // No fallar si la aplicación de OCR falla - es opcional
            const errorMsg = ocrError instanceof Error ? ocrError.message : String(ocrError);
            console.log(`⚠️ OCR: Error aplicando regla a ${file.name} - ${errorMsg}`);
          }
        }
      } catch (consolidatedError) {
        // No fallar si el consolidado falla, puede que ya exista
      }
    } catch (error) {
      throw error;
    }

    return { 
      success: true, 
      fileName: file.name, 
      parsedData: parsed.data,
      missingFields,
      hasAllRequiredFields
    };

  } catch (error) {
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
    
    // Normalizar el nombre del archivo
    const normalizedFilename = normalizeFileName(file.name);
    
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
