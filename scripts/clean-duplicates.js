#!/usr/bin/env node

/**
 * Script para eliminar registros duplicados de Supabase
 * Elimina registros con la misma combinación de legajo, período y empresa
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicates() {
  console.log('🔍 Buscando registros duplicados...');
  
  try {
    // Obtener todos los registros consolidados
    const { data: allRecords, error: fetchError } = await supabase
      .from('consolidated')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error al obtener registros:', fetchError);
      return;
    }

    console.log(`📊 Total de registros encontrados: ${allRecords.length}`);

    // Agrupar por clave única (legajo-periodo-empresa)
    const groupedRecords = {};
    const duplicates = [];

    allRecords.forEach(record => {
      const key = `${record.legajo}-${record.periodo}-${record.empresa}`;
      
      if (!groupedRecords[key]) {
        groupedRecords[key] = [];
      }
      
      groupedRecords[key].push(record);
    });

    // Identificar duplicados
    Object.entries(groupedRecords).forEach(([key, records]) => {
      if (records.length > 1) {
        console.log(`🔍 Clave duplicada encontrada: ${key} (${records.length} registros)`);
        duplicates.push({ key, records });
      }
    });

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron registros duplicados');
      return;
    }

    console.log(`\n🗑️ Eliminando ${duplicates.length} grupos de duplicados...`);

    // Eliminar duplicados (mantener solo el más reciente)
    for (const { key, records } of duplicates) {
      console.log(`\n🔧 Procesando clave: ${key}`);
      
      // Ordenar por fecha de creación (más reciente primero)
      const sortedRecords = records.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      // Mantener el más reciente, eliminar el resto
      const toDelete = sortedRecords.slice(1);
      
      console.log(`   📝 Manteniendo: ${sortedRecords[0].id} (${sortedRecords[0].created_at})`);
      console.log(`   🗑️ Eliminando: ${toDelete.length} registros`);

      for (const record of toDelete) {
        const { error: deleteError } = await supabase
          .from('consolidated')
          .delete()
          .eq('id', record.id);

        if (deleteError) {
          console.error(`   ❌ Error al eliminar ${record.id}:`, deleteError);
        } else {
          console.log(`   ✅ Eliminado: ${record.id}`);
        }
      }
    }

    console.log('\n🎉 Limpieza de duplicados completada');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanDuplicates()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { cleanDuplicates };















