// scripts/test-nfc-detection.js
// Script simple para verificar si el lector NFC está siendo detectado

const { NFC } = require('nfc-pcsc');

console.log('🔍 Verificando detección de lector NFC...\n');

const nfc = new NFC();

let readerDetected = false;

nfc.on('reader', reader => {
  readerDetected = true;
  console.log(`✅ LECTOR DETECTADO:`);
  console.log(`   Nombre: ${reader.reader.name}`);
  console.log(`   ATR: ${reader.ATR ? reader.ATR.toString('hex') : 'N/A'}`);
  console.log(`\n📱 Pasa una tarjeta sobre el lector para probar...\n`);

  reader.on('card', card => {
    console.log(`\n🎴 TARJETA DETECTADA:`);
    console.log(`   UID: ${card.uid}`);
    console.log(`   Tipo: ${card.type}`);
    console.log(`   ATR: ${card.atr ? card.atr.toString('hex') : 'N/A'}`);
  });

  reader.on('card.off', card => {
    console.log(`📴 Tarjeta retirada`);
  });

  reader.on('error', err => {
    console.error(`❌ Error en lector: ${err.message}`);
  });
});

nfc.on('error', err => {
  console.error(`❌ Error NFC: ${err.message}`);
});

// Verificar después de 5 segundos
setTimeout(() => {
  if (!readerDetected) {
    console.log('\n❌ NO SE DETECTÓ NINGÚN LECTOR');
    console.log('\n💡 Posibles causas:');
    console.log('   1. El lector no está conectado por USB');
    console.log('   2. El sistema no reconoce el lector');
    console.log('   3. Falta el driver PC/SC');
    console.log('   4. El lector JD014 no es compatible con PC/SC');
    console.log('\n🔧 Soluciones:');
    console.log('   - En macOS: Verifica en "Información del Sistema" > USB');
    console.log('   - Instala PC/SC drivers si es necesario');
    console.log('   - Algunos lectores JD014 pueden requerir drivers específicos\n');
    process.exit(1);
  }
}, 5000);

// Mantener el proceso corriendo
process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando...');
  nfc.close();
  process.exit(0);
});

