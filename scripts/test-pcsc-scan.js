// scripts/test-pcsc-scan.js
// Prueba alternativa usando pcsc-scan si está disponible

const { exec } = require('child_process');

console.log('🔍 Probando con pcsc-scan (si está instalado)...\n');

// Verificar si pcsc_scan está instalado
exec('which pcsc_scan', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ pcsc_scan no está instalado');
    console.log('\n💡 Para instalar:');
    console.log('   brew install pcsc-tools');
    console.log('\n📋 O prueba manualmente:');
    console.log('   1. Abre Terminal');
    console.log('   2. Ejecuta: pcsc_scan');
    console.log('   3. Pasa una tarjeta sobre el lector');
    console.log('   4. Observa si detecta el lector y la tarjeta\n');
  } else {
    console.log('✅ pcsc_scan encontrado:', stdout.trim());
    console.log('\n📋 Ejecutando pcsc_scan...');
    console.log('💡 Pasa una tarjeta sobre el lector cuando aparezca "Waiting for card..."\n');
    
    const scanProcess = exec('pcsc_scan', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error ejecutando pcsc_scan:', error.message);
      }
    });
    
    scanProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    scanProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    // Detener después de 30 segundos
    setTimeout(() => {
      scanProcess.kill();
      console.log('\n\n⏹️  Prueba detenida después de 30 segundos');
      process.exit(0);
    }, 30000);
  }
});

