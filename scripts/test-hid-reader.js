// scripts/test-hid-reader.js
// Prueba si el lector funciona como emulador de teclado (HID)

console.log('⌨️  PRUEBA DE LECTOR COMO EMULADOR DE TECLADO\n');
console.log('='.repeat(50));
console.log('\n📝 INSTRUCCIONES:');
console.log('1. Abre un Bloc de notas o TextEdit');
console.log('2. Haz clic en el área de texto para enfocar');
console.log('3. Pasa una tarjeta sobre el lector');
console.log('4. Si aparece un número en el texto, el lector funciona como teclado');
console.log('\n⏳ Esperando 30 segundos para que pruebes...\n');
console.log('💡 Si aparece un número, el lector NO es PC/SC, es HID (teclado)');
console.log('💡 En ese caso, necesitaremos usar una solución diferente\n');

setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Prueba completada');
  console.log('\n📋 RESULTADO:');
  console.log('   - Si apareció un número: El lector es HID (emulador de teclado)');
  console.log('   - Si no apareció nada: El lector puede ser PC/SC pero necesita configuración');
  console.log('\n');
  process.exit(0);
}, 30000);

