// test-supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('🔍 Probando conectividad con Supabase...');
  
  try {
    // Probar conexión básica
    const { data, error } = await supabase
      .from('consolidated')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error al conectar con Supabase:', error);
      console.log('💡 Posibles soluciones:');
      console.log('1. Verifica que las tablas estén creadas ejecutando el script SQL en Supabase');
      console.log('2. Verifica que las credenciales sean correctas');
      console.log('3. Verifica que las políticas RLS permitan acceso');
      return;
    }
    
    console.log('✅ Conexión exitosa con Supabase');
    console.log('📊 Conteo de registros en consolidated:', data);
    
    // Probar inserción de un registro de prueba
    const testData = {
      key: 'test||2024-01||TEST',
      legajo: 'test',
      periodo: '2024-01',
      nombre: 'Test User',
      cuil: '20-12345678-9',
      cuil_norm: '20123456789',
      archivos: ['test.pdf'],
      data: { test: 'value' }
    };
    
    const { error: insertError } = await supabase
      .from('consolidated')
      .insert(testData);
    
    if (insertError) {
      console.error('❌ Error al insertar datos de prueba:', insertError);
    } else {
      console.log('✅ Inserción de prueba exitosa');
      
      // Limpiar datos de prueba
      const { error: deleteError } = await supabase
        .from('consolidated')
        .delete()
        .eq('key', 'test||2024-01||TEST');
      
      if (deleteError) {
        console.error('⚠️ Error al limpiar datos de prueba:', deleteError);
      } else {
        console.log('✅ Limpieza de datos de prueba exitosa');
      }
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

testSupabase();
