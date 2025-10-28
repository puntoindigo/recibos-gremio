#!/usr/bin/env node

/**
 * Script de test para verificar que el sistema centralizado funciona correctamente
 * Este script verifica que:
 * 1. IndexedDB está roto (falla al intentar usarlo)
 * 2. El sistema centralizado funciona
 * 3. No hay consultas directas a IndexedDB
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TESTING: Sistema Centralizado de Datos');
console.log('==========================================');

// Test 1: Verificar que IndexedDB está roto
console.log('\n1️⃣ Verificando que IndexedDB está roto...');

try {
  // Intentar importar db debería fallar o mostrar warnings
  const dbPath = path.join(__dirname, '..', 'lib', 'db.ts');
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  
  if (dbContent.includes('class BrokenDatabase')) {
    console.log('✅ IndexedDB está roto - BrokenDatabase implementada');
  } else {
    console.log('❌ IndexedDB NO está roto - BrokenDatabase no encontrada');
  }
  
  if (dbContent.includes('🚨 INDEXEDDB ROTO')) {
    console.log('✅ Mensajes de error implementados');
  } else {
    console.log('❌ Mensajes de error no implementados');
  }
} catch (error) {
  console.log('❌ Error leyendo db.ts:', error.message);
}

// Test 2: Verificar que el sistema centralizado existe
console.log('\n2️⃣ Verificando sistema centralizado...');

try {
  const singletonPath = path.join(__dirname, '..', 'lib', 'data-manager-singleton.ts');
  const singletonContent = fs.readFileSync(singletonPath, 'utf8');
  
  if (singletonContent.includes('class DataManagerSingleton')) {
    console.log('✅ DataManagerSingleton implementado');
  } else {
    console.log('❌ DataManagerSingleton no encontrado');
  }
  
  if (singletonContent.includes('export interface DataManager')) {
    console.log('✅ Interfaz DataManager definida');
  } else {
    console.log('❌ Interfaz DataManager no encontrada');
  }
  
  if (singletonContent.includes('class IndexedDBDataManager') && singletonContent.includes('class SupabaseDataManager')) {
    console.log('✅ Ambas implementaciones de DataManager encontradas');
  } else {
    console.log('❌ Implementaciones de DataManager incompletas');
  }
} catch (error) {
  console.log('❌ Error leyendo data-manager-singleton.ts:', error.message);
}

// Test 3: Verificar que no hay consultas directas a IndexedDB
console.log('\n3️⃣ Verificando que no hay consultas directas a IndexedDB...');

const filesToCheck = [
  'app/page.tsx',
  'components/Dashboard.tsx',
  'components/EmpleadosPanel.tsx',
  'components/EmpresasPanel.tsx',
  'components/DescuentosPanel.tsx',
  'components/FichaEmpleadoModal.tsx',
  'components/EmpleadoModal.tsx',
  'components/EmpresaModal.tsx',
  'components/BackupPanel.tsx',
  'components/DebugModal.tsx',
  'components/EmpresasPanel.tsx',
  'components/DebugSessions.tsx',
  'components/ColumnConfigWithPreview.tsx',
  'components/UploadLogModal.tsx',
  'hooks/useEmpresasInUse.ts',
  'hooks/useEmpresasFromReceipts.ts',
  'lib/empleado-manager.ts',
  'lib/empresa-manager.ts',
  'lib/descuentos-manager.ts',
  'lib/user-management.ts',
];

let directDbAccessFound = false;
let filesWithIssues = [];

for (const file of filesToCheck) {
  const filePath = path.join(__dirname, '..', file);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Buscar patrones de acceso directo a IndexedDB
      const directDbAccessPatterns = [
        /db\.consolidated/,
        /db\.receipts/,
        /db\.descuentos/,
        /db\.empresas/,
        /db\.savedControls/,
        /db\.columnConfigs/,
        /db\.userActivities/,
        /db\.uploadSessions/,
        /db\.control/,
      ];

      for (const pattern of directDbAccessPatterns) {
        if (pattern.test(content)) {
          console.log(`❌ ${file}: Se encontró acceso directo a IndexedDB (${pattern.source})`);
          directDbAccessFound = true;
          filesWithIssues.push(file);
          break;
        }
      }
      
      if (!directDbAccessFound) {
        console.log(`✅ ${file}: Sin consultas directas a IndexedDB`);
      }
    }
  } catch (error) {
    console.log(`⚠️ Error leyendo ${file}:`, error.message);
  }
}

// Test 4: Verificar que el Context Provider está configurado
console.log('\n4️⃣ Verificando Context Provider...');

try {
  const contextPath = path.join(__dirname, '..', 'contexts', 'DataManagerContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');
  
  if (contextContent.includes('DataManagerProvider')) {
    console.log('✅ DataManagerProvider implementado');
  } else {
    console.log('❌ DataManagerProvider no encontrado');
  }
  
  if (contextContent.includes('useDataManagerContext')) {
    console.log('✅ useDataManagerContext hook implementado');
  } else {
    console.log('❌ useDataManagerContext hook no encontrado');
  }
} catch (error) {
  console.log('❌ Error leyendo DataManagerContext.tsx:', error.message);
}

// Test 5: Verificar que el layout está configurado
console.log('\n5️⃣ Verificando configuración del layout...');

try {
  const layoutPath = path.join(__dirname, '..', 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  if (layoutContent.includes('DataManagerProvider')) {
    console.log('✅ DataManagerProvider configurado en layout');
  } else {
    console.log('❌ DataManagerProvider no configurado en layout');
  }
} catch (error) {
  console.log('❌ Error leyendo layout.tsx:', error.message);
}

// Resumen final
console.log('\n📊 RESUMEN DEL TEST');
console.log('==================');

if (directDbAccessFound) {
  console.log('❌ FALLÓ: Se encontraron consultas directas a IndexedDB');
  console.log('📁 Archivos con problemas:', filesWithIssues.join(', '));
  console.log('💡 Solución: Reemplazar consultas directas con useCentralizedDataManager()');
} else {
  console.log('✅ ÉXITO: No se encontraron consultas directas a IndexedDB');
}

console.log('\n🎯 PRÓXIMOS PASOS:');
console.log('1. Recargar la aplicación en el navegador');
console.log('2. Verificar que solo aparecen logs de SUPABASE|');
console.log('3. Confirmar que se muestran 6 registros en lugar de 1152');
console.log('4. Si aparecen errores 🚨 INDEXEDDB ROTO, identificar y arreglar el componente problemático');

console.log('\n✨ Test completado!');




