const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('🔍 Verificando tablas en Supabase...');
  
  const tables = [
    'recibos',
    'consolidated', 
    'descuentos',
    'empresas',
    'column_configs',
    'user_activities',
    'control_data',
    'backup_data',
    'app_config',
    'pending_items'
  ];
  
  for (const table of tables) {
    try {
      console.log(`📋 Verificando tabla: ${table}`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error en ${table}:`, error.message);
      } else {
        console.log(`✅ ${table}: OK (${data.length} registros encontrados)`);
      }
    } catch (err) {
      console.log(`💥 Error crítico en ${table}:`, err.message);
    }
  }
  
  console.log('\n🎉 Verificación completada!');
}

async function testInsert() {
  console.log('\n🧪 Probando inserción en pending_items...');
  
  try {
    const testItem = {
      title: 'Test Item',
      description: 'Item de prueba para verificar funcionamiento',
      category: 'test',
      priority: 'medium',
      status: 'pending',
      order: 1
    };
    
    const { data, error } = await supabase
      .from('pending_items')
      .insert(testItem)
      .select();
    
    if (error) {
      console.log('❌ Error insertando:', error.message);
    } else {
      console.log('✅ Inserción exitosa:', data[0]);
      
      // Limpiar el item de prueba
      const { error: deleteError } = await supabase
        .from('pending_items')
        .delete()
        .eq('id', data[0].id);
      
      if (deleteError) {
        console.log('⚠️ No se pudo limpiar el item de prueba');
      } else {
        console.log('🧹 Item de prueba eliminado');
      }
    }
  } catch (err) {
    console.log('💥 Error en prueba de inserción:', err.message);
  }
}

async function main() {
  await verifyTables();
  await testInsert();
}

if (require.main === module) {
  main();
}

module.exports = { verifyTables, testInsert };
