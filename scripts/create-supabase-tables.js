const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

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
