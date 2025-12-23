// scripts/clear-stored-credentials.js
console.log('🧹 Limpiando credenciales guardadas...');

// Función para ejecutar en el navegador
const clearCredentialsScript = `
// Limpiar localStorage
localStorage.removeItem('savedEmail');
localStorage.removeItem('savedPassword');
localStorage.removeItem('rememberPassword');

// Limpiar sessionStorage
sessionStorage.clear();

// Limpiar cookies de NextAuth
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ Credenciales limpiadas');
console.log('🔄 Recarga la página para hacer login fresco');
`;

console.log('📋 Script para ejecutar en el navegador:');
console.log('1. Abre las herramientas de desarrollador (F12)');
console.log('2. Ve a la pestaña "Console"');
console.log('3. Copia y pega este código:');
console.log('');
console.log(clearCredentialsScript);
console.log('');
console.log('4. Presiona Enter para ejecutar');
console.log('5. Recarga la página (F5)');
console.log('6. Haz login con superadmin@recibos.com / super123');

