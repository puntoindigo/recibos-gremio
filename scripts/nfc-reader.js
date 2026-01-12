// scripts/nfc-reader.js
// Script para leer tarjetas NFC/RFID usando nfc-pcsc
// Ejecutar con: node scripts/nfc-reader.js

const { NFC } = require('nfc-pcsc');
const http = require('http');

const nfc = new NFC();
let lastUID = null;

// Función para enviar UID al servidor Next.js
function sendUIDToServer(uid) {
  const data = JSON.stringify({ uid, timestamp: new Date().toISOString() });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/nfc-card',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ UID enviado al servidor. Status: ${res.statusCode}`);
  });

  req.on('error', (error) => {
    console.error('❌ Error enviando UID al servidor:', error.message);
    console.log('💡 Asegúrate de que el servidor Next.js esté corriendo en http://localhost:3000');
  });

  req.write(data);
  req.end();
}

console.log('🔌 Iniciando lector NFC...');
console.log('📱 Conecta tu lector JD014 y pasa una tarjeta');

nfc.on('reader', reader => {
  console.log(`\n✅ Lector conectado: ${reader.reader.name}`);
  console.log('⏳ Esperando tarjeta...\n');

  reader.on('card', card => {
    const uid = card.uid;
    
    // Evitar leer la misma tarjeta múltiples veces
    if (uid !== lastUID) {
      lastUID = uid;
      console.log(`\n🎴 TARJETA DETECTADA!`);
      console.log(`   UID: ${uid}`);
      console.log(`   Tipo: ${card.type}`);
      console.log(`   Timestamp: ${new Date().toLocaleString()}\n`);
      
      // Enviar al servidor Next.js
      sendUIDToServer(uid);
    }
  });

  reader.on('card.off', card => {
    console.log(`📴 Tarjeta retirada: ${card.uid}`);
    console.log('⏳ Esperando nueva tarjeta...\n');
  });

  reader.on('error', err => {
    console.error(`❌ Error en el lector: ${err.message}`);
  });

  reader.on('end', () => {
    console.log(`\n🔌 Lector desconectado: ${reader.reader.name}`);
  });
});

nfc.on('error', err => {
  console.error(`❌ Error general NFC: ${err.message}`);
  console.log('\n💡 Verifica que:');
  console.log('   1. El lector esté conectado por USB');
  console.log('   2. Tengas permisos para acceder al dispositivo');
  console.log('   3. El driver esté instalado correctamente\n');
});

// Manejar cierre limpio
process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando lector NFC...');
  nfc.close();
  process.exit(0);
});

