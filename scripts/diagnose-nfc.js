// scripts/diagnose-nfc.js
// Script de diagnóstico completo para NFC en macOS

const { NFC } = require('nfc-pcsc');

console.log('🔍 DIAGNÓSTICO COMPLETO DE NFC\n');
console.log('='.repeat(50));

// Verificar sistema operativo
console.log('\n📱 Información del Sistema:');
console.log(`   OS: ${process.platform}`);
console.log(`   Node.js: ${process.version}`);
console.log(`   Arquitectura: ${process.arch}`);

// Verificar módulo nfc-pcsc
console.log('\n📦 Verificando módulo nfc-pcsc:');
try {
  const nfcModule = require('nfc-pcsc');
  console.log('   ✅ Módulo cargado correctamente');
  console.log(`   Versión: ${require('nfc-pcsc/package.json')?.version || 'N/A'}`);
} catch (error) {
  console.error('   ❌ Error cargando módulo:', error.message);
  process.exit(1);
}

// Verificar PC/SC
console.log('\n🔌 Verificando PC/SC:');
const pcsc = require('@pokusew/pcsclite');
try {
  const pcscInstance = pcsc();
  console.log('   ✅ PC/SC inicializado');
  
  pcscInstance.on('error', (error) => {
    console.error('   ❌ Error en PC/SC:', error.message);
  });
  
  pcscInstance.on('reader', (reader) => {
    console.log(`   ✅ Lector detectado: ${reader.name}`);
  });
  
  // Esperar 3 segundos para detectar lectores
  setTimeout(() => {
    pcscInstance.close();
  }, 3000);
  
} catch (error) {
  console.error('   ❌ Error inicializando PC/SC:', error.message);
  console.log('\n💡 Posibles soluciones:');
  console.log('   1. Instala PC/SC: brew install pcsc-lite');
  console.log('   2. Verifica permisos en Preferencias del Sistema > Seguridad');
  console.log('   3. Reinicia después de instalar');
}

// Probar con NFC
console.log('\n🎴 Iniciando prueba con NFC:');
const nfc = new NFC();

let readerDetected = false;
let cardDetected = false;

nfc.on('reader', reader => {
  readerDetected = true;
  console.log(`\n✅ LECTOR DETECTADO:`);
  console.log(`   Nombre: ${reader.reader.name}`);
  console.log(`   Estado: ${reader.reader.state}`);
  
  if (reader.ATR) {
    console.log(`   ATR: ${reader.ATR.toString('hex')}`);
  }

  reader.on('card', card => {
    cardDetected = true;
    console.log(`\n🎴 TARJETA DETECTADA:`);
    console.log(`   UID: ${card.uid}`);
    console.log(`   Tipo: ${card.type}`);
    if (card.atr) {
      console.log(`   ATR: ${card.atr.toString('hex')}`);
    }
  });

  reader.on('card.off', card => {
    console.log(`📴 Tarjeta retirada`);
    cardDetected = false;
  });

  reader.on('error', err => {
    console.error(`❌ Error en lector: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
  });
});

nfc.on('error', err => {
  console.error(`❌ Error general NFC: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);
});

// Esperar 10 segundos para detectar lectores y tarjetas
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:\n');
  
  if (!readerDetected) {
    console.log('❌ NO SE DETECTÓ NINGÚN LECTOR');
    console.log('\n🔧 PASOS PARA RESOLVER:');
    console.log('\n1. Verificar conexión física:');
    console.log('   - Desconecta y vuelve a conectar el lector USB');
    console.log('   - Prueba otro puerto USB');
    console.log('   - Verifica que el LED del lector se encienda');
    
    console.log('\n2. Verificar en macOS:');
    console.log('   - Abre "Información del Sistema" (⌘ + Espacio, busca "Información")');
    console.log('   - Ve a Hardware > USB');
    console.log('   - Busca "JD014" o "Judi" o "NFC" o "Card Reader"');
    console.log('   - Si no aparece, el sistema no reconoce el dispositivo');
    
    console.log('\n3. Instalar PC/SC:');
    console.log('   brew install pcsc-lite');
    console.log('   Reinicia la terminal después de instalar');
    
    console.log('\n4. Verificar permisos:');
    console.log('   - Ve a Preferencias del Sistema > Seguridad y Privacidad');
    console.log('   - Busca "Accesibilidad" o "Privacidad"');
    console.log('   - Asegúrate de que Terminal tenga permisos');
    
    console.log('\n5. Verificar drivers:');
    console.log('   - Algunos lectores JD014 pueden necesitar drivers específicos');
    console.log('   - Busca drivers para macOS en el sitio del fabricante');
    
    console.log('\n6. Probar con otro software:');
    console.log('   - Instala "Card Reader" desde App Store');
    console.log('   - O usa: pcsc_scan (si tienes pcsc-tools instalado)');
    
  } else {
    console.log('✅ Lector detectado correctamente');
    
    if (!cardDetected) {
      console.log('⚠️  Lector detectado pero no se leyeron tarjetas');
      console.log('\n💡 Prueba:');
      console.log('   - Pasa una tarjeta sobre el lector');
      console.log('   - Mantén la tarjeta cerca del lector (2-3 segundos)');
      console.log('   - Algunos lectores necesitan que la tarjeta esté quieta');
    } else {
      console.log('✅ Tarjetas detectadas correctamente');
      console.log('🎉 Todo funciona! Puedes usar el script principal');
    }
  }
  
  console.log('\n' + '='.repeat(50));
  nfc.close();
  process.exit(0);
}, 10000);

// Manejar cierre
process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando diagnóstico...');
  nfc.close();
  process.exit(0);
});

