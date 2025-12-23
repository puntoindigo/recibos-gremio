// scripts/fix-saved-controls-table.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar variables de entorno desde .env.local
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixTable() {
  try {
    console.log('🔧 Fixing saved_controls table structure...');
    
    // SQL para agregar las columnas faltantes
    const sql = `
      -- Agregar columnas faltantes si no existen
      DO $$ 
      BEGIN
          -- Agregar columna filterKey si no existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'saved_controls' AND column_name = 'filterKey') THEN
              ALTER TABLE saved_controls ADD COLUMN filterKey TEXT;
          END IF;
          
          -- Agregar columna periodo si no existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'saved_controls' AND column_name = 'periodo') THEN
              ALTER TABLE saved_controls ADD COLUMN periodo TEXT;
          END IF;
          
          -- Agregar columna empresa si no existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'saved_controls' AND column_name = 'empresa') THEN
              ALTER TABLE saved_controls ADD COLUMN empresa TEXT;
          END IF;
          
          -- Agregar columna summaries si no existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'saved_controls' AND column_name = 'summaries') THEN
              ALTER TABLE saved_controls ADD COLUMN summaries JSONB;
          END IF;
      END $$;

      -- Crear índices para las nuevas columnas
      CREATE INDEX IF NOT EXISTS idx_saved_controls_filterKey ON saved_controls(filterKey);
      CREATE INDEX IF NOT EXISTS idx_saved_controls_periodo ON saved_controls(periodo);
      CREATE INDEX IF NOT EXISTS idx_saved_controls_empresa ON saved_controls(empresa);
    `;
    
    // Ejecutar el SQL usando rpc
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      return;
    }
    
    console.log('✅ saved_controls table structure fixed successfully');
    
    // Verificar la estructura actualizada
    const { data: testData, error: testError } = await supabase
      .from('saved_controls')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing table:', testError);
    } else {
      console.log('✅ Table structure verified');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixTable();
