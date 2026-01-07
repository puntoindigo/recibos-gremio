// scripts/test-all-sections.js
// Script para probar todas las secciones de la aplicación automáticamente

const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'adminregistro@recibos.com',
  password: 'adminreg123'
};

const SECTIONS = [
  { name: 'Dashboard', tab: 'tablero' },
  { name: 'Empresas', tab: 'empresas' },
  { name: 'Empleados', tab: 'empleados' },
  { name: 'Accesos', tab: 'accesos' },
  { name: 'Recibos', tab: 'recibos' },
  { name: 'Control', tab: 'control' },
  { name: 'Descuentos', tab: 'descuentos' },
  { name: 'Exportar', tab: 'export' }
];

async function testSection(page, section) {
  console.log(`\n🧪 Probando sección: ${section.name} (${section.tab})`);
  
  try {
    // Navegar a la sección
    await page.evaluate((tab) => {
      // Simular click en el tab
      const event = new CustomEvent('changeTab', { detail: tab });
      window.dispatchEvent(event);
    }, section.tab);
    
    // Esperar a que la página cargue
    await page.waitForTimeout(2000);
    
    // Verificar errores en consola
    const errors = await page.evaluate(() => {
      return window.__testErrors || [];
    });
    
    if (errors.length > 0) {
      console.error(`❌ Errores encontrados en ${section.name}:`);
      errors.forEach(error => {
        console.error(`   - ${error.message}`);
        if (error.stack) {
          console.error(`     ${error.stack.split('\n')[0]}`);
        }
      });
      return false;
    }
    
    // Verificar que no haya errores de React
    const reactErrors = await page.evaluate(() => {
      const reactErrorOverlay = document.querySelector('[data-react-error-overlay]');
      return reactErrorOverlay !== null;
    });
    
    if (reactErrors) {
      console.error(`❌ Error de React detectado en ${section.name}`);
      return false;
    }
    
    console.log(`✅ ${section.name} - Sin errores detectados`);
    return true;
  } catch (error) {
    console.error(`❌ Error probando ${section.name}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas automatizadas...');
  console.log(`📍 URL base: ${BASE_URL}`);
  
  const browser = await puppeteer.launch({
    headless: false, // Mostrar navegador para debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capturar errores de consola
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      if (!window.__testErrors) window.__testErrors = [];
      window.__testErrors.push({
        message: text,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Capturar errores de página
  page.on('pageerror', error => {
    console.error('❌ Error de página:', error.message);
  });
  
  try {
    // Ir a la página de login
    console.log('\n📝 Iniciando sesión...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle0' });
    
    // Llenar formulario de login
    await page.type('input[type="email"]', TEST_USER.email);
    await page.type('input[type="password"]', TEST_USER.password);
    
    // Click en botón de login
    await page.click('button[type="submit"]');
    
    // Esperar a que cargue el dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    console.log('✅ Sesión iniciada correctamente');
    
    // Probar cada sección
    const results = [];
    for (const section of SECTIONS) {
      const result = await testSection(page, section);
      results.push({ section: section.name, passed: result });
    }
    
    // Resumen
    console.log('\n📊 RESUMEN DE PRUEBAS:');
    console.log('='.repeat(50));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.section}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Total: ${results.length} | Pasadas: ${passed} | Fallidas: ${failed}`);
    
    if (failed > 0) {
      console.log('\n⚠️  Se encontraron errores. Revisa los logs arriba.');
      process.exit(1);
    } else {
      console.log('\n🎉 ¡Todas las pruebas pasaron!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testSection };

