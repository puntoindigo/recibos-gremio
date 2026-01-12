// scripts/nfc-reader.js
// Script para leer tarjetas NFC/RFID usando nfc-pcsc
// Ejecutar con: node scripts/nfc-reader.js
// Para producción: SERVER_URL=https://v0-recibos.vercel.app node scripts/nfc-reader.js

const { NFC } = require('nfc-pcsc');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const nfc = new NFC();
let lastUID = null;

// Configurar URL del servidor (desde variable de entorno o default)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const serverUrl = new URL(SERVER_URL);

console.log(`🌐 Servidor configurado: ${SERVER_URL}`);

// Función para enviar UID al servidor Next.js
function sendUIDToServer(uid) {
  const data = JSON.stringify({ uid, timestamp: new Date().toISOString() });
  
  const options = {
    hostname: serverUrl.hostname,
    port: serverUrl.port || (serverUrl.protocol === 'https:' ? 443 : 80),
    path: '/api/nfc-card',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  // Usar https o http según el protocolo
  const requestModule = serverUrl.protocol === 'https:' ? https : http;

  const req = requestModule.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ UID enviado al servidor. Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(responseData);
          if (response.success) {
            console.log(`   ✓ Confirmado por el servidor`);
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
      } else {
        console.log(`⚠️  Respuesta del servidor: ${res.statusCode}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error enviando UID al servidor:', error.message);
    console.log(`💡 Verifica que el servidor esté accesible en: ${SERVER_URL}`);
    console.log(`💡 Si es producción, usa: SERVER_URL=${SERVER_URL} node scripts/nfc-reader.js`);
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

