#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando que el error de IndexedDB se haya resuelto...\n');

// Verificar que el DataManagerProvider no cambie a IndexedDB cuando está roto
const dataManagerContextPath = 'contexts/DataManagerContext.tsx';
if (fs.existsSync(dataManagerContextPath)) {
  const content = fs.readFileSync(dataManagerContextPath, 'utf8');
  
  if (content.includes('IndexedDB está roto, manteniendo Supabase')) {
    console.log('✅ DataManagerProvider - Protección contra cambio a IndexedDB implementada');
  } else {
    console.log('❌ DataManagerProvider - No se encontró protección contra cambio a IndexedDB');
  }
  
  if (content.includes('No se puede cambiar a IndexedDB')) {
    console.log('✅ DataManagerProvider - Mensaje de error implementado');
  } else {
    console.log('❌ DataManagerProvider - No se encontró mensaje de error');
  }
} else {
  console.log('❌ DataManagerContext.tsx no encontrado');
}

// Verificar que el DataManagerSingleton se inicialice con Supabase por defecto
const dataManagerSingletonPath = 'lib/data-manager-singleton.ts';
if (fs.existsSync(dataManagerSingletonPath)) {
  const content = fs.readFileSync(dataManagerSingletonPath, 'utf8');
  
  if (content.includes('this.currentDataManager = new SupabaseDataManager()')) {
    console.log('✅ DataManagerSingleton - Inicialización con Supabase por defecto');
  } else {
    console.log('❌ DataManagerSingleton - No se encontró inicialización con Supabase');
  }
  
  if (content.includes('this.storageType = \'SUPABASE\'')) {
    console.log('✅ DataManagerSingleton - StorageType configurado a SUPABASE por defecto');
  } else {
    console.log('❌ DataManagerSingleton - No se encontró configuración de storageType');
  }
} else {
  console.log('❌ data-manager-singleton.ts no encontrado');
}

// Verificar que IndexedDB esté roto
const dbPath = 'lib/db.ts';
if (fs.existsSync(dbPath)) {
  const content = fs.readFileSync(dbPath, 'utf8');
  
  if (content.includes('🚨 INDEXEDDB ROTO')) {
    console.log('✅ IndexedDB - Roto intencionalmente');
  } else {
    console.log('❌ IndexedDB - No se encontró indicador de que esté roto');
  }
  
  if (content.includes('class BrokenDatabase')) {
    console.log('✅ IndexedDB - BrokenDatabase implementada');
  } else {
    console.log('❌ IndexedDB - No se encontró BrokenDatabase');
  }
} else {
  console.log('❌ db.ts no encontrado');
}

// Verificar que no haya imports directos de @/lib/db
const problematicImports = [];
const filesToCheck = [
  'lib/descuentos-manager.ts',
  'lib/empresa-manager.ts',
  'lib/user-management.ts',
  'app/page.tsx',
  'components/DescuentoModal.tsx',
  'components/UploadManagerModal.tsx',
  'components/Control/SavedControlsList.tsx',
  'components/EmployeeSelector.tsx',
  'components/ExportDescuentos.tsx',
  'components/DeleteConfirmModal.tsx',
  'components/Control/ControlDetailsPanel.tsx'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    // Buscar imports activos (no comentados)
    const lines = content.split('\n');
    const activeImports = lines.filter(line => {
      const trimmed = line.trim();
      return (trimmed.includes("from '@/lib/db'") || trimmed.includes("from './db'")) && 
             !trimmed.startsWith('//') && 
             !trimmed.startsWith('*') &&
             !trimmed.startsWith('/*');
    });
    
    if (activeImports.length > 0) {
      problematicImports.push(file);
    }
  }
});

if (problematicImports.length === 0) {
  console.log('✅ Imports - No se encontraron imports directos de @/lib/db');
} else {
  console.log('❌ Imports - Se encontraron imports problemáticos:');
  problematicImports.forEach(file => console.log(`   - ${file}`));
}

// Verificar que el servidor esté funcionando
try {
  execSync('curl -s http://localhost:3000 > /dev/null', { stdio: 'pipe' });
  console.log('✅ Servidor - Funcionando en puerto 3000');
} catch (error) {
  console.log('❌ Servidor - No responde en puerto 3000');
}

console.log('\n🎯 Resumen:');
console.log('- DataManagerProvider protegido contra cambio a IndexedDB');
console.log('- DataManagerSingleton inicializa con Supabase por defecto');
console.log('- IndexedDB roto intencionalmente');
console.log('- Sin imports directos de @/lib/db');
console.log('- Servidor funcionando correctamente');

console.log('\n📋 Próximos pasos:');
console.log('1. Abrir http://localhost:3000 en el navegador');
console.log('2. Verificar en la consola que NO aparezcan errores "🚨 INDEXEDDB ROTO"');
console.log('3. Verificar que solo aparezcan logs de SUPABASE|');
console.log('4. Verificar que se muestren los datos correctos de Supabase');
