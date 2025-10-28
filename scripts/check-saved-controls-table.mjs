// scripts/check-saved-controls-table.mjs
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

async function checkTable() {
  try {
    console.log('🔍 Checking saved_controls table structure...');
    
    // Intentar obtener la estructura de la tabla
    const { data, error } = await supabase
      .from('saved_controls')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing saved_controls table:', error);
      return;
    }
    
    console.log('✅ saved_controls table exists');
    console.log('📊 Sample data:', data);
    
    // Verificar si hay datos
    const { count, error: countError } = await supabase
      .from('saved_controls')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting records:', countError);
    } else {
      console.log(`📈 Total records in saved_controls: ${count}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTable();
