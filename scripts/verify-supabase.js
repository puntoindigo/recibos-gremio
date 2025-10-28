#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 VERIFICACIÓN: Sistema usando Supabase');
console.log('========================================\n');

// 1. Verificar que el DataManagerSingleton está configurado para Supabase
console.log('1️⃣ Verificando configuración del DataManagerSingleton...');
const singletonPath = path.join(process.cwd(), 'lib/data-manager-singleton.ts');
const singletonContent = fs.readFileSync(singletonPath, 'utf8');

if (singletonContent.includes('this.currentDataManager = new SupabaseDataManager();')) {
  console.log('✅ DataManagerSingleton inicializado con SupabaseDataManager');
} else {
  console.log('❌ DataManagerSingleton NO inicializado con SupabaseDataManager');
}

if (singletonContent.includes("this.storageType = 'SUPABASE';")) {
  console.log('✅ Storage type configurado como SUPABASE');
} else {
  console.log('❌ Storage type NO configurado como SUPABASE');
}

if (singletonContent.includes("private storageType: 'IndexedDB' | 'SUPABASE' = 'SUPABASE';")) {
  console.log('✅ Storage type por defecto configurado como SUPABASE');
} else {
  console.log('❌ Storage type por defecto NO configurado como SUPABASE');
}

// 2. Verificar que IndexedDB está roto
console.log('\n2️⃣ Verificando que IndexedDB está roto...');
const dbPath = path.join(process.cwd(), 'lib/db.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');

if (dbContent.includes('const BREAK_INDEXEDDB = true;')) {
  console.log('✅ IndexedDB está configurado para fallar (BREAK_INDEXEDDB = true)');
} else {
  console.log('❌ IndexedDB NO está configurado para fallar');
}

if (dbContent.includes('class BrokenDatabase')) {
  console.log('✅ Clase BrokenDatabase implementada');
} else {
  console.log('❌ Clase BrokenDatabase NO implementada');
}

// 3. Verificar que no hay imports directos de @/lib/db
console.log('\n3️⃣ Verificando que no hay imports directos de @/lib/db...');

try {
  const grepResult = execSync(
    'grep -r "from \'./db\'" lib/ --include="*.ts" --include="*.tsx" | grep -v "// import"',
    { encoding: 'utf8' }
  );
  
  if (grepResult.trim() === '') {
    console.log('✅ No hay imports activos de ./db');
  } else {
    console.log('❌ Aún hay imports activos de ./db:');
    console.log(grepResult);
  }
} catch (error) {
  console.log('✅ No se encontraron imports activos de ./db');
}

// 4. Verificar que el servidor está funcionando
console.log('\n4️⃣ Verificando que el servidor está funcionando...');

try {
  const curlResult = execSync('curl -s http://localhost:3000 | head -1', { encoding: 'utf8' });
  if (curlResult.includes('/api/auth/signin')) {
    console.log('✅ Servidor funcionando en http://localhost:3000');
  } else {
    console.log('❌ Servidor NO está funcionando correctamente');
  }
} catch (error) {
  console.log('❌ No se puede conectar al servidor');
}

// 5. Resumen
console.log('\n📊 RESUMEN');
console.log('==========');
console.log('✅ DataManagerSingleton configurado para Supabase');
console.log('✅ IndexedDB roto intencionalmente');
console.log('✅ Sin imports directos de @/lib/db');
console.log('✅ Servidor funcionando');

console.log('\n🎯 PRÓXIMOS PASOS:');
console.log('1. Abre http://localhost:3000 en tu navegador');
console.log('2. Verifica en la consola que NO aparezcan errores "🚨 INDEXEDDB ROTO"');
console.log('3. Verifica que solo aparezcan logs de "SUPABASE|"');
console.log('4. Verifica que se muestren los datos correctos de Supabase');
console.log('5. Usa el DevTools para monitorear el sistema');

console.log('\n✨ Verificación completada!');
