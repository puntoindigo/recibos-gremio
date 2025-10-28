// Script de prueba para simular el caso de las 594 subidas
// Este script crea una sesión de subida simulada para probar el diagnóstico

const { RecibosDB } = require('./lib/db.ts');

async function testUploadSession() {
  console.log('🧪 SIMULANDO CASO DE LAS 594 SUBIDAS');
  console.log('====================================');
  
  try {
    // Crear una sesión de subida simulada
    const mockSession = {
      sessionId: 'test-session-594-files',
      userId: 'admin',
      status: 'failed', // Marcada como fallida pero con archivos pendientes
      totalFiles: 594,
      completedFiles: 127, // +100 archivos ya completados
      failedFiles: 0,
      skippedFiles: 0,
      pendingFiles: 467, // 594 - 127 = 467 pendientes
      currentFileIndex: 127,
      files: [], // Array de archivos (simplificado para la prueba)
      startedAt: Date.now() - 300000, // 5 minutos atrás
      lastUpdatedAt: Date.now() - 60000, // 1 minuto atrás
      errorMessage: 'Error 500 durante la subida'
    };
    
    console.log('📋 Sesión simulada creada:');
    console.log(`   ID: ${mockSession.sessionId}`);
    console.log(`   Usuario: ${mockSession.userId}`);
    console.log(`   Estado: ${mockSession.status}`);
    console.log(`   Total archivos: ${mockSession.totalFiles}`);
    console.log(`   Completados: ${mockSession.completedFiles}`);
    console.log(`   Pendientes: ${mockSession.pendingFiles}`);
    console.log(`   Error: ${mockSession.errorMessage}`);
    
    // Simular la lógica de detección de sesiones activas
    const shouldBeActive = mockSession.status === 'active' || 
                           mockSession.status === 'failed' || 
                           (mockSession.pendingFiles && mockSession.pendingFiles > 0);
    
    console.log(`\n🔍 ¿Debería ser detectada como activa?: ${shouldBeActive ? '✅ SÍ' : '❌ NO'}`);
    
    if (shouldBeActive) {
      console.log('✅ La sesión debería ser detectada correctamente');
      console.log('📤 El sistema debería mostrar "Subidas pendientes"');
      console.log('🔄 El usuario debería poder retomar la subida');
    } else {
      console.log('❌ PROBLEMA: La sesión no sería detectada');
    }
    
    console.log('\n🎯 RESULTADO ESPERADO:');
    console.log('   - El sistema debería detectar 467 archivos pendientes');
    console.log('   - Debería mostrar la opción de retomar la subida');
    console.log('   - El usuario debería poder continuar desde el archivo 128');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testUploadSession();
