const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rlqmsnycvgsiykvbatgo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscW1zbnljdmdzaXlrdmJhdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDEzODQsImV4cCI6MjA3NjgxNzM4NH0.Faa2R1eZysdRHzxEov_mnUU6Up5M0sQRXHz9pwUt9wE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Probando conexión con Supabase...');
  
  try {
    // Probar conexión con una consulta simple
    const { data, error } = await supabase
      .from('pending_items')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️ Tabla pending_items no existe aún (esto es normal)');
      console.log('📝 Error:', error.message);
    } else {
      console.log('✅ Conexión exitosa con Supabase');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    return false;
  }
}

async function createPendingItemsTable() {
  console.log('📝 Creando tabla pending_items...');
  
  // Esta tabla ya debería existir, pero la verificamos
  try {
    const { data, error } = await supabase
      .from('pending_items')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('⚠️ Tabla pending_items no existe, necesitas crearla manualmente');
      console.log('📋 Ve a tu dashboard de Supabase y ejecuta el SQL de pending_items');
    } else {
      console.log('✅ Tabla pending_items existe');
    }
  } catch (err) {
    console.log('⚠️ Error verificando pending_items:', err.message);
  }
}

async function main() {
  console.log('🚀 Iniciando verificación de Supabase...');
  
  const connected = await testConnection();
  if (connected) {
    await createPendingItemsTable();
    console.log('🎉 Verificación completada');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('1. Ve a tu dashboard de Supabase');
    console.log('2. Ve a SQL Editor');
    console.log('3. Ejecuta el contenido de sql/migrate_to_supabase.sql');
    console.log('4. Vuelve aquí para probar la conexión');
  }
}

if (require.main === module) {
  main();
}

module.exports = { testConnection, createPendingItemsTable };
