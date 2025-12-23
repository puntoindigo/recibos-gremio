// Script para simular el caso de las 594 subidas interrumpidas
// Este script crea una sesión de prueba en IndexedDB

// Función para simular la creación de una sesión interrumpida
async function simulateInterruptedSession() {
  console.log('🧪 SIMULANDO SESIÓN DE 594 SUBIDAS INTERRUMPIDAS');
  console.log('===============================================');
  
  try {
    // Importar la base de datos
    const { RecibosDB } = await import('./lib/db.ts');
    const db = new RecibosDB();
    
    // Crear una sesión simulada
    const mockSession = {
      sessionId: 'test-594-files-interrupted',
      userId: 'superadmin_initial',
      status: 'failed', // Marcada como fallida
      totalFiles: 594,
      completedFiles: 127, // +100 archivos completados
      failedFiles: 0,
      skippedFiles: 0,
      pendingFiles: 467, // 594 - 127 = 467 pendientes
      currentFileIndex: 127,
      files: [], // Array de archivos (simplificado)
      startedAt: Date.now() - 300000, // 5 minutos atrás
      lastUpdatedAt: Date.now() - 60000, // 1 minuto atrás
      completedAt: undefined,
      errorMessage: 'Error 500 durante la subida masiva'
    };
    
    console.log('📋 Creando sesión simulada:');
    console.log(`   ID: ${mockSession.sessionId}`);
    console.log(`   Usuario: ${mockSession.userId}`);
    console.log(`   Estado: ${mockSession.status}`);
    console.log(`   Total archivos: ${mockSession.totalFiles}`);
    console.log(`   Completados: ${mockSession.completedFiles}`);
    console.log(`   Pendientes: ${mockSession.pendingFiles}`);
    console.log(`   Error: ${mockSession.errorMessage}`);
    
    // Insertar la sesión en la base de datos
    await db.uploadSessions.add(mockSession);
    console.log('✅ Sesión simulada creada en la base de datos');
    
    // Verificar que se creó correctamente
    const createdSession = await db.uploadSessions
      .where('sessionId')
      .equals(mockSession.sessionId)
      .first();
    
    if (createdSession) {
      console.log('✅ Sesión verificada en la base de datos');
      console.log('🎯 Ahora puedes probar el diagnóstico en la aplicación');
      console.log('📱 Abre el Debug Modal (F) y haz clic en "Diagnosticar"');
    } else {
      console.log('❌ Error: La sesión no se creó correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error creando sesión simulada:', error);
  }
}

// Ejecutar la simulación
simulateInterruptedSession();
