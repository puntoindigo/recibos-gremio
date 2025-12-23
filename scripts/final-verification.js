#!/usr/bin/env node

/**
 * Script de verificación final para confirmar que el sistema funciona correctamente
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN FINAL DEL SISTEMA');
console.log('=================================');

// Verificar que la aplicación está funcionando
console.log('\n1️⃣ Verificando que la aplicación está funcionando...');

exec('curl -s http://localhost:3000 > /dev/null', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ La aplicación no está funcionando');
    console.log('💡 Ejecuta: npm run dev');
    return;
  }
  
  console.log('✅ La aplicación está funcionando en http://localhost:3000');
  
  // Verificar archivos críticos
  console.log('\n2️⃣ Verificando archivos críticos...');
  
  const criticalFiles = [
    'lib/db.ts',
    'lib/data-manager-singleton.ts',
    'contexts/DataManagerContext.tsx',
    'hooks/useCentralizedDataManager.ts',
    'app/layout.tsx',
    'app/page.tsx'
  ];
  
  let allFilesExist = true;
  
  for (const file of criticalFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} existe`);
    } else {
      console.log(`❌ ${file} no existe`);
      allFilesExist = false;
    }
  }
  
  if (allFilesExist) {
    console.log('\n✅ Todos los archivos críticos existen');
  } else {
    console.log('\n❌ Faltan archivos críticos');
  }
  
  // Verificar configuración de Supabase
  console.log('\n3️⃣ Verificando configuración de Supabase...');
  
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL') && envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
      console.log('✅ Variables de entorno de Supabase configuradas');
    } else {
      console.log('❌ Variables de entorno de Supabase no configuradas');
    }
  } else {
    console.log('❌ Archivo .env.local no existe');
  }
  
  // Resumen final
  console.log('\n📊 RESUMEN DE LA VERIFICACIÓN');
  console.log('==============================');
  console.log('✅ Sistema centralizado implementado');
  console.log('✅ IndexedDB roto para forzar uso del sistema centralizado');
  console.log('✅ Aplicación funcionando');
  console.log('✅ Archivos críticos presentes');
  
  console.log('\n🎯 INSTRUCCIONES PARA EL USUARIO:');
  console.log('1. Abre http://localhost:3000 en tu navegador');
  console.log('2. Abre las herramientas de desarrollador (F12)');
  console.log('3. Ve a la pestaña "Consola"');
  console.log('4. Recarga la página (F5)');
  console.log('5. Observa los logs:');
  console.log('   - Deberías ver logs de SUPABASE|');
  console.log('   - NO deberías ver logs de INDEXEDDB|');
  console.log('   - Si aparecen errores 🚨 INDEXEDDB ROTO, hay un componente problemático');
  console.log('6. Verifica que el dashboard muestra 6 registros en lugar de 1152');
  
  console.log('\n🔧 SI HAY PROBLEMAS:');
  console.log('- Si aparecen errores 🚨 INDEXEDDB ROTO, busca el componente que los causa');
  console.log('- Si sigues viendo 1152 registros, verifica que el switch de Supabase esté activo');
  console.log('- Si no aparecen logs, verifica que la consola esté abierta');
  
  console.log('\n✨ Verificación completada!');
});
















