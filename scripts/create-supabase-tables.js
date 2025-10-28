const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://rlqmsnycvgsiykvbatgo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscW1zbnljdmdzaXlrdmJhdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDEzODQsImV4cCI6MjA3NjgxNzM4NH0.Faa2R1eZysdRHzxEov_mnUU6Up5M0sQRXHz9pwUt9wE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('🚀 Iniciando creación de tablas en Supabase...');
  
  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'migrate_to_supabase.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir el SQL en statements individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Encontrados ${statements.length} statements SQL`);
    
    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Ejecutando statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error en statement ${i + 1}:`, error.message);
          // Continuar con el siguiente statement
        } else {
          console.log(`✅ Statement ${i + 1} ejecutado correctamente`);
        }
      }
    }
    
    console.log('🎉 ¡Creación de tablas completada!');
    
    // Verificar que las tablas se crearon
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('⚠️ No se pudo verificar las tablas creadas');
    } else {
      console.log('📋 Tablas creadas:', tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('💥 Error general:', error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createTables();
}

module.exports = { createTables };
