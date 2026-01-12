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
    },
    timeout: 10000 // 10 segundos de timeout
  };

  // Usar https o http según el protocolo
  const requestModule = serverUrl.protocol === 'https:' ? https : http;

  console.log(`   📡 Conectando a: ${serverUrl.protocol}//${serverUrl.hostname}:${options.port}${options.path}`);

  const req = requestModule.request(options, (res) => {
    let responseData = '';
    
    console.log(`   📥 Respuesta recibida. Status: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ UID enviado al servidor exitosamente`);
        try {
          const response = JSON.parse(responseData);
          if (response.success) {
            console.log(`   ✓ Confirmado por el servidor: ${response.uid}`);
          }
        } catch (e) {
          console.log(`   ⚠️  No se pudo parsear la respuesta: ${responseData}`);
        }
      } else {
        console.log(`⚠️  Respuesta del servidor: ${res.statusCode}`);
        console.log(`   Respuesta: ${responseData}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`❌ Error enviando UID al servidor:`);
    console.error(`   Tipo: ${error.code || error.name}`);
    console.error(`   Mensaje: ${error.message}`);
    console.log(`💡 Verifica que el servidor esté accesible en: ${SERVER_URL}`);
    console.log(`💡 Si es producción, usa: SERVER_URL=${SERVER_URL} node scripts/nfc-reader.js`);
  });

  req.on('timeout', () => {
    console.error('❌ Timeout al enviar UID al servidor');
    req.destroy();
  });

  req.write(data);
  req.end();
}

console.log('🔌 Iniciando lector NFC...');
console.log('📱 Conecta tu lector JD014 y pasa una tarjeta');
console.log(`🌐 Enviando datos a: ${SERVER_URL}/api/nfc-card`);
console.log(`💻 Sistema: ${process.platform} ${process.arch}`);
console.log(`📦 Node.js: ${process.version}\n`);

// Timeout para detectar si no hay lectores
let readerTimeout = setTimeout(() => {
  console.log('\n⚠️  No se detectó ningún lector después de 5 segundos');
  console.log('💡 Verifica que:');
  console.log('   1. El lector esté conectado por USB');
  console.log('   2. El sistema lo reconozca (Información del Sistema > USB)');
  console.log('   3. Tengas PC/SC instalado: brew install pcsc-lite');
  console.log('   4. Ejecuta: npm run nfc:diagnose para diagnóstico completo\n');
}, 5000);

nfc.on('reader', reader => {
  clearTimeout(readerTimeout);
  console.log(`\n✅ LECTOR CONECTADO:`);
  console.log(`   Nombre: ${reader.reader.name}`);
  console.log(`   Estado: ${reader.reader.state || 'N/A'}`);
  if (reader.ATR) {
    console.log(`   ATR: ${reader.ATR.toString('hex')}`);
  }
  console.log('⏳ Esperando tarjeta...\n');

  reader.on('card', card => {
    const uid = card.uid;
    
    console.log(`\n🔔 EVENTO: card detectado`);
    console.log(`   UID raw: ${uid}`);
    console.log(`   UID tipo: ${typeof uid}`);
    console.log(`   Tipo de tarjeta: ${card.type}`);
    console.log(`   Último UID guardado: ${lastUID}`);
    
    // Evitar leer la misma tarjeta múltiples veces (pero resetear después de 3 segundos)
    const now = Date.now();
    if (uid !== lastUID) {
      lastUID = uid;
      console.log(`\n🎴 TARJETA DETECTADA!`);
      console.log(`   UID: ${uid}`);
      console.log(`   Tipo: ${card.type}`);
      console.log(`   Timestamp: ${new Date().toLocaleString()}\n`);
      
      // Enviar al servidor Next.js
      console.log(`📤 Enviando UID al servidor...`);
      sendUIDToServer(uid);
    } else {
      console.log(`⚠️  Tarjeta ya leída (${uid}), ignorando...`);
      console.log(`💡 Retira la tarjeta y vuelve a pasarla para leerla de nuevo\n`);
    }
  });

  reader.on('card.off', card => {
    console.log(`📴 Tarjeta retirada: ${card.uid}`);
    // Resetear lastUID cuando se retira la tarjeta para permitir leerla de nuevo
    lastUID = null;
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
  console.error(`❌ Error general NFC:`);
  console.error(`   Mensaje: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);
  console.log('\n💡 Verifica que:');
  console.log('   1. El lector esté conectado por USB');
  console.log('   2. Tengas permisos para acceder al dispositivo');
  console.log('   3. El driver esté instalado correctamente');
  console.log('   4. El lector sea compatible con PC/SC\n');
});

// Agregar listener para cuando no se detecta ningún lector después de un tiempo
setTimeout(() => {
  if (!nfc.readers || nfc.readers.length === 0) {
    console.log('\n⚠️  No se detectó ningún lector después de 5 segundos');
    console.log('💡 Verifica que:');
    console.log('   1. El lector JD014 esté conectado por USB');
    console.log('   2. El sistema operativo lo reconozca');
    console.log('   3. En macOS, verifica en "Información del Sistema" > USB');
    console.log('   4. En Linux, verifica con: pcsc_scan\n');
  }
}, 5000);

// Manejar cierre limpio
process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando lector NFC...');
  nfc.close();
  process.exit(0);
});

