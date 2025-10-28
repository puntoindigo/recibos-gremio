const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    // Crear un archivo de prueba
    const testContent = 'Test PDF content';
    fs.writeFileSync('test-file.pdf', testContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-file.pdf'), {
      filename: 'SUMAR_recibos sueldos 09.2025 (CHOFERES)-14.pdf',
      contentType: 'application/pdf'
    });
    
    console.log('🚀 Subiendo archivo de prueba...');
    
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('📊 Resultado:', result);
    
    // Limpiar archivo de prueba
    fs.unlinkSync('test-file.pdf');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpload();



