// scripts/extract-categoria-from-existing.js
// Script para extraer CATEGORIA de los PDFs de recibos existentes y actualizar los registros en Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Directorio donde se almacenan los PDFs
const RECIBOS_DIR = path.join(process.cwd(), 'public/recibos');

// Función para extraer CATEGORIA del texto del PDF usando los mismos patrones que los parsers
function extractCategoriaFromText(rawText) {
  const categoriaPatterns = [
    /Categoría\s*:?\s*([A-ZÁÉÍÓÚÑ\s\d\-]+)/i,
    /CATEGORIA\s*:?\s*([A-ZÁÉÍÓÚÑ\s\d\-]+)/i,
    /Categoría\s+([A-ZÁÉÍÓÚÑ\s\d\-]+?)(?:\s|$)/i,
    /CATEGORIA\s+([A-ZÁÉÍÓÚÑ\s\d\-]+?)(?:\s|$)/i
  ];
  
  for (const pattern of categoriaPatterns) {
    const categoriaMatch = rawText.match(pattern);
    if (categoriaMatch) {
      const categoria = categoriaMatch[1].trim();
      if (categoria && categoria.length > 0 && !categoria.match(/^[\s\-]+$/)) {
        return categoria;
      }
    }
  }
  
  return null;
}

// Función para extraer texto de un PDF usando pdf-parse
async function extractTextFromPdf(filePath) {
  try {
    // Importar pdf-parse dinámicamente
    const pdfParse = require('pdf-parse');
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`  ❌ Error leyendo PDF ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

// Función para procesar un registro consolidado
async function processRecord(record, index, total) {
  console.log(`\n[${index + 1}/${total}] Procesando: ${record.nombre} (${record.legajo}) - ${record.periodo}`);
  
  // Verificar si ya tiene CATEGORIA
  if (record.data?.CATEGORIA && record.data.CATEGORIA.trim() !== '' && record.data.CATEGORIA !== 'Sin categoría') {
    console.log(`  ⏭️  Ya tiene CATEGORIA: "${record.data.CATEGORIA}" - Saltando`);
    return { success: false, reason: 'ya_tiene_categoria', categoria: record.data.CATEGORIA };
  }
  
  // Obtener archivos asociados
  const archivos = record.archivos || [];
  if (archivos.length === 0) {
    console.log(`  ⚠️  No tiene archivos asociados`);
    return { success: false, reason: 'sin_archivos' };
  }
  
  // Intentar con cada archivo hasta encontrar CATEGORIA
  for (const archivoNombre of archivos) {
    const filePath = path.join(RECIBOS_DIR, archivoNombre);
    
    try {
      // Verificar que el archivo existe
      await fs.access(filePath);
      
      console.log(`  📄 Procesando archivo: ${archivoNombre}`);
      
      // Extraer texto del PDF
      const textoPdf = await extractTextFromPdf(filePath);
      if (!textoPdf) {
        continue;
      }
      
      // Extraer CATEGORIA del texto
      const categoria = extractCategoriaFromText(textoPdf);
      
      if (categoria) {
        console.log(`  ✅ CATEGORIA encontrada: "${categoria}"`);
        
        // Actualizar el registro en Supabase
        const nuevoData = {
          ...record.data,
          CATEGORIA: categoria
        };
        
        const { error } = await supabase
          .from('consolidated')
          .update({ 
            data: nuevoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id);
        
        if (error) {
          console.error(`  ❌ Error actualizando registro:`, error.message);
          return { success: false, reason: 'error_actualizacion', error: error.message };
        }
        
        console.log(`  ✅ Registro actualizado exitosamente`);
        return { success: true, categoria, archivo: archivoNombre };
      } else {
        console.log(`  ⚠️  No se encontró CATEGORIA en este archivo`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`  ⚠️  Archivo no encontrado: ${archivoNombre}`);
      } else {
        console.error(`  ❌ Error procesando archivo ${archivoNombre}:`, error.message);
      }
    }
  }
  
  return { success: false, reason: 'categoria_no_encontrada' };
}

// Función principal
async function main() {
  console.log('🚀 Iniciando extracción de CATEGORIA de recibos existentes...\n');
  
  try {
    // Verificar que el directorio de recibos existe
    try {
      await fs.access(RECIBOS_DIR);
    } catch {
      console.error(`❌ Directorio de recibos no encontrado: ${RECIBOS_DIR}`);
      process.exit(1);
    }
    
  // Obtener todos los registros consolidados
  console.log('📊 Obteniendo registros consolidados de Supabase...');
  const { data: records, error } = await supabase
    .from('consolidated')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error obteniendo registros:', error);
    process.exit(1);
  }
  
  console.log(`✅ Se encontraron ${records.length} registros consolidados\n`);
  
  // También obtener recibos para mapear archivos
  console.log('📊 Obteniendo recibos de Supabase...');
  const { data: recibos, error: recibosError } = await supabase
    .from('recibos')
    .select('*');
  
  if (recibosError) {
    console.error('⚠️  Error obteniendo recibos:', recibosError);
  } else {
    console.log(`✅ Se encontraron ${recibos.length} recibos\n`);
    
    // Crear mapa de archivos por legajo+periodo
    const archivosMap = new Map();
    recibos.forEach(recibo => {
      const key = `${recibo.legajo}||${recibo.periodo}`;
      if (recibo.archivos && Array.isArray(recibo.archivos)) {
        if (!archivosMap.has(key)) {
          archivosMap.set(key, []);
        }
        archivosMap.get(key).push(...recibo.archivos);
      }
    });
    
    // Agregar archivos a los registros consolidados si no los tienen
    records.forEach(record => {
      const key = `${record.legajo}||${record.periodo}`;
      if (archivosMap.has(key) && (!record.archivos || record.archivos.length === 0)) {
        record.archivos = [...new Set(archivosMap.get(key))]; // Eliminar duplicados
      }
    });
  }
  
  console.log(`📊 Procesando ${records.length} registros...\n`);
    
    // Estadísticas
    const stats = {
      total: records.length,
      procesados: 0,
      exitosos: 0,
      ya_tienen_categoria: 0,
      sin_archivos: 0,
      categoria_no_encontrada: 0,
      errores: 0
    };
    
    const detalles = {
      exitosos: [],
      ya_tienen_categoria: [],
      sin_archivos: [],
      categoria_no_encontrada: [],
      errores: []
    };
    
    // Procesar cada registro
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const resultado = await processRecord(record, i, records.length);
      
      stats.procesados++;
      
      if (resultado.success) {
        stats.exitosos++;
        detalles.exitosos.push({
          legajo: record.legajo,
          nombre: record.nombre,
          periodo: record.periodo,
          categoria: resultado.categoria,
          archivo: resultado.archivo
        });
      } else {
        switch (resultado.reason) {
          case 'ya_tiene_categoria':
            stats.ya_tienen_categoria++;
            detalles.ya_tienen_categoria.push({
              legajo: record.legajo,
              nombre: record.nombre,
              periodo: record.periodo,
              categoria_existente: resultado.categoria
            });
            break;
          case 'sin_archivos':
            stats.sin_archivos++;
            detalles.sin_archivos.push({
              legajo: record.legajo,
              nombre: record.nombre,
              periodo: record.periodo
            });
            break;
          case 'categoria_no_encontrada':
            stats.categoria_no_encontrada++;
            detalles.categoria_no_encontrada.push({
              legajo: record.legajo,
              nombre: record.nombre,
              periodo: record.periodo
            });
            break;
          case 'error_actualizacion':
            stats.errores++;
            detalles.errores.push({
              legajo: record.legajo,
              nombre: record.nombre,
              periodo: record.periodo,
              error: resultado.error
            });
            break;
        }
      }
      
      // Pequeña pausa para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Mostrar resumen
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE PROCESAMIENTO');
    console.log('='.repeat(60));
    console.log(`Total de registros: ${stats.total}`);
    console.log(`✅ Exitosos (CATEGORIA extraída y guardada): ${stats.exitosos}`);
    console.log(`⏭️  Ya tenían CATEGORIA: ${stats.ya_tienen_categoria}`);
    console.log(`⚠️  Sin archivos asociados: ${stats.sin_archivos}`);
    console.log(`❌ CATEGORIA no encontrada en PDFs: ${stats.categoria_no_encontrada}`);
    console.log(`💥 Errores: ${stats.errores}`);
    console.log('='.repeat(60));
    
    // Mostrar detalles de los que no se pudieron procesar
    if (detalles.categoria_no_encontrada.length > 0) {
      console.log('\n❌ Registros donde NO se encontró CATEGORIA:');
      detalles.categoria_no_encontrada.slice(0, 10).forEach(item => {
        console.log(`  - ${item.nombre} (${item.legajo}) - ${item.periodo}`);
      });
      if (detalles.categoria_no_encontrada.length > 10) {
        console.log(`  ... y ${detalles.categoria_no_encontrada.length - 10} más`);
      }
    }
    
    if (detalles.sin_archivos.length > 0) {
      console.log('\n⚠️  Registros sin archivos asociados:');
      detalles.sin_archivos.slice(0, 10).forEach(item => {
        console.log(`  - ${item.nombre} (${item.legajo}) - ${item.periodo}`);
      });
      if (detalles.sin_archivos.length > 10) {
        console.log(`  ... y ${detalles.sin_archivos.length - 10} más`);
      }
    }
    
    if (detalles.errores.length > 0) {
      console.log('\n💥 Registros con errores:');
      detalles.errores.forEach(item => {
        console.log(`  - ${item.nombre} (${item.legajo}) - ${item.periodo}: ${item.error}`);
      });
    }
    
    console.log('\n✅ Proceso completado!\n');
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar
main();

