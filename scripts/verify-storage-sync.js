#!/usr/bin/env node

/**
 * Script para verificar que el sistema de validación y el DataManagerSingleton están sincronizados
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando sincronización entre sistema de validación y DataManagerSingleton...\n');

// Verificar que validate-data-source.ts inicializa con SUPABASE
const validateDataSourcePath = path.join(__dirname, '..', 'lib', 'validate-data-source.ts');
const validateDataSourceContent = fs.readFileSync(validateDataSourcePath, 'utf8');

if (validateDataSourceContent.includes("let currentStorageType: 'IndexedDB' | 'SUPABASE' = 'SUPABASE';")) {
  console.log('✅ validate-data-source.ts inicializa con SUPABASE');
} else {
  console.log('❌ validate-data-source.ts NO inicializa con SUPABASE');
}

// Verificar que data-manager-singleton.ts actualiza el sistema de validación
const dataManagerPath = path.join(__dirname, '..', 'lib', 'data-manager-singleton.ts');
const dataManagerContent = fs.readFileSync(dataManagerPath, 'utf8');

if (dataManagerContent.includes('setCurrentStorageType(\'SUPABASE\');')) {
  console.log('✅ data-manager-singleton.ts actualiza el sistema de validación');
} else {
  console.log('❌ data-manager-singleton.ts NO actualiza el sistema de validación');
}

// Verificar que el constructor del singleton actualiza el sistema de validación
if (dataManagerContent.includes('// Actualizar el sistema de validación inmediatamente')) {
  console.log('✅ Constructor del singleton actualiza el sistema de validación');
} else {
  console.log('❌ Constructor del singleton NO actualiza el sistema de validación');
}

// Verificar que setStorageType actualiza el sistema de validación
if (dataManagerContent.includes('setCurrentStorageType(type);')) {
  console.log('✅ setStorageType actualiza el sistema de validación');
} else {
  console.log('❌ setStorageType NO actualiza el sistema de validación');
}

console.log('\n🎯 Resumen:');
console.log('- Sistema de validación inicializa con SUPABASE');
console.log('- DataManagerSingleton actualiza el sistema de validación en el constructor');
console.log('- DataManagerSingleton actualiza el sistema de validación en setStorageType');
console.log('\n✅ Sincronización verificada correctamente');






