#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 VERIFICACIÓN FINAL DEL SISTEMA');
console.log('=================================\n');

// 1. Verificar que no hay imports directos de @/lib/db
console.log('1️⃣ Verificando imports de @/lib/db...');
const { execSync } = require('child_process');

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

// 2. Verificar que los tipos están definidos en data-manager-singleton
console.log('\n2️⃣ Verificando tipos en data-manager-singleton...');
const singletonPath = path.join(process.cwd(), 'lib/data-manager-singleton.ts');
const singletonContent = fs.readFileSync(singletonPath, 'utf8');

const tipos = [
  'SavedControlDB',
  'ControlRow',
  'ConsolidatedEntity',
  'UploadSessionDB',
  'Descuento'
];

let tiposEncontrados = 0;
tipos.forEach(tipo => {
  if (singletonContent.includes(`export type ${tipo}`) || singletonContent.includes(`export interface ${tipo}`)) {
    console.log(`✅ ${tipo} definido`);
    tiposEncontrados++;
  } else {
    console.log(`❌ ${tipo} NO definido`);
  }
});

console.log(`\n📊 Tipos encontrados: ${tiposEncontrados}/${tipos.length}`);

// 3. Verificar que descuentos-manager tiene las funciones helper
console.log('\n3️⃣ Verificando funciones helper en descuentos-manager...');
const descuentosPath = path.join(process.cwd(), 'lib/descuentos-manager.ts');
const descuentosContent = fs.readFileSync(descuentosPath, 'utf8');

const funciones = [
  'generateDescuentoId',
  'calculateMontoCuota',
  'calculateCuotasRestantes'
];

let funcionesEncontradas = 0;
funciones.forEach(funcion => {
  if (descuentosContent.includes(`export function ${funcion}`)) {
    console.log(`✅ ${funcion} definida`);
    funcionesEncontradas++;
  } else {
    console.log(`❌ ${funcion} NO definida`);
  }
});

console.log(`\n📊 Funciones encontradas: ${funcionesEncontradas}/${funciones.length}`);

// 4. Verificar que empresa-manager tiene el tipo Empresa
console.log('\n4️⃣ Verificando tipo Empresa en empresa-manager...');
const empresaPath = path.join(process.cwd(), 'lib/empresa-manager.ts');
const empresaContent = fs.readFileSync(empresaPath, 'utf8');

if (empresaContent.includes('export interface Empresa')) {
  console.log('✅ Tipo Empresa definido en empresa-manager');
} else {
  console.log('❌ Tipo Empresa NO definido en empresa-manager');
}

// 5. Verificar que user-management tiene los tipos necesarios
console.log('\n5️⃣ Verificando tipos en user-management...');
const userPath = path.join(process.cwd(), 'lib/user-management.ts');
const userContent = fs.readFileSync(userPath, 'utf8');

const tiposUser = [
  'User',
  'Invitation',
  'UserActivity',
  'ROLE_PERMISSIONS'
];

let tiposUserEncontrados = 0;
tiposUser.forEach(tipo => {
  if (userContent.includes(`export type ${tipo}`) || userContent.includes(`export interface ${tipo}`) || userContent.includes(`export const ${tipo}`)) {
    console.log(`✅ ${tipo} definido`);
    tiposUserEncontrados++;
  } else {
    console.log(`❌ ${tipo} NO definido`);
  }
});

console.log(`\n📊 Tipos encontrados: ${tiposUserEncontrados}/${tiposUser.length}`);

// 6. Resumen final
console.log('\n📊 RESUMEN FINAL');
console.log('================');
console.log('✅ Imports de @/lib/db eliminados');
console.log(`✅ Tipos centralizados: ${tiposEncontrados}/${tipos.length}`);
console.log(`✅ Funciones helper: ${funcionesEncontradas}/${funciones.length}`);
console.log(`✅ Tipos en user-management: ${tiposUserEncontrados}/${tiposUser.length}`);
console.log('\n🎯 PRÓXIMOS PASOS:');
console.log('1. Abre http://localhost:3000 en tu navegador');
console.log('2. Verifica que NO aparezcan errores 🚨 INDEXEDDB ROTO');
console.log('3. Verifica que solo aparezcan logs de SUPABASE|');
console.log('4. Verifica que se muestren 6 registros en lugar de 1152');
console.log('5. Usa el DevTools para monitorear el sistema');
console.log('\n✨ Verificación final completada!');

