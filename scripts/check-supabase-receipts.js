// scripts/check-supabase-receipts.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkReceipts() {
  try {
    console.log('🔍 Verificando recibos en Supabase...');
    
    // Verificar tabla recibos
    const { data: recibos, error: recibosError } = await supabase
      .from('recibos')
      .select('*')
      .order('created_at', { ascending: false });

    if (recibosError) {
      console.error('❌ Error consultando recibos:', recibosError);
      return;
    }

    console.log('📊 Recibos en Supabase:');
    console.log(`  Total: ${recibos.length}`);
    
    if (recibos.length > 0) {
      console.log('  Últimos 3 recibos:');
      recibos.slice(0, 3).forEach((recibo, index) => {
        console.log(`    ${index + 1}. ${recibo.nombre} (${recibo.legajo}) - ${recibo.periodo} - ${recibo.data?.EMPRESA || 'Sin empresa'}`);
      });
    }

    // Verificar tabla consolidated
    const { data: consolidated, error: consolidatedError } = await supabase
      .from('consolidated')
      .select('*')
      .order('created_at', { ascending: false });

    if (consolidatedError) {
      console.error('❌ Error consultando consolidated:', consolidatedError);
      return;
    }

    console.log('\n📊 Consolidated en Supabase:');
    console.log(`  Total: ${consolidated.length}`);
    
    if (consolidated.length > 0) {
      console.log('  Últimos 3 consolidated:');
      consolidated.slice(0, 3).forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.nombre} (${item.legajo}) - ${item.periodo} - ${item.data?.EMPRESA || 'Sin empresa'}`);
      });
    }

    // Comparar
    console.log('\n🔍 Análisis:');
    console.log(`  Recibos: ${recibos.length}`);
    console.log(`  Consolidated: ${consolidated.length}`);
    
    if (recibos.length > consolidated.length) {
      console.log('  ⚠️  Hay más recibos que consolidated - posible problema de sincronización');
    } else if (recibos.length === consolidated.length) {
      console.log('  ✅ Números coinciden');
    } else {
      console.log('  ⚠️  Hay más consolidated que recibos - posible duplicación');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkReceipts();
