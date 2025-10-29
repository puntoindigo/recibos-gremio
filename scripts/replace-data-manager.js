const fs = require('fs');
const path = require('path');

// Archivos a procesar (excluyendo los que ya están actualizados)
const filesToProcess = [
  'components/FichaEmpleadoModal.tsx',
  'hooks/useStorage.ts',
  'hooks/useDataSource.ts',
  'components/EmpleadoModal.tsx',
  'components/EmpleadosPanel.tsx',
  'components/EmpresaModal.tsx',
  'components/BackupPanel.tsx',
  'components/DescuentosPanel.tsx',
  'hooks/useEmpresasInUse.ts',
  'hooks/useEmpresasFromReceipts.ts',
  'components/DebugModal.tsx',
  'components/EmpresasPanel.tsx',
  'components/DebugSessions.tsx',
  'components/ColumnConfigWithPreview.tsx',
  'components/UploadLogModal.tsx'
];

function replaceInFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Archivo no encontrado: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Reemplazar importación
    if (content.includes("import { useDataManager } from '@/lib/data-manager';")) {
      content = content.replace(
        "import { useDataManager } from '@/lib/data-manager';",
        "import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';"
      );
      modified = true;
    }

    // Reemplazar uso del hook
    if (content.includes('const dataManager = useDataManager();')) {
      content = content.replace(
        'const dataManager = useDataManager();',
        'const { dataManager } = useCentralizedDataManager();'
      );
      modified = true;
    }

    // Reemplazar uso del hook con destructuring
    if (content.includes('const { dataManager } = useDataManager();')) {
      content = content.replace(
        'const { dataManager } = useDataManager();',
        'const { dataManager } = useCentralizedDataManager();'
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
    } else {
      console.log(`⏭️  Sin cambios: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

console.log('🔄 Reemplazando useDataManager con useCentralizedDataManager...\n');

filesToProcess.forEach(file => {
  replaceInFile(file);
});

console.log('\n✅ Proceso completado');







