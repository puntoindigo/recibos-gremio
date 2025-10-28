const fs = require('fs');
const path = require('path');

console.log('🔍 Validando que todas las consultas pasen por el sistema centralizado...\n');

// Archivos a verificar (excluyendo scripts de migración)
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
  'lib/user-management.ts'
];

let hasErrors = false;

function checkFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⏭️  Archivo no encontrado: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Buscar consultas directas a IndexedDB
    const directQueries = [
      /db\.consolidated\./g,
      /db\.receipts\./g,
      /db\.descuentos\./g,
      /db\.empresas\./g,
      /db\.savedControls\./g,
      /db\.columnConfigs\./g,
      /db\.userActivities\./g,
      /db\.uploadSessions\./g,
      /db\.control\./g
    ];

    let hasDirectQueries = false;
    
    directQueries.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        console.error(`❌ ${filePath}: Consultas directas a IndexedDB encontradas:`);
        matches.forEach(match => {
          console.error(`   - ${match}`);
        });
        hasDirectQueries = true;
        hasErrors = true;
      }
    });

    if (!hasDirectQueries) {
      console.log(`✅ ${filePath}: Sin consultas directas a IndexedDB`);
    }

  } catch (error) {
    console.error(`❌ Error verificando ${filePath}:`, error.message);
    hasErrors = true;
  }
}

console.log('Verificando archivos...\n');

filesToCheck.forEach(file => {
  checkFile(file);
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('❌ VALIDACIÓN FALLIDA');
  console.log('❌ Se encontraron consultas directas a IndexedDB');
  console.log('❌ Todas las consultas deben pasar por el sistema centralizado');
  console.log('❌ Usa useCentralizedDataManager() en lugar de db.consolidated');
  process.exit(1);
} else {
  console.log('✅ VALIDACIÓN EXITOSA');
  console.log('✅ Todas las consultas pasan por el sistema centralizado');
  console.log('✅ No se encontraron consultas directas a IndexedDB');
}




