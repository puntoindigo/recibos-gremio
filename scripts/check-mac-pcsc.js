// scripts/check-mac-pcsc.js
// Script para verificar la configuración de PC/SC en macOS

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN PC/SC EN macOS\n');
console.log('='.repeat(60));

async function checkCommand(command, description) {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, output: stdout.trim(), error: stderr };
  } catch (error) {
    return { success: false, output: error.message, error: error.stderr };
  }
}

async function main() {
  console.log('\n1️⃣ Verificando PC/SC Lite instalación:\n');
  const pcscCheck = await checkCommand('brew list pcsc-lite');
  if (pcscCheck.success) {
    console.log('   ✅ pcsc-lite está instalado');
  } else {
    console.log('   ❌ pcsc-lite NO está instalado');
    console.log('   💡 Instala con: brew install pcsc-lite');
  }

  console.log('\n2️⃣ Verificando proceso pcscd:\n');
  const pcscdCheck = await checkCommand('ps aux | grep -i pcscd | grep -v grep');
  if (pcscdCheck.success && pcscdCheck.output) {
    console.log('   ✅ pcscd está corriendo:');
    console.log(`   ${pcscdCheck.output}`);
  } else {
    console.log('   ⚠️  pcscd NO está corriendo');
    console.log('   💡 En macOS, pcscd puede iniciarse automáticamente cuando se necesita');
  }

  console.log('\n3️⃣ Verificando dispositivos USB conectados:\n');
  const usbCheck = await checkCommand('system_profiler SPUSBDataType | grep -i -A 5 "wCopy\\|Smart Reader\\|Card Reader\\|NFC"');
  if (usbCheck.success && usbCheck.output) {
    console.log('   ✅ Dispositivo encontrado:');
    console.log(`   ${usbCheck.output}`);
  } else {
    console.log('   ❌ No se encontró el lector en USB');
    console.log('   💡 Verifica que esté conectado y encendido');
  }

  console.log('\n4️⃣ Verificando permisos de Terminal:\n');
  console.log('   📋 Verifica manualmente:');
  console.log('   1. Ve a: Preferencias del Sistema > Seguridad y Privacidad');
  console.log('   2. Pestaña "Privacidad"');
  console.log('   3. Busca "Accesibilidad"');
  console.log('   4. Verifica que Terminal (o iTerm) esté marcado');
  console.log('   5. Si no está, haz clic en el candado y agrégalo');

  console.log('\n5️⃣ Verificando librerías PC/SC:\n');
  const libCheck = await checkCommand('ls -la /usr/local/lib/pcsc* 2>/dev/null || ls -la /opt/homebrew/lib/pcsc* 2>/dev/null || echo "No encontrado"');
  if (libCheck.success && !libCheck.output.includes('No encontrado')) {
    console.log('   ✅ Librerías PC/SC encontradas:');
    console.log(`   ${libCheck.output}`);
  } else {
    console.log('   ⚠️  Librerías PC/SC no encontradas en ubicaciones estándar');
  }

  console.log('\n6️⃣ Verificando variables de entorno:\n');
  const envCheck = await checkCommand('echo $DYLD_LIBRARY_PATH');
  if (envCheck.success && envCheck.output) {
    console.log(`   DYLD_LIBRARY_PATH: ${envCheck.output}`);
  } else {
    console.log('   DYLD_LIBRARY_PATH: (no configurado)');
  }

  console.log('\n7️⃣ Verificando si hay otros procesos usando el lector:\n');
  const processCheck = await checkCommand('lsof | grep -i "usb\\|card\\|reader" | head -10');
  if (processCheck.success && processCheck.output) {
    console.log('   Procesos que pueden estar usando dispositivos USB:');
    console.log(`   ${processCheck.output}`);
  } else {
    console.log('   ✅ No se encontraron procesos bloqueando dispositivos');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PASOS RECOMENDADOS:\n');
  console.log('1. Desconecta y vuelve a conectar el lector USB');
  console.log('2. Reinicia Terminal después de instalar pcsc-lite');
  console.log('3. Verifica permisos en Preferencias del Sistema');
  console.log('4. Prueba ejecutar: npm run nfc:diagnose');
  console.log('5. Si sigue sin funcionar, puede necesitar drivers específicos\n');
}

main().catch(console.error);

