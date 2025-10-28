// scripts/test-all-sections.mjs
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

async function testAllSections() {
  console.log('🧪 Testing all sections with Supabase...\n');
  
  const sections = [
    { name: 'Consolidated Data', table: 'consolidated' },
    { name: 'Receipts', table: 'recibos' },
    { name: 'Descuentos', table: 'descuentos' },
    { name: 'Empresas', table: 'empresas' },
    { name: 'Saved Controls', table: 'saved_controls' },
    { name: 'User Activities', table: 'user_activities' },
    { name: 'Upload Sessions', table: 'upload_sessions' },
    { name: 'Control Data', table: 'control_data' },
    { name: 'Column Configs', table: 'column_configs' },
    { name: 'Pending Items', table: 'pending_items' }
  ];
  
  for (const section of sections) {
    try {
      console.log(`🔍 Testing ${section.name}...`);
      
      const { data, error, count } = await supabase
        .from(section.table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${section.name}: ${error.message}`);
      } else {
        console.log(`✅ ${section.name}: ${count || 0} records`);
      }
    } catch (error) {
      console.log(`❌ ${section.name}: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Go to http://localhost:3000');
  console.log('2. Login');
  console.log('3. Test each section manually:');
  console.log('   - Dashboard (T)');
  console.log('   - Recibos (R)');
  console.log('   - Descuentos (D)');
  console.log('   - Empleados (E)');
  console.log('   - Empresas (if enabled)');
  console.log('   - Backup (B)');
  console.log('   - Items Pendientes (P)');
  console.log('   - Documentación (0)');
  console.log('   - Configuración (S)');
  console.log('\n4. Test the Storage switch in Configuración');
}

testAllSections();
