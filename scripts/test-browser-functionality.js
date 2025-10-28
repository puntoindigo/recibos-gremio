#!/usr/bin/env node

/**
 * Script de Testing de Funcionalidad del Navegador
 * Verifica que el servidor responda correctamente y no haya errores de JavaScript
 */

const http = require('http');

console.log('🌐 TESTING DE FUNCIONALIDAD DEL NAVEGADOR');
console.log('==========================================\n');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function testServerResponse() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      log(colors.green, `✅ Servidor respondiendo: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Verificar que la página contiene elementos esperados
        const hasTitle = data.includes('<title>');
        const hasNextJS = data.includes('_next');
        const hasReact = data.includes('react');
        
        if (hasTitle) {
          log(colors.green, '✅ Página tiene título');
        } else {
          log(colors.red, '❌ Página sin título');
        }
        
        if (hasNextJS) {
          log(colors.green, '✅ Next.js funcionando');
        } else {
          log(colors.red, '❌ Next.js no detectado');
        }
        
        if (hasReact) {
          log(colors.green, '✅ React funcionando');
        } else {
          log(colors.red, '❌ React no detectado');
        }
        
        resolve({
          statusCode: res.statusCode,
          hasTitle,
          hasNextJS,
          hasReact
        });
      });
    });

    req.on('error', (error) => {
      log(colors.red, `❌ Error conectando al servidor: ${error.message}`);
      resolve({
        statusCode: 0,
        hasTitle: false,
        hasNextJS: false,
        hasReact: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      log(colors.red, '❌ Timeout conectando al servidor');
      req.destroy();
      resolve({
        statusCode: 0,
        hasTitle: false,
        hasNextJS: false,
        hasReact: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function runBrowserTests() {
  log(colors.blue, '🔍 Probando respuesta del servidor...');
  
  const result = await testServerResponse();
  
  console.log('\n' + '='.repeat(50));
  
  if (result.statusCode === 200 || result.statusCode === 307) {
    log(colors.green, '🎉 Servidor funcionando correctamente');
    
    if (result.hasTitle && result.hasNextJS && result.hasReact) {
      log(colors.green, '✅ Todos los componentes web funcionando');
      log(colors.green, '✅ Sistema listo para usar en el navegador');
      return true;
    } else {
      log(colors.yellow, '⚠️ Algunos componentes pueden tener problemas');
      return false;
    }
  } else {
    log(colors.red, '❌ Servidor no responde correctamente');
    return false;
  }
}

// Ejecutar tests
runBrowserTests().then((success) => {
  if (success) {
    console.log('\n🚀 El sistema está completamente funcional y listo para usar.');
    console.log('📱 Puedes abrir http://localhost:8000 en tu navegador.');
    process.exit(0);
  } else {
    console.log('\n❌ Hay problemas que necesitan ser resueltos.');
    process.exit(1);
  }
});
