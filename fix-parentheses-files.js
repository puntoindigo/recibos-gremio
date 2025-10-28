const fs = require('fs');
const path = require('path');

// Función para limpiar archivos con paréntesis
async function fixParenthesesFiles() {
  const recibosDir = path.join(__dirname, 'public/recibos');
  
  try {
    console.log('🔍 Buscando archivos con paréntesis...');
    
    // Leer todos los archivos
    const files = await fs.promises.readdir(recibosDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    console.log(`📁 Total de archivos PDF: ${pdfFiles.length}`);
    
    // Buscar archivos con paréntesis
    const filesWithParentheses = pdfFiles.filter(file => file.includes('(') && file.includes(')'));
    
    console.log(`🔍 Archivos con paréntesis encontrados: ${filesWithParentheses.length}`);
    
    if (filesWithParentheses.length === 0) {
      console.log('✅ No hay archivos con paréntesis para corregir');
      return;
    }
    
    // Mostrar archivos encontrados
    filesWithParentheses.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    console.log('\n🔧 Archivos que serán corregidos:');
    
    for (const file of filesWithParentheses) {
      const oldPath = path.join(recibosDir, file);
      const newName = file.replace(/\(([^)]+)\)/g, '$1'); // Quitar paréntesis
      const newPath = path.join(recibosDir, newName);
      
      console.log(`📝 ${file} → ${newName}`);
      
      try {
        // Verificar si el archivo existe
        await fs.promises.access(oldPath);
        
        // Renombrar archivo
        await fs.promises.rename(oldPath, newPath);
        console.log(`✅ Renombrado: ${file} → ${newName}`);
        
      } catch (error) {
        console.log(`❌ Error renombrando ${file}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Proceso completado');
    console.log('💡 Ahora necesitas actualizar la base de datos para reflejar los nuevos nombres');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar la función
fixParenthesesFiles();



