// scripts/test-saved-controls-structure.mjs
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

async function testStructure() {
  try {
    console.log('🔍 Testing saved_controls table structure...');
    
    // Intentar insertar un registro de prueba con diferentes estructuras
    const testRecord = {
      id: 'test-' + Date.now(),
      filterKey: 'test-filter',
      periodo: '2024-01',
      empresa: 'Test Company',
      summaries: { test: 'data' }
    };
    
    console.log('📝 Attempting to insert test record:', testRecord);
    
    const { data, error } = await supabase
      .from('saved_controls')
      .insert([testRecord])
      .select();
    
    if (error) {
      console.error('❌ Error inserting test record:', error);
      console.log('📋 Error details:', JSON.stringify(error, null, 2));
      
      // Si el error es por columnas faltantes, mostrar qué columnas existen
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('🔍 This suggests the table structure is different than expected');
        console.log('💡 You need to run the SQL script in Supabase SQL Editor');
      }
    } else {
      console.log('✅ Test record inserted successfully:', data);
      
      // Limpiar el registro de prueba
      await supabase
        .from('saved_controls')
        .delete()
        .eq('id', testRecord.id);
      
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testStructure();
