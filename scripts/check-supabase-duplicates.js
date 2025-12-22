const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDuplicates() {
  console.log('🔍 Verificando duplicados en Supabase...');
  
  const { data, error } = await supabase
    .from('consolidated')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('📊 Total registros en Supabase:', data.length);
  
  // Agrupar por legajo y empresa
  const grouped = {};
  data.forEach(item => {
    const key = `${item.legajo}-${item.data?.EMPRESA || 'Sin empresa'}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  // Encontrar duplicados
  const duplicates = Object.entries(grouped).filter(([key, items]) => items.length > 1);
  
  console.log('🔍 Duplicados encontrados:', duplicates.length);
  duplicates.forEach(([key, items]) => {
    console.log(`  - ${key}: ${items.length} registros`);
  });
  
  // Mostrar algunos ejemplos
  if (data.length > 0) {
    console.log('📋 Primeros 3 registros:');
    data.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i+1}. Legajo: ${item.legajo}, Empresa: ${item.data?.EMPRESA}, Creado: ${item.created_at}`);
    });
  }
  
  // Mostrar estadísticas por empresa
  const empresaStats = {};
  data.forEach(item => {
    const empresa = item.data?.EMPRESA || 'Sin empresa';
    if (!empresaStats[empresa]) {
      empresaStats[empresa] = 0;
    }
    empresaStats[empresa]++;
  });
  
  console.log('📊 Estadísticas por empresa:');
  Object.entries(empresaStats).forEach(([empresa, count]) => {
    console.log(`  - ${empresa}: ${count} registros`);
  });
}

checkDuplicates().catch(console.error);
















