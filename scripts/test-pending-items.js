const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPendingItems() {
  console.log('🧪 Probando tabla pending_items...');
  
  try {
    // 1. Verificar que la tabla existe
    console.log('📋 Verificando tabla...');
    const { data: existing, error: checkError } = await supabase
      .from('pending_items')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.log('❌ Error:', checkError.message);
      return;
    }
    
    console.log('✅ Tabla pending_items existe');
    
    // 2. Insertar un item de prueba
    console.log('📝 Insertando item de prueba...');
    const testItem = {
      id: 'test-' + Date.now(),
      title: 'Test Item',
      description: 'Item de prueba para verificar funcionamiento',
      category: 'test',
      priority: 'medium',
      status: 'pending',
      order: 1
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('pending_items')
      .insert(testItem)
      .select();
    
    if (insertError) {
      console.log('❌ Error insertando:', insertError.message);
      return;
    }
    
    console.log('✅ Item insertado:', inserted[0].id);
    
    // 3. Leer el item
    console.log('📖 Leyendo item...');
    const { data: read, error: readError } = await supabase
      .from('pending_items')
      .select('*')
      .eq('id', testItem.id);
    
    if (readError) {
      console.log('❌ Error leyendo:', readError.message);
    } else {
      console.log('✅ Item leído:', read[0].title);
    }
    
    // 4. Actualizar el item
    console.log('✏️ Actualizando item...');
    const { data: updated, error: updateError } = await supabase
      .from('pending_items')
      .update({ title: 'Test Item Updated' })
      .eq('id', testItem.id)
      .select();
    
    if (updateError) {
      console.log('❌ Error actualizando:', updateError.message);
    } else {
      console.log('✅ Item actualizado:', updated[0].title);
    }
    
    // 5. Eliminar el item
    console.log('🗑️ Eliminando item...');
    const { error: deleteError } = await supabase
      .from('pending_items')
      .delete()
      .eq('id', testItem.id);
    
    if (deleteError) {
      console.log('❌ Error eliminando:', deleteError.message);
    } else {
      console.log('✅ Item eliminado');
    }
    
    console.log('\n🎉 ¡Prueba completada exitosamente!');
    console.log('✅ Supabase está funcionando correctamente');
    
  } catch (err) {
    console.log('💥 Error crítico:', err.message);
  }
}

if (require.main === module) {
  testPendingItems();
}

module.exports = { testPendingItems };
